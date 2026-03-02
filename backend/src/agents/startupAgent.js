import { StateGraph, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";

const graphState = {
  idea: null,
  analysis: null,
  competitors: null,
  gtmPlan: null,
  riskAssessment: null,
  checklist: null,
};

let model = null;
function getModel() {
  if (!model) {
    model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });
  }
  return model;
}

function cleanJson(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

async function analyzeNode(state) {
  console.log("🔍 Analyzing idea...");
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a startup advisor. Analyze startup ideas concisely. Analyze it wrt Indian market if nothing else is specified.
      
IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation, no code blocks.

Use exactly this structure:
{
  "summary": "One sentence summary of the idea",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "challenges": ["challenge 1", "challenge 2", "challenge 3"],
  "verdict": "GO" or "NO-GO" or "PIVOT",
  "nextSteps": ["actionable step 1", "actionable step 2", "actionable step 3"]
}`
    },
    {
      role: "user",
      content: `Analyze this startup idea: ${state.idea}`
    }
  ]);
  
  try {
    const cleaned = cleanJson(response.content);
    return { ...state, analysis: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, analysis: { error: e.message } };
  }
}

async function competitorNode(state) {
  console.log("🏢 Finding competitors...");
  
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a market research analyst. Find competitors for a startup idea. Find wrt Indian market if nothing else is specified.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "directCompetitors": [
    {"name": "Company Name", "description": "What they do", "strengths": "Their key strength"}
  ],
  "indirectCompetitors": [
    {"name": "Company Name", "description": "What they do", "threat": "Why they're a threat"}
  ],
  "marketGap": "What opportunity exists that competitors aren't addressing"
}`
    },
    {
      role: "user",
      content: `Find competitors for this startup idea: ${state.idea}
      
Context from analysis: ${JSON.stringify(state.analysis)}`
    }
  ]);
  
  try {
    const cleaned = cleanJson(response.content);
    return { ...state, competitors: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, competitors: { error: e.message } };
  }
}

async function gtmNode(state) {
  console.log("📈 Generating GTM plan...");
  
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a go-to-market strategist. Create a GTM plan for a startup.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "targetAudience": "Specific description of ideal first customers",
  "valueProposition": "One clear sentence of why customers should choose this",
  "channels": [
    {"channel": "Channel name", "strategy": "How to use it", "priority": "HIGH/MEDIUM/LOW"}
  ],
  "launchStrategy": "How to launch in first 90 days",
  "metrics": ["Key metric 1 to track", "Key metric 2 to track"]
}`
    },
    {
      role: "user",
      content: `Create a GTM plan for: ${state.idea}

Analysis: ${JSON.stringify(state.analysis)}
Competitors: ${JSON.stringify(state.competitors)}`
    }
  ]);
  
  try {
    const cleaned = cleanJson(response.content);
    return { ...state, gtmPlan: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, gtmPlan: { error: e.message } };
  }
}

async function riskAssessmentNode(state) {
  console.log("⚠️ Assessing risks...");
  
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a startup risk analyst. Identify the top risks and mitigation strategies.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "risks": [
    {
      "risk": "Risk description",
      "severity": "HIGH/MEDIUM/LOW",
      "likelihood": "HIGH/MEDIUM/LOW",
      "mitigation": "How to mitigate this risk"
    }
  ],
  "overallRiskLevel": "HIGH/MEDIUM/LOW",
  "criticalAssumptions": ["Assumption 1 that must be true", "Assumption 2"]
}`
    },
    {
      role: "user",
      content: `Identify top 3 risks for: ${state.idea}

Based on:
- Analysis: ${JSON.stringify(state.analysis)}
- Competitors: ${JSON.stringify(state.competitors)}
- GTM Plan: ${JSON.stringify(state.gtmPlan)}`
    }
  ]);
  
  try {
    const cleaned = cleanJson(response.content);
    return { ...state, riskAssessment: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, riskAssessment: { error: e.message } };
  }
}

async function checklistNode(state) {
  console.log("✅ Creating checklist...");
  
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a startup execution coach. Create an actionable checklist.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "week1": [
    {"task": "Task description", "priority": "HIGH/MEDIUM", "category": "Research/Build/Marketing/Legal"}
  ],
  "week2to4": [
    {"task": "Task description", "priority": "HIGH/MEDIUM", "category": "Research/Build/Marketing/Legal"}
  ],
  "month2to3": [
    {"task": "Task description", "priority": "HIGH/MEDIUM", "category": "Research/Build/Marketing/Legal"}
  ]
}`
    },
    {
      role: "user",
      content: `Create an action checklist for: ${state.idea}

Based on:
- Analysis: ${JSON.stringify(state.analysis)}
- Competitors: ${JSON.stringify(state.competitors)}
- GTM Plan: ${JSON.stringify(state.gtmPlan)}
- Risks: ${JSON.stringify(state.riskAssessment)}`
    }
  ]);
  
  try {
    const cleaned = cleanJson(response.content);
    return { ...state, checklist: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, checklist: { error: e.message } };
  }
}

export function createStartupAgent() {
  const graph = new StateGraph({
    channels: graphState,
  });

  graph.addNode("analyzeStep", analyzeNode);
  graph.addNode("competitorStep", competitorNode);
  graph.addNode("gtmStep", gtmNode);
  graph.addNode("riskStep", riskAssessmentNode);
  graph.addNode("checklistStep", checklistNode);

  graph.setEntryPoint("analyzeStep");
  graph.addEdge("analyzeStep", "competitorStep");
  graph.addEdge("competitorStep", "gtmStep");
  graph.addEdge("gtmStep", "riskStep");
  graph.addEdge("riskStep", "checklistStep");
  graph.addEdge("checklistStep", END);

  return graph.compile();
}

export async function runAgentWithProgress(idea, onProgress) {
  let state = { idea };
  
  onProgress({ step: 1, name: 'Analysis', total: 5 });
  state = await analyzeNode(state);
  
  onProgress({ step: 2, name: 'Research', total: 5 });
  state = await competitorNode(state);
  
  onProgress({ step: 3, name: 'Strategy', total: 5 });
  state = await gtmNode(state);
  
  onProgress({ step: 4, name: 'Risks', total: 5 });
  state = await riskAssessmentNode(state);
  
  onProgress({ step: 5, name: 'Action Plan', total: 5 });
  state = await checklistNode(state);
  
  return state;
}