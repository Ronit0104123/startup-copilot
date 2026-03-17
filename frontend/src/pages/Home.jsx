import { useState, useRef, useEffect } from 'react'
import IdeaForm from '../components/IdeaForm'
import AnalysisResults from '../components/AnalysisResults'
import { analyzeIdea, analyzeIdeaWithProgress } from '../services/api'
import { supabase } from '../lib/supabaseClient'
import { LogOut, LogIn } from 'lucide-react'

function Home({ session }) {
  const [idea, setIdea] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysisType, setAnalysisType] = useState('agent') // simple, agent, tools
  const [currentStep, setCurrentStep] = useState(0)
  const [stepName, setStepName] = useState('')
  const loadingRef = useRef(null)
  const formRef = useRef(null)

  // Track if the guest has used their one free trial
  const [hasUsedGuestTrial, setHasUsedGuestTrial] = useState(() => {
    return localStorage.getItem('justexecute_guest_used') === 'true'
  })

  // Auto-scroll to loading section when it appears
  useEffect(() => {
    if (loading && loadingRef.current) {
      loadingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [loading])

  const handleAnalyze = async (ideaText) => {
    setIdea(ideaText)
    setLoading(true)
    setError(null)
    setResults(null)
    setCurrentStep(1)
    setStepName('Starting...')

    // Determine the token to use
    let token = session?.access_token
    if (!token) {
      if (hasUsedGuestTrial) {
        setError('You have already used your free trial. Please sign in to continue.')
        setLoading(false)
        setCurrentStep(0)
        return
      }
      token = 'guest'
    }

    // Function to mark guest trial as used
    const markGuestTrialUsed = () => {
      if (!session) {
        localStorage.setItem('justexecute_guest_used', 'true')
        setHasUsedGuestTrial(true)
      }
    }

    // Use SSE streaming for agent mode to track progress
    if (analysisType === 'agent') {
      analyzeIdeaWithProgress(
        ideaText,
        // onProgress
        (step, name) => {
          setCurrentStep(step)
          setStepName(name)
        },
        // onComplete
        (data) => {
          setResults(data)
          setLoading(false)
          setCurrentStep(0)
          markGuestTrialUsed()
        },
        // onError
        (err) => {
          // Check for 403 Forbidden to prompt upgrade
          if (err.message?.includes('403')) {
            setError('You have reached your limit of free AI calls. Please upgrade to continue.')
          } else {
            setError(err.message)
          }
          setLoading(false)
          setCurrentStep(0)
        },
        token
      )
    } else {
      // For other modes, use regular fetch
      try {
        const data = await analyzeIdea(ideaText, analysisType, token)
        setResults(data)
        markGuestTrialUsed()
      } catch (err) {
        if (err.message?.includes('403')) {
          setError('You have reached your limit of free API calls. Please upgrade to continue.')
        } else {
          setError(err.message)
        }
      } finally {
        setLoading(false)
        setCurrentStep(0)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const scrollToLogin = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const steps = [
    { num: 1, label: 'Market Validation' },
    { num: 2, label: 'Competitive Intel' },
    { num: 3, label: 'GTM Strategy' },
    { num: 4, label: 'Risk Assessment' },
    { num: 5, label: 'Execution Plan' },
  ]

  return (
    <div className="app">
      <header>
        <div className="header-actions" style={{ position: 'absolute', top: '1.5rem', right: '2rem' }}>
          {session ? (
            <button onClick={handleLogout} className="auth-btn-logout">
              <LogOut size={16} />
              Sign Out
            </button>
          ) : (
            <button onClick={scrollToLogin} className="auth-btn-login">
              <LogIn size={16} />
              Sign In
            </button>
          )}
        </div>
        <div className="logo-wrapper">
          <img src="/logo-icon.png" alt="JustExecute" className="logo-icon-img" />
        </div>
        <h1>JustExecute</h1>
        <p className="tagline">Turn your startup idea into an actionable plan in seconds</p>
        <div className="value-props">
          <span className="value-prop">✓ Real demand validation</span>
          <span className="value-prop">✓ Competitor analysis</span>
          <span className="value-prop">✓ Go-to-market strategy</span>
          <span className="value-prop">✓ Risk assessment</span>
        </div>
      </header>

      {/* Marketing Value Section - visible to everyone, especially impactful for non-logged-in users */}
      {!session && (
        <section className="marketing-section">
          <div className="marketing-cost-hero">
            <div className="cost-comparison">
              <div className="cost-old">
                <span className="cost-label">Traditional Market Research</span>
                <span className="cost-price">$5,000 – $15,000</span>
                <span className="cost-detail">Consultants, weeks of waiting</span>
              </div>
              <div className="cost-arrow">→</div>
              <div className="cost-new">
                <span className="cost-label">JustExecute AI</span>
                <span className="cost-price highlight">Free to start</span>
                <span className="cost-detail">Instant results, same depth</span>
              </div>
            </div>
          </div>

          <h2 className="marketing-title">What Our AI Does <span className="text-gradient">For You</span></h2>
          <p className="marketing-subtitle">Our agents crawl the entire internet so you don't have to</p>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Live Web Search</h3>
              <p>Scans Google, Bing, and specialized search engines to find real-time market data, trends, and news about your niche.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Reddit & Forum Mining</h3>
              <p>Digs through Reddit threads, Indie Hackers, Hacker News, and niche forums to find what real users are saying about similar ideas.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏢</div>
              <h3>Competitor Deep-Dive</h3>
              <p>Identifies direct and indirect competitors, analyzes their pricing, features, and market positioning so you know exactly where you stand.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Demand Validation</h3>
              <p>Estimates market size, finds early signals of demand, and validates whether people would actually pay for your solution.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚠️</div>
              <h3>Risk Assessment</h3>
              <p>Identifies the "Death Spiral" patterns that kill 90% of startups — before you invest your time and money.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>90-Day Action Plan</h3>
              <p>Generates a step-by-step go-to-market strategy with milestones, channels, and tactics tailored to your specific idea.</p>
            </div>
          </div>

          <div className="social-proof-bar">
            <span>💡 Replacing hours of manual research with a single click</span>
            <span>•</span>
            <span>🤖 Powered by multi-agent AI architecture</span>
            <span>•</span>
            <span>⚡ Results in under 2 minutes</span>
          </div>
        </section>
      )}

      <main>
        <div ref={formRef}>
          <IdeaForm 
            onSubmit={handleAnalyze} 
            loading={loading}
            analysisType={analysisType}
            onTypeChange={setAnalysisType}
            session={session}
            hasUsedGuestTrial={hasUsedGuestTrial}
          />
        </div>

        {loading && (
          <div className="loading" ref={loadingRef}>
            <div className="loading-visual">
              <div className="spinner"></div>
              <span className="loading-icon">{analysisType === 'tools' ? '🔍' : '🧠'}</span>
            </div>
            <h3>{analysisType === 'simple' ? 'Quick analysis...' : analysisType === 'tools' ? 'Searching the web...' : 'Analyzing your idea...'}</h3>
            <p>
              {analysisType === 'agent' 
                ? (stepName ? `Step ${currentStep}/5: ${stepName}` : 'Running deep research across 5 steps')
                : analysisType === 'tools' 
                  ? 'Finding real-time data from the web'
                  : 'Getting a quick assessment'
              }
            </p>
            {analysisType === 'agent' && (
              <div className="loading-steps">
                {steps.map((step) => (
                  <div 
                    key={step.num} 
                    className={`loading-step ${currentStep >= step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}
                  >
                    <span className="step-number">{currentStep > step.num ? '✓' : step.num}</span>
                    <span className="step-label">{step.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {results && (
          <AnalysisResults 
            idea={idea} 
            results={results} 
            analysisType={analysisType}
          />
        )}
      </main>

      <footer>
        <p>Made for founders who move fast 🚀</p>
      </footer>
    </div>
  )
}

export default Home
