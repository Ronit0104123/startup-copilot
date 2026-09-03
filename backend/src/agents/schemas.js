import { z } from "zod";

// Zod schemas for each of the 5 pipeline stages, used with
// ChatOpenAI#withStructuredOutput() so the model's output is guaranteed to
// match this shape — no more markdown-fence stripping, no more JSON.parse
// failures degrading a stage to { error, raw }.
//
// OpenAI's strict structured-output mode has two hard constraints that
// shaped these schemas (both confirmed against the live API, not assumed):
//   1. Every property must appear in the object's "required" list — there is
//      no such thing as an optional field. A field that the prompt describes
//      as "if found" / "if any" must be modelled as .nullable() and the
//      model told to return null, not omitted.
//   2. Open-ended/dynamic keys (z.record()) are rejected outright — every
//      property name must be spelled out. This is why pitchDeckSlideSchema
//      below lists all 18 possible slide fields (nullable) instead of a
//      free-form content object; each slide only fills in the 2-3 that
//      apply to it and nulls the rest, which the frontend already treats
//      the same as a missing field.

const level = z.enum(["HIGH", "MEDIUM", "LOW"]);

// Used only for the Stage 1 confidence-gated retry: when the first round of
// search comes back thin, this asks for one broader rephrasing of the idea
// to search again with, rather than giving up on that evidence category.
export const broadenQuerySchema = z.object({
  broaderPhrase: z
    .string()
    .describe(
      "A broader, more generic rephrasing of the idea — drop niche/specific qualifiers and use category-level language — chosen to surface more real web discussion than the original phrasing did"
    ),
});

export const marketValidationSchema = z.object({
  demandScore: z.object({
    overallVerdict: z.enum(["Strong Demand", "Moderate Demand", "Weak Demand"]),
    confidenceLevel: level,
    recommendation: z.string().describe("1-2 sentence actionable recommendation based strictly on the evidence"),
  }),
  marketAnalysis: z.object({
    tamSize: z.string().describe("Market size with specific data found, or 'Unknown' if the evidence has none"),
    growthRate: z.string().nullable().describe("Growth data if found in the evidence, else null"),
    customerPain: z.string().describe("Pain severity 1-10 with a short justification, e.g. '7/10 — ...'"),
  }),
  evidence: z.object({
    painSignals: z.array(
      z.object({
        source: z.string().describe("The exact URL this came from, copied verbatim from the evidence given"),
        quote: z.string().describe("An actual complaint found in the evidence — do not invent one"),
        painLevel: level,
      })
    ),
    solutionSeeking: z.array(
      z.object({
        source: z.string().describe("The exact URL this came from, copied verbatim from the evidence given"),
        query: z.string().describe("What people asked for"),
        context: z.string(),
      })
    ),
  }),
  summary: z.string().describe("One sentence, brutal but fair assessment of the market opportunity"),
});

export const competitorsSchema = z.object({
  marketDominance: z.object({
    leader: z.string().nullable().describe("Company that owns this market, or null if there isn't a clear one"),
    marketShare: z.string().describe("Their perceived dominance and why, or empty string if there is no leader"),
    moatStrength: z.string().describe("How strong their competitive moat is, 1-10, or empty string if there is no leader"),
  }),
  directCompetitors: z.array(
    z.object({
      name: z.string().describe("Real company name from the search results"),
      description: z.string().describe("What they do exactly"),
      pricing: z.string().nullable().describe("Pricing or funding data if found, else null"),
      weaknesses: z.string().nullable().describe("Their exploitable gaps if identifiable, else null"),
    })
  ),
  workarounds: z.array(
    z.object({
      method: z.string().describe("How people solve this without a tool, from the search results"),
      painWithWorkaround: z.string().describe("Why the workaround is inadequate"),
    })
  ),
  bigTechThreat: z.object({
    riskLevel: level,
    timeline: z.string().describe("When a large incumbent will likely enter this space"),
    preventionStrategy: z.string().describe("How to survive their entry"),
  }),
  marketGap: z.string().describe("The specific unaddressed customer pain point based on evidence"),
  entryStrategy: z.string().describe("How to wedge into this market"),
});

