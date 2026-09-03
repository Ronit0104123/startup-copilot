import { useState } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabaseClient'

const EXAMPLES = [
  'AI-powered resume builder for Gen Z',
  'Subscription box for indie board games',
  'Food delivery app for college campuses',
  'Pet sitting marketplace with video calls',
]

const MODES = [
  { value: 'agent', label: 'Deep research — 5 passes' },
  { value: 'tools', label: 'Live web search' },
  { value: 'simple', label: 'Quick take — no search' },
]

function IdeaForm({ onSubmit, loading, analysisType, onTypeChange, session, hasUsedGuestTrial }) {
  const [input, setInput] = useState('')

  const isLocked = !session && hasUsedGuestTrial

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !loading && !isLocked) onSubmit(input.trim())
  }

  return (
    <section className="composer-block">
      <div className={`composer ${isLocked ? 'is-locked' : ''}`}>
        <div className="composer-inner">
          <form onSubmit={handleSubmit}>
            <label className="composer-label" htmlFor="idea">
              <span className="label">Your idea</span>
            </label>
            <textarea
              id="idea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="An app that connects busy professionals with personal chefs for weekly meal prep…"
              disabled={loading || isLocked}
            />

            <div className="composer-foot">
              <div className="field">
                <label className="label" htmlFor="mode">
                  Mode
                </label>
                <select
                  id="mode"
                  value={analysisType}
                  onChange={(e) => onTypeChange(e.target.value)}
                  disabled={loading || isLocked}
                >
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !input.trim() || isLocked}
              >
                {loading ? 'Running…' : 'Analyse idea'}
              </button>
            </div>
          </form>

          {!isLocked && (
            <div className="examples">
              <span className="label">Or start from one of these</span>
              <div className="example-list">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className="chip"
                    onClick={() => setInput(ex)}
                    disabled={loading}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isLocked && (
          <div className="gate">
            <div className="gate-card">
              <h3 className="serif">Sign in to keep going</h3>
              <p>You&rsquo;ve used your free run. Sign in for unlimited analyses.</p>
              <div className="gate-auth">
                <Auth
                  supabaseClient={supabase}
                  appearance={{
                    theme: ThemeSupa,
                    variables: {
                      default: {
                        colors: {
                          brand: '#16150f',
                          brandAccent: '#000000',
                          brandButtonText: '#faf9f6',
                          defaultButtonBackground: '#ffffff',
                          defaultButtonBorder: '#cfccc1',
                          defaultButtonText: '#16150f',
                          inputBorder: '#cfccc1',
                        },
                        radii: { borderRadiusButton: '4px', inputBorderRadius: '4px' },
                      },
                    },
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
    </section>
  )
}

export default IdeaForm
