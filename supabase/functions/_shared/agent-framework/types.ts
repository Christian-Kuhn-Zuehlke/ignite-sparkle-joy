// Agent Framework Types

export interface AgentContext {
  companyId: string;
  userId?: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface Observation {
  type: string;
  data: unknown;
  confidence: number;
  timestamp: Date;
  source: string;
}

export interface Thought {
  reasoning: string;
  confidence: number;
  actions: AgentAction[];
}

export interface AgentAction {
  type: string;
  tool: string;
  params: Record<string, unknown>;
  priority: number; // 1-10, 10 = highest
}

export interface ActionResult {
  action: AgentAction;
  result?: unknown;
  error?: string;
  success: boolean;
  executedAt: Date;
}

export interface Experience {
  observation: Observation;
  thought: Thought;
  action: AgentAction;
  result: ActionResult;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: Record<string, unknown>, context: AgentContext) => Promise<unknown>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
}

export interface AgentMemoryEntry {
  key: string;
  value: unknown;
  createdAt: Date;
  expiresAt?: Date;
  agentName: string;
  companyId: string;
}

export interface AgentLog {
  id: string;
  agentName: string;
  companyId: string;
  action: string;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'success';
  createdAt: Date;
}

// Order-specific types
export interface OrderWithRisk {
  id: string;
  source_no: string;
  company_id: string;
  status: string;
  order_date: string;
  created_at: string;
  order_amount: number | null;
  ship_to_name: string;
  slaRisk: number; // 0-1
  riskFactors: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  hoursInCurrentStatus: number;
}

export interface SLARiskAssessment {
  orderId: string;
  risk: number; // 0-1
  factors: string[];
  recommendation: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentRunResult {
  agentName: string;
  companyId: string;
  startedAt: Date;
  completedAt: Date;
  observations: number;
  thoughts: number;
  actionsExecuted: number;
  actionsSucceeded: number;
  errors: string[];
}
