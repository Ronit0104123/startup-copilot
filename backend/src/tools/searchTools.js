import { DynamicTool } from "@langchain/core/tools";
import { tavily } from "@tavily/core";

function getTavilyClient() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY });
}

export const competitorSearchTool = new DynamicTool({
  name: "search_competitors",
  description: "Search the web for competitors of a startup idea. Input should be the startup category or idea as a string.",
  func: async (input) => {
    const query = typeof input === 'string' ? input : (input.query || input.idea || JSON.stringify(input));
    console.log(`🔍 Searching REAL competitors for: ${query}`);
    
    try {
      const client = getTavilyClient();
      const searchQuery = `top competitors in ${query} market startups`;
      const response = await client.search(searchQuery, { maxResults: 5 });
      
      const competitors = response.results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.substring(0, 200) + "..."
      }));
      
      console.log(`  ✅ Found ${competitors.length} real results`);
      
      return JSON.stringify({
        query,
        competitors,
        source: "tavily_web_search"
      });
    } catch (error) {
      console.error(`  ❌ Tavily error: ${error.message}`);
      return JSON.stringify({
        query,
        competitors: ["Error fetching real data - check API key"],
        source: "error",
        error: error.message
      });
    }
  }
});

export const marketSizeTool = new DynamicTool({
  name: "get_market_size",
  description: "Get market size and growth data for an industry. Input should be the industry name as a string.",
  func: async (input) => {
    const industry = typeof input === 'string' ? input : (input.industry || input.query || JSON.stringify(input));
    console.log(`📊 Searching REAL market data for: ${industry}`);
    
    try {
      const client = getTavilyClient();
      const searchQuery = `${industry} market size 2024 2025 growth rate statistics`;
      const response = await client.search(searchQuery, { maxResults: 5 });
      
      const marketData = response.results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.substring(0, 200) + "..."
      }));
      
      console.log(`  ✅ Found ${marketData.length} market research results`);
      
      return JSON.stringify({
        industry,
        searchResults: marketData,
        source: "tavily_web_search"
      });
    } catch (error) {
      console.error(`  ❌ Tavily error: ${error.message}`);
      return JSON.stringify({
        industry,
        marketSize: "Unknown",
        source: "error",
        error: error.message
      });
    }
  }
});