import { ChatGroq } from "@langchain/groq";
import {
  painSignalsTool,
  solutionSeekingTool,
  workaroundDetectionTool,
  competitorSignalsTool,
  searchDemandTool,
  earlyUserChannelsTool,
} from "../tools/validationSearchTools.js";

let model = null;
function getModel() {
  if (!model) {
    model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.3,
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

// ─── Node 1: Pain Signals ───────────────────────────────────────────────────

async function painSignalsNode(state) {
  console.log("🔥 Step 1/7: Searching pain signals...");

  const rawResults = await painSignalsTool.func(state.idea);

  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are an expert at analyzing online discussions to detect real customer pain. 
Given web search results about a problem, extract concrete evidence of pain and frustration.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "examples": [
    {
      "source": "URL or platform name",
      "quote": "Actual complaint or frustration language found",
      "painLevel": "HIGH/MEDIUM/LOW"
    }
  ],
  "discussionVolume": "HIGH/MEDIUM/LOW — estimate based on number and diversity of sources",
  "volumeReasoning": "Brief explanation of why you rated the volume this way",
  "dominantPainThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "summary": "2-3 sentence summary of the pain landscape"
}`,
    },
    {
      role: "user",
      content: `Analyze these search results for pain signals related to: "${state.idea}"

Search results:
${rawResults}

Extract real complaints, frustration language, and pain indicators. Only cite evidence actually present in the search results.`,
    },
  ]);

  try {
    const cleaned = cleanJson(response.content);
    return { ...state, painSignals: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, painSignals: { error: e.message, raw: response.content } };
  }
}

// ─── Node 2: Solution-Seeking Signals ───────────────────────────────────────

async function solutionSeekingNode(state) {
  console.log("🔍 Step 2/7: Detecting solution-seeking signals...");

  const rawResults = await solutionSeekingTool.func(state.idea);

  const response = await getModel().invoke([
    {
      role: "system",
      content: `You analyze search results to find evidence that people are actively seeking solutions for a problem.
Look for posts like "is there a tool for X", "what's the best software for X", "need help with X".

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "seekingExamples": [
    {
      "source": "URL or platform name",
      "query": "What the person was asking for",
      "context": "Brief context of the request"
    }
  ],
  "seekingVolume": "HIGH/MEDIUM/LOW",
  "commonRequests": ["Most requested feature/solution 1", "Feature 2", "Feature 3"],
  "urgencyLevel": "HIGH/MEDIUM/LOW — how urgent do these requests feel",
  "summary": "2-3 sentence summary of solution-seeking activity"
}`,
    },
    {
      role: "user",
      content: `Analyze these search results for solution-seeking signals related to: "${state.idea}"

Search results:
${rawResults}

Find concrete examples of people asking for tools, software, or solutions. Only cite what's actually in the results.`,
    },
  ]);

  try {
    const cleaned = cleanJson(response.content);
    return { ...state, solutionSeeking: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, solutionSeeking: { error: e.message, raw: response.content } };
  }
}

// ─── Node 3: Workaround Detection ──────────────────────────────────────────

async function workaroundDetectionNode(state) {
  console.log("🔧 Step 3/7: Detecting workarounds...");

  const rawResults = await workaroundDetectionTool.func(state.idea);

  const response = await getModel().invoke([
    {
      role: "system",
      content: `You analyze search results to identify workarounds people use to solve a problem — spreadsheets, manual workflows, custom scripts, duct-tape solutions. 
These workarounds are strong signals of unmet demand.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "workarounds": [
    {
      "source": "URL or platform",
      "method": "What workaround they use (e.g., 'Google Sheets with manual data entry')",
      "painWithWorkaround": "Why this workaround is painful or limited"
    }
  ],
  "workaroundTypes": ["spreadsheet", "manual process", "custom script", "multiple-tool stack"],
  "sophisticationLevel": "HIGH/MEDIUM/LOW — how complex are the workarounds (complex = stronger signal)",
  "replacementOpportunity": "HIGH/MEDIUM/LOW — how replaceable are these workarounds with a product",
  "summary": "2-3 sentence summary of the workaround landscape"
}`,
    },
    {
      role: "user",
      content: `Analyze these search results for workarounds related to: "${state.idea}"

Search results:
${rawResults}

Identify DIY solutions, spreadsheet hacks, manual processes, and makeshift tools people use. Only cite what's actually in the results.`,
    },
  ]);

  try {
    const cleaned = cleanJson(response.content);
    return { ...state, workarounds: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, workarounds: { error: e.message, raw: response.content } };
  }
}

