import { useState, useRef, useEffect } from 'react'
import IdeaForm from './components/IdeaForm'
import AnalysisResults from './components/AnalysisResults'
import { analyzeIdea, analyzeIdeaWithProgress } from './services/api'

function App() {
  const [idea, setIdea] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysisType, setAnalysisType] = useState('agent') // simple, agent, tools
  const [currentStep, setCurrentStep] = useState(0)
  const [stepName, setStepName] = useState('')
  const loadingRef = useRef(null)

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
        },
        // onError
        (err) => {
          setError(err.message)
          setLoading(false)
          setCurrentStep(0)
        }
      )
    } else {
      // For other modes, use regular fetch
      try {
        const data = await analyzeIdea(ideaText, analysisType)
        setResults(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
        setCurrentStep(0)
      }
    }
  }

  const steps = [
    { num: 1, label: 'Analysis' },
    { num: 2, label: 'Research' },
    { num: 3, label: 'Strategy' },
    { num: 4, label: 'Risks' },
    { num: 5, label: 'Plan' },
  ]

  return (
    <div className="app">
      <header>
        <div className="logo-wrapper">
          <span className="logo-icon">🚀</span>
        </div>
        <h1>Startup Copilot</h1>
        <p className="tagline">Turn your startup idea into an actionable plan in seconds</p>
        <div className="value-props">
          <span className="value-prop">✓ Competitor analysis</span>
          <span className="value-prop">✓ Go-to-market strategy</span>
          <span className="value-prop">✓ Risk assessment</span>
        </div>
      </header>

      <main>
        <IdeaForm 
          onSubmit={handleAnalyze} 
          loading={loading}
          analysisType={analysisType}
          onTypeChange={setAnalysisType}
        />

        {loading && (
          <div className="loading" ref={loadingRef}>
            <div className="loading-visual">
              <div className="spinner"></div>
              <span className="loading-icon">{analysisType === 'tools' ? '🔍' : '🧠'}</span>
            </div>
            <h3>{analysisType === 'simple' ? 'Quick analysis...' : analysisType === 'tools' ? 'Searching the web...' : 'Analyzing your idea...'}</h3>
            <p>
              {analysisType === 'agent' 
                ? (stepName ? `Step ${currentStep}: ${stepName}` : 'Running deep research across 5 steps')
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

export default App
