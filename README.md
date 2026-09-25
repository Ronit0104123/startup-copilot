# JustExecute

JustExecute is a research assistant for the early, uncomfortable question behind a startup idea: is there enough real-world evidence to spend the next few weeks on it? A user describes the idea, and the app returns a five-part brief covering demand signals, competitors and workarounds, initial distribution, risks, and a practical first-quarter plan.

The product is opinionated about evidence. It is not a market-size calculator and it does not turn a model's confidence into a fact. Search-backed claims are shown with their sources, and results the backend cannot tie back to the retrieved evidence are labelled for caution.

## How it works

The deep-research flow is a five-stage LangGraph pipeline:

1. **Market validation** searches for pain, solution-seeking, and demand signals, then synthesizes a verdict.
2. **Competitive landscape** looks for existing products and the manual workarounds people use instead.
3. **Go-to-market** finds communities where potential early users already gather.
4. **Risk assessment** evaluates the earlier findings for specific failure modes.
5. **Execution plan** turns the research into a checklist and six-slide pitch narrative.

I used a state graph instead of a single LangChain prompt because each step needs a different evidence set and a clear dependency on the prior conclusion. It also makes the live interface honest about where a longer run is spending time: the backend sends SSE progress events after each stage, rather than leaving the user watching an undifferentiated loading state.

Tavily calls are deliberately grouped by research question and made in parallel within a stage. The first stage gets one broader re-query only when the cited-evidence yield is thin; this was more useful than retrying every result-count failure, since a large number of generic results can still be poor evidence. Search outages and empty result sets are surfaced as inconclusive or partial research instead of being silently turned into a confident verdict.

The default research framing is India, while allowing global evidence where the target category is not India-specific.

## Stack

- React + Vite frontend
- Express API with SSE for deep-research progress
- LangGraph / LangChain structured outputs
- Tavily for web research
- Supabase for Google sign-in and usage tracking
- OpenAI by default, with Groq as an environment-configured fallback

## Running locally

Use Node 22 or newer. Install and run each application separately:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

The backend needs `OPENAI_API_KEY` (or `LLM_PROVIDER=groq` and `GROQ_API_KEY`), `TAVILY_API_KEY`, and the Supabase configuration used by the auth middleware. Set `VITE_API_URL` in the frontend when it is not using the local API.

## Tests

The backend uses Node's built-in test runner for fast, dependency-free unit tests around request boundaries:

```bash
cd backend
npm test
```

The current suite covers valid input normalization and invalid, missing, and oversized descriptions. The external LLM, Tavily, and Supabase calls are intentionally not exercised in unit tests; they need credentials and are better covered by a small staging smoke test.

## Limits and failure behaviour

- A description must be a meaningful string under 1,500 characters before a research run starts.
- Provider rate limits, authentication failures, and timeouts return an actionable message to the client.
- A failed Tavily source produces partial-evidence messaging; if all first-stage sources fail, JustExecute does not fabricate a market verdict.
- Search evidence is not investment or market advice. Open the cited sources before making a decision.