// ─── Node 4: Competitor Signals ─────────────────────────────────────────────

async function competitorSignalsNode(state) {
  console.log("🏢 Step 4/7: Analyzing competitor signals...");

  const rawResults = await competitorSignalsTool.func(state.idea);

  const response = await getModel().invoke([
    {
      role: "system",
      content: `You analyze search results to identify existing competitors and whether they have paying customers.
Key signals: pricing pages, paid plans, funding rounds, revenue mentions, customer testimonials.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "competitors": [
    {
      "name": "Company/product name",
      "url": "Their website URL",
      "description": "What they do",
      "hasPricing": true/false,
      "pricingDetails": "Pricing info if found (e.g., '$29/mo starter plan')",
      "fundingInfo": "Funding details if found",
      "marketPresence": "HIGH/MEDIUM/LOW"
    }
  ],
  "marketMaturity": "NASCENT/GROWING/MATURE/SATURATED",
  "monetizationEvidence": "Is there evidence people PAY for solutions in this space?",
  "competitiveGaps": ["Gap 1 competitors don't address", "Gap 2"],
  "summary": "2-3 sentence competitive landscape summary"
}`,
    },
    {
      role: "user",
      content: `Analyze these search results for competitor signals related to: "${state.idea}"

Search results:
${rawResults}

Find real companies, their pricing, funding status, and whether they have paying customers. Only cite what's actually in the results.`,
    },
  ]);

  try {
    const cleaned = cleanJson(response.content);
    return { ...state, competitors: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, competitors: { error: e.message, raw: response.content } };
  }
}

// ─── Node 5: Search Demand ──────────────────────────────────────────────────

async function searchDemandNode(state) {
  console.log("📊 Step 5/7: Analyzing search demand...");

  const rawResults = await searchDemandTool.func(state.idea);

  const response = await getModel().invoke([
    {
      role: "system",
      content: `You analyze search results to estimate search demand and market interest for a problem/solution category.
Look for: market size data, growth rates, search volume indicators, trend data, industry reports.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "marketSize": "Estimated market size if found in results",
  "growthRate": "Market growth rate if found",
  "searchIndicators": [
    {
      "source": "URL or report name",
      "data": "Specific data point found (e.g., 'market expected to reach $X by 2027')"
    }
  ],
  "trendDirection": "GROWING/STABLE/DECLINING",
  "relatedSearchTerms": ["Related term people search for", "Term 2", "Term 3"],
  "demandLevel": "HIGH/MEDIUM/LOW",
  "summary": "2-3 sentence summary of search demand landscape"
}`,
    },
    {
      role: "user",
      content: `Analyze these search results for search demand signals related to: "${state.idea}"

Search results:
${rawResults}

Extract market size data, growth indicators, search trends, and demand signals. Only cite what's actually in the results.`,
    },
  ]);

  try {
    const cleaned = cleanJson(response.content);
    return { ...state, searchDemand: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, searchDemand: { error: e.message, raw: response.content } };
  }
}

// ─── Node 6: Early User Channels ────────────────────────────────────────────

