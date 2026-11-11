import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";

// dotenv.config() must run HERE, not rely on index.js: ESM imports are fully
// evaluated before the importing module's body executes, so index.js's own
// dotenv.config() has not run at the time this module is initialised.
dotenv.config();

export const LLM_PROVIDER = (process.env.LLM_PROVIDER || "openai").toLowerCase();

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6";

// Groq retained as a fallback provider. Note: Groq decommissioned
// meta-llama/llama-4-scout-17b-16e-instruct on 2026-07-17, which is what
// originally broke every LLM call in this app.
export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export const ACTIVE_MODEL =
  LLM_PROVIDER === "groq" ? GROQ_MODEL : OPENAI_MODEL;

// The GPT-5 family rejects an explicit `temperature` outright:
//   400 Unsupported value: 'temperature' does not support 0.7 with this model.
//   Only the default (1) value is supported.
// So the param is omitted automatically for those models. LLM_DISABLE_TEMPERATURE
// forces omission for any other model that turns out to behave the same way.
const FORCE_OMIT =
  String(process.env.LLM_DISABLE_TEMPERATURE).toLowerCase() === "true";

function omitTemperature(provider, modelId) {
  if (FORCE_OMIT) return true;
  return provider === "openai" && /^(gpt-5|o\d)/.test(modelId);
}

/**
 * Build a chat model. Single construction point for every LLM call in the app,
 * so provider/model changes never require touching agent code.
 *
 * @param {{ temperature?: number }} opts
 * @returns {ChatOpenAI | ChatGroq}
 */
export function createChatModel({ temperature = 0.7 } = {}) {
  const tempOpt = omitTemperature(LLM_PROVIDER, ACTIVE_MODEL)
    ? {}
    : { temperature };

  if (LLM_PROVIDER === "groq") {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set (LLM_PROVIDER=groq)");
    }
    return new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: GROQ_MODEL,
      ...tempOpt,
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to backend/.env (see .env.example)."
    );
  }

  return new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: OPENAI_MODEL,
    ...tempOpt,
  });
}

// ─── Rate-limit-aware retry ────────────────────────────────────────────────
// The hosted providers this app runs on enforce per-minute token budgets
// (Groq's free tier is 8,000 TPM for gpt-oss-120b). A 5-stage deep-research
// run can burst past that window, and the providers answer with a 429 whose
// message names the exact wait ("Please try again in 19.33s"). Until this
// wrapper existed, that 429 was caught by the stage's catch and stored as
// { error }, which the UI rendered as a blank tab. Now we wait out the
// window the provider itself specifies and retry, so a busy minute slows the
// run down instead of silently dropping stages.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseRetryAfterMs(message) {
  const m = /try again in\s+([\d.]+)\s*(ms|s|m)\b/i.exec(message || "");
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  return unit === "ms" ? n : unit === "m" ? n * 60000 : n * 1000;
}

/**
 * Invoke a chat model / structured-output runnable with retries for
 * transient failures: 429 rate limits (waiting the provider-suggested
 * delay), 5xx, and network resets. Permanent errors (4xx other than 429)
 * are thrown immediately.
 *
 * @param {{ invoke: Function }} runnable
 * @param {any} messages
 * @param {{ maxAttempts?: number }} opts
 */
export async function invokeWithRetry(runnable, messages, { maxAttempts = 5 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await runnable.invoke(messages);
    } catch (e) {
      const msg = String(e?.message || e);
      const status = e?.status ?? e?.statusCode;
      const rateLimited =
        status === 429 || msg.startsWith("429") || /rate.?limit/i.test(msg);
      const serverError = typeof status === "number" && status >= 500;
      const network = /ECONNRESET|ETIMEDOUT|fetch failed|socket hang up/i.test(msg);

      if ((!rateLimited && !serverError && !network) || attempt >= maxAttempts) {
        throw e;
      }

      const suggested = parseRetryAfterMs(msg);
      // Cap at 70s: per-minute windows always free up within a minute.
      const wait = Math.min(
        (suggested ?? Math.min(15000 * attempt, 45000)) + 1500,
        70000
      );
      console.warn(
        `⏳ LLM call failed (attempt ${attempt}/${maxAttempts}): ${
          rateLimited ? "provider rate limit" : msg.slice(0, 120)
        }. Retrying in ${Math.round(wait / 1000)}s...`
      );
      await sleep(wait);
    }
  }
}
