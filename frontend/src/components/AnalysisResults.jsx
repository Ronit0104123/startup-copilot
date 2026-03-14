import { useState } from 'react'

function AnalysisResults({ idea, results, analysisType }) {
  const [activeTab, setActiveTab] = useState(0)
  
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
    const analysis = parseData(results.analysis)
    const competitors = parseData(results.competitors)
    const gtm = parseData(results.gtmPlan)
    const pitchDeck = parseData(results.pitchDeck)
    const risk = parseData(results.riskAssessment)
    const checklist = parseData(results.checklist)

    const tabs = [
      { id: 0, label: 'Analysis', icon: '📊', color: 'primary' },
      { id: 1, label: 'Competitors', icon: '🎯', color: 'pink' },
      { id: 2, label: 'GTM Strategy', icon: '🚀', color: 'warning' },
      { id: 3, label: 'Pitch Deck', icon: '🎯', color: 'success' },
      { id: 4, label: 'Risks', icon: '⚠️', color: 'danger' },
      { id: 5, label: 'Action Plan', icon: '✅', color: 'accent' },
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
                  {/* Summary */}
                  {analysis.summary && (
                    <div className="analysis-card summary-card">
                      <h5>📋 Executive Summary</h5>
                      <p>{analysis.summary}</p>
                    </div>
                  )}

                  {/* Verdict - prominently displayed */}
                  {analysis.verdict && (
                    <div className={`analysis-card verdict ${analysis.verdict.toLowerCase().replace('-', '').replace('_', '')}`}>
                      <h5>🎯 Investment Verdict</h5>
                      <p className="verdict-text">{analysis.verdict}</p>
                      {analysis.verdictReason && <p className="verdict-reason"><strong>Analysis:</strong> {analysis.verdictReason}</p>}
                    </div>
                  )}

                  {/* Market Analysis */}
                  {analysis.marketAnalysis && (
                    <div className="analysis-card market-analysis">
                      <h5>📊 Market Assessment</h5>
                      {analysis.marketAnalysis.tamSize && <p><strong>Market Size:</strong> {analysis.marketAnalysis.tamSize}</p>}
                      {analysis.marketAnalysis.timingAnalysis && <p><strong>Market Timing:</strong> {analysis.marketAnalysis.timingAnalysis}</p>}
                      {analysis.marketAnalysis.customerPain && <p><strong>Customer Pain Points:</strong> {analysis.marketAnalysis.customerPain}</p>}
                      {analysis.marketAnalysis.monetizationEvidence && <p><strong>Revenue Evidence:</strong> {analysis.marketAnalysis.monetizationEvidence}</p>}
                    </div>
                  )}

                  {/* Business Viability */}
                  {analysis.businessViability && (
                    <div className="analysis-card business-model">
                      <h5>💰 Business Model</h5>
                      {analysis.businessViability.revenueModel && <p><strong>Revenue Model:</strong> {analysis.businessViability.revenueModel}</p>}
                      {analysis.businessViability.unitEconomics && <p><strong>Unit Economics:</strong> {analysis.businessViability.unitEconomics}</p>}
                      {analysis.businessViability.scalingChallenges && <p><strong>Scaling Challenges:</strong> {analysis.businessViability.scalingChallenges}</p>}
                    </div>
                  )}

                  {/* Competitive Reality */}
                  {analysis.competitiveReality && (
                    <div className="analysis-card competitive-reality">
                      <h5>⚡ Competitive Landscape</h5>
                      {analysis.competitiveReality.majorThreats && <p><strong>Major Threats:</strong> {analysis.competitiveReality.majorThreats}</p>}
                      {analysis.competitiveReality.failurePatterns && <p><strong>Common Failures:</strong> {analysis.competitiveReality.failurePatterns}</p>}
                      {analysis.competitiveReality.defensibilityScore && <p><strong>Defensibility:</strong> {analysis.competitiveReality.defensibilityScore}</p>}
                    </div>
                  )}

                  {/* Strengths & Challenges Grid */}
                  <div className="strengths-challenges-grid">
                    {analysis.strengths && analysis.strengths.length > 0 && (
                      <div className="analysis-card strengths">
                        <h5>✅ Key Strengths</h5>
                        {renderList(analysis.strengths)}
                      </div>
                    )}
                    {analysis.challenges && analysis.challenges.length > 0 && (
                      <div className="analysis-card challenges">
                        <h5>⚠️ Critical Challenges</h5>
                        {renderList(analysis.challenges)}
                      </div>
                    )}
                  </div>

                  {/* Next Steps */}
                  {analysis.nextSteps && analysis.nextSteps.length > 0 && (
                    <div className="analysis-card next-steps">
                      <h5>🚀 Recommended Actions</h5>
                      {renderList(analysis.nextSteps)}
                    </div>
                  )}

                  {/* Legacy backward compatibility fields */}
                  {analysis.redFlags && analysis.redFlags.length > 0 && (
                    <div className="analysis-card red-flags">
                      <h5>🚨 Critical Red Flags</h5>
                      {renderList(analysis.redFlags)}
                    </div>
                  )}
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
                  {/* Market Dominance Analysis */}
                  {competitors.marketDominance && (
                    <div className="analysis-card market-dominance">
                      <h5>👑 Market Dominance</h5>
                      <p><strong>Market Leader:</strong> {competitors.marketDominance.leader}</p>
                      {competitors.marketDominance.marketShare && <p><strong>Market Share:</strong> {competitors.marketDominance.marketShare}</p>}
                      {competitors.marketDominance.moatStrength && <p><strong>Defensibility Score:</strong> {competitors.marketDominance.moatStrength}/10</p>}
                    </div>
                  )}

                  {/* Enhanced Direct Competitors */}
                  {competitors.directCompetitors && competitors.directCompetitors.length > 0 && (
                    <div className="analysis-card competitors-analysis">
                      <h5>🎯 Direct Competitors</h5>
                      <div className="competitors-list">
                        {competitors.directCompetitors.map((c, i) => (
                          <div key={i} className="competitor-item">
                            <h6>{c.name}</h6>
                            <p>{c.description}</p>
                            {c.funding && <p className="competitor-detail"><strong>Funding:</strong> {c.funding}</p>}
                            {c.strengths && <p className="competitor-detail"><strong>Strengths:</strong> {c.strengths}</p>}
                            {c.weaknesses && <p className="competitor-detail"><strong>Weaknesses:</strong> {c.weaknesses}</p>}
                            {c.customerBase && <p className="competitor-detail"><strong>Customer Base:</strong> {c.customerBase}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failed Attempts Analysis */}
                  {competitors.failedAttempts && competitors.failedAttempts.length > 0 && (
                    <div className="analysis-card failed-attempts">
                      <h5>💀 Failed Attempts</h5>
                      <div className="failures-list">
                        {competitors.failedAttempts.map((f, i) => (
                          <div key={i} className="failure-item">
                            <h6>{f.name}</h6>
                            <p><strong>Why they failed:</strong> {f.failureReason}</p>
                            <p><strong>Key lesson:</strong> {f.lessonLearned}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Big Tech Threat Assessment */}
                  {competitors.bigTechThreat && (
                    <div className={`analysis-card big-tech-threat ${competitors.bigTechThreat.riskLevel?.toLowerCase()}-risk`}>
                      <h5>🏢 Big Tech Threat</h5>
                      <p><strong>Risk Level:</strong> <span className="threat-level">{competitors.bigTechThreat.riskLevel}</span></p>
                      {competitors.bigTechThreat.timeline && <p><strong>Expected Timeline:</strong> {competitors.bigTechThreat.timeline}</p>}
                      {competitors.bigTechThreat.preventionStrategy && <p><strong>Defense Strategy:</strong> {competitors.bigTechThreat.preventionStrategy}</p>}
                    </div>
                  )}

                  {/* Legacy indirect competitors for backward compatibility */}
                  {competitors.indirectCompetitors && (
                    <div className="competitor-group">
                      <h5>🔄 Indirect Competitors</h5>
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

                  {/* Market Entry Strategy */}
                  <div className="market-insights-grid">
                    {competitors.marketGap && (
                      <div className="analysis-card market-gap">
                        <h5>🎯 Market Opportunity</h5>
                        <p>{competitors.marketGap}</p>
                      </div>
                    )}
                    {competitors.entryStrategy && (
                      <div className="analysis-card entry-strategy">
                        <h5>🚀 Entry Strategy</h5>
                        <p>{competitors.entryStrategy}</p>
                      </div>
                    )}
                  </div>

                  {/* Legacy indirect competitors */}
                  {competitors.indirectCompetitors && competitors.indirectCompetitors.length > 0 && (
                    <div className="analysis-card indirect-competitors">
                      <h5>🔄 Indirect Competitors</h5>
                      <ul>
                        {competitors.indirectCompetitors.map((c, i) => (
                          <li key={i}><strong>{c.name}:</strong> {c.description} {c.threat && `(Threat: ${c.threat})`}</li>
                        ))}
                      </ul>
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
                <div className="analysis-grid">
                  {/* Target Audience */}
                  {gtm.targetAudience && (
                    <div className="analysis-card target-audience">
                      <h5>🎯 Target Audience</h5>
                      <p>{gtm.targetAudience}</p>
                    </div>
                  )}

                  {/* Value Proposition */}
                  {gtm.valueProposition && (
                    <div className="analysis-card value-proposition">
                      <h5>💎 Value Proposition</h5>
                      <p>{gtm.valueProposition}</p>
                    </div>
                  )}

                  {/* Pricing Strategy */}
                  {gtm.pricing && (
                    <div className="analysis-card pricing-strategy">
                      <h5>💰 Pricing Strategy</h5>
                      <p>{typeof gtm.pricing === 'object' ? gtm.pricing.model : gtm.pricing}</p>
                      {gtm.pricing.tiers && (
                        <ul>
                          {gtm.pricing.tiers.map((tier, i) => (
                            <li key={i}>{tier}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Marketing Channels */}
                  {gtm.channels && (
                    <div className="analysis-card marketing-channels">
                      <h5>📢 Marketing Channels</h5>
                      {Array.isArray(gtm.channels) ? (
                        <ul>
                          {gtm.channels.map((ch, i) => (
                            <li key={i}>{typeof ch === 'object' ? `${ch.channel}: ${ch.strategy}` : ch}</li>
                          ))}
                        </ul>
                      ) : <p>{gtm.channels}</p>}
                    </div>
                  )}

                  {/* Launch Strategy */}
                  {gtm.launchStrategy && (
                    <div className="analysis-card launch-strategy">
                      <h5>🚀 Launch Strategy</h5>
                      <p>{gtm.launchStrategy}</p>
                    </div>
                  )}

                  {/* Key Metrics */}
                  {gtm.metrics && gtm.metrics.length > 0 && (
                    <div className="analysis-card key-metrics">
                      <h5>📈 Key Metrics</h5>
                      <ul>
                        {gtm.metrics.map((metric, i) => (
                          <li key={i}>{metric}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        
        case 3:
          return pitchDeck && (
            <div className="tab-content pitch-deck-tab">
              {typeof pitchDeck === 'string' ? (
                <p>{pitchDeck}</p>
              ) : (
                <div className="pitch-deck-container">
                  {/* Export buttons always visible */}
                  <div className="pitch-deck-header">
                    <h3>🎯 Pitch Deck</h3>
                    <div className="export-options">
                      <button className="export-btn google-slides" onClick={() => exportPitchDeck('google')}>
                        📈 Google Slides
                      </button>
                      <button className="export-btn pdf" onClick={() => exportPitchDeck('pdf')}>
                        📄 Export PDF
                      </button>
                    </div>
                  </div>
                  
                  {pitchDeck.executivesummary && (
                    <div className="pitch-summary">
                      <div className="summary-header">
                        <h4>📋 Executive Summary</h4>
                      </div>
                      <p className="summary-text">{pitchDeck.executivesummary}</p>
                    </div>
                  )}
                  
                  {pitchDeck.slides && (
                    <div className="slides-container">
                      {pitchDeck.slides.map((slide, i) => (
                        <div key={i} className="slide">
                          <div className="slide-header-bar">
                            <span className="slide-num">{slide.slideNumber}</span>
                            <h3 className="slide-title">{slide.title}</h3>
                            <div className="slide-indicator"></div>
                          </div>
                          
                          <div className="slide-body">
                            {slide.content.headline && (
                              <div className="slide-headline">
                                <h4>{slide.content.headline}</h4>
                              </div>
                            )}
                            
                            {/* Problem Slide */}
                            {slide.title === 'Problem' && (
                              <div className="slide-grid">
                                {slide.content.painPoints && (
                                  <div className="content-block">
                                    <h5>😔 Key Pain Points</h5>
                                    <ul>{slide.content.painPoints.map((p, j) => <li key={j}>{p}</li>)}</ul>
                                  </div>
                                )}
                                {slide.content.marketSize && (
                                  <div className="content-block highlight">
                                    <h5>📊 Market Impact</h5>
                                    <p>{slide.content.marketSize}</p>
                                  </div>
                                )}
                                {slide.content.urgency && (
                                  <div className="content-block">
                                    <h5>⏰ Why Now</h5>
                                    <p>{slide.content.urgency}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Solution Slide */}
                            {slide.title === 'Solution' && (
                              <div className="slide-grid">
                                {slide.content.keyFeatures && (
                                  <div className="content-block">
                                    <h5>✨ Key Features</h5>
                                    <ul>{slide.content.keyFeatures.map((f, j) => <li key={j}>{f}</li>)}</ul>
                                  </div>
                                )}
                                {slide.content.magicMoment && (
                                  <div className="content-block highlight">
                                    <h5>🎆 The Magic Moment</h5>
                                    <p>{slide.content.magicMoment}</p>
                                  </div>
                                )}
                                {slide.content.demo && (
                                  <div className="content-block">
                                    <h5>📱 Product Demo</h5>
                                    <p>{slide.content.demo}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Market Size Slide */}
                            {slide.title === 'Market Size' && (
                              <div className="market-metrics">
                                <div className="metric-card tam">
                                  <h5>TAM</h5>
                                  <p>{slide.content.tam}</p>
                                </div>
                                <div className="metric-card sam">
                                  <h5>SAM</h5>
                                  <p>{slide.content.sam}</p>
                                </div>
                                <div className="metric-card som">
                                  <h5>SOM</h5>
                                  <p>{slide.content.som}</p>
                                </div>
                                {slide.content.growth && (
                                  <div className="content-block full-width">
                                    <h5>📈 Market Growth</h5>
                                    <p>{slide.content.growth}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Business Model Slide */}
                            {slide.title === 'Business Model' && (
                              <div className="slide-grid">
                                <div className="content-block">
                                  <h5>💰 Revenue Model</h5>
                                  <p>{slide.content.revenueModel}</p>
                                </div>
                                <div className="content-block">
                                  <h5>🏷️ Pricing</h5>
                                  <p>{slide.content.pricing}</p>
                                </div>
                                {slide.content.unitEconomics && (
                                  <div className="content-block highlight">
                                    <h5>📊 Unit Economics</h5>
                                    <p>{slide.content.unitEconomics}</p>
                                  </div>
                                )}
                                {slide.content.revenueStreams && (
                                  <div className="content-block">
                                    <h5>💵 Revenue Streams</h5>
                                    <ul>{slide.content.revenueStreams.map((r, j) => <li key={j}>{r}</li>)}</ul>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Traction Slide */}
                            {slide.title === 'Traction' && (
                              <div className="slide-grid">
                                {slide.content.keyMetrics && (
                                  <div className="content-block highlight">
                                    <h5>📊 Key Metrics</h5>
                                    <p>{slide.content.keyMetrics}</p>
                                  </div>
                                )}
                                {slide.content.milestones && (
                                  <div className="content-block">
                                    <h5>🏆 Milestones</h5>
                                    <ul>{slide.content.milestones.map((m, j) => <li key={j}>{m}</li>)}</ul>
                                  </div>
                                )}
                                {slide.content.growth && (
                                  <div className="content-block">
                                    <h5>🚀 Growth Rate</h5>
                                    <p>{slide.content.growth}</p>
                                  </div>
                                )}
                                {slide.content.projections && (
                                  <div className="content-block">
                                    <h5>🔮 Projections</h5>
                                    <p>{slide.content.projections}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Generic content for other slides */}
                            {!['Problem', 'Solution', 'Market Size', 'Business Model', 'Traction'].includes(slide.title) && (
                              <div className="slide-grid">
                                {Object.entries(slide.content).map(([key, value]) => {
                                  if (key === 'headline') return null;
                                  return (
                                    <div key={key} className="content-block">
                                      <h5>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</h5>
                                      {Array.isArray(value) ? (
                                        <ul>{value.map((item, j) => <li key={j}>{item}</li>)}</ul>
                                      ) : (
                                        <p>{value}</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        
        case 4:
          return risk && (
            <div className="tab-content">
              {typeof risk === 'string' ? (
                <p>{risk}</p>
              ) : (
                <div className="risk-section">
                  {/* Mortality Score */}
                  {risk.mortalityScore && (
                    <div className="mortality-overview">
                      <h5>💀 Startup Mortality Analysis</h5>
                      <div className="mortality-score">
                        <span className="score">{risk.mortalityScore}</span>
                        <span className="score-label">Death Risk Score</span>
                      </div>
                      {risk.primaryDeathRisk && <p className="primary-death-risk"><strong>Most Likely Death Scenario:</strong> {risk.primaryDeathRisk}</p>}
                    </div>
                  )}

                  {/* Market Risks */}
                  {risk.marketRisks && risk.marketRisks.length > 0 && (
                    <div className="risk-category">
                      <h6>📊 Market Risks</h6>
                      {risk.marketRisks.map((r, i) => (
                        <div key={i} className="enhanced-risk-card market">
                          <div className="risk-header">
                            <strong>{r.risk}</strong>
                            <span className="probability">{r.probability}</span>
                          </div>
                          <p className="impact"><strong>Impact:</strong> {r.impact}</p>
                          {r.mitigation && <p className="mitigation"><strong>Mitigation:</strong> {r.mitigation}</p>}
                          {r.testable && <p className="testable"><strong>How to Test:</strong> {r.testable}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Execution Risks */}
                  {risk.executionRisks && risk.executionRisks.length > 0 && (
                    <div className="analysis-card execution-risks">
                      <h5>🎯 Execution Risks</h5>
                      <div className="risks-list">
                        {risk.executionRisks.map((r, i) => (
                          <div key={i} className="risk-item">
                            <h6>{r.risk}</h6>
                            <p><strong>Probability:</strong> {r.probability}</p>
                            <p><strong>Impact:</strong> {r.impact}</p>
                            {r.mitigation && <p><strong>Prevention:</strong> {r.mitigation}</p>}
                            {r.earlyWarning && <p><strong>Warning Signs:</strong> {r.earlyWarning}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Competitive Threats */}
                  {risk.competitiveThreats && risk.competitiveThreats.length > 0 && (
                    <div className="analysis-card competitive-threats">
                      <h5>⚔️ Competitive Threats</h5>
                      <div className="risks-list">
                        {risk.competitiveThreats.map((t, i) => (
                          <div key={i} className="risk-item">
                            <h6>{t.threat}</h6>
                            <p><strong>Timeline:</strong> {t.timeline}</p>
                            {t.defensibility && <p><strong>Defensibility Score:</strong> {t.defensibility}/10</p>}
                            {t.response && <p><strong>Counter-Strategy:</strong> {t.response}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Critical Assumptions & Strategy */}
                  <div className="assumptions-strategy-grid">
                    {risk.criticalAssumptions && risk.criticalAssumptions.length > 0 && (
                      <div className="analysis-card critical-assumptions">
                        <h5>🎯 Critical Assumptions</h5>
                        <ul>
                          {risk.criticalAssumptions.map((assumption, i) => (
                            <li key={i}>{assumption}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {risk.survivalStrategy && (
                      <div className="analysis-card survival-strategy">
                        <h5>🛡️ Survival Strategy</h5>
                        <p>{risk.survivalStrategy}</p>
                      </div>
                    )}
                  </div>

                  {/* Death Spiral Scenario */}
                  {risk.deathSpiral && (
                    <div className="analysis-card death-spiral">
                      <h5>💀 Failure Scenario</h5>
                      <p>{risk.deathSpiral}</p>
                    </div>
                  )}

                  {/* Legacy risk format for backward compatibility */}
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
        
        case 5:
          return checklist && (
            <div className="tab-content">
              {typeof checklist === 'string' ? (
                <p>{checklist}</p>
              ) : (
                <div className="analysis-grid">
                  {checklist.week1 && (
                    <div className="analysis-card week1-actions">
                      <h5>📅 Week 1 Priority Actions</h5>
                      <ul>
                        {checklist.week1.map((item, i) => (
                          <li key={i}>{item.task || item.action || item.title || item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {checklist.week2to4 && (
                    <div className="analysis-card week2to4-actions">
                      <h5>📅 Weeks 2-4 Follow-up Actions</h5>
                      <ul>
                        {checklist.week2to4.map((item, i) => (
                          <li key={i}>{item.task || item.action || item.title || item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {checklist.month2to3 && (
                    <div className="analysis-card monthly-actions">
                      <h5>📆 Months 2-3 Strategic Actions</h5>
                      <ul>
                        {checklist.month2to3.map((item, i) => (
                          <li key={i}>{item.task || item.action || item.title || item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!checklist.week1 && !checklist.week2to4 && !checklist.month2to3 && (
                    <div className="analysis-card general-actions">
                      <h5>📋 Action Items</h5>
                      <ul>
                        {(checklist.items || checklist.tasks || (Array.isArray(checklist) ? checklist : []))?.map?.((item, i) => (
                          <li key={i}>{typeof item === 'object' ? (item.task || item.action || item.title) : item}</li>
                        ))}
                      </ul>
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
