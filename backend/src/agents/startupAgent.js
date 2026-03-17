import { StateGraph, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import {
  painSignalsTool,
  solutionSeekingTool,
  workaroundDetectionTool,
  competitorSignalsTool,
  searchDemandTool,
  earlyUserChannelsTool,
} from "../tools/validationSearchTools.js";

// CONSOLIDATED 5-STEP GRAPH STATE
const graphState = {
  idea: null,
  marketValidation: null,   // Step 1
  competitors: null,        // Step 2
  gtmStrategy: null,        // Step 3
  risks: null,              // Step 4
  executionPlan: null,      // Step 5
};

let model = null;
function getModel() {
  if (!model) {
    model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
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

// ─── STEP 1: MARKET VALIDATION ──────────────────────────────────────────────
// Runs 3 Tavily searches (pain, seeking, demand) + LLM Synthesis
async function marketValidationNode(state) {
  console.log("🔥 Step 1/5: Validating Market Demand & Problem Fit...");
  
  // 1. Gather real web evidence
  const [painRaw, seekingRaw, demandRaw] = await Promise.all([
    painSignalsTool.func(state.idea),
    solutionSeekingTool.func(state.idea),
    searchDemandTool.func(state.idea),
  ]);

  // 2. Synthesize using the LLM
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a tough startup advisor evaluating problem-solution fit and market demand.
Analyze the provided web search signals (pain points, solution-seeking behavior, and market demand).

IMPORTANT: Respond ONLY with valid JSON. Do not make up data.

Use exactly this structure:
{
  "demandScore": {
    "overallVerdict": "Strong Demand", "Moderate Demand", or "Weak Demand",
    "confidenceLevel": "HIGH/MEDIUM/LOW",
    "recommendation": "1-2 sentence actionable recommendation based strictly on the data"
  },
  "marketAnalysis": {
    "tamSize": "Market size with specific data found (or 'Unknown')", 
    "growthRate": "Growth data if found",
    "customerPain": "Pain severity (1-10) with justification"
  },
  "evidence": {
    "painSignals": [
      { "source": "URL or platform", "quote": "Actual complaint found", "painLevel": "HIGH/MEDIUM/LOW" }
    ],
    "solutionSeeking": [
      { "source": "URL or platform", "query": "What people asked for", "context": "Context" }
    ]
  },
  "summary": "One sentence brutal but fair assessment of the market opportunity"
}`
    },
    {
      role: "user",
      content: `Evaluate market validation for: "${state.idea}"

REAL WEB SEARCH EVIDENCE:
--- PAIN SIGNALS ---
${painRaw}

--- SOLUTION SEEKING ---
${seekingRaw}

--- MARKET DEMAND ---
${demandRaw}

Default context: India. Base your analysis completely on this real evidence.`
    }
  ]);

  try {
    return { ...state, marketValidation: JSON.parse(cleanJson(response.content)) };
  } catch (e) {
    return { ...state, marketValidation: { error: e.message, raw: response.content } };
  }
}

// ─── STEP 2: COMPETITIVE LANDSCAPE ──────────────────────────────────────────
// Runs 2 Tavily searches (competitor signals, workarounds) + LLM Synthesis
async function competitorNode(state) {
  console.log("🏢 Step 2/5: Deep Competitive Intelligence...");
  
  // 1. Gather competitor and workaround data
  const [competitorRaw, workaroundRaw] = await Promise.all([
    competitorSignalsTool.func(state.idea),
    workaroundDetectionTool.func(state.idea),
  ]);

  // 2. Synthesize using the LLM
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You conduct competitive due diligence. Analyze the real web search data for existing tools, competitors, and manual workarounds.

IMPORTANT: Respond ONLY with valid JSON. Extract real companies and failure cases.

Use exactly this structure:
{
  "marketDominance": {
    "leader": "Company that owns this market (if any)",
    "marketShare": "Their perceived dominance and why",
    "moatStrength": "How strong their competitive moat is (1-10)"
  },
  "directCompetitors": [
    {
      "name": "Real Company Name from search results", 
      "description": "What they do exactly",
      "pricing": "Pricing/funding data if found",
      "weaknesses": "Their exploitable gaps"
    }
  ],
  "workarounds": [
    {
      "method": "How people solve this without a tool (from search results)",
      "painWithWorkaround": "Why it sucks"
    }
  ],
  "bigTechThreat": {
    "riskLevel": "HIGH/MEDIUM/LOW", 
    "timeline": "When they'll likely enter",
    "preventionStrategy": "How to survive their entry"
  },
  "marketGap": "The specific unaddressed customer pain point based on evidence",
  "entryStrategy": "How to wedge into this market"
}`
    },
    {
      role: "user",
      content: `Analyze the competitive landscape for: "${state.idea}"

ANALYSIS CONTEXT:
Demand Verdict: ${state.marketValidation?.demandScore?.overallVerdict}

REAL WEB SEARCH EVIDENCE:
--- COMPETITOR SIGNALS ---
${competitorRaw}

--- WORKAROUNDS (What people use instead) ---
${workaroundRaw}

Default context: India. Base analysis on real companies and specific workarounds found in the data.`
    }
  ]);

  try {
    return { ...state, competitors: JSON.parse(cleanJson(response.content)) };
  } catch (e) {
    return { ...state, competitors: { error: e.message, raw: response.content } };
  }
}

