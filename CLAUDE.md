# CLAUDE.md — JustExecute (startup-copilot)

Context file for AI agents and new contributors. **Read this before opening source files.**
Keep it current: if you change architecture, env vars, or a documented invariant, update it
in the same commit.

---

## 1. What this is

A startup-idea validation tool. A user submits a one-line idea; the backend runs a 5-stage
research pipeline (real web search + LLM synthesis at each stage) and returns structured JSON
covering market validation, competitive landscape, go-to-market, risk analysis, a 90-day
execution checklist, and a 6-slide investor pitch deck. Progress streams to the browser live
over SSE. Default market context is **India** (hardcoded into prompts).

---

## 2. Stack

| Layer | Technology |
|---|---|
| Runtime | **Node ≥22** (required by `@langchain/openai`), ESM (`"type": "module"`) |
| Backend | Express 4, LangChain 1.x, LangGraph 1.2 |
| LLM | **OpenAI `gpt-5.6`** via `@langchain/openai` (Groq retained as fallback provider) |
| Search | Tavily (`@tavily/core`) |
| Frontend | React 19, Vite 7, React Router 7 |
| Auth / DB | Supabase (JWT verification + `users` table for quotas) |
| Deploy | Backend → Render (`render.yaml`); Frontend → Vercel |

**There is no Python in this repo.** Do not look for a virtualenv, `requirements.txt`, or a
WSGI/ASGI server. Express binds its own socket via `app.listen()` — there is no uvicorn/
gunicorn equivalent because Node's HTTP server is built into the runtime.

---

## 3. Running locally

Two processes, two terminals. Start the backend first.

```bash
cd backend  && npm install && npm run dev   # :3001 — node --watch (native reloader)
cd frontend && npm install && npm run dev   # :3000 — vite
```

`npm run dev` is only an alias defined in `scripts`; it expands to `node --watch src/index.js`.

**Install caveat:** `backend/.npmrc` sets `legacy-peer-deps=true`. This silently suppresses
peer-dependency resolution — it has already caused one broken install (see §9.3). After adding
any `@langchain/*` package, verify the import graph actually loads:

```bash
node --input-type=module -e "import('./src/agents/startupAgent.js').then(()=>console.log('OK'))"
```

Health check: `curl http://localhost:3001` → `{"status":"ok","message":"JustExecute API"}`.

---

## 4. Repository layout

```
backend/src/
  index.js                       Express app, all 6 routes, SSE handler, error mapper. app.listen() at the bottom.
  config/models.js               ★ Provider factory. THE ONLY PLACE a chat model is constructed.
  middleware/auth.js             requireAuth — Supabase JWT → req.user; quota enforcement; guest bypass.
  lib/supabaseClient.js          Service-role Supabase client (module-level singleton).
  agents/
    startupAgent.js              ★ PRIMARY PIPELINE. 5 nodes + runAgentWithProgress() used by SSE.
    validationAgent.js           Alternate, deeper validation agent (temperature 0.3).
    toolAgent.js                 Tool-calling agent via .bindTools().
  tools/
    validationSearchTools.js     6 Tavily DynamicTools used by startupAgent/validationAgent.
    searchTools.js               2 simpler tools (competitor, market size) used by toolAgent.
  services/
    llm.js                       Single-shot, non-agentic analysis for /api/analyze.
    googleSlides.js              Converts the generated pitch deck into a Google Slides deck.

frontend/src/
  main.jsx                       Root render. React.StrictMode is ON (effects double-fire in dev).
  App.jsx                        Supabase session listener; routes.
  index.css                      ★ THE ENTIRE DESIGN SYSTEM. Tokens in :root, then components.
                                 Paper/ink palette, hairline rules, no gradients/shadows/glows.
                                 Colour is reserved for demand verdicts and risk levels only.
                                 Icons come from lucide-react — do not reintroduce emoji as UI.
  pages/Home.jsx                 Main screen. handleAnalyze() branches: SSE for 'agent', fetch otherwise.
                                 STEPS is the single source of truth for the 5 stage names, shared
                                 by the landing explainer and the live progress list.
  services/api.js                analyzeIdea() (POST/fetch) + analyzeIdeaWithProgress() (EventSource).
  components/                    IdeaForm, AnalysisResults
  lib/supabaseClient.js          Anon-key browser client.
```

---

## 5. HTTP API

All routes are `requireAuth`-protected **except** `GET /` and `POST /api/create-slides`.

