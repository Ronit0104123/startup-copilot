import { StateGraph, END } from "@langchain/langgraph";
import { createChatModel } from "../config/models.js";
import {
  painSignalsTool,
  solutionSeekingTool,
  workaroundDetectionTool,
  competitorSignalsTool,
  searchDemandTool,
  earlyUserChannelsTool,
} from "../tools/validationSearchTools.js";
import {
  marketValidationSchema,
  competitorsSchema,
  gtmStrategySchema,
  risksSchema,
  executionPlanSchema,
  broadenQuerySchema,
} from "./schemas.js";

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
    model = createChatModel({ temperature: 0.7 });
  }
  return model;
}

// Binds a stage's Zod schema to the shared model via OpenAI structured
// outputs (response_format: json_schema, strict mode). This replaces the old
// "describe the JSON shape in the prompt, then JSON.parse(cleanJson(text))"
// pattern — the API now guarantees the shape, so a stage can no longer
// degrade to { error, raw } from a markdown-fence or malformed-JSON slip.
function structured(schema, name) {
  return getModel().withStructuredOutput(schema, { name });
}

// Serializes a prior stage's full output for a downstream prompt, minus its
// raw evidence/quote arrays — those are kept in state for the UI, but the
// synthesized fields already summarize them, so re-sending the quotes would
// just add tokens without adding information a downstream node can use.
function context(stage) {
  if (!stage) return "None available.";
  if (stage.error) return `(This stage failed: ${stage.error})`;
  const { evidence, ...rest } = stage;
  return JSON.stringify(rest, null, 2);
}

// The model is told "do not make up data," but nothing enforces that — it can
// still cite a URL that was never in the search results it was given. This
// cross-checks each evidence item's "source" against the URLs the Tavily
// tools actually returned and tags mismatches as unverified rather than
// silently trusting them.
function extractUrls(...rawToolResults) {
  const urls = new Set();
  for (const raw of rawToolResults) {
    try {
      const parsed = JSON.parse(raw);
      for (const r of parsed.results || []) {
        if (r.url) urls.add(normalizeUrl(r.url));
      }
    } catch {
      // Tool already degrades to { source: "error" } on failure — nothing to collect.
    }
  }
  return urls;
}

function normalizeUrl(url) {
  return String(url).trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function verifyEvidence(evidence, knownUrls) {
  if (!evidence) return evidence;
  const tag = (item) => ({
    ...item,
    verified: typeof item.source === "string" && knownUrls.has(normalizeUrl(item.source)),
  });
  return {
    ...evidence,
    painSignals: (evidence.painSignals || []).map(tag),
    solutionSeeking: (evidence.solutionSeeking || []).map(tag),
  };
}

// Same grounding idea as verifyEvidence(), for stages whose entities (a
// competitor's name, a community's name) aren't tied to a single URL but
// should still appear somewhere in the title/snippet text the tools
// returned. A name that doesn't show up anywhere in the evidence text is
// more likely paraphrased or invented than a genuine find.
function extractText(...rawToolResults) {
  const chunks = [];
  for (const raw of rawToolResults) {
    try {
      const parsed = JSON.parse(raw);
      for (const r of parsed.results || []) {
        chunks.push(`${r.title || ""} ${r.snippet || ""}`);
      }
    } catch {
      // Tool already degrades to { source: "error" } on failure — nothing to collect.
    }
  }
  return chunks.join(" \n ").toLowerCase();
}

function mentionedIn(name, evidenceText) {
  return typeof name === "string" && name.trim().length > 0 && evidenceText.includes(name.trim().toLowerCase());
}

function tagByName(items, evidenceText) {
  return (items || []).map((item) => ({
    ...item,
    verified: mentionedIn(item.name, evidenceText),
  }));
}

// Combines two rounds of the same tool's raw JSON output into one, deduped
// by URL, in the same { results: [...] } shape the rest of the pipeline
// already expects — so extractUrls() and the synthesis prompt don't need to
// know a retry happened at all.
function mergeRawResults(rawA, rawB) {
  const parse = (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return { results: [] };
    }
  };
  const a = parse(rawA);
  const b = parse(rawB);
  const seen = new Set();
  const results = [...(a.results || []), ...(b.results || [])].filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  return JSON.stringify({ query: a.query || b.query, results, source: a.source || b.source });
}

function countVerifiedCitations(marketValidation) {
  const pain = marketValidation?.evidence?.painSignals || [];
  const seeking = marketValidation?.evidence?.solutionSeeking || [];
  return [...pain, ...seeking].filter((item) => item.verified).length;
}

function searchStatus(...rawToolResults) {
  const searches = rawToolResults.map((raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return { source: "error", results: [] };
    }
  });

  return {
    failed: searches.filter((search) => search.source === "error").length,
    results: searches.reduce((count, search) => count + (search.results?.length || 0), 0),
  };
}

