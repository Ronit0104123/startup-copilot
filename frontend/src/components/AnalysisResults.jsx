import { useState } from 'react'

function AnalysisResults({ idea, results, analysisType }) {
  const [activeTab, setActiveTab] = useState(0)
  
  // Helper to safely parse JSON strings
  const parseData = (data) => {
    if (!data) return null
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch {
        return data
      }
    }
    return data
  }

  // Render a list of items
  const renderList = (items) => {
    if (!items) return null
    const list = Array.isArray(items) ? items : [items]
    return (
      <ul>
        {list.map((item, i) => (
          <li key={i}>{typeof item === 'object' ? item.name || item.title || JSON.stringify(item) : item}</li>
        ))}
      </ul>
    )
  }

  // Handle different response formats from different endpoints
  const renderSimpleResults = () => {
    const analysis = results.analysis || results
    return (
      <div className="result-section">
        <h3>📊 Analysis</h3>
        {typeof analysis === 'object' ? (
          <div className="analysis-grid">
            {analysis.summary && (
              <div className="analysis-card">
                <h4>Summary</h4>
                <p>{analysis.summary}</p>
              </div>
            )}
            {analysis.targetMarket && (
              <div className="analysis-card">
                <h4>Target Market</h4>
                <p>{analysis.targetMarket}</p>
              </div>
            )}
            {analysis.uniqueValue && (
              <div className="analysis-card">
                <h4>Unique Value</h4>
                <p>{analysis.uniqueValue}</p>
              </div>
            )}
            {analysis.challenges && (
              <div className="analysis-card">
                <h4>Challenges</h4>
                <ul>
                  {Array.isArray(analysis.challenges) 
                    ? analysis.challenges.map((c, i) => <li key={i}>{c}</li>)
                    : <li>{analysis.challenges}</li>
                  }
                </ul>
              </div>
            )}
            {analysis.opportunities && (
              <div className="analysis-card">
                <h4>Opportunities</h4>
                <ul>
                  {Array.isArray(analysis.opportunities)
                    ? analysis.opportunities.map((o, i) => <li key={i}>{o}</li>)
                    : <li>{analysis.opportunities}</li>
                  }
                </ul>
              </div>
            )}
            {analysis.nextSteps && (
              <div className="analysis-card">
                <h4>Next Steps</h4>
                <ul>
                  {Array.isArray(analysis.nextSteps)
                    ? analysis.nextSteps.map((s, i) => <li key={i}>{s}</li>)
                    : <li>{analysis.nextSteps}</li>
                  }
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-response">{analysis}</p>
        )}
      </div>
    )
  }

  const renderToolsResults = () => {
    return (
      <div className="result-section">
        <h3>🔍 Research Results (with Web Search)</h3>
        <div className="tools-info">
          <span className="badge">🌐 {results.toolCallsCount || 0} web searches</span>
        </div>
        <div className="response-text">
          {results.response?.split('\n').map((paragraph, i) => (
            paragraph.trim() && <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    )
  }

  const renderAgentResults = () => {
    const analysis = parseData(results.analysis)
    const competitors = parseData(results.competitors)
    const gtm = parseData(results.gtmPlan)
    const risk = parseData(results.riskAssessment)
    const checklist = parseData(results.checklist)

    const tabs = [
      { id: 0, label: 'Analysis', icon: '📊', color: 'primary' },
      { id: 1, label: 'Competitors', icon: '🎯', color: 'pink' },
      { id: 2, label: 'GTM Strategy', icon: '🚀', color: 'warning' },
      { id: 3, label: 'Risks', icon: '⚠️', color: 'danger' },
      { id: 4, label: 'Action Plan', icon: '✅', color: 'accent' },
    ]

    const renderTabContent = () => {
      switch (activeTab) {
        case 0:
          return analysis && (
            <div className="tab-content">
              {typeof analysis === 'string' ? (
                <p>{analysis}</p>
              ) : (
                <div className="analysis-grid">
                  {analysis.summary && <div className="analysis-card"><h5>Summary</h5><p>{analysis.summary}</p></div>}
                  {analysis.strengths && <div className="analysis-card"><h5>Strengths</h5>{renderList(analysis.strengths)}</div>}
                  {analysis.challenges && <div className="analysis-card"><h5>Challenges</h5>{renderList(analysis.challenges)}</div>}
                  {analysis.verdict && <div className="analysis-card verdict"><h5>Verdict</h5><p className="verdict-text">{analysis.verdict}</p></div>}
                  {analysis.nextSteps && <div className="analysis-card"><h5>Next Steps</h5>{renderList(analysis.nextSteps)}</div>}
                </div>
              )}
            </div>
          )
        
        case 1:
          return competitors && (
            <div className="tab-content">
              {typeof competitors === 'string' ? (
                <p>{competitors}</p>
              ) : (
                <div className="competitors-section">
                  {competitors.directCompetitors && (
                    <div className="competitor-group">
                      <h5>Direct Competitors</h5>
                      <div className="competitor-cards">
                        {competitors.directCompetitors.map((c, i) => (
                          <div key={i} className="competitor-card">
                            <strong>{c.name}</strong>
                            <p>{c.description}</p>
                            {c.strengths && <span className="tag">💪 {c.strengths}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {competitors.indirectCompetitors && (
                    <div className="competitor-group">
                      <h5>Indirect Competitors</h5>
                      <div className="competitor-cards">
                        {competitors.indirectCompetitors.map((c, i) => (
                          <div key={i} className="competitor-card indirect">
                            <strong>{c.name}</strong>
                            <p>{c.description}</p>
                            {c.threat && <span className="tag threat">⚠️ {c.threat}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {competitors.marketGap && (
                    <div className="market-gap">
                      <h5>🎯 Market Gap</h5>
                      <p>{competitors.marketGap}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        
        case 2:
          return gtm && (
            <div className="tab-content">
              {typeof gtm === 'string' ? (
                <p>{gtm}</p>
              ) : (
                <div className="gtm-section">
                  {gtm.targetAudience && <div className="gtm-item"><h5>🎯 Target Audience</h5><p>{gtm.targetAudience}</p></div>}
                  {gtm.valueProposition && <div className="gtm-item"><h5>💎 Value Proposition</h5><p>{gtm.valueProposition}</p></div>}
                  {gtm.channels && (
                    <div className="gtm-item">
                      <h5>📢 Channels</h5>
                      {Array.isArray(gtm.channels) ? (
                        <div className="channel-tags">
                          {gtm.channels.map((ch, i) => (
                            <span key={i} className="channel-tag">{typeof ch === 'object' ? ch.channel : ch}</span>
                          ))}
                        </div>
                      ) : <p>{gtm.channels}</p>}
                    </div>
                  )}
                  {gtm.pricing && <div className="gtm-item"><h5>💰 Pricing</h5><p>{typeof gtm.pricing === 'object' ? gtm.pricing.model : gtm.pricing}</p></div>}
                </div>
              )}
            </div>
          )
        
        case 3:
          return risk && (
            <div className="tab-content">
              {typeof risk === 'string' ? (
                <p>{risk}</p>
              ) : (
                <div className="risk-section">
                  {risk.risks && risk.risks.map((r, i) => (
                    <div key={i} className={`risk-card ${r.severity?.toLowerCase() || 'medium'}`}>
                      <div className="risk-header">
                        <strong>{r.risk || r.name}</strong>
                        {r.severity && <span className="severity-badge">{r.severity}</span>}
                      </div>
                      {r.mitigation && <p className="mitigation">Mitigation: {r.mitigation}</p>}
                    </div>
                  ))}
                  {risk.overallRisk && <p className="overall-risk">Overall Risk Level: <strong>{risk.overallRisk}</strong></p>}
                </div>
              )}
            </div>
          )
        
        case 4:
          return checklist && (
            <div className="tab-content">
              {typeof checklist === 'string' ? (
                <p>{checklist}</p>
              ) : (
                <div className="checklist-section">
                  {checklist.week1 && (
                    <div className="checklist-group">
                      <h5>📅 Week 1</h5>
                      {checklist.week1.map((item, i) => (
                        <div key={i} className="checklist-item">
                          <span className="checkbox">☐</span>
                          <span>{item.task || item.action || item.title || item}</span>
                          {item.priority && <span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span>}
                          {item.category && <span className="category-tag">{item.category}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {checklist.week2to4 && (
                    <div className="checklist-group">
                      <h5>📅 Weeks 2-4</h5>
                      {checklist.week2to4.map((item, i) => (
                        <div key={i} className="checklist-item">
                          <span className="checkbox">☐</span>
                          <span>{item.task || item.action || item.title || item}</span>
                          {item.priority && <span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span>}
                          {item.category && <span className="category-tag">{item.category}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {checklist.month2to3 && (
                    <div className="checklist-group">
                      <h5>📅 Months 2-3</h5>
                      {checklist.month2to3.map((item, i) => (
                        <div key={i} className="checklist-item">
                          <span className="checkbox">☐</span>
                          <span>{item.task || item.action || item.title || item}</span>
                          {item.priority && <span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span>}
                          {item.category && <span className="category-tag">{item.category}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {!checklist.week1 && !checklist.week2to4 && !checklist.month2to3 && (
                    (checklist.items || checklist.tasks || (Array.isArray(checklist) ? checklist : []))?.map?.((item, i) => (
                      <div key={i} className="checklist-item">
                        <span className="checkbox">☐</span>
                        <span>{typeof item === 'object' ? (item.task || item.action || item.title) : item}</span>
                        {item.priority && <span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        
        default:
          return null
      }
    }

    return (
      <div className="result-section agent-results tabbed">
        <div className="tabs-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.color}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
        
        <div className="tab-panel">
          {renderTabContent()}
        </div>
      </div>
    )
  }

  return (
    <div className="analysis-results">
      <div className="results-header">
        <h2>Results for: <span>"{idea}"</span></h2>
        <div className="result-meta">
          <span className="meta-badge">
            {analysisType === 'simple' && '⚡ Quick Analysis'}
            {analysisType === 'agent' && '🤖 Deep Research'}
            {analysisType === 'tools' && '🌐 Web Search'}
          </span>
        </div>
      </div>

      {analysisType === 'simple' && renderSimpleResults()}
      {analysisType === 'tools' && renderToolsResults()}
      {analysisType === 'agent' && renderAgentResults()}
    </div>
  )
}

export default AnalysisResults
