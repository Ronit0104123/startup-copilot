import { ChatGroq } from "@langchain/groq";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { competitorSearchTool, marketSizeTool } from "../tools/searchTools.js";

let modelWithTools = null;

function getModelWithTools() {
  if (!modelWithTools) {
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.7,
    });
    
    modelWithTools = model.bindTools([competitorSearchTool, marketSizeTool]);
  }
  return modelWithTools;
}

// Map tool names to their implementations
const toolMap = {
  search_competitors: competitorSearchTool,
  get_market_size: marketSizeTool,
};

export async function runWithTools(userQuery) {
  const model = getModelWithTools();
  const messages = [
    new HumanMessage(`You are a startup research assistant. Help analyze this startup idea and use tools when you need real data.
    
Startup idea: ${userQuery}
Use the search_competitors tool to find real competitors.
Use the get_market_size tool to get market data.
After gathering data, provide a comprehensive analysis.`)
  ];

  console.log("🤖 Starting tool-enabled agent...");
  
  let response = await model.invoke(messages);
  messages.push(response);
  
  while (response.tool_calls && response.tool_calls.length > 0) {
    console.log(`🔧 AI requested ${response.tool_calls.length} tool call(s)`);
    
    for (const toolCall of response.tool_calls) {
      console.log(`  → Calling tool: ${toolCall.name}`);
      console.log(`    Args: ${JSON.stringify(toolCall.args)}`);
      
      const tool = toolMap[toolCall.name];
      if (!tool) {
        throw new Error(`Unknown tool: ${toolCall.name}`);
      }
      
      const toolResult = await tool.func(toolCall.args);
      console.log(`  ← Result: ${toolResult.substring(0, 100)}...`);
      
      messages.push(new ToolMessage({
        tool_call_id: toolCall.id,
        content: toolResult,
      }));
    }
    
    response = await model.invoke(messages);
    messages.push(response);
  }
  
  console.log("✅ Agent completed (no more tool calls)");
  
  return {
    response: response.content,
    toolCallsCount: messages.filter(m => m.tool_calls?.length > 0).length,
  };
}
