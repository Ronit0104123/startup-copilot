import { StateGraph, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";

const graphState = {
  idea: null,
  analysis: null,
  competitors: null,
  gtmPlan: null,
  pitchDeck: null,
  riskAssessment: null,
  checklist: null,
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

async function analyzeNode(state) {
  console.log("🔍 Conducting rigorous startup analysis...");
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are an experienced startup advisor applying the most rigorous evaluation criteria. Be brutally honest about market reality and startup viability.

EVALUATION FRAMEWORK:
1. PROBLEM-SOLUTION FIT: Does this solve a real, painful problem for a significant market?
2. MARKET OPPORTUNITY: Is the Total Addressable Market substantial and growing?
3. TIMING: Why now? What has changed to make this viable today?
4. EXECUTION FEASIBILITY: Can this be built and scaled with available resources?
5. COMPETITIVE ADVANTAGE: What prevents competitors from easily replicating this?
6. BUSINESS MODEL: Clear, proven revenue model with sustainable unit economics?
7. FOUNDER-MARKET FIT: Are founders uniquely positioned to solve this?

MARKET VALIDATION REQUIREMENTS:
- Evidence of people already paying for inferior solutions
- Clear distinction between "nice-to-have" vs "must-have"
- Ability to find paying customers quickly
- Proven willingness to pay at target price points

COMPETITIVE LANDSCAPE ANALYSIS:
- Thorough analysis of direct/indirect competitors
- Understanding why similar attempts failed
- Identification of market gaps and defensible positioning

Apply startup mortality statistics: 90% fail. Be extremely critical but constructive.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation, no code blocks.

Use exactly this structure:
{
  "summary": "One sentence brutal but fair assessment",
  "marketAnalysis": {
    "tamSize": "Market size with specific data and growth metrics", 
    "timingAnalysis": "Why this timing makes sense or doesn't",
    "customerPain": "Pain severity (1-10) with supporting evidence",
    "monetizationEvidence": "Current payment behavior in this market"
  },
  "competitiveReality": {
    "majorThreats": "Biggest competitive threats and timeline",
    "failurePatterns": "Why similar startups typically fail here", 
    "defensibilityScore": "How defensible this is (1-10) and why"
  },
  "businessViability": {
    "revenueModel": "Revenue clarity and validation status",
    "unitEconomics": "Customer acquisition vs lifetime value reality",
    "scalingChallenges": "Primary obstacles to 10x growth"
  },
  "verdict": "GO" or "NO-GO" or "PIVOT-REQUIRED",
  "verdictReason": "Specific data-driven reason for this verdict",
  "strengths": ["Real, validated strengths only"],
  "challenges": ["Critical challenges that must be solved"],
  "nextSteps": ["Specific validation steps needed immediately"]
}`
    },
    {
      role: "user",
      content: `Conduct rigorous startup analysis for: ${state.idea}

Apply Indian market context unless specified otherwise. Focus on data-driven analysis over speculation.`
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
  console.log("🏢 Deep competitive intelligence...");
  
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a YC partner conducting competitive due diligence. Uncover the brutal competitive reality that will determine this startup's fate.

COMPETITIVE INTELLIGENCE FRAMEWORK:
1. MARKET LEADERS: Who owns this space and why?
2. FAILED ATTEMPTS: Which startups tried this and died? Why did they fail?
3. BIG TECH THREAT: When will Google/Meta/Amazon enter and crush everyone?
4. SWITCHING COSTS: What keeps customers locked to existing solutions?
5. NETWORK EFFECTS: Do incumbents get stronger as they grow?
6. DEFENSIBLE MOATS: What sustainable advantages exist?

ANALYSIS DEPTH:
- Research actual companies, not hypothetical ones
- Find specific failure cases and reasons
- Identify exact revenue models competitors use
- Assess war chest sizes and funding advantages
- Map out customer lock-in mechanisms

Be comprehensive and pessimistic. Most markets are harder to penetrate than founders think.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "marketDominance": {
    "leader": "Company that owns this market",
    "marketShare": "Their dominance percentage and why",
    "moatStrength": "How strong their competitive moat is (1-10)"
  },
  "directCompetitors": [
    {
      "name": "Company Name", 
      "description": "What they do exactly",
      "funding": "$X million raised, Series Y",
      "strengths": "Their key advantages",
      "weaknesses": "Their exploitable gaps",
      "customerBase": "Who uses them and why"
    }
  ],
  "failedAttempts": [
    {
      "name": "Dead startup name",
      "failureReason": "Why they died specifically",
      "lessonLearned": "What this teaches us"
    }
  ],
  "bigTechThreat": {
    "riskLevel": "HIGH/MEDIUM/LOW", 
    "timeline": "When they'll likely enter the market",
    "preventionStrategy": "How to survive their entry"
  },
  "marketGap": "Specific unaddressed customer pain point",
  "entryStrategy": "How to wedge into this competitive market"
}`
    },
    {
      role: "user",
      content: `Conduct deep competitive analysis for: ${state.idea}

Analysis context: ${JSON.stringify(state.analysis)}

Focus on Indian/global market competitive landscape. Find real companies and real failures.`
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

async function pitchDeckNode(state) {
  console.log("📊 Creating pitch deck...");
  
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a Y Combinator partner creating an investor-ready pitch deck. Create compelling, data-driven content that VCs expect to see.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Create a deck following YC best practices with these exact slides:
{
  "slides": [
    {
      "slideNumber": 1,
      "title": "Problem",
      "content": {
        "headline": "A clear, relatable problem statement",
        "painPoints": ["Specific pain point affecting target users", "Quantified impact of this problem", "Why existing solutions fail"],
        "marketSize": "X people/companies face this problem",
        "urgency": "Why this needs to be solved now"
      }
    },
    {
      "slideNumber": 2,
      "title": "Solution", 
      "content": {
        "headline": "Our unique approach to solving this problem",
        "keyFeatures": ["Core feature that directly addresses pain", "Unique differentiator", "User benefit in measurable terms"],
        "demo": "Brief description of product in action",
        "magicMoment": "The 'aha!' moment users experience"
      }
    },
    {
      "slideNumber": 3,
      "title": "Market Size",
      "content": {
        "tam": "Total addressable market with specific $ figure",
        "sam": "Serviceable addressable market we can realistically target", 
        "som": "Serviceable obtainable market in 5 years",
        "growth": "Market growth rate and key trends driving expansion",
        "timing": "Why now is the right time for this solution"
      }
    },
    {
      "slideNumber": 4,
      "title": "Product",
      "content": {
        "headline": "Product overview and core value",
        "coreFeatures": ["Feature 1: Impact on user", "Feature 2: Competitive advantage", "Feature 3: Scalability factor"],
        "userJourney": "How users discover, try, and adopt our product",
        "technology": "Key technical advantages or IP",
        "roadmap": "Next 6-12 months of product development"
      }
    },
    {
      "slideNumber": 5,
      "title": "Business Model",
      "content": {
        "revenueModel": "Primary revenue stream (SaaS, marketplace, etc.)",
        "pricing": "Pricing strategy with specific numbers",
        "unitEconomics": "LTV:CAC ratio and payback period",
        "revenueStreams": ["Primary revenue (X%)", "Secondary revenue (Y%)", "Future opportunity (Z%)"],
        "scalability": "How revenue scales with growth"
      }
    },
    {
      "slideNumber": 6,
      "title": "Traction",
      "content": {
        "keyMetrics": "Current user/revenue numbers with growth rate",
        "milestones": ["Significant achievement 1", "Key partnership or customer", "Product or market validation"],
        "growth": "Month-over-month or quarter-over-quarter growth",
        "validation": "Evidence of product-market fit or strong signals",
        "projections": "12-18 month realistic projections"
      }
    },
    {
      "slideNumber": 7,
      "title": "Competition",
      "content": {
        "landscape": "Current competitive landscape overview",
        "directCompetitors": ["Competitor 1: Their approach vs ours", "Competitor 2: Their weakness, our strength"],
        "indirectCompetitors": ["Alternative solution users currently use", "Why users will switch to us"],
        "moats": "Our defensible competitive advantages",
        "positioning": "How we win in this market"
      }
    },
    {
      "slideNumber": 8,
      "title": "Go-to-Market",
      "content": {
        "targetCustomer": "Specific ideal customer profile with demographics",
        "acquisition": "Primary customer acquisition channel and cost",
        "salesProcess": "How we convert prospects to customers",
        "channels": ["Channel 1: Expected CAC and conversion", "Channel 2: Scaling strategy", "Channel 3: Future expansion"],
        "partnerships": "Key partnerships that accelerate growth"
      }
    },
    {
      "slideNumber": 9,
      "title": "Team",
      "content": {
        "founders": "Founder backgrounds and why we're uniquely qualified",
        "keyHires": ["Critical hire 1: Role and impact", "Critical hire 2: Expected timeline", "Advisor: Industry expertise"],
        "experience": "Relevant experience solving similar problems",
        "vision": "Shared vision and long-term commitment",
        "culture": "What makes this team special"
      }
    },
    {
      "slideNumber": 10,
      "title": "Funding Ask", 
      "content": {
        "amount": "Specific funding amount (e.g., $2M seed round)",
        "useOfFunds": ["Product development (40%)", "Customer acquisition (35%)", "Team expansion (20%)", "Operations (5%)"],
        "milestones": "What this funding will achieve in 18-24 months",
        "runway": "Expected runway and path to next round or profitability",
        "nextRound": "Series A target: timing, size, and expected valuation"
      }
    }
  ],
  "executivesummary": "One compelling paragraph that captures the opportunity, solution, traction, and ask",
  "appendix": {
    "financials": "Key financial projections summary",
    "customerTestimonials": "Brief quotes from early users/customers",
    "competitiveAnalysis": "Detailed competitive positioning"
  }
}`
    },
    {
      role: "user",
      content: `Create an investor-ready pitch deck for: ${state.idea}

Based on:
- Analysis: ${JSON.stringify(state.analysis)}
- Competitors: ${JSON.stringify(state.competitors)}
- GTM Plan: ${JSON.stringify(state.gtmPlan)}

Make it compelling for VCs with specific numbers, clear differentiation, and realistic projections.`
    }
  ]);
  
  try {
    const cleaned = cleanJson(response.content);
    return { ...state, pitchDeck: JSON.parse(cleaned) };
  } catch (e) {
    return { ...state, pitchDeck: { error: e.message } };
  }
}

async function riskAssessmentNode(state) {
  console.log("⚠️ Startup mortality analysis...");
  
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a startup forensics expert analyzing why 90% of startups fail. Apply brutal realism to identify exact failure modes.

STARTUP GRAVEYARD ANALYSIS:
1. MARKET RISKS: Why customers won't adopt/pay/stay
2. EXECUTION RISKS: Why the team will fail to deliver  
3. COMPETITION RISKS: How incumbents/big tech crush you
4. FUNDING RISKS: Why VCs will pass and money runs out
5. REGULATORY RISKS: How government/compliance kills you
6. TECHNICAL RISKS: Why the product won't work/scale
7. FOUNDER RISKS: Why the team implodes

CRITICAL ASSUMPTIONS TO TEST:
- What MUST be true for this to work?
- What single failure point kills the company?
- What can't be recovered from?

RED FLAG DETECTION:
- Signs this is a "solution looking for a problem"
- Evidence of founder market mismatch  
- Indications of poor unit economics
- Competitive vulnerability signals

BE PESSIMISTIC: Most startups die. Find the most likely death scenarios.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks.

Use exactly this structure:
{
  "mortalityScore": "X/10 (10 = certain death)",
  "primaryDeathRisk": "Most likely way this startup dies",
  "marketRisks": [
    {
      "risk": "Specific market failure mode",
      "probability": "X% chance this happens", 
      "impact": "Company death/major setback/minor issue",
      "mitigation": "How to reduce this risk",
      "testable": "How to validate this assumption"
    }
  ],
  "executionRisks": [
    {
      "risk": "Specific execution failure",
      "probability": "X% based on industry data",
      "impact": "Severity of outcome",
      "mitigation": "Concrete prevention steps",
      "earlyWarning": "Signs this is happening"
    }
  ],
  "competitiveThreats": [
    {
      "threat": "How competitors destroy you",
      "timeline": "When this threat materializes", 
      "defensibility": "How defensible you are (1-10)",
      "response": "Your counter-strategy"
    }
  ],
  "criticalAssumptions": [
    "Must be true for success - if false, company dies",
    "Another make-or-break assumption"
  ],
  "deathSpiral": "Most likely sequence of events leading to failure",
  "survivalStrategy": "How to avoid the startup graveyard"
}`
    },
    {
      role: "user",
      content: `Conduct startup mortality analysis for: ${state.idea}

Context:
- Market Analysis: ${JSON.stringify(state.analysis)}
- Competitive Landscape: ${JSON.stringify(state.competitors)}
- GTM Strategy: ${JSON.stringify(state.gtmPlan)}

Be brutally honest about failure probability and specific death scenarios.`
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
  graph.addNode("pitchDeckStep", pitchDeckNode);
  graph.addNode("riskStep", riskAssessmentNode);
  graph.addNode("checklistStep", checklistNode);

  graph.setEntryPoint("analyzeStep");
  graph.addEdge("analyzeStep", "competitorStep");
  graph.addEdge("competitorStep", "gtmStep");
  graph.addEdge("gtmStep", "pitchDeckStep");
  graph.addEdge("pitchDeckStep", "riskStep");
  graph.addEdge("riskStep", "checklistStep");
  graph.addEdge("checklistStep", END);

  return graph.compile();
}

export async function runAgentWithProgress(idea, onProgress) {
  let state = { idea };
  
  onProgress({ step: 1, name: 'Analysis', total: 6 });
  state = await analyzeNode(state);
  
  onProgress({ step: 2, name: 'Research', total: 6 });
  state = await competitorNode(state);
  
  onProgress({ step: 3, name: 'Strategy', total: 6 });
  state = await gtmNode(state);
  
  onProgress({ step: 4, name: 'Pitch Deck', total: 6 });
  state = await pitchDeckNode(state);
  
  onProgress({ step: 5, name: 'Risks', total: 6 });
  state = await riskAssessmentNode(state);
  
  onProgress({ step: 6, name: 'Action Plan', total: 6 });
  state = await checklistNode(state);
  
  return state;
}