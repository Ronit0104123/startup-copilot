import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeIdea } from './services/llm.js';
import { createStartupAgent, runAgentWithProgress } from './agents/startupAgent.js';
import { runWithTools } from './agents/toolAgent.js';
import { createGoogleSlidesPresentation } from './services/googleSlides.js';

dotenv.config();

console.log('Groq API Key loaded:', process.env.GROQ_API_KEY ? 'Yes' : 'No');

// Helper to create user-friendly error messages
function getFriendlyErrorMessage(error) {
    const msg = error.message || '';
    if (msg.includes('rate_limit') || msg.includes('Rate limit') || msg.includes('429')) {
        return "We're experiencing high demand right now. Please try again in a few minutes.";
    }
    if (msg.includes('API key') || msg.includes('authentication') || msg.includes('401')) {
        return "Service temporarily unavailable. Please try again later.";
    }
    if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
        return "The request took too long. Please try again.";
    }
    return "Something went wrong. Please try again.";
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'JustExecute API' });
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
        res.status(500).json({ error: getFriendlyErrorMessage(error) });
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
        res.status(500).json({ error: getFriendlyErrorMessage(error) });
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
        res.write(`data: ${JSON.stringify({ type: 'error', message: getFriendlyErrorMessage(error) })}\n\n`);
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
        res.status(500).json({ error: getFriendlyErrorMessage(error) });
    }
});

app.post('/api/create-slides', async (req, res) => {
    const { pitchDeck, idea } = req.body;
    
    if (!pitchDeck || !idea) {
        return res.status(400).json({ error: "Pitch deck data and idea are required" });
    }
    
    try {
        console.log('📊 Creating Google Slides for:', idea);
        const result = await createGoogleSlidesPresentation(pitchDeck, idea);
        
        if (result.success) {
            res.status(200).json({
                success: true,
                htmlContent: result.htmlContent,
                importInstructions: result.importInstructions
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Google Slides Error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: "Failed to create Google Slides presentation",
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});