async function earlyUserChannelsNode(state) {
  console.log("👥 Step 6/7: Finding early user channels...");

  const rawResults = await earlyUserChannelsTool.func(state.idea);

  const response = await getModel().invoke([
    {
      role: "system",
      content: `You analyze search results to identify communities where potential early users already gather.
Look for: subreddits, forums, Slack/Discord groups, Facebook groups, LinkedIn communities, niche sites.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "channels": [
    {
      "name": "Community/group name (e.g., r/SaaS, IndieHackers)",
      "platform": "reddit/discord/slack/facebook/linkedin/forum/other",
      "url": "URL if found",
      "relevance": "HIGH/MEDIUM/LOW",
      "estimatedSize": "Estimated member count if available",
      "engagementLevel": "How active the community seems"
    }
  ],
  "bestChannelsForLaunch": ["Top channel 1", "Top channel 2", "Top channel 3"],
  "communityDensity": "HIGH/MEDIUM/LOW — how many relevant communities exist",
  "summary": "2-3 sentence summary of the early user channel landscape"
}`,
    },
    {
      role: "user",
      content: `Analyze these search results for early user communities related to: "${state.idea}"

Search results:
${rawResults}

Find specific communities, groups, and forums where potential early adopters already gather. Only cite what's actually in the results.`,
    },
  ]);

  try {
    const cleaned = cleanJson(response.content);
    return { ...state, earlyUserChannels: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, earlyUserChannels: { error: e.message, raw: response.content } };
  }
}

// ─── Node 7: Final Demand Score ─────────────────────────────────────────────

async function demandScoringNode(state) {
  console.log("⚡ Step 7/7: Computing demand score...");

  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a startup demand analyst. Based on the 6 validation signals below, compute an overall demand verdict.

Scoring criteria:
- STRONG DEMAND: Multiple high-volume pain signals, active solution-seeking, complex workarounds exist, competitors with paying customers, growing market, active communities
- MODERATE DEMAND: Some pain signals, moderate solution-seeking, basic workarounds, some competition, market exists but may not be growing fast
- WEAK DEMAND: Few pain signals, low solution-seeking, no workarounds detected, no clear competitors or market, few communities

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "overallVerdict": "Strong Demand" or "Moderate Demand" or "Weak Demand",
  "confidenceLevel": "HIGH/MEDIUM/LOW",
  "signalBreakdown": {
    "painSignals": "STRONG/MODERATE/WEAK",
    "solutionSeeking": "STRONG/MODERATE/WEAK",
    "workarounds": "STRONG/MODERATE/WEAK",
    "competitors": "STRONG/MODERATE/WEAK",
    "searchDemand": "STRONG/MODERATE/WEAK",
    "earlyUserChannels": "STRONG/MODERATE/WEAK"
  },
  "strongestSignals": ["Signal 1 that's most convincing", "Signal 2"],
  "weakestSignals": ["Signal 1 that's weakest", "Signal 2"],
  "recommendation": "1-2 sentence actionable recommendation based on the evidence",
  "nextSteps": ["Concrete next step 1", "Step 2", "Step 3"]
}`,
    },
    {
      role: "user",
      content: `Score the overall demand for this startup idea: "${state.idea}"

Based on these validation signals:

1. PAIN SIGNALS: ${JSON.stringify(state.painSignals)}

2. SOLUTION-SEEKING: ${JSON.stringify(state.solutionSeeking)}

3. WORKAROUNDS: ${JSON.stringify(state.workarounds)}

4. COMPETITORS: ${JSON.stringify(state.competitors)}

5. SEARCH DEMAND: ${JSON.stringify(state.searchDemand)}

6. EARLY USER CHANNELS: ${JSON.stringify(state.earlyUserChannels)}

Based on ALL the evidence above, provide your demand verdict. Be honest and evidence-based.`,
    },
  ]);

  try {
    const cleaned = cleanJson(response.content);
    return { ...state, demandScore: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, demandScore: { error: e.message, raw: response.content } };
  }
}

// ─── Exported runner ────────────────────────────────────────────────────────

export async function runValidationWithProgress(idea, onProgress) {
  let state = { idea };

  const steps = [
    { name: "Pain Signals", fn: painSignalsNode },
    { name: "Solution-Seeking", fn: solutionSeekingNode },
    { name: "Workarounds", fn: workaroundDetectionNode },
    { name: "Competitors", fn: competitorSignalsNode },
    { name: "Search Demand", fn: searchDemandNode },
    { name: "Early Users", fn: earlyUserChannelsNode },
    { name: "Demand Score", fn: demandScoringNode },
  ];

  for (let i = 0; i < steps.length; i++) {
    onProgress({ step: i + 1, name: steps[i].name, total: steps.length });
    state = await steps[i].fn(state);
  }

  return state;
}