// The number of confirmed-real citations the first pass found, below which
// a retry is worth the extra call. Tried gating this on raw Tavily result
// *count* first — that failed empirically: a deliberately obscure test idea
// ("artisanal saffron cooperatives in Kashmir") still got 27 total results,
// because Tavily returns plausible-looking filler for almost any query
// rather than coming back empty. Result count measures whether search ran,
// not whether it found anything relevant. Verified-citation count measures
// the thing that actually matters: could the model, and can we confirm,
// point to real evidence — so it's what gates the retry instead.
const MIN_VERIFIED_CITATIONS = 2;

async function synthesizeMarketValidation(idea, painRaw, seekingRaw, demandRaw) {
  const parsed = await structured(marketValidationSchema, "market_validation").invoke([
    {
      role: "system",
      content: `You are a tough startup advisor evaluating problem-solution fit and market demand.
Analyze the provided web search signals (pain points, solution-seeking behavior, and market demand).
Do not make up data — every quote and source must come directly from the evidence given.`,
    },
    {
      role: "user",
      content: `Evaluate market validation for: "${idea}"

REAL WEB SEARCH EVIDENCE:
--- PAIN SIGNALS ---
${painRaw}

--- SOLUTION SEEKING ---
${seekingRaw}

--- MARKET DEMAND ---
${demandRaw}

Default context: India. Base your analysis completely on this real evidence.`,
    },
  ]);

  const knownUrls = extractUrls(painRaw, seekingRaw, demandRaw);
  parsed.evidence = verifyEvidence(parsed.evidence, knownUrls);
  return parsed;
}

