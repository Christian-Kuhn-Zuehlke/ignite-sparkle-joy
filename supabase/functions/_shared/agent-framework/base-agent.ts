// Base Agent Class
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { 
  AgentContext, 
  Observation, 
  Thought, 
  AgentAction, 
  ActionResult, 
  Tool,
  AgentLog,
  AgentRunResult 
} from './types.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export abstract class BaseAgent {
  abstract name: string;
  abstract description: string;
  abstract tools: Tool[];
  
  protected supabase: ReturnType<typeof createClient>;
  protected logs: AgentLog[] = [];
  
  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  // Main execution loop
  async run(companyId: string): Promise<AgentRunResult> {
    const startedAt = new Date();
    const context: AgentContext = {
      companyId,
      timestamp: startedAt,
      data: {},
    };
    
    let observations: Observation[] = [];
    let thoughts: Thought[] = [];
    let actionsExecuted = 0;
    let actionsSucceeded = 0;
    const errors: string[] = [];
    
    try {
      // 1. Observe
      this.log('info', 'Starting observation phase', { companyId });
      observations = await this.observe(context);
      this.log('info', `Observed ${observations.length} events`, { 
        types: observations.map(o => o.type) 
      });
      
      if (observations.length === 0) {
        this.log('info', 'No observations, skipping thinking and acting');
        return this.buildResult(startedAt, companyId, observations, thoughts, actionsExecuted, actionsSucceeded, errors);
      }
      
      // 2. Think
      this.log('info', 'Starting thinking phase');
      thoughts = await this.think(observations, context);
      this.log('info', `Generated ${thoughts.length} thoughts`, {
        totalActions: thoughts.reduce((sum, t) => sum + t.actions.length, 0)
      });
      
      // 3. Act
      const allActions = this.prioritizeActions(thoughts);
      this.log('info', `Executing ${allActions.length} actions`);
      
      for (const action of allActions) {
        actionsExecuted++;
        const result = await this.executeAction(action, context);
        
        if (result.success) {
          actionsSucceeded++;
          this.log('success', `Action ${action.type} succeeded`, { 
            tool: action.tool, 
            result: result.result 
          });
        } else {
          errors.push(result.error || 'Unknown error');
          this.log('error', `Action ${action.type} failed`, { 
            tool: action.tool, 
            error: result.error 
          });
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      this.log('error', 'Agent run failed', { error: errorMessage });
    }
    
    return this.buildResult(startedAt, companyId, observations, thoughts, actionsExecuted, actionsSucceeded, errors);
  }
  
  // Abstract methods - must be implemented by subclasses
  abstract observe(context: AgentContext): Promise<Observation[]>;
  
  // Default thinking implementation using AI
  async think(observations: Observation[], context: AgentContext): Promise<Thought[]> {
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return this.thinkWithoutAI(observations);
    }
    
    const prompt = this.buildThinkingPrompt(observations, context);
    
    try {
      const response = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: this.getSystemPrompt() 
            },
            { 
              role: 'user', 
              content: prompt 
            }
          ],
          tools: this.getToolDefinitions(),
          tool_choice: 'auto',
        }),
      });
      
      if (!response.ok) {
        console.error('AI API error:', response.status);
        return this.thinkWithoutAI(observations);
      }
      
      const data = await response.json();
      return this.parseAIResponse(data, observations);
      
    } catch (error) {
      console.error('Error calling AI:', error);
      return this.thinkWithoutAI(observations);
    }
  }
  
  // Fallback thinking without AI
  protected abstract thinkWithoutAI(observations: Observation[]): Thought[];
  
  // Execute a single action
  protected async executeAction(action: AgentAction, context: AgentContext): Promise<ActionResult> {
    const tool = this.tools.find(t => t.name === action.tool);
    
    if (!tool) {
      return {
        action,
        error: `Tool ${action.tool} not found`,
        success: false,
        executedAt: new Date(),
      };
    }
    
    try {
      const result = await tool.execute(action.params, context);
      return {
        action,
        result,
        success: true,
        executedAt: new Date(),
      };
    } catch (error) {
      return {
        action,
        error: error instanceof Error ? error.message : String(error),
        success: false,
        executedAt: new Date(),
      };
    }
  }
  
  // Prioritize and deduplicate actions
  protected prioritizeActions(thoughts: Thought[]): AgentAction[] {
    const allActions = thoughts
      .filter(t => t.confidence > 0.5) // Only high-confidence thoughts
      .flatMap(t => t.actions);
    
    // Sort by priority (highest first)
    allActions.sort((a, b) => b.priority - a.priority);
    
    // Deduplicate by type and main parameter
    const seen = new Set<string>();
    return allActions.filter(action => {
      const key = `${action.type}:${JSON.stringify(action.params)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  // Build system prompt for AI
  protected getSystemPrompt(): string {
    return `You are the ${this.name} agent. ${this.description}

You analyze observations and decide which actions to take using the available tools.
Be decisive but careful. Only recommend actions when confidence is high.
Always explain your reasoning briefly.

Available tools:
${this.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`;
  }
  
  // Build thinking prompt from observations
  protected buildThinkingPrompt(observations: Observation[], context: AgentContext): string {
    return `Current context:
- Company: ${context.companyId}
- Time: ${context.timestamp.toISOString()}

Observations:
${observations.map((o, i) => `${i + 1}. [${o.type}] (confidence: ${(o.confidence * 100).toFixed(0)}%)
   ${JSON.stringify(o.data, null, 2)}`).join('\n\n')}

Based on these observations, what actions should be taken? 
Use the available tools to address any issues or opportunities you identify.`;
  }
  
  // Get tool definitions for AI
  protected getToolDefinitions(): unknown[] {
    return this.tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            tool.parameters.map(p => [
              p.name,
              { type: p.type, description: p.description }
            ])
          ),
          required: tool.parameters.filter(p => p.required).map(p => p.name),
        },
      },
    }));
  }
  
  // Parse AI response into thoughts
  protected parseAIResponse(data: unknown, observations: Observation[]): Thought[] {
    const thoughts: Thought[] = [];
    
    // Handle tool calls from the AI response
    const choices = (data as { choices?: { message?: { tool_calls?: unknown[]; content?: string } }[] })?.choices;
    if (!choices || choices.length === 0) return thoughts;
    
    const message = choices[0]?.message;
    if (!message) return thoughts;
    
    // If there are tool calls, convert them to actions
    const toolCalls = message.tool_calls as { function?: { name?: string; arguments?: string } }[] | undefined;
    if (toolCalls && toolCalls.length > 0) {
      const actions: AgentAction[] = toolCalls.map((tc, index) => {
        let params = {};
        try {
          params = JSON.parse(tc.function?.arguments || '{}');
        } catch {
          params = {};
        }
        
        return {
          type: tc.function?.name || 'unknown',
          tool: tc.function?.name || 'unknown',
          params,
          priority: 10 - index, // First tool call has highest priority
        };
      });
      
      thoughts.push({
        reasoning: message.content || 'AI recommended actions based on observations',
        confidence: 0.8,
        actions,
      });
    }
    
    return thoughts;
  }
  
  // Logging helper
  protected log(severity: AgentLog['severity'], action: string, details: Record<string, unknown> = {}): void {
    const logEntry: AgentLog = {
      id: crypto.randomUUID(),
      agentName: this.name,
      companyId: '', // Will be set in run()
      action,
      details,
      severity,
      createdAt: new Date(),
    };
    
    this.logs.push(logEntry);
    console.log(`[${this.name}] [${severity.toUpperCase()}] ${action}`, details);
  }
  
  // Build final result
  private buildResult(
    startedAt: Date,
    companyId: string,
    observations: Observation[],
    thoughts: Thought[],
    actionsExecuted: number,
    actionsSucceeded: number,
    errors: string[]
  ): AgentRunResult {
    return {
      agentName: this.name,
      companyId,
      startedAt,
      completedAt: new Date(),
      observations: observations.length,
      thoughts: thoughts.length,
      actionsExecuted,
      actionsSucceeded,
      errors,
    };
  }
}