| Method | Route | Handler | Notes |
|---|---|---|---|
| GET | `/` | inline | Health check |
| POST | `/api/analyze` | `services/llm.js` | One LLM call, no search |
| POST | `/api/agent` | `startupAgent` | Full pipeline, blocking, returns once |
| GET | `/api/agent/stream` | `startupAgent` | **SSE**, powers "Deep Research (5 Steps)" |
| POST | `/api/tools` | `toolAgent` | Tool-calling loop |
| POST | `/api/create-slides` | `googleSlides.js` | ⚠️ **unauthenticated** — known gap |

### SSE contract (`GET /api/agent/stream`)

Query params: `idea` (URL-encoded), `token`. Emits `data:`-prefixed JSON frames:

```jsonc
{ "type": "progress", "step": 1, "name": "Market Validation", "total": 5 }
{ "type": "complete", "result": { /* full state object */ } }
{ "type": "error",    "message": "user-safe string" }
```

The server calls `res.flushHeaders()` **immediately**, so a `200 OK` arrives long before any
work is done. The connection then stays open for the whole analysis (tens of seconds). A
request sitting "pending" in DevTools is the normal, healthy state — not a hang.

Both `idea` and `token` travel in the **query string** because the browser `EventSource` API
only issues a bare `GET` and cannot set request headers. `middleware/auth.js` explicitly falls
back to `req.query.token` for this reason.

---

## 6. The 5-stage pipeline (`agents/startupAgent.js`)

Strictly sequential; each stage reads the accumulated `state` produced by earlier stages.

| # | Node | Tavily calls | Consumes from state | Produces |
|---|---|---|---|---|
| 1 | `marketValidationNode` | 3 (pain, solution-seeking, demand) | — | `marketValidation` |
| 2 | `competitorNode` | 2 (competitors, workarounds) | `marketValidation.demandScore` | `competitors` |
| 3 | `gtmNode` | 1 (early-user channels) | `marketValidation.summary`, `competitors.marketGap` | `gtmStrategy` |
| 4 | `riskNode` | 0 | stages 1–3 | `risks` |
| 5 | `executionNode` | 0 | stages 1–4 | `executionPlan` (checklist + 6 pitch slides) |

Cost per full run: **5 LLM calls + 6 Tavily tool invocations** (each tool internally issues
2–3 separate Tavily queries, so ~15 search requests total).

### Two execution paths — important

`createStartupAgent()` compiles a genuine LangGraph `StateGraph` with the nodes wired
1→2→3→4→5→END. **The SSE path does not use it.** `runAgentWithProgress()` invokes the same
five node functions manually in sequence so it can fire an `onProgress` callback between them.
If you add or reorder a stage, you must update **both** the graph edges and
`runAgentWithProgress()`, or they will silently diverge.

### Output parsing

Each node prompts for raw JSON, then runs `cleanJson()` (strips ``` / ```json fences) and
`JSON.parse()`. There is **no schema validation**. A parse failure is caught and written into
state as `{ error, raw }`, so a malformed response degrades that one section to empty in the
UI rather than throwing. Consider OpenAI structured outputs / `response_format` to harden this.

---

## 7. LLM provider configuration (`config/models.js`)

Every chat model in the app is built by `createChatModel({ temperature })`. No agent file
constructs a client directly — this is deliberate, so a provider or model change is a one-file
edit. Temperatures in use: `0.7` (startupAgent, toolAgent, llm) and `0.3` (validationAgent).

| Env var | Default | Purpose |
|---|---|---|
| `LLM_PROVIDER` | `openai` | `openai` or `groq` |
| `OPENAI_API_KEY` | — | Required when provider is `openai`; factory throws if absent |
| `OPENAI_MODEL` | `gpt-5.6` | `gpt-5.6` (flagship) / `-terra` (balanced) / `-luna` (cheapest) |
| `GROQ_API_KEY` | — | Required when provider is `groq` |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq-hosted open-weight model |
| `LLM_DISABLE_TEMPERATURE` | `false` | Force-omit `temperature`; auto-detected for `gpt-5*`/`o*` |

### `temperature` is not universally supported — verified

`gpt-5.6` **rejects an explicit `temperature`**:

```
400 Unsupported value: 'temperature' does not support 0.7 with this model.
    Only the default (1) value is supported.
```

`createChatModel()` therefore omits the parameter automatically when the provider is `openai`
and the model matches `/^(gpt-5|o\d)/`. The per-call `temperature` arguments in the agents
(`0.7` / `0.3`) are consequently **inert on GPT-5 models** — they take effect again if you
switch to Groq or an older OpenAI model. If a future model rejects it too, set
`LLM_DISABLE_TEMPERATURE=true` rather than editing agent code.

> **Naming trap:** `openai/gpt-oss-120b` is an *open-weight* model **hosted by Groq**. The
> `openai/` prefix is a namespace in Groq's catalog, not a routing instruction. It authenticates
> with `GROQ_API_KEY` and never touches the OpenAI API.