// ─── STEP 3: GO-TO-MARKET STRATEGY ──────────────────────────────────────────
// Runs 1 Tavily search (early user channels) + LLM Synthesis
async function gtmNode(state) {
  console.log("🚀 Step 3/5: Generating Data-Driven GTM Plan...");
  
  // 1. Gather community data
  const [communityRaw] = await Promise.all([
    earlyUserChannelsTool.func(state.idea),
  ]);

  // 2. Synthesize using the LLM
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a go-to-market strategist. Create a launch plan explicitly targeting the real communities found in the web search.

IMPORTANT: Respond ONLY with valid JSON.

Use exactly this structure:
{
  "targetAudience": "Specific description of ideal first customers",
  "valueProposition": "One clear sentence of why customers should choose this",
  "earlyUserCommunities": [
    {
      "name": "Real community name from search results",
      "platform": "reddit/discord/etc",
      "relevance": "HIGH/MEDIUM/LOW",
      "strategy": "How to specifically acquire users here without spamming"
    }
  ],
  "channels": [
    {"channel": "Broader channel (e.g., SEO, Cold Email)", "strategy": "How to use it", "priority": "HIGH/MEDIUM/LOW"}
  ],
  "launchStrategy": "How to launch in the first 90 days",
  "metrics": ["Key metric 1 to track", "Key metric 2 to track"]
}`
    },
    {
      role: "user",
      content: `Create a GTM plan for: "${state.idea}"

ANALYSIS CONTEXT:
Summary: ${state.marketValidation?.summary}
Market Gap: ${state.competitors?.marketGap}

REAL WEB SEARCH EVIDENCE:
--- EARLY USER COMMUNITIES ---
${communityRaw}

Focus on Indian/global market context.`
    }
  ]);

  try {
    return { ...state, gtmStrategy: JSON.parse(cleanJson(response.content)) };
  } catch (e) {
    return { ...state, gtmStrategy: { error: e.message, raw: response.content } };
  }
}

// ─── STEP 4: RISK ASSESSMENT ────────────────────────────────────────────────
// Pure LLM Analysis based on upstream steps
async function riskNode(state) {
  console.log("⚠️ Step 4/5: Startup Mortality Analysis...");
  
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a startup forensics expert. Based on the gathered market, competitor, and GTM data, identify exact failure modes.

IMPORTANT: Respond ONLY with valid JSON.

Use exactly this structure:
{
  "mortalityScore": "X/10 (10 = certain death)",
  "primaryDeathRisk": "Most likely way this startup dies",
  "marketRisks": [
    { "risk": "Specific market failure mode", "probability": "X%", "mitigation": "How to reduce this risk" }
  ],
  "executionRisks": [
    { "risk": "Specific execution failure", "probability": "X%", "earlyWarning": "Signs this is happening" }
  ],
  "competitiveThreats": [
    { "threat": "How competitors destroy you", "timeline": "When this happens", "response": "Counter-strategy" }
  ],
  "criticalAssumptions": [
    "Must be true for success - if false, company dies"
  ],
  "deathSpiral": "Most likely sequence of events leading to failure",
  "survivalStrategy": "How to avoid the startup graveyard"
}`
    },
    {
      role: "user",
      content: `Conduct mortality analysis for: "${state.idea}"

CONTEXT:
Demand Score: ${state.marketValidation?.demandScore?.overallVerdict}
Market Gap: ${state.competitors?.marketGap}
GTM Core Strategy: ${state.gtmStrategy?.launchStrategy}

Be brutally honest about failure probability given the competitive landscape.`
    }
  ]);

  try {
    return { ...state, risks: JSON.parse(cleanJson(response.content)) };
  } catch (e) {
    return { ...state, risks: { error: e.message } };
  }
}

