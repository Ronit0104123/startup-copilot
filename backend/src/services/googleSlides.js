// Working Google Slides integration - creates HTML presentation for import
export async function createGoogleSlidesPresentation(pitchDeckData, idea) {
  try {
    // Generate HTML content that can be imported into Google Slides
    const htmlContent = generateSlidesHTML(pitchDeckData, idea);
    
    return {
      success: true,
      htmlContent,
      importInstructions: {
        step1: "Copy all the text from the generated presentation",
        step2: "Go to slides.google.com and create a new presentation",
        step3: "Paste the content and format as needed"
      }
    };
  } catch (error) {
    console.error('Error creating Google Slides presentation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function generateSlidesHTML(pitchDeckData, idea) {
  const slides = [];
  
  // Title slide
  slides.push({
    type: 'title',
    title: idea,
    subtitle: pitchDeckData.executiveSummary || pitchDeckData.executivesummary || 'Startup Pitch Deck'
  });
  
  // Content slides
  pitchDeckData.slides.forEach((slide, index) => {
    const slideContent = {
      type: 'content',
      title: slide.title,
      content: []
    };
    
    if (slide.content.headline) {
      slideContent.content.push(slide.content.headline);
    }
    
    Object.entries(slide.content).forEach(([key, value]) => {
      if (key === 'headline' || !value) return;
      
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      if (Array.isArray(value)) {
        slideContent.content.push(`${label}:`);
        value.forEach(item => slideContent.content.push(`• ${item}`));
      } else {
        slideContent.content.push(`${label}: ${value}`);
      }
    });
    
    slides.push(slideContent);
  });
  
  return generatePresentationHTML(slides, idea);
}

function generatePresentationHTML(slides, idea) {
  const slideHtml = slides.map((slide, index) => {
    if (slide.type === 'title') {
      return `
        <div class="slide title-slide">
          <h1>${slide.title}</h1>
          <h2>${slide.subtitle}</h2>
        </div>`;
    } else {
      return `
        <div class="slide content-slide">
          <h1>${slide.title}</h1>
          <div class="content">
            ${slide.content.map(line => {
              if (line.startsWith('•')) {
                return `<li>${line.substring(2)}</li>`;
              } else if (line.endsWith(':')) {
                return `<h3>${line}</h3><ul>`;
              } else if (line === '') {
                return '</ul>';
              } else {
                return `<p>${line}</p>`;
              }
            }).join('\n')}
          </div>
        </div>`;
    }
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Pitch Deck - ${idea}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Google Sans', 'Roboto', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
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
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            min-height: 600px;
            display: flex;
            flex-direction: column;
            page-break-after: always;
        }
        
        .title-slide {
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .title-slide h1 {
            font-size: 4rem;
            font-weight: 700;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .title-slide h2 {
            font-size: 1.8rem;
            font-weight: 300;
            opacity: 0.95;
        }
        
        .content-slide h1 {
            font-size: 2.5rem;
            color: #2c3e50;
            margin-bottom: 30px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
        }
        
        .content {
            flex: 1;
        }
        
        .content h3 {
            font-size: 1.5rem;
            color: #667eea;
            margin: 25px 0 15px 0;
            font-weight: 600;
        }
        
        .content p {
            font-size: 1.2rem;
            margin: 15px 0;
            text-align: justify;
        }
        
        .content ul {
            list-style: none;
            margin: 20px 0;
        }
        
        .content li {
            font-size: 1.1rem;
            margin: 10px 0;
            padding-left: 15px;
            position: relative;
        }
        
        .content li::before {
            content: "▶";
            color: #667eea;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        .instructions {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255,255,255,0.95);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            max-width: 300px;
            z-index: 1000;
        }
        
        .instructions h3 {
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .copy-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
            width: 100%;
        }
        
        .copy-btn:hover {
            background: #5a6fd8;
        }
        
        @media print {
            .instructions {
                display: none;
            }
            
            .slide {
                page-break-after: always;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="instructions">
        <h3>📋 Import to Google Slides</h3>
        <p>1. Click "Copy All" below</p>
        <p>2. Go to slides.google.com</p>
        <p>3. Create new presentation</p>
        <p>4. Paste and format</p>
        <button class="copy-btn" onclick="copyAllContent()">Copy All Text</button>
        <button class="copy-btn" onclick="window.open('https://slides.google.com', '_blank')">Open Google Slides</button>
    </div>
    
    <div class="presentation">${slideHtml}
    </div>
    
    <script>
        function copyAllContent() {
            const textContent = document.querySelector('.presentation').innerText;
            navigator.clipboard.writeText(textContent).then(() => {
                alert('✅ Content copied! Now paste it into Google Slides.');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = textContent;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('✅ Content copied! Now paste it into Google Slides.');
            });
        }
    </script>
</body>
</html>`;
}