---

## 8. Environment variables

**`backend/.env`** (gitignored — never commit; `.env.example` is the tracked template):
`LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`,
`LLM_DISABLE_TEMPERATURE`, `TAVILY_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`

**`frontend/.env`**: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

`GOOGLE_API_KEY` is present in `backend/.env` but **read by no code** — vestigial.

---

## 9. Gotchas — read before debugging

### 9.1 The UI hides every real error
`getFriendlyErrorMessage()` in `index.js` pattern-matches only rate limits, API-key failures,
and timeouts. **Everything else collapses to "Something went wrong. Please try again."**
The actual message is printed server-side only, as `Streaming Agent Error:` (`index.js`).
**Always check the backend terminal before theorising.**

### 9.2 An unhandled agent exception is always the LLM call
This narrows debugging enormously:
- All 6 Tavily tools wrap their bodies in try/catch and return `{source:"error"}` — they
  **cannot** throw.
- Every `JSON.parse` is wrapped and degrades to `{error, raw}` — it **cannot** throw.
- `incrementUsage()` swallows its own DB errors.

The only unguarded `await`s in the whole request path are the five `getModel().invoke()` calls.
If the pipeline throws, the LLM provider rejected the request.

### 9.3 Peer dependencies are silently unenforced
`.npmrc` has `legacy-peer-deps=true`, so npm installs mismatched peers without complaint.
This produced a runtime-only failure — `@langchain/openai@1.5.11` requires
`@langchain/core ^1.2.9`, but `1.1.29` was installed, and the mismatch surfaced as
`Package subpath './utils/gateway' is not defined by "exports"` at import time, not install
time. Verify imports after any LangChain install.

### 9.4 dotenv + ESM initialisation order
`index.js` calls `dotenv.config()` at line 10, but **ESM imports are fully evaluated before the
importing module's body runs.** Any module that reads `process.env` at *module scope* must call
`dotenv.config()` itself. `config/models.js` and `lib/supabaseClient.js` both do. Reading env
lazily *inside a function* (as the agents do for API keys) is safe either way.

### 9.5 Model IDs get decommissioned — plan for it
Groq shut down `meta-llama/llama-4-scout-17b-16e-instruct` on **2026-07-17**, which broke every
LLM call in this app with a generic error (see §9.1) and took real debugging to find. The model
ID is now centralised in `config/models.js` and env-overridable so the next one is a config
change. Pin deliberately; check provider deprecation pages when calls start failing wholesale.

### 9.6 Supabase misconfiguration fails silently and misleadingly
`lib/supabaseClient.js` falls back to `'placeholder-key'` when `SUPABASE_SERVICE_ROLE_KEY` is
absent. `createClient()` validates nothing, so the process boots and passes health checks; the
failure appears later as `401 Invalid or expired token` on every request — blaming the user's
session rather than the config. Prefer failing loudly at boot.

### 9.7 Guest mode masks broken auth
`requireAuth` short-circuits on `token === 'guest'` **before** any Supabase call, assigning a
synthetic user. The guest flow therefore works perfectly even when Supabase is entirely
misconfigured. A smoke test of the deployed site can pass while every logged-in user is broken.
Free-tier quota is `MAX_FREE_CALLS = 10`, tracked in the `users` table.

### 9.8 Auth tokens leak into URLs
Because of the `EventSource` limitation (§5), a live Supabase JWT is placed in the query string
for streaming requests, where it reaches server access logs, browser history, and `Referer`
headers. Harmless for `guest`; a real exposure for authenticated users. Intended fix: POST to
mint a short-lived stream ticket, then `GET /api/agent/stream?ticket=…`.

### 9.9 The frontend bypasses the Vite proxy
`vite.config.js` defines an `/api` → `:3001` proxy, but `services/api.js` reads `VITE_API_URL`
and calls `http://localhost:3001` **directly**, making every request cross-origin. It only
works because backend CORS is `origin: '*'`. The proxy config is effectively dead code.

---

## 10. Conventions

- **ESM everywhere.** Relative imports must include the `.js` extension.
- **Lazy singletons** for models: `let model = null; function getModel() { if (!model) … }`.
  Keeps construction off the import path so env vars are read after `dotenv` runs.
- **Prompts are inline template literals** in the agent files, each specifying an exact JSON
  shape. Edit the prompt and the consuming frontend component together.
- **Never construct a chat client outside `config/models.js`.**
- **Never commit secrets.** `backend/.env` and `frontend/.env` are gitignored; keep
  `.env.example` updated with placeholders whenever you add a variable.
