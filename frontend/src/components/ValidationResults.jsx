import { useState } from 'react'

function ValidationResults({ results }) {
  const [expandedSections, setExpandedSections] = useState({
    pain: true,
    seeking: true,
    workarounds: true,
    competitors: true,
    demand: true,
    channels: true,
  })

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const painSignals = results.painSignals
  const solutionSeeking = results.solutionSeeking
  const workarounds = results.workarounds
  const competitors = results.competitors
  const searchDemand = results.searchDemand
  const earlyUserChannels = results.earlyUserChannels
  const demandScore = results.demandScore

  const verdictClass = demandScore?.overallVerdict === 'Strong Demand'
    ? 'verdict-strong'
    : demandScore?.overallVerdict === 'Moderate Demand'
      ? 'verdict-moderate'
      : 'verdict-weak'

  return (
    <div className="validation-results">
      {/* Demand Score Header */}
      {demandScore && (
        <div className={`demand-score-header ${verdictClass}`}>
          <div className="score-badge-container">
            <div className={`score-badge ${verdictClass}`}>
              {demandScore.overallVerdict || 'Unknown'}
            </div>
            {demandScore.confidenceLevel && (
              <span className="confidence-tag">
                Confidence: {demandScore.confidenceLevel}
              </span>
            )}
          </div>
          {demandScore.recommendation && (
            <p className="score-recommendation">{demandScore.recommendation}</p>
          )}

          {/* Signal Breakdown Bar */}
          {demandScore.signalBreakdown && (
            <div className="signal-breakdown">
              {Object.entries(demandScore.signalBreakdown).map(([key, value]) => (
                <div key={key} className={`signal-chip ${value?.toLowerCase()}`}>
                  <span className="signal-label">{formatLabel(key)}</span>
                  <span className="signal-value">{value}</span>
                </div>
              ))}
            </div>
          )}

          {demandScore.nextSteps && demandScore.nextSteps.length > 0 && (
            <div className="next-steps-box">
              <h4>📋 Next Steps</h4>
              <ul>
                {demandScore.nextSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Signal Sections */}
      <div className="signal-sections">
        {/* Pain Signals */}
        <SignalSection
          title="🔥 Pain Signals"
          subtitle="Complaints & frustration found online"
          sectionKey="pain"
          expanded={expandedSections.pain}
          onToggle={toggleSection}
          badge={painSignals?.discussionVolume}
        >
          {painSignals?.summary && <p className="signal-summary">{painSignals.summary}</p>}
          
          {painSignals?.dominantPainThemes && painSignals.dominantPainThemes.length > 0 && (
            <div className="pain-themes">
              <h5>Dominant Pain Themes</h5>
              <div className="theme-tags">
                {painSignals.dominantPainThemes.map((theme, i) => (
                  <span key={i} className="theme-tag">{theme}</span>
                ))}
              </div>
            </div>
          )}

          {painSignals?.examples && painSignals.examples.length > 0 && (
            <div className="evidence-cards">
              {painSignals.examples.map((ex, i) => (
                <div key={i} className="evidence-card">
                  <div className="evidence-header">
                    <span className={`pain-level ${ex.painLevel?.toLowerCase()}`}>
                      {ex.painLevel}
                    </span>
                    {ex.source && (
                      <a href={ex.source} target="_blank" rel="noopener noreferrer" className="source-link">
                        🔗 Source
                      </a>
                    )}
                  </div>
                  <blockquote>{ex.quote}</blockquote>
                </div>
              ))}
            </div>
          )}
        </SignalSection>

        {/* Solution-Seeking */}
        <SignalSection
          title="🔍 Solution-Seeking Signals"
          subtitle='People asking "is there a tool for X?"'
          sectionKey="seeking"
          expanded={expandedSections.seeking}
          onToggle={toggleSection}
          badge={solutionSeeking?.seekingVolume}
        >
          {solutionSeeking?.summary && <p className="signal-summary">{solutionSeeking.summary}</p>}

          {solutionSeeking?.commonRequests && solutionSeeking.commonRequests.length > 0 && (
            <div className="common-requests">
              <h5>Most Common Requests</h5>
              <ul>
                {solutionSeeking.commonRequests.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {solutionSeeking?.seekingExamples && solutionSeeking.seekingExamples.length > 0 && (
            <div className="evidence-cards">
              {solutionSeeking.seekingExamples.map((ex, i) => (
                <div key={i} className="evidence-card">
                  <div className="evidence-header">
                    <strong>{ex.query}</strong>
                    {ex.source && (
                      <a href={ex.source} target="_blank" rel="noopener noreferrer" className="source-link">
                        🔗 Source
                      </a>
                    )}
                  </div>
                  <p>{ex.context}</p>
                </div>
              ))}
            </div>
          )}
        </SignalSection>

        {/* Workarounds */}
        <SignalSection
          title="🔧 Workarounds"
          subtitle="DIY solutions, spreadsheets, and hacks people use"
          sectionKey="workarounds"
          expanded={expandedSections.workarounds}
          onToggle={toggleSection}
          badge={workarounds?.replacementOpportunity ? `Opportunity: ${workarounds.replacementOpportunity}` : null}
        >
          {workarounds?.summary && <p className="signal-summary">{workarounds.summary}</p>}

          {workarounds?.workaroundTypes && workarounds.workaroundTypes.length > 0 && (
            <div className="workaround-types">
              <h5>Workaround Types Detected</h5>
              <div className="theme-tags">
                {workarounds.workaroundTypes.map((type, i) => (
                  <span key={i} className="theme-tag workaround">{type}</span>
                ))}
              </div>
            </div>
          )}

          {workarounds?.workarounds && workarounds.workarounds.length > 0 && (
            <div className="evidence-cards">
              {workarounds.workarounds.map((w, i) => (
                <div key={i} className="evidence-card">
                  <div className="evidence-header">
                    <strong>{w.method}</strong>
                    {w.source && (
                      <a href={w.source} target="_blank" rel="noopener noreferrer" className="source-link">
                        🔗 Source
                      </a>
                    )}
                  </div>
                  <p className="pain-text">{w.painWithWorkaround}</p>
                </div>
              ))}
            </div>
          )}
        </SignalSection>

        {/* Competitors */}
        <SignalSection
          title="🏢 Competitor Signals"
          subtitle="Existing tools and monetization evidence"
          sectionKey="competitors"
          expanded={expandedSections.competitors}
          onToggle={toggleSection}
          badge={competitors?.marketMaturity}
        >
          {competitors?.summary && <p className="signal-summary">{competitors.summary}</p>}

          {competitors?.monetizationEvidence && (
            <div className="monetization-box">
              <h5>💰 Monetization Evidence</h5>
              <p>{competitors.monetizationEvidence}</p>
            </div>
          )}

          {competitors?.competitors && competitors.competitors.length > 0 && (
            <div className="competitor-cards-grid">
              {competitors.competitors.map((c, i) => (
                <div key={i} className="competitor-evidence-card">
                  <div className="comp-header">
                    <strong>{c.name}</strong>
                    <span className={`market-presence ${c.marketPresence?.toLowerCase()}`}>
                      {c.marketPresence}
                    </span>
                  </div>
                  <p>{c.description}</p>
                  {c.hasPricing && c.pricingDetails && (
                    <p className="pricing-info">💳 {c.pricingDetails}</p>
                  )}
                  {c.fundingInfo && (
                    <p className="funding-info">📊 {c.fundingInfo}</p>
                  )}
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="source-link">
                      🔗 Website
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {competitors?.competitiveGaps && competitors.competitiveGaps.length > 0 && (
            <div className="gaps-box">
              <h5>🎯 Competitive Gaps</h5>
              <ul>
                {competitors.competitiveGaps.map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
        </SignalSection>

        {/* Search Demand */}
        <SignalSection
          title="📊 Search Demand"
          subtitle="Market size, trends, and search interest"
          sectionKey="demand"
          expanded={expandedSections.demand}
          onToggle={toggleSection}
          badge={searchDemand?.trendDirection}
        >
          {searchDemand?.summary && <p className="signal-summary">{searchDemand.summary}</p>}

          <div className="demand-metrics">
            {searchDemand?.marketSize && (
              <div className="demand-metric">
                <span className="metric-label">Market Size</span>
                <span className="metric-value">{searchDemand.marketSize}</span>
              </div>
            )}
            {searchDemand?.growthRate && (
              <div className="demand-metric">
                <span className="metric-label">Growth Rate</span>
                <span className="metric-value">{searchDemand.growthRate}</span>
              </div>
            )}
          </div>

          {searchDemand?.searchIndicators && searchDemand.searchIndicators.length > 0 && (
            <div className="evidence-cards">
              {searchDemand.searchIndicators.map((ind, i) => (
                <div key={i} className="evidence-card">
                  <p>{ind.data}</p>
                  {ind.source && (
                    <a href={ind.source} target="_blank" rel="noopener noreferrer" className="source-link">
                      🔗 {ind.source.length > 50 ? ind.source.substring(0, 50) + '...' : ind.source}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchDemand?.relatedSearchTerms && searchDemand.relatedSearchTerms.length > 0 && (
            <div className="related-terms">
              <h5>Related Search Terms</h5>
              <div className="theme-tags">
                {searchDemand.relatedSearchTerms.map((term, i) => (
                  <span key={i} className="theme-tag search">{term}</span>
                ))}
              </div>
            </div>
          )}
        </SignalSection>

        {/* Early User Channels */}
        <SignalSection
          title="👥 Early User Communities"
          subtitle="Where potential early adopters already gather"
          sectionKey="channels"
          expanded={expandedSections.channels}
          onToggle={toggleSection}
          badge={earlyUserChannels?.communityDensity ? `Density: ${earlyUserChannels.communityDensity}` : null}
        >
          {earlyUserChannels?.summary && <p className="signal-summary">{earlyUserChannels.summary}</p>}

          {earlyUserChannels?.bestChannelsForLaunch && earlyUserChannels.bestChannelsForLaunch.length > 0 && (
            <div className="best-channels">
              <h5>🚀 Best Channels for Launch</h5>
              <div className="theme-tags">
                {earlyUserChannels.bestChannelsForLaunch.map((ch, i) => (
                  <span key={i} className="theme-tag channel">{ch}</span>
                ))}
              </div>
            </div>
          )}

          {earlyUserChannels?.channels && earlyUserChannels.channels.length > 0 && (
            <div className="channel-cards">
              {earlyUserChannels.channels.map((ch, i) => (
                <div key={i} className="channel-card">
                  <div className="channel-header">
                    <strong>{ch.name}</strong>
                    <span className="platform-tag">{ch.platform}</span>
                    <span className={`relevance-tag ${ch.relevance?.toLowerCase()}`}>
                      {ch.relevance}
                    </span>
                  </div>
                  {ch.estimatedSize && <p className="channel-size">👥 {ch.estimatedSize}</p>}
                  {ch.engagementLevel && <p className="channel-engagement">💬 {ch.engagementLevel}</p>}
                  {ch.url && (
                    <a href={ch.url} target="_blank" rel="noopener noreferrer" className="source-link">
                      🔗 Visit
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </SignalSection>
      </div>
    </div>
  )
}

/* Reusable collapsible section */
function SignalSection({ title, subtitle, sectionKey, expanded, onToggle, badge, children }) {
  return (
    <div className={`signal-section ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="signal-section-header" onClick={() => onToggle(sectionKey)}>
        <div className="section-title-group">
          <h3>{title}</h3>
          <p className="section-subtitle">{subtitle}</p>
        </div>
        <div className="section-controls">
          {badge && <span className={`volume-badge ${badge?.toLowerCase()}`}>{badge}</span>}
          <span className="toggle-icon">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>
      {expanded && <div className="signal-section-body">{children}</div>}
    </div>
  )
}

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim()
}

export default ValidationResults