// Confidence-gated retry for Stage 1 only: it's the stage everything else
// depends on, and the one most exposed to a niche/jargon-heavy idea simply
// not matching how people phrase things on the open web. If the first
// synthesis pass can't back up more than a citation or two, this asks the
// model for one broader rephrasing, searches again with it, merges both
// rounds of evidence, and re-synthesizes once — rather than shipping a
// verdict the model itself had almost nothing real to support.
async function gatherAndSynthesizeMarketValidation(idea, painRaw, seekingRaw, demandRaw) {
  const initialSearch = searchStatus(painRaw, seekingRaw, demandRaw);
  if (initialSearch.failed === 3) {
    return {
      error: "Live research is temporarily unavailable. No market verdict was generated.",
    };
  }

  const first = await synthesizeMarketValidation(idea, painRaw, seekingRaw, demandRaw);
  const firstYield = countVerifiedCitations(first);

  if (initialSearch.results === 0) {
    first.researchNote = "The search completed but did not return usable public evidence for this idea. Treat this as an inconclusive result, not a negative verdict.";
    return first;
  }

  if (firstYield >= MIN_VERIFIED_CITATIONS) {
    first.researchNote = initialSearch.failed
      ? `${initialSearch.failed} of 3 research sources did not respond, so this verdict is based on partial evidence.`
      : null;
    return first;
  }

  console.log(
    `⚠️  Only ${firstYield} verified citation(s) for "${idea}" — broadening and re-searching once...`
  );

  try {
    const { broaderPhrase } = await structured(broadenQuerySchema, "broaden_query").invoke([
      {
        role: "system",
        content:
          "Web search for the given startup idea returned little the model could confirm as real evidence. Propose a broader rephrasing likely to surface more real web discussion.",
      },
      { role: "user", content: `Idea: ${idea}` },
    ]);

    const [painRaw2, seekingRaw2, demandRaw2] = await Promise.all([
      painSignalsTool.func(broaderPhrase),
      solutionSeekingTool.func(broaderPhrase),
      searchDemandTool.func(broaderPhrase),
    ]);

    const retry = await synthesizeMarketValidation(
      idea,
      mergeRawResults(painRaw, painRaw2),
      mergeRawResults(seekingRaw, seekingRaw2),
      mergeRawResults(demandRaw, demandRaw2)
    );
    const retryYield = countVerifiedCitations(retry);

    if (retryYield > firstYield) {
      retry.researchNote = `Initial search surfaced only ${firstYield} verifiable citation(s), so a broader search for "${broaderPhrase}" was run and merged in — found ${retryYield}.`;
      return retry;
    }

    first.researchNote = `Initial search surfaced only ${firstYield} verifiable citation(s). A broader search for "${broaderPhrase}" was tried but didn't add more — showing the original result.`;
    return first;
  } catch (e) {
    console.error("  ❌ Broadening retry failed, keeping the original result:", e.message);
    first.researchNote = null;
    return first;
  }
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

  // 2. Synthesize using the LLM — retries once with broader evidence if the
  // first pass can't back itself up (see gatherAndSynthesizeMarketValidation)
  try {
    const parsed = await gatherAndSynthesizeMarketValidation(
      state.idea,
      painRaw,
      seekingRaw,
      demandRaw
    );
    return { ...state, marketValidation: parsed };
  } catch (e) {
    return { ...state, marketValidation: { error: e.message } };
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
  try {
    const parsed = await structured(competitorsSchema, "competitive_landscape").invoke([
      {
        role: "system",
        content: `You conduct competitive due diligence. Analyze the real web search data for existing tools, competitors, and manual workarounds.

List every competitor confirmed in the search evidence below. You may also name additional real companies you are genuinely confident compete in this exact space, even if the search evidence didn't happen to surface them — search results sometimes under-index a real competitor that markets itself with different vocabulary than this vertical's usual terms (e.g. a horizontal AI platform that also sells into this space but doesn't brand around it). Only add a company this way if you are highly confident it is real and actually competes here; never invent one you are not sure exists.`,
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

Default context: India. Base analysis on real companies and specific workarounds found in the data.`,
      },
    ]);

    const competitorEvidenceText = extractText(competitorRaw, workaroundRaw);
    parsed.directCompetitors = tagByName(parsed.directCompetitors, competitorEvidenceText);

    return { ...state, competitors: parsed };
  } catch (e) {
    return { ...state, competitors: { error: e.message } };
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
  try {
    const parsed = await structured(gtmStrategySchema, "gtm_strategy").invoke([
      {
        role: "system",
        content: `You are a go-to-market strategist. Create a launch plan explicitly targeting the real communities found in the web search.`,
      },
      {
        role: "user",
        content: `Create a GTM plan for: "${state.idea}"

MARKET VALIDATION (Step 1):
${context(state.marketValidation)}

COMPETITIVE LANDSCAPE (Step 2):
${context(state.competitors)}

REAL WEB SEARCH EVIDENCE:
--- EARLY USER COMMUNITIES ---
${communityRaw}

Focus on Indian/global market context.`,
      },
    ]);

    const communityEvidenceText = extractText(communityRaw);
    parsed.earlyUserCommunities = tagByName(parsed.earlyUserCommunities, communityEvidenceText);

    return { ...state, gtmStrategy: parsed };
  } catch (e) {
    return { ...state, gtmStrategy: { error: e.message } };
  }
}

// ─── STEP 4: RISK ASSESSMENT ────────────────────────────────────────────────
// Pure LLM Analysis based on upstream steps
async function riskNode(state) {
  console.log("⚠️ Step 4/5: Startup Mortality Analysis...");

  try {
    const parsed = await structured(risksSchema, "risk_assessment").invoke([
      {
        role: "system",
        content: `You are a startup forensics expert. Based on the gathered market, competitor, and GTM data, identify exact failure modes.`,
      },
      {
        role: "user",
        content: `Conduct mortality analysis for: "${state.idea}"

MARKET VALIDATION (Step 1):
${context(state.marketValidation)}

COMPETITIVE LANDSCAPE (Step 2):
${context(state.competitors)}

GTM STRATEGY (Step 3):
${context(state.gtmStrategy)}

Be brutally honest about failure probability given the competitive landscape.`,
      },
    ]);

    return { ...state, risks: parsed };
  } catch (e) {
    return { ...state, risks: { error: e.message } };
  }
}

// ─── STEP 5: EXECUTION PLAN (Checklist + Pitch Deck) ────────────────────────
// Pure LLM Synthesis
async function executionNode(state) {
  console.log("✅ Step 5/5: Creating Execution Plan & Pitch Deck...");

  try {
    const parsed = await structured(executionPlanSchema, "execution_plan").invoke([
      {
        role: "system",
        content: `You are an execution coach. Synthesize all the research into an actionable checklist AND a 6-slide investor pitch deck narrative.

The pitch deck must have exactly 6 slides, in this order, each using only the
content fields relevant to it and nulling the rest:
  1. Problem            — content.headline, content.details, content.scale
  2. Solution & Value Prop — content.headline, content.howItWorks, content.uniqueInsight
  3. Market Size & Timing   — content.tam, content.whyNow, content.growthTrend
  4. Competition & Moat     — content.landscape, content.differentiation, content.defensibility
  5. Go-to-Market & Traction — content.initialTarget, content.distribution, content.currentStatus
  6. Business Model & Ask    — content.revenue, content.runway, content.nextRound`,
      },
      {
        role: "user",
        content: `Create the final execution plan and deck for: "${state.idea}"

MARKET VALIDATION (Step 1):
${context(state.marketValidation)}

COMPETITIVE LANDSCAPE (Step 2):
${context(state.competitors)}

GTM STRATEGY (Step 3):
${context(state.gtmStrategy)}

RISK ANALYSIS (Step 4):
${context(state.risks)}

Make the pitch deck compelling and the checklist highly actionable.`,
      },
    ]);

    return { ...state, executionPlan: parsed };
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
