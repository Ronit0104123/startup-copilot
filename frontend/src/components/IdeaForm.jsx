import { useState } from 'react'

function IdeaForm({ onSubmit, loading, analysisType, onTypeChange }) {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !loading) {
      onSubmit(input.trim())
    }
  }

  const examples = [
    "AI-powered resume builder for Gen Z",
    "Subscription box for indie board games",
    "Food delivery app for college campuses",
    "Pet sitting marketplace with video calls"
  ]

  return (
    <div className="idea-form">
      <div className="form-header">
        <h2>💡 Describe your startup idea</h2>
        <p>Get instant analysis, competitor insights, and a 90-day action plan</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., An app that connects busy professionals with personal chefs for weekly meal prep..."
          disabled={loading}
        />

        <div className="form-controls">
          <div className="analysis-type">
            <label>Mode:</label>
            <select 
              value={analysisType} 
              onChange={(e) => onTypeChange(e.target.value)}
              disabled={loading}
            >
              <option value="simple">⚡ Quick Analysis</option>
              <option value="agent">🤖 Deep Research (5 Steps)</option>
              <option value="tools">🌐 Live Web Search</option>
            </select>
          </div>

          <button type="submit" className="submit-btn" disabled={loading || !input.trim()}>
            <span className="btn-icon">{loading ? '⏳' : '✨'}</span>
            {loading ? 'Analyzing...' : 'Analyze Idea'}
          </button>
        </div>
      </form>

      <div className="examples">
        <div className="examples-header">
          <span>💭 Try an example:</span>
        </div>
        <div className="example-buttons">
          {examples.map((ex, i) => (
            <button 
              key={i} 
              onClick={() => setInput(ex)}
              disabled={loading}
              className="example-btn"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default IdeaForm
