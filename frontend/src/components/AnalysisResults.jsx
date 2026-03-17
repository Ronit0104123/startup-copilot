import { useState } from 'react'

function AnalysisResults({ idea, results, analysisType }) {
  const [activeTab, setActiveTab] = useState(0)
  const [checkedItems, setCheckedItems] = useState(new Set())
  
  const toggleCheckItem = (itemId) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }
  
  // Export pitch deck functionality  
  const exportPitchDeck = (format) => {
    const pitchDeck = parseData(results.pitchDeck)
    if (!pitchDeck || !pitchDeck.slides) {
      alert('No pitch deck data available to export')
      return
    }
    
    if (format === 'google') {
      // Create actual Google Slides presentation
      createGoogleSlidesPresentation(pitchDeck, idea)
    } else if (format === 'pdf') {
      // Generate PDF using browser print
      const printContent = generatePrintableHTML(pitchDeck)
      const printWindow = window.open('', '_blank')
      printWindow.document.write(printContent)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }
  
  const generatePrintableHTML = (pitchDeck) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pitch Deck - ${idea}</title>
        <style>
          body { 
            font-family: 'Arial', sans-serif; 
            margin: 0; 
            padding: 20px;
            background: #fff;
            color: #333;
          }
          .slide { 
            page-break-after: always; 
            margin-bottom: 60px; 
            padding: 30px; 
            border: 2px solid #e1e1e1;
            border-radius: 12px;
            min-height: 500px;
          }
          .slide:last-child { page-break-after: avoid; }
          .slide-header { 
            background: linear-gradient(135deg, #007acc, #5856d6); 
            color: white;
            padding: 20px; 
            margin: -30px -30px 30px -30px; 
            border-radius: 12px 12px 0 0;
          }
          .slide-number { 
            background: rgba(255, 255, 255, 0.2); 
            color: white; 
            padding: 8px 15px; 
            border-radius: 20px; 
            font-size: 14px; 
            font-weight: bold;
            display: inline-block;
            margin-right: 15px;
          }
          .slide-title { 
            display: inline-block; 
            font-size: 24px; 
            font-weight: bold; 
            margin: 0;
          }
          h1 { color: #007acc; text-align: center; margin-bottom: 40px; }
          h3 { color: #007acc; margin-bottom: 15px; }
          h4 { color: #333; margin-bottom: 10px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; line-height: 1.4; }
          .executive-summary { 
            background: #f8f9ff; 
            padding: 20px; 
            margin-bottom: 30px; 
            border-left: 4px solid #007acc;
            border-radius: 8px;
          }
          .content-section { margin-bottom: 20px; }
          .highlight { 
            background: #fff3cd; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 10px 0;
          }
          @media print {
            body { margin: 0; }
            .slide { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>📊 ${idea}</h1>
        ${pitchDeck.executivesummary ? `
          <div class="executive-summary">
            <h3>🎯 Executive Summary</h3>
            <p>${pitchDeck.executivesummary}</p>
          </div>
        ` : ''}
        ${pitchDeck.slides.map(slide => `
          <div class="slide">
            <div class="slide-header">
              <span class="slide-number">${slide.slideNumber}</span>
              <h2 class="slide-title">${slide.title}</h2>
            </div>
            <div class="slide-content">
              ${slide.content.headline ? `<h3>${slide.content.headline}</h3>` : ''}
              ${Object.entries(slide.content).map(([key, value]) => {
                if (key === 'headline' || !value) return '';
                const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                if (Array.isArray(value)) {
                  return `<div class="content-section"><h4>${label}:</h4><ul>${value.map(item => `<li>${item}</li>`).join('')}</ul></div>`;
                } else {
                  return `<div class="content-section"><h4>${label}:</h4><p>${value}</p></div>`;
                }
              }).join('')}
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `
  }
  
  // Create actual Google Slides presentation
  const createGoogleSlidesPresentation = async (pitchDeck, idea) => {
    try {
      // Show loading state
      const button = document.querySelector('.export-btn.google-slides')
      const originalText = button.innerHTML
      button.innerHTML = `⏳ Creating...`
      button.disabled = true
      
      console.log('🚀 Creating Google Slides presentation...');
      const response = await fetch('/api/create-slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pitchDeck, idea }),
      });

      const result = await response.json();

      if (result.success) {
        // Create and open HTML presentation
        const blob = new Blob([result.htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Open in new tab
        window.open(url, '_blank');
        
        // Show success message
        alert('📈 Presentation created! \\n\\n✅ The presentation opened in a new tab with copy/import instructions.\\n\\n💡 Click "Copy All Text" and paste into Google Slides for best results!');
      } else {
        throw new Error(result.error || 'Failed to create presentation');
      }
      
    } catch (error) {
      console.error('❌ Error creating Google Slides:', error);
      alert('❌ Failed to create Google Slides presentation: ' + error.message);
    } finally {
      // Reset button
      setTimeout(() => {
        const button = document.querySelector('.export-btn.google-slides')
        if (button) {
          button.innerHTML = `📈 Google Slides`
          button.disabled = false
        }
      }, 1000)
    }
  }
  
  // Create slides via Google's template system
  const createSlidesViaTemplate = async (pitchDeck, idea) => {
    // Generate a structured presentation that Google can import
    const presentationData = formatForGoogleSlides(pitchDeck, idea);
    
    // Create a JSON file that Google Slides can import
    const jsonContent = JSON.stringify(presentationData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    // Create download link for the JSON structure
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${idea.substring(0, 30)}-slides-data.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Use Google's presentation creation API via URL
    const slidesUrl = createGoogleSlidesUrl(pitchDeck, idea);
    window.open(slidesUrl, '_blank');
    
    alert('📊 Opening Google Slides...\\n\\n💡 A structured data file has been downloaded. You can also import this for more detailed formatting!');
  }
  
  // Format data specifically for Google Slides
  const formatForGoogleSlides = (pitchDeck, idea) => {
    return {
      title: `Pitch Deck - ${idea}`,
      slides: [
        {
          layout: 'TITLE_SLIDE',
          title: `Pitch Deck - ${idea}`,
          subtitle: pitchDeck.executivesummary || ''
        },
        ...pitchDeck.slides.map(slide => ({
          layout: 'TITLE_AND_BODY',
          title: slide.title,
          body: formatSlideContentForSlides(slide.content)
        }))
      ]
    };
  }
  
  // Create Google Slides URL with parameters
  const createGoogleSlidesUrl = (pitchDeck, idea) => {
    const title = encodeURIComponent(`Pitch Deck - ${idea}`);
    
    // Use Google Slides creation with title parameter
    let baseUrl = `https://docs.google.com/presentation/create?title=${title}`;
    
    // Add template parameter if available
    const templateId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Generic template ID
    baseUrl += `&template=${templateId}`;
    
    return baseUrl;
  }
  
  // Format slide content for Google Slides
  const formatSlideContentForSlides = (content) => {
    let formattedContent = [];
    
    if (content.headline) {
      formattedContent.push(content.headline);
      formattedContent.push(''); // Empty line
    }
    
    Object.entries(content).forEach(([key, value]) => {
      if (key === 'headline' || !value) return;
      
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      
      if (Array.isArray(value)) {
        formattedContent.push(`${label}:`);
        value.forEach(item => {
          formattedContent.push(`• ${item}`);
        });
        formattedContent.push(''); // Empty line
      } else {
        formattedContent.push(`${label}: ${value}`);
        formattedContent.push(''); // Empty line
      }
    });
    
    return formattedContent.join('\\n');
  }
  
  // Generate Google Slides compatible HTML
  const generateGoogleSlidesHTML = (data) => {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${data.title}</title>
    <style>
        body { 
            font-family: 'Google Sans', 'Roboto', Arial, sans-serif; 
            margin: 0; 
            background: #f8f9fa;
            line-height: 1.5;
        }
        .presentation {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .slide {
            background: white;
            margin: 30px 0;
            padding: 60px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-height: 500px;
            page-break-after: always;
        }
        .slide-number {
            background: #1a73e8;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 20px;
        }
        .slide-title {
            color: #1a73e8;
            font-size: 48px;
            font-weight: 700;
            margin: 0 0 40px 0;
            line-height: 1.2;
        }
        .slide-subtitle {
            color: #5f6368;
            font-size: 24px;
            font-weight: 500;
            margin: 0 0 30px 0;
            line-height: 1.3;
        }
        .content-section {
            margin: 30px 0;
        }
        .content-section h3 {
            color: #202124;
            font-size: 28px;
            font-weight: 600;
            margin: 0 0 15px 0;
        }
        .content-section p {
            color: #5f6368;
            font-size: 20px;
            margin: 0 0 20px 0;
            line-height: 1.5;
        }
        .bullet-list {
            list-style: none;
            padding: 0;
            margin: 20px 0;
        }
        .bullet-list li {
            color: #202124;
            font-size: 20px;
            margin: 12px 0;
            padding-left: 30px;
            position: relative;
            line-height: 1.4;
        }
        .bullet-list li:before {
            content: '●';
            color: #1a73e8;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        .highlight-box {
            background: linear-gradient(135deg, #e8f0fe, #f1f8ff);
            border: 2px solid #1a73e8;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .metric-card {
            background: #f8f9fa;
            border: 2px solid #e8eaed;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .metric-card h4 {
            color: #1a73e8;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .metric-card p {
            color: #202124;
            font-size: 18px;
            font-weight: 500;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="presentation">
        <!-- Title Slide -->
        <div class="slide">
            <div class="slide-number">Cover</div>
            <h1 class="slide-title">${data.title}</h1>
            ${data.executiveSummary ? `
            <div class="highlight-box">
                <h3>Executive Summary</h3>
                <p>${data.executiveSummary}</p>
            </div>
            ` : ''}
        </div>
        
        <!-- Content Slides -->
        ${data.slides.map((slide, index) => `
        <div class="slide">
            <div class="slide-number">${slide.title}</div>
            <h1 class="slide-title">${slide.title}</h1>
            ${slide.content.headline ? `<p class="slide-subtitle">${slide.content.headline}</p>` : ''}
            ${formatSlideContentForHTML(slide.content)}
        </div>
        `).join('')}
    </div>
</body>
</html>`
  }
  
  // Format slide content for Google Slides HTML
  const formatSlideContentForHTML = (content) => {
    let html = ''
    
    // Handle special slide types
    if (content.tam && content.sam && content.som) {
      // Market Size slide
      html += `
        <div class="metric-grid">
            <div class="metric-card">
                <h4>TAM</h4>
                <p>${content.tam}</p>
            </div>
            <div class="metric-card">
                <h4>SAM</h4>
                <p>${content.sam}</p>
            </div>
            <div class="metric-card">
                <h4>SOM</h4>
                <p>${content.som}</p>
            </div>
        </div>
      `
    }
    
    // Handle other content
    Object.entries(content).forEach(([key, value]) => {
      if (['headline', 'tam', 'sam', 'som'].includes(key) || !value) return
      
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
      
      if (Array.isArray(value) && value.length > 0) {
        html += `
          <div class="content-section">
              <h3>${label}</h3>
              <ul class="bullet-list">
                  ${value.map(item => `<li>${item}</li>`).join('')}
              </ul>
          </div>
        `
      } else if (typeof value === 'string') {
        html += `
          <div class="content-section">
              <h3>${label}</h3>
              <p>${value}</p>
          </div>
        `
      }
    })
    
    return html
  }
  
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
    // 5 New Sections from the consolidated backend
    const marketValidation = parseData(results.marketValidation)
    const competitors = parseData(results.competitors)
    const gtmStrategy = parseData(results.gtmStrategy)
    const risks = parseData(results.risks)
    const executionPlan = parseData(results.executionPlan)

    const tabs = [
      { id: 0, label: 'Market Validation', icon: '🔬', color: 'accent' },
      { id: 1, label: 'Competitors', icon: '🎯', color: 'pink' },
      { id: 2, label: 'GTM Strategy', icon: '🚀', color: 'warning' },
      { id: 3, label: 'Risks', icon: '⚠️', color: 'danger' },
      { id: 4, label: 'Execution', icon: '✅', color: 'success' },
    ]

    const renderTabContent = () => {
      switch (activeTab) {
        case 0:
          return marketValidation && (
            <div className="tab-content validation-results">
              {typeof marketValidation === 'string' ? (
                <p>{marketValidation}</p>
              ) : (
                <div className="validation-grid">
                  <div className="summary-card">
                    <h5>📈 Market Opportunity</h5>
                    <p>{marketValidation.summary}</p>
                  </div>
                  
                  {marketValidation.demandScore && (
                    <div className="demand-score-header">
                      <p className="text-sm text-gray-400 uppercase tracking-wider mb-2 font-bold">Demand Verdict</p>
                      <div className={`score-badge verdict-${marketValidation.demandScore.overallVerdict.toLowerCase().includes('strong') ? 'strong' : marketValidation.demandScore.overallVerdict.toLowerCase().includes('weak') ? 'weak' : 'moderate'}`}>
                        {marketValidation.demandScore.overallVerdict}
                      </div>
                      <p className="recommendation mt-4"><strong>Recommendation:</strong> {marketValidation.demandScore.recommendation}</p>
                    </div>
                  )}

                  <div className="signal-sections">
                    <div className="signal-section main-insights">
                      <h4>📊 Market Data</h4>
                      {marketValidation.marketAnalysis && (
                        <div className="stats-grid">
                          <div className="stat-box">
                            <span className="stat-label">TAM</span>
                            <span className="stat-value">{marketValidation.marketAnalysis.tamSize}</span>
                          </div>
                          {marketValidation.marketAnalysis.growthRate && (
                            <div className="stat-box">
                              <span className="stat-label">Growth</span>
                              <span className="stat-value">{marketValidation.marketAnalysis.growthRate}</span>
                            </div>
                          )}
                          <div className="stat-box">
                            <span className="stat-label">Pain Level</span>
                            <span className="stat-value">{marketValidation.marketAnalysis.customerPain}/10</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {marketValidation.evidence && marketValidation.evidence.painSignals && marketValidation.evidence.painSignals.length > 0 && (
                      <div className="signal-section pain-points">
                        <h4>🔥 Real Pain Signals</h4>
                        <div className="evidence-grid">
                          {marketValidation.evidence.painSignals.map((signal, i) => (
                            <div key={i} className="evidence-card">
                              <span className="source-tag">{signal.source}</span>
                              <p className="quote">"{signal.quote}"</p>
                              {signal.painLevel && <span className={`intensity-tag ${signal.painLevel.toLowerCase()}`}>{signal.painLevel}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {marketValidation.evidence && marketValidation.evidence.solutionSeeking && marketValidation.evidence.solutionSeeking.length > 0 && (
                      <div className="signal-section seeking">
                        <h4>🔍 Solution Seeking Behavior</h4>
                        <div className="evidence-grid">
                          {marketValidation.evidence.solutionSeeking.map((signal, i) => (
                            <div key={i} className="evidence-card">
                              <span className="source-tag">{signal.source}</span>
                              <p className="quote">"{signal.query}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
                <div className="analysis-grid">
                  {competitors.marketGap && (
                    <div className="content-block full-width highlight">
                      <h5>🎯 The Golden Opportunity</h5>
                      <p>{competitors.marketGap}</p>
                      {competitors.entryStrategy && <p className="mt-2"><strong>Wedge Strategy:</strong> {competitors.entryStrategy}</p>}
                    </div>
                  )}
                  
                  {competitors.marketDominance && (
                    <div className="analysis-card market-leader">
                      <h5>👑 Market Dominance</h5>
                      {competitors.marketDominance.leader ? (
                        <>
                          <p><strong>Leader:</strong> {competitors.marketDominance.leader}</p>
                          <p><strong>Share:</strong> {competitors.marketDominance.marketShare}</p>
                          <p><strong>Moat Strength:</strong> {competitors.marketDominance.moatStrength}/10</p>
                        </>
                      ) : (
                        <p>No clear market leader established yet.</p>
                      )}
                    </div>
                  )}
                  
                  {competitors.bigTechThreat && (
                    <div className="analysis-card big-tech">
                      <h5>🦍 Big Tech Threat</h5>
                      <p><strong>Risk:</strong> <span className={`risk-badge ${competitors.bigTechThreat.riskLevel?.toLowerCase()}`}>{competitors.bigTechThreat.riskLevel}</span></p>
                      <p><strong>Timeline:</strong> {competitors.bigTechThreat.timeline}</p>
                      <p><strong>Defense:</strong> {competitors.bigTechThreat.preventionStrategy}</p>
                    </div>
                  )}

                  {competitors.directCompetitors && competitors.directCompetitors.length > 0 && (
                    <div className="competitors-list full-width mt-4">
                      <h5>⚔️ Existing Solutions</h5>
                      {competitors.directCompetitors.map((comp, i) => (
                        <div key={i} className="competitor-card">
                          <div className="comp-header">
                            <strong>{comp.name}</strong>
                            {comp.pricing && <span className="pricing-tag">{comp.pricing}</span>}
                          </div>
                          <p className="desc">{comp.description}</p>
                          {comp.weaknesses && <p className="weakness"><strong>Vulnerability:</strong> {comp.weaknesses}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {competitors.workarounds && competitors.workarounds.length > 0 && (
                    <div className="workarounds-list full-width mt-4">
                      <h5>🛠️ Manual Workarounds (Current Status Quo)</h5>
                      <div className="evidence-grid">
                        {competitors.workarounds.map((w, i) => (
                          <div key={i} className="evidence-card">
                            <strong>{w.method}</strong>
                            <p className="mt-1">{w.painWithWorkaround}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )

        case 2:
          return gtmStrategy && (
            <div className="tab-content">
              {typeof gtmStrategy === 'string' ? (
                <p>{gtmStrategy}</p>
              ) : (
                <div className="analysis-grid">
                  <div className="content-block full-width highlight">
                    <h5>🎯 Core Value Proposition</h5>
                    <p>{gtmStrategy.valueProposition}</p>
                  </div>
                  
                  <div className="target-audience full-width">
                    <h5>👥 Target Audience</h5>
                    <p>{gtmStrategy.targetAudience}</p>
                  </div>

                  {gtmStrategy.earlyUserCommunities && gtmStrategy.earlyUserCommunities.length > 0 && (
                    <div className="communities-list full-width mt-4">
                      <h5>🏕️ First 100 Users Strategy</h5>
                      <div className="evidence-grid">
                        {gtmStrategy.earlyUserCommunities.map((comm, i) => (
                          <div key={i} className="evidence-card">
                            <div className="flex-between">
                              <strong>{comm.name}</strong>
                              <span className="platform-tag">{comm.platform}</span>
                            </div>
                            <p className="mt-2 text-sm">{comm.strategy}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {gtmStrategy.channels && gtmStrategy.channels.length > 0 && (
                    <div className="channels-list full-width mt-4">
                      <h5>📣 Scalable Channels</h5>
                      {gtmStrategy.channels.map((channel, i) => (
                        <div key={i} className="channel-item">
                          <div className="channel-header">
                            <strong>{channel.channel || channel.name}</strong>
                            <span className={`priority-badge ${channel.priority?.toLowerCase()}`}>{channel.priority}</span>
                          </div>
                          <p>{channel.strategy}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )

        case 3:
          return risks && (
            <div className="tab-content risk-section">
              {typeof risks === 'string' ? (
                <p>{risks}</p>
              ) : (
                <>
                  {risks.mortalityScore && (
                    <div className="mortality-overview">
                      <h5>💀 Startup Mortality Analysis</h5>
                      <div className="mortality-score">
                        <span className="score">{risks.mortalityScore}</span>
                        <span className="score-label">Death Risk Score</span>
                      </div>
                      {risks.primaryDeathRisk && <p className="primary-death-risk"><strong>Most Likely Death Scenario:</strong> {risks.primaryDeathRisk}</p>}
                    </div>
                  )}

                  <div className="assumptions-strategy-grid mt-4">
                    {risks.criticalAssumptions && risks.criticalAssumptions.length > 0 && (
                      <div className="analysis-card critical-assumptions">
                        <h5>🎯 Critical Assumptions</h5>
                        <ul>
                          {risks.criticalAssumptions.map((assumption, i) => (
                            <li key={i}>{assumption}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {risks.survivalStrategy && (
                      <div className="analysis-card survival-strategy">
                        <h5>🛡️ Survival Strategy</h5>
                        <p>{risks.survivalStrategy}</p>
                      </div>
                    )}
                  </div>

                  {risks.marketRisks && risks.marketRisks.length > 0 && (
                    <div className="risk-category mt-4">
                      <h6>📊 Market Risks</h6>
                      {risks.marketRisks.map((r, i) => (
                        <div key={i} className="enhanced-risk-card market">
                          <div className="risk-header">
                            <strong>{r.risk}</strong>
                            <span className="probability">{r.probability}</span>
                          </div>
                          {r.mitigation && <p className="mitigation"><strong>Mitigation:</strong> {r.mitigation}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {risks.executionRisks && risks.executionRisks.length > 0 && (
                    <div className="risk-category mt-4">
                      <h6>🎯 Execution Risks</h6>
                      {risks.executionRisks.map((r, i) => (
                        <div key={i} className="enhanced-risk-card execution">
                          <div className="risk-header">
                            <strong>{r.risk}</strong>
                            <span className="probability">{r.probability}</span>
                          </div>
                          {r.earlyWarning && <p className="early-warning"><strong>Warning Signs:</strong> {r.earlyWarning}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {risks.competitiveThreats && risks.competitiveThreats.length > 0 && (
                    <div className="risk-category mt-4">
                      <h6>⚔️ Competitive Threats</h6>
                      {risks.competitiveThreats.map((t, i) => (
                        <div key={i} className="enhanced-risk-card competitor">
                          <div className="risk-header">
                            <strong>{t.threat}</strong>
                            <span className="timeline">{t.timeline}</span>
                          </div>
                          {t.response && <p className="response"><strong>Response:</strong> {t.response}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )

        case 4:
          return executionPlan && (
            <div className="tab-content">
              {typeof executionPlan === 'string' ? (
                <p>{executionPlan}</p>
              ) : (
                <div className="execution-grid">
                  
                  {/* PITCH DECK SECTION */}
                  {executionPlan.pitchDeck && executionPlan.pitchDeck.slides && (
                    <div className="pitch-deck-container mb-8">
                      <div className="deck-header flex-between mb-4">
                        <h4>🎤 Narrative / Pitch Deck</h4>
                        <div className="export-actions">
                          <button onClick={() => exportPitchDeck('pdf')} className="export-btn outline">
                            📄 Export PDF
                          </button>
                        </div>
                      </div>
                      
                      {executionPlan.pitchDeck.executiveSummary && (
                        <div className="executive-summary highlight mb-4">
                          <strong>Executive Summary:</strong> {executionPlan.pitchDeck.executiveSummary}
                        </div>
                      )}

                      <div className="slides-container">
                        {executionPlan.pitchDeck.slides.map((slide, i) => (
                          <div key={i} className="slide-card">
                            <div className="slide-header">
                              <span className="slide-number">{slide.slideNumber || i + 1}</span>
                              <h5>{slide.title}</h5>
                            </div>
                            <div className="slide-content">
                              {Object.entries(slide.content || {}).map(([key, value]) => {
                                if (!value) return null;
                                return (
                                  <div key={key} className="slide-section mb-2">
                                    <strong className="text-sm text-gray-400 block mb-1 uppercase tracking-wider">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </strong>
                                    {Array.isArray(value) ? (
                                      <ul className="list-disc pl-5 mb-2">
                                        {value.map((v, idx) => (
                                          <li key={idx} className="text-sm mb-1">{v}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm">{value}</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CHECKLIST SECTION */}
                  {executionPlan.checklist && (
                    <div className="checklist-container">
                      <h4>✅ Next 90 Days Execution</h4>
                      <div className="analysis-grid mt-4">
                        {Object.entries(executionPlan.checklist).map(([period, items]) => {
                          if (!items || !items.length) return null;
                          const periodTitles = {
                            week1: '📅 Week 1',
                            week2to4: '📅 Weeks 2-4',
                            month2to3: '📅 Months 2-3'
                          }
                          return (
                            <div key={period} className="checklist-group">
                              <h5>{periodTitles[period] || period}</h5>
                              {items.map((item, i) => {
                                const itemId = `${period}-${i}`
                                const isChecked = checkedItems.has(itemId)
                                return (
                                  <div 
                                    key={i} 
                                    className={`checklist-item ${isChecked ? 'checked' : ''}`}
                                    onClick={() => toggleCheckItem(itemId)}
                                  >
                                    <span className="checkbox">{isChecked ? '✓' : '☐'}</span>
                                    <span>{item.task || item}</span>
                                    {item.priority && <span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span>}
                                    {item.category && <span className="category-tag">{item.category}</span>}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
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
        <div className="tab-pane-container">
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
