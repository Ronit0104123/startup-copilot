import { ChatGroq } from "@langchain/groq";

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

function cleanJsonResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export async function analyzeIdea(idea) {
  const response = await getModel().invoke([
    {
      role: "system",
      content: `You are a startup advisor. Analyze startup ideas concisely.
      
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
      content: `Analyze this startup idea: ${idea}`
    }
  ]);
  
  try {
    const cleaned = cleanJsonResponse(response.content);
    return JSON.parse(cleaned);
  } catch (e) {
    return { raw: response.content, error: "Failed to parse JSON" };
  }
}