# JustExecute

Analyze startup ideas with AI. Get competitor research, GTM strategy, risks, and action plans.

## Setup

```bash
# Backend
cd backend
cp .env.example .env  # add GROQ_API_KEY and TAVILY_API_KEY
npm install && npm start

# Frontend
cd frontend
npm install && npm run dev
```

## Env vars

Backend: `GROQ_API_KEY`, `TAVILY_API_KEY`
Frontend: `VITE_API_URL` (backend url for prod)