// ─── STEP 5: EXECUTION PLAN (Checklist + Pitch Deck) ────────────────────────
// Pure LLM Synthesis
async function executionNode(state) {
  console.log("✅ Step 5/5: Creating Execution Plan & Pitch Deck...");
  
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are an execution coach. Synthesize all the research into an actionable checklist AND an investor pitch deck narrative.

IMPORTANT: Respond ONLY with valid JSON.

Use exactly this structure:
{
  "checklist": {
    "week1": [
      {"task": "Task description", "priority": "HIGH/MEDIUM", "category": "Build/Marketing/Legal"}
    ],
    "week2to4": [
      {"task": "Task description", "priority": "HIGH/MEDIUM", "category": "Build/Marketing/Legal"}
    ],
    "month2to3": [
      {"task": "Task description", "priority": "HIGH/MEDIUM", "category": "Build/Marketing/Legal"}
    ]
  },
  "pitchDeck": {
    "slides": [
      {
        "slideNumber": 1,
        "title": "Problem",
        "content": {
          "headline": "A clear, relatable problem statement",
          "details": "Bullet points based on REAL pain signals found",
          "scale": "How big the problem is"
        }
      },
      {
        "slideNumber": 2,
        "title": "Solution & Value Prop",
        "content": {
          "headline": "Clear, jargon-free description of what you're building",
          "howItWorks": "Simple 3-step explanation of the mechanics",
          "uniqueInsight": "Why this solution works when others fail"
        }
      },
      {
        "slideNumber": 3,
        "title": "Market Size & Timing",
        "content": {
          "tam": "Bottom-up TAM calculation",
          "whyNow": "Market/tech shifts making this possible today",
          "growthTrend": "Relevant market tailwinds"
        }
      },
      {
        "slideNumber": 4,
        "title": "Competition & Moat",
        "content": {
          "landscape": "Current alternatives (status quo)",
          "differentiation": "Why your approach is 10x better",
          "defensibility": "Long-term moat (network effects, deep tech, etc)"
        }
      },
      {
        "slideNumber": 5,
        "title": "Go-to-Market & Traction",
        "content": {
          "initialTarget": "Who is the precise first customer",
          "distribution": "How you acquire them scalably",
          "currentStatus": "Where the project is today"
        }
      },
      {
        "slideNumber": 6,
        "title": "Business Model & Ask",
        "content": {
          "revenue": "How you make money (pricing/unit economics)",
          "runway": "Expected runway and path to next round or profitability",
          "nextRound": "Series A target: timing, size, and expected valuation"
        }
      }
    ],
    "executiveSummary": "One compelling paragraph that captures the opportunity"
  }
}`
    },
    {
      role: "user",
      content: `Create the final execution plan and deck for: "${state.idea}"

BASED ON THE FOLLOWING RESEARCH:
Market Fit: ${state.marketValidation?.summary}
Competitors: ${state.competitors?.marketGap}
GTM: ${state.gtmStrategy?.launchStrategy}
Risks: ${state.risks?.primaryDeathRisk}

Make the pitch deck compelling and the checklist highly actionable.`
    }
  ]);

  try {
    return { ...state, executionPlan: JSON.parse(cleanJson(response.content)) };
  } catch (e) {
    return { ...state, executionPlan: { error: e.message } };
  }
}

export function createStartupAgent() {
  const graph = new StateGraph({
    channels: graphState,
  });

  graph.addNode("marketValidationNode", marketValidationNode);
  graph.addNode("competitorNode", competitorNode);
  graph.addNode("gtmNode", gtmNode);
  graph.addNode("riskNode", riskNode);
  graph.addNode("executionNode", executionNode);

  graph.setEntryPoint("marketValidationNode");
  graph.addEdge("marketValidationNode", "competitorNode");
  graph.addEdge("competitorNode", "gtmNode");
  graph.addEdge("gtmNode", "riskNode");
  graph.addEdge("riskNode", "executionNode");
  graph.addEdge("executionNode", END);

  return graph.compile();
}

export async function runAgentWithProgress(idea, onProgress) {
  let state = { idea };
  const total = 5;
  
  onProgress({ step: 1, name: 'Market Validation', total });
  state = await marketValidationNode(state);
  
  onProgress({ step: 2, name: 'Competitive Intel', total });
  state = await competitorNode(state);
  
  onProgress({ step: 3, name: 'GTM Strategy', total });
  state = await gtmNode(state);
  
  onProgress({ step: 4, name: 'Risk Assessment', total });
  state = await riskNode(state);
  
  onProgress({ step: 5, name: 'Execution Plan', total });
  state = await executionNode(state);
  
  return state;
}