const BACKEND_URL = import.meta.env.VITE_API_URL || ''
const API_BASE = `${BACKEND_URL}/api`

export async function analyzeIdea(idea, type = 'tools') {
  const endpoints = {
    simple: '/analyze',
    agent: '/agent',
    tools: '/tools'
  }

  const response = await fetch(`${API_BASE}${endpoints[type]}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ idea })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Analysis failed')
  }

  return response.json()
}

export function analyzeIdeaWithProgress(idea, onProgress, onComplete, onError) {
  const encodedIdea = encodeURIComponent(idea)
  const sseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const eventSource = new EventSource(`${sseUrl}/api/agent/stream?idea=${encodedIdea}`)
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      
      if (data.type === 'progress') {
        onProgress(data.step, data.name, data.total)
      } else if (data.type === 'complete') {
        eventSource.close()
        onComplete(data.result)
      } else if (data.type === 'error') {
        eventSource.close()
        onError(new Error(data.message))
      }
    } catch (e) {
      console.error('SSE parse error:', e)
    }
  }
  
  eventSource.onerror = () => {
    eventSource.close()
    onError(new Error('Connection lost'))
  }
  
  return eventSource
}
