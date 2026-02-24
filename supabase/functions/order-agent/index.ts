// Order Agent Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OrderManagementAgent } from './agent.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json();
    
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'companyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[Order Agent] Starting run for company: ${companyId}`);
    
    // Create and run the agent
    const agent = new OrderManagementAgent();
    const result = await agent.run(companyId);
    
    console.log(`[Order Agent] Completed:`, {
      observations: result.observations,
      thoughts: result.thoughts,
      actionsExecuted: result.actionsExecuted,
      actionsSucceeded: result.actionsSucceeded,
      errors: result.errors.length,
      durationMs: new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime(),
    });
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[Order Agent] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
