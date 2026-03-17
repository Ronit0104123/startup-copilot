import { DynamicTool } from "@langchain/core/tools";
import { tavily } from "@tavily/core";

function getTavilyClient() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY });
}

/**
 * Searches Reddit, forums, and discussion boards for complaints and
 * frustration language around a given problem.
 */
export const painSignalsTool = new DynamicTool({
  name: "search_pain_signals",
  description:
    "Search for complaints, frustrations, and pain points about a problem on Reddit, forums, and discussion boards. Input should be the problem description as a string.",
  func: async (input) => {
    const query =
      typeof input === "string"
        ? input
        : input.query || input.idea || JSON.stringify(input);
    console.log(`🔍 Searching pain signals for: ${query}`);

    try {
      const client = getTavilyClient();
      const queries = [
        `"${query}" complaints frustration reddit India`,
        `"${query}" problem hate annoying forum India`,
      ];

      let allResults = [];
      for (const q of queries) {
        const response = await client.search(q, { maxResults: 5 });
        allResults.push(
          ...response.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content?.substring(0, 300),
          }))
        );
      }

      // Deduplicate by URL
      const seen = new Set();
      allResults = allResults.filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

      console.log(`  ✅ Found ${allResults.length} pain signal results`);
      return JSON.stringify({ query, results: allResults, source: "tavily" });
    } catch (error) {
      console.error(`  ❌ Pain signals search error: ${error.message}`);
      return JSON.stringify({
        query,
        results: [],
        source: "error",
        error: error.message,
      });
    }
  },
});

/**
 * Detects posts where people actively ask for solutions:
 * "is there a tool for X", "what's the best software for X", etc.
 */
export const solutionSeekingTool = new DynamicTool({
  name: "search_solution_seeking",
  description:
    "Search for posts where people ask for tools or solutions to a problem. Input should be the problem/category as a string.",
  func: async (input) => {
    const query =
      typeof input === "string"
        ? input
        : input.query || input.idea || JSON.stringify(input);
    console.log(`🔍 Searching solution-seeking signals for: ${query}`);

    try {
      const client = getTavilyClient();
      const queries = [
        `"is there a tool for" ${query} India`,
        `"best software for" OR "best app for" ${query} India`,
        `"looking for a tool" OR "need a solution" ${query} reddit India`,
      ];

      let allResults = [];
      for (const q of queries) {
        const response = await client.search(q, { maxResults: 4 });
        allResults.push(
          ...response.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content?.substring(0, 300),
          }))
        );
      }

      const seen = new Set();
      allResults = allResults.filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

      console.log(
        `  ✅ Found ${allResults.length} solution-seeking results`
      );
      return JSON.stringify({ query, results: allResults, source: "tavily" });
    } catch (error) {
      console.error(
        `  ❌ Solution-seeking search error: ${error.message}`
      );
      return JSON.stringify({
        query,
        results: [],
        source: "error",
        error: error.message,
      });
    }
  },
});

/**
 * Identifies if users solve the problem with spreadsheets, manual workflows,
 * scripts, or hacks — signals unmet demand.
 */
export const workaroundDetectionTool = new DynamicTool({
  name: "search_workarounds",
  description:
    "Search for workarounds people use for a problem — spreadsheets, manual processes, scripts, hacks. Input should be the problem/category as a string.",
  func: async (input) => {
    const query =
      typeof input === "string"
        ? input
        : input.query || input.idea || JSON.stringify(input);
    console.log(`🔍 Searching workarounds for: ${query}`);

    try {
      const client = getTavilyClient();
      const queries = [
        `${query} spreadsheet template workaround India`,
        `${query} manual process hack script automation India`,
        `${query} "I built" OR "I use" OR "my workflow" reddit India`,
      ];

      let allResults = [];
      for (const q of queries) {
        const response = await client.search(q, { maxResults: 4 });
        allResults.push(
          ...response.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content?.substring(0, 300),
          }))
        );
      }

      const seen = new Set();
      allResults = allResults.filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

      console.log(`  ✅ Found ${allResults.length} workaround results`);
      return JSON.stringify({ query, results: allResults, source: "tavily" });
    } catch (error) {
      console.error(`  ❌ Workaround search error: ${error.message}`);
      return JSON.stringify({
        query,
        results: [],
        source: "error",
        error: error.message,
      });
    }
  },
});