export const gtmStrategySchema = z.object({
  targetAudience: z.string().describe("Specific description of ideal first customers"),
  valueProposition: z.string().describe("One clear sentence of why customers should choose this"),
  earlyUserCommunities: z.array(
    z.object({
      name: z.string().describe("Real community name from the search results"),
      platform: z.string().describe("e.g. reddit, discord, facebook, forum"),
      relevance: level,
      strategy: z.string().describe("How to specifically acquire users here without spamming"),
    })
  ),
  channels: z.array(
    z.object({
      channel: z.string().describe("Broader channel, e.g. SEO, cold email"),
      strategy: z.string().describe("How to use it"),
      priority: level,
    })
  ),
  launchStrategy: z.string().describe("How to launch in the first 90 days"),
  metrics: z.array(z.string()).describe("Key metrics to track"),
});

export const risksSchema = z.object({
  mortalityScore: z.string().describe("X/10 where 10 = certain death"),
  primaryDeathRisk: z.string().describe("The most likely way this startup dies"),
  marketRisks: z.array(
    z.object({
      risk: z.string().describe("Specific market failure mode"),
      probability: z.string().describe("e.g. '60%'"),
      mitigation: z.string().describe("How to reduce this risk"),
    })
  ),
  executionRisks: z.array(
    z.object({
      risk: z.string().describe("Specific execution failure"),
      probability: z.string().describe("e.g. '60%'"),
      earlyWarning: z.string().describe("Signs this is happening"),
    })
  ),
  competitiveThreats: z.array(
    z.object({
      threat: z.string().describe("How a competitor destroys this business"),
      timeline: z.string().describe("When this happens"),
      response: z.string().describe("Counter-strategy"),
    })
  ),
  criticalAssumptions: z.array(z.string()).describe("Must be true for success — if false, the company dies"),
  deathSpiral: z.string().describe("Most likely sequence of events leading to failure"),
  survivalStrategy: z.string().describe("How to avoid the startup graveyard"),
});

// Every field across all 6 slide types, unioned into one shape. Each slide
// only fills in the 2-3 fields relevant to it and nulls the rest — see the
// file header for why this can't be a dynamic per-slide content object.
const pitchDeckSlideContentSchema = z.object({
  headline: z.string().nullable(),
  details: z.string().nullable(),
  scale: z.string().nullable(),
  howItWorks: z.string().nullable(),
  uniqueInsight: z.string().nullable(),
  tam: z.string().nullable(),
  whyNow: z.string().nullable(),
  growthTrend: z.string().nullable(),
  landscape: z.string().nullable(),
  differentiation: z.string().nullable(),
  defensibility: z.string().nullable(),
  initialTarget: z.string().nullable(),
  distribution: z.string().nullable(),
  currentStatus: z.string().nullable(),
  revenue: z.string().nullable(),
  runway: z.string().nullable(),
  nextRound: z.string().nullable(),
});

const checklistItemSchema = z.object({
  task: z.string(),
  priority: z.enum(["HIGH", "MEDIUM"]),
  category: z.enum(["Build", "Marketing", "Legal"]),
});

export const executionPlanSchema = z.object({
  checklist: z.object({
    week1: z.array(checklistItemSchema),
    week2to4: z.array(checklistItemSchema),
    month2to3: z.array(checklistItemSchema),
  }),
  pitchDeck: z.object({
    slides: z.array(
      z.object({
        slideNumber: z.number(),
        title: z.string(),
        content: pitchDeckSlideContentSchema,
      })
    ),
    executiveSummary: z.string().describe("One compelling paragraph that captures the opportunity"),
  }),
});
