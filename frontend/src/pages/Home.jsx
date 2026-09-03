import { useState, useRef, useEffect } from 'react'
import { LogIn, LogOut, AlertCircle } from 'lucide-react'
import IdeaForm from '../components/IdeaForm'
import AnalysisResults from '../components/AnalysisResults'
import { analyzeIdea, analyzeIdeaWithProgress } from '../services/api'
import { supabase } from '../lib/supabaseClient'

const STEPS = [
  {
    title: 'Market validation',
    desc: 'Searches the open web for complaints, "is there a tool for this" posts and demand data, then rates problem–solution fit against what it actually finds.',
    cost: '8 searches',
  },
  {
    title: 'Competitive landscape',
    desc: 'Looks for products already solving this, their pricing and funding, and the spreadsheets and manual workflows people use instead.',
    cost: '6 searches',
  },
  {
    title: 'Go-to-market',
    desc: 'Identifies the communities where your first hundred users already gather, and how to reach them without spamming.',
    cost: '3 searches',
  },
  {
    title: 'Risk',
    desc: 'Names the most likely way this dies, the assumptions it rests on, and the early warning signs for each.',
    cost: 'no searches',
  },
  {
    title: 'Execution plan',
    desc: 'A 90-day checklist broken into week one, weeks two to four, and months two to three, plus a six-slide pitch narrative.',
    cost: 'no searches',
  },
]

function Home({ session }) {
  const [idea, setIdea] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysisType, setAnalysisType] = useState('agent')
  const [currentStep, setCurrentStep] = useState(0)
  const [stepName, setStepName] = useState('')
  const runRef = useRef(null)
  const formRef = useRef(null)

  const [hasUsedGuestTrial, setHasUsedGuestTrial] = useState(
    () => localStorage.getItem('justexecute_guest_used') === 'true'
  )

  useEffect(() => {
    if (loading && runRef.current) {
      runRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [loading])

  const handleAnalyze = async (ideaText) => {
    setIdea(ideaText)
    setLoading(true)
    setError(null)
    setResults(null)
    setCurrentStep(1)
    setStepName('Starting')

    let token = session?.access_token
    if (!token) {
      if (hasUsedGuestTrial) {
        setError('You have already used your free run. Sign in to continue.')
        setLoading(false)
        setCurrentStep(0)
        return
      }
      token = 'guest'
    }

    const markGuestTrialUsed = () => {
      if (!session) {
        localStorage.setItem('justexecute_guest_used', 'true')
        setHasUsedGuestTrial(true)
      }
    }

    if (analysisType === 'agent') {
      analyzeIdeaWithProgress(
        ideaText,
        (step, name) => {
          setCurrentStep(step)
          setStepName(name)
        },
        (data) => {
          setResults(data)
          setLoading(false)
          setCurrentStep(0)
          markGuestTrialUsed()
        },
        (err) => {
          setError(
            err.message?.includes('403')
              ? 'You have reached your limit of free runs.'
              : err.message
          )
          setLoading(false)
          setCurrentStep(0)
        },
        token
      )
    } else {
      try {
        const data = await analyzeIdea(ideaText, analysisType, token)
        setResults(data)
        markGuestTrialUsed()
      } catch (err) {
        setError(
          err.message?.includes('403')
            ? 'You have reached your limit of free runs.'
            : err.message
        )
      } finally {
        setLoading(false)
        setCurrentStep(0)
      }
    }
  }

  const handleLogout = () => supabase.auth.signOut()

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a href="/" className="wordmark">
            <img src="/logo-icon.png" alt="" />
            JustExecute
          </a>
          <div className="topbar-actions">
            {session ? (
              <>
                <span className="topbar-email">{session.user?.email}</span>
                <button onClick={handleLogout} className="btn btn-quiet btn-sm">
                  <LogOut size={14} strokeWidth={1.75} />
                  Sign out
                </button>
              </>
            ) : (
              <button onClick={scrollToForm} className="btn btn-sm">
                <LogIn size={14} strokeWidth={1.75} />
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <h1 className="serif">
            Validate a startup idea against <em>evidence</em>, not vibes.
          </h1>
          <p className="lead">
            Describe the idea in a sentence. JustExecute runs five research passes over
            the open web and returns a demand verdict, the competitors already there, a
            go-to-market plan, the risks, and a 90-day checklist.
          </p>
          <div className="hero-meta">
            <span>17 web searches per run</span>
            <span>Default market: India</span>
            <span>Around two minutes</span>
          </div>
        </section>

        {!session && (
          <section className="section">
            <div className="section-head">
              <span className="label">How it works</span>
              <h2>Five passes, run in order.</h2>
              <p>
                Each pass reads what the passes before it produced, so the go-to-market
                plan is built on the competitors actually found, not on generic advice.
              </p>
            </div>

            <div className="steps">
              {STEPS.map((step, i) => (
                <article className="step" key={step.title}>
                  <div className="step-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <h3 className="step-title">{step.title}</h3>
                    <p className="step-desc">{step.desc}</p>
                    <p className="step-cost">{step.cost}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

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
          <section className="run" ref={runRef}>
            <div className="run-head">
              <h2>
                {analysisType === 'agent'
                  ? 'Researching'
                  : analysisType === 'tools'
                    ? 'Searching the web'
                    : 'Analysing'}
              </h2>
              {analysisType === 'agent' && (
                <span className="run-counter">
                  {currentStep} of 5 &middot; {stepName}
                </span>
              )}
            </div>

            {analysisType === 'agent' ? (
              <div className="run-steps">
                {STEPS.map((step, i) => {
                  const num = i + 1
                  const state =
                    currentStep > num ? 'done' : currentStep === num ? 'active' : 'pending'
                  return (
                    <div className="run-step" key={step.title} data-state={state}>
                      <span className="run-step-mark">
                        {state === 'done' ? '✓' : String(num).padStart(2, '0')}
                      </span>
                      <span>{step.title}</span>
                      {state === 'active' && <span className="pulse" />}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="run-step" data-state="active">
                <span className="spinner" />
                <span>Working</span>
              </div>
            )}
          </section>
        )}

        {error && (
          <div className="notice" data-tone="error" role="alert">
            <AlertCircle size={16} strokeWidth={1.75} />
            <p>{error}</p>
          </div>
        )}

        {results && (
          <AnalysisResults idea={idea} results={results} analysisType={analysisType} />
        )}
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <span>JustExecute</span>
          <span>Research is generated by a model and can be wrong. Check the sources.</span>
        </div>
      </footer>
    </div>
  )
}

export default Home
