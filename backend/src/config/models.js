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
