import { useState } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabaseClient'

function IdeaForm({ onSubmit, loading, analysisType, onTypeChange, session, hasUsedGuestTrial }) {
  const [input, setInput] = useState('')

  // Determine if the form should be locked
  const isLocked = !session && hasUsedGuestTrial

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !loading && !isLocked) {
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
    <div className="form-section-container">
      {/* Premium Marketing Header for Logged-Out Users */}
      {!session && (
        <div className="premium-marketing-header">
          <h2>Stop Guessing. Start <span className="text-gradient">Executing.</span></h2>
          <p>Get instant deep-dive market research, competitor intel, and a step-by-step launch plan.</p>
          <div className="usp-badges">
            <span className="usp-badge"><span className="icon">🎁</span> Try 1 Full Analysis for Free</span>
            <span className="usp-badge"><span className="icon">🎯</span> Demand Validation</span>
            <span className="usp-badge"><span className="icon">🕵️</span> Competitor Intel</span>
            <span className="usp-badge"><span className="icon">⚠️</span> Risk Assessment</span>
          </div>
        </div>
      )}

      <div className={`idea-form-wrapper ${isLocked ? 'is-locked' : ''}`}>
        <div className="idea-form">
          <div className="form-header">
            <h2>💡 Describe your startup idea</h2>
            <p>Get instant analysis, competitor insights, and a 90-day action plan</p>
          </div>

          <form onSubmit={handleSubmit} className={isLocked ? 'blurred-form' : ''}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., An app that connects busy professionals with personal chefs for weekly meal prep..."
              disabled={loading || isLocked}
            />

            <div className="form-controls">
              <div className="analysis-type">
                <label>Mode:</label>
                <select 
                  value={analysisType} 
                  onChange={(e) => onTypeChange(e.target.value)}
                  disabled={loading || isLocked}
                >
                  <option value="simple">⚡ Quick Analysis</option>
                  <option value="agent">🤖 Deep Research (5 Steps)</option>
                  <option value="tools">🌐 Live Web Search</option>
                </select>
              </div>

              <button type="submit" className="submit-btn" disabled={loading || !input.trim() || isLocked}>
                <span className="btn-icon">{loading ? '⏳' : '✨'}</span>
                {loading ? 'Analyzing...' : 'Analyze Idea'}
              </button>
            </div>
          </form>

          {(session || !hasUsedGuestTrial) && (
            <div className="examples">
              <div className="examples-header">
                <span>💭 Try an example:</span>
              </div>
              <div className="example-buttons">
                {examples.map((ex, i) => (
                  <button 
                    key={i} 
                    onClick={() => setInput(ex)}
                    disabled={loading || isLocked}
                    className="example-btn"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Glassmorphism Lock Overlay for Logged-Out Users who exhausted trial */}
          {isLocked && (
            <div className="glass-auth-overlay">
              <div className="glass-auth-content">
                <div className="lock-icon">🔒</div>
                <h3>Sign in to Analyze</h3>
                <p>You've used your free trial! Unlock the power of our AI to validate unlimited ideas instantly.</p>
                <div className="auth-box">
                  <Auth
                    supabaseClient={supabase}
                    appearance={{
                      theme: ThemeSupa,
                      variables: {
                        default: {
                          colors: {
                            brand: 'var(--primary)',
                            brandAccent: 'var(--secondary)',
                          }
                        }
                      }
                    }}
                    providers={['google']}
                    onlyThirdPartyProviders
                    redirectTo={window.location.origin}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IdeaForm
