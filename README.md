# 🚀 Startup Copilot

AI-powered startup idea analyzer that provides competitor research, go-to-market strategy, risk assessment, and action plans.

## Features

- **Quick Analysis** - Fast AI assessment of your idea
- **Deep Research (5 Steps)** - Comprehensive analysis with real-time progress
- **Live Web Search** - Real-time competitor data using Tavily

## Tech Stack

- **Backend**: Node.js, Express, LangChain, LangGraph, Groq AI
- **Frontend**: React, Vite
- **APIs**: Groq (LLM), Tavily (Web Search)

## Local Development

### Backend
```bash
cd backend
cp .env.example .env
# Add your GROQ_API_KEY and TAVILY_API_KEY to .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000, Backend on http://localhost:3001

---

## 🚀 Deployment

### Option 1: Railway (Backend) + Vercel (Frontend)

#### Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repo, then choose `backend` folder as root
4. Add environment variables:
   - `GROQ_API_KEY` = your Groq API key
   - `TAVILY_API_KEY` = your Tavily API key
5. Railway auto-deploys. Copy your backend URL (e.g., `https://startup-copilot-backend.up.railway.app`)

#### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New** → **Project** → Import your repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `VITE_API_URL` = your Railway backend URL
5. Click **Deploy**

---

### Option 2: Railway Only (Both services)

1. Create a new Railway project
2. Add two services from same repo:
   - Service 1: Backend (root: `backend`)
   - Service 2: Frontend (root: `frontend`)
3. Set environment variables for each

---

## Environment Variables

### Backend
| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Get from [console.groq.com](https://console.groq.com) |
| `TAVILY_API_KEY` | Yes | Get from [tavily.com](https://tavily.com) |
| `PORT` | No | Default: 3001 |

### Frontend
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes (prod) | Your deployed backend URL |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Quick analysis |
| `/api/agent` | POST | 5-step deep research |
| `/api/agent/stream` | GET | SSE streaming for progress |
| `/api/tools` | POST | Web search enabled analysis |

---

## License

MIT
