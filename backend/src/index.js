import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeIdea } from './services/llm.js';
import { createStartupAgent, runAgentWithProgress } from './agents/startupAgent.js';
import { runWithTools } from './agents/toolAgent.js';

dotenv.config();

console.log('Groq API Key loaded:', process.env.GROQ_API_KEY ? 'Yes' : 'No');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Startup Copilot API' });
});

app.post('/api/analyze', async (req, res) => {
    const idea = req.body.idea;
    
    if (!idea) {
        return res.status(400).json({ error: "No idea provided" });
    }
    
    try {
        const result = await analyzeIdea(idea);
        res.status(200).json({ analysis: result });
    } catch (error) {
        console.error('AI Error:', error.message);
        res.status(500).json({ error: "Failed to analyze idea", details: error.message });
    }
});

app.post('/api/agent', async (req, res) => {
    const idea = req.body.idea;
    
    if (!idea) {
        return res.status(400).json({ error: "No idea provided" });
    }
    
    try {
        console.log('🚀 Starting Startup Agent for:', idea);
        const agent = createStartupAgent();
        const result = await agent.invoke({ idea });
        
        console.log('✅ Agent completed');
        res.status(200).json(result);
    } catch (error) {
        console.error('Agent Error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ error: "Agent failed", details: error.message });
    }
});

app.get('/api/agent/stream', async (req, res) => {
    const idea = req.query.idea;
    
    if (!idea) {
        return res.status(400).json({ error: "No idea provided" });
    }
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    
    try {
        console.log('🚀 Starting Streaming Agent for:', idea);
        
        const result = await runAgentWithProgress(idea, (progress) => {
            res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
        });
        res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
        res.end();
    } catch (error) {
        console.error('Streaming Agent Error:', error.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
});

app.post('/api/tools', async (req, res) => {
    const idea = req.body.idea;
    
    if (!idea) {
        return res.status(400).json({ error: "No idea provided" });
    }
    
    try {
        console.log('🔧 Starting Tool Agent for:', idea);
        const result = await runWithTools(idea);
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Tool Agent Error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ error: "Tool agent failed", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})