/**
 * Finds existing tools/products solving the same problem and checks for
 * pricing pages or monetization signals (= paying customers exist).
 */
export const competitorSignalsTool = new DynamicTool({
  name: "search_competitor_signals",
  description:
    "Search for existing competitors, their pricing, and paying customers. Input should be the product category as a string.",
  func: async (input) => {
    const query =
      typeof input === "string"
        ? input
        : input.query || input.idea || JSON.stringify(input);
    console.log(`🔍 Searching competitor signals for: ${query}`);

    try {
      const client = getTavilyClient();
      const queries = [
        `${query} tool software pricing plans India`,
        `${query} alternatives comparison review 2025 India`,
        `${query} startup funding raised India`,
      ];

      let allResults = [];
      for (const q of queries) {
        const response = await client.search(q, { maxResults: 5 });
        allResults.push(
          ...response.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content?.substring(0, 300),
          }))
        );
      }

      const seen = new Set();
      allResults = allResults.filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

      console.log(`  ✅ Found ${allResults.length} competitor results`);
      return JSON.stringify({ query, results: allResults, source: "tavily" });
    } catch (error) {
      console.error(`  ❌ Competitor search error: ${error.message}`);
      return JSON.stringify({
        query,
        results: [],
        source: "error",
        error: error.message,
      });
    }
  },
});

/**
 * Retrieves search queries / trends related to the problem to estimate
 * how many people are actively looking for solutions.
 */
export const searchDemandTool = new DynamicTool({
  name: "search_demand_signals",
  description:
    "Search for market demand indicators, search trends, and volume statistics related to a problem. Input should be the problem/category as a string.",
  func: async (input) => {
    const query =
      typeof input === "string"
        ? input
        : input.query || input.idea || JSON.stringify(input);
    console.log(`🔍 Searching demand signals for: ${query}`);

    try {
      const client = getTavilyClient();
      const queries = [
        `${query} market size growth statistics 2024 2025 India`,
        `${query} search trends google trends demand India`,
        `${query} industry report market research India`,
      ];

      let allResults = [];
      for (const q of queries) {
        const response = await client.search(q, { maxResults: 4 });
        allResults.push(
          ...response.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content?.substring(0, 300),
          }))
        );
      }

      const seen = new Set();
      allResults = allResults.filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

      console.log(`  ✅ Found ${allResults.length} demand signal results`);
      return JSON.stringify({ query, results: allResults, source: "tavily" });
    } catch (error) {
      console.error(`  ❌ Demand search error: ${error.message}`);
      return JSON.stringify({
        query,
        results: [],
        source: "error",
        error: error.message,
      });
    }
  },
});

/**
 * Identifies communities where early users for this type of product
 * already gather — subreddits, forums, Slack/Discord groups, etc.
 */
export const earlyUserChannelsTool = new DynamicTool({
  name: "search_early_user_channels",
  description:
    "Search for communities, subreddits, forums, and groups where potential early users gather. Input should be the problem/category as a string.",
  func: async (input) => {
    const query =
      typeof input === "string"
        ? input
        : input.query || input.idea || JSON.stringify(input);
    console.log(`🔍 Searching early user channels for: ${query}`);

    try {
      const client = getTavilyClient();
      const queries = [
        `${query} subreddit reddit community India`,
        `${query} forum community slack discord group India`,
        `${query} facebook group whatsapp linkedin community India`,
      ];

      let allResults = [];
      for (const q of queries) {
        const response = await client.search(q, { maxResults: 4 });
        allResults.push(
          ...response.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content?.substring(0, 300),
          }))
        );
      }

      const seen = new Set();
      allResults = allResults.filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

      console.log(`  ✅ Found ${allResults.length} community results`);
      return JSON.stringify({ query, results: allResults, source: "tavily" });
    } catch (error) {
      console.error(`  ❌ Community search error: ${error.message}`);
      return JSON.stringify({
        query,
        results: [],
        source: "error",
        error: error.message,
      });
    }
  },
});
