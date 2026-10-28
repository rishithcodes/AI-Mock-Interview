import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

export default function DomainAndResume({ onNext }) {
  const [domain, setDomain] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [domainScores, setDomainScores] = useState({});
  const [difficulty, setDifficulty] = useState('medium');
  const [practiceMode, setPracticeMode] = useState(false);

  const domains = [
    'Artificial Intelligence',
    'Chartered Accountant',
    'Sales Executive',
    'Data analytics',
    'Web Development',
    'Data Science',
    'Cybersecurity',
  ];
  

  const domainKeywords = {
    'Artificial Intelligence': [
      {word: 'ai', weight: 3}, 
      {word: 'artificial intelligence', weight: 5}, 
      {word: 'machine learning', weight: 4}, 
      {word: 'ml', weight: 3}, 
      {word: 'deep learning', weight: 4}, 
      {word: 'neural network', weight: 4}, 
      {word: 'nlp', weight: 3}, 
      {word: 'natural language processing', weight: 4},
      {word: 'tensorflow', weight: 4},
      {word: 'pytorch', weight: 4},
      {word:'data science',weight:4},
      {word:'data analysis',weight:4}
    ],
    'Chartered Accountant': [
      {word: 'ca', weight: 3}, 
      {word: 'chartered accountant', weight: 5},
      {word: 'accountant', weight: 4}, 
      {word: 'accounting', weight: 4}, 
      {word: 'audit', weight: 4}, 
      {word: 'finance', weight: 3}, 
      {word: 'taxation', weight: 4}, 
      {word: 'financial', weight: 3}, 
      {word: 'balance sheet', weight: 4},
      {word: 'ledger', weight: 3},
      {word: 'tax', weight: 3},
      {word: 'icai', weight: 5},
    ],
    'Sales Executive': [
      {word: 'sales', weight: 5}, 
      {word: 'marketing', weight: 3}, 
      {word: 'business development', weight: 4}, 
      {word: 'account manager', weight: 4}, 
      {word: 'client', weight: 2}, 
      {word: 'customer', weight: 2}, 
      {word: 'revenue', weight: 3},
      {word: 'target', weight: 3},
      {word: 'quota', weight: 4},
      {word: 'conversion', weight: 3},
    ],
    'Data analytics': [
      {word: 'analytics', weight: 5}, 
      {word: 'data analysis', weight: 5}, 
      {word: 'visualization', weight: 4}, 
      {word: 'tableau', weight: 4}, 
      {word: 'power bi', weight: 4}, 
      {word: 'sql', weight: 3}, 
      {word: 'excel', weight: 2}, 
      {word: 'reporting', weight: 3},
      {word: 'dashboard', weight: 3},
      {word: 'metrics', weight: 3},
    ],
    'Web Development': [
      {word: 'web', weight: 2}, 
      {word: 'frontend', weight: 4}, 
      {word: 'backend', weight: 4}, 
      {word: 'fullstack', weight: 5}, 
      {word: 'html', weight: 3}, 
      {word: 'css', weight: 3}, 
      {word: 'javascript', weight: 4}, 
      {word: 'react', weight: 4}, 
      {word: 'angular', weight: 4}, 
      {word: 'node', weight: 4},
      {word: 'responsive', weight: 3},
      {word: 'api', weight: 3},
    ],
    'Data Science': [
      {word: 'data science', weight: 5}, 
      {word: 'statistics', weight: 3}, 
      {word: 'python', weight: 3}, 
      {word: 'r', weight: 3}, 
      {word: 'machine learning', weight: 4}, 
      {word: 'predictive', weight: 3}, 
      {word: 'modeling', weight: 3}, 
      {word: 'pandas', weight: 4},
      {word: 'scikit-learn', weight: 4},
      {word: 'data mining', weight: 4},
    ],
    'Cybersecurity': [
      {word: 'security', weight: 3}, 
      {word: 'cyber', weight: 4}, 
      {word: 'penetration testing', weight: 5}, 
      {word: 'ethical hacking', weight: 5}, 
      {word: 'network security', weight: 4}, 
      {word: 'firewall', weight: 3}, 
      {word: 'encryption', weight: 3},
      {word: 'vulnerability', weight: 4},
      {word: 'threat', weight: 3},
      {word: 'authentication', weight: 3},
      {word: 'infosec', weight: 4},
    ],
  };


  const calculateDomainScores = (resumeText) => {
    if (!resumeText) return {};
    
    const scores = {};
    const lowerCaseResumeText = resumeText.toLowerCase();
    
  
    for (const [domainName, keywords] of Object.entries(domainKeywords)) {
      let domainScore = 0;
      let keywordMatches = 0;
      
      for (const {word, weight} of keywords) {
     
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = (lowerCaseResumeText.match(regex) || []).length;
        
        if (matches > 0) {
          domainScore += weight * Math.min(matches, 3);
          keywordMatches++;
        }
      }
      
      // Calculate percentage of keywords matched
      const keywordCoverage = keywordMatches / keywords.length;
      
      
      scores[domainName] = {
        score: domainScore,
        coverage: keywordCoverage,
        normalizedScore: domainScore * (0.7 + 0.3 * keywordCoverage) 
      };
    }
    
    return scores;
  };
  const validateDomainMatch = (selectedDomain, resumeText, scores) => {
    if (!selectedDomain || !resumeText || !scores || Object.keys(scores).length === 0) {
      return false;
    }
    

    const selectedScore = scores[selectedDomain]?.normalizedScore || 0;
    
    let highestScore = 0;
    let bestMatchDomain = null;
    
    for (const [domainName, scoreData] of Object.entries(scores)) {
      if (scoreData.normalizedScore > highestScore) {
        highestScore = scoreData.normalizedScore;
        bestMatchDomain = domainName;
      }
    }
    
    console.log('Domain scores:', scores);
    console.log('Selected domain:', selectedDomain, 'Score:', selectedScore);
    console.log('Best match domain:', bestMatchDomain, 'Score:', highestScore);
    
  
    const MINIMUM_SCORE = 5; 
    const RELATIVE_THRESHOLD = 0.6;
    
    return (
      selectedScore >= MINIMUM_SCORE && 
      (selectedDomain === bestMatchDomain || selectedScore >= highestScore * RELATIVE_THRESHOLD)
    );
  };

  const extractTextFromPDF = async (file) => {
    setIsProcessing(true);
    setError('');
    
    try {
      const reader = new FileReader();
      
      const fileReadPromise = new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
      });
  
      reader.readAsArrayBuffer(file);
      await fileReadPromise;
  
      const pdf = await pdfjsLib.getDocument(reader.result).promise;
      let extractedText = '';
  
      // Corrected page processing logic
      const pagePromises = Array.from({ length: pdf.numPages }, (_, i) => 
        pdf.getPage(i + 1).then(page => 
          page.getTextContent().then(content => 
            content.items.map(item => item.str).join(' ')
          )
        ));
  
      const pagesText = await Promise.all(pagePromises);
      extractedText = pagesText.join('\n').replace(/\s+/g, ' ').trim();
  
      if (!extractedText) {
        throw new Error('PDF appears to be image-based or contains no extractable text');
      }
  
      // Calculate domain scores when text is extracted
      const scores = calculateDomainScores(extractedText);
      setDomainScores(scores);
      setResumeText(extractedText);
      setIsProcessing(false);
    } catch (err) {
      console.error('PDF processing error:', err);
      setError(err.message || 'Failed to process PDF. Please ensure it contains text.');
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    setResumeFile(file);
    setError('');
    await extractTextFromPDF(file);
  };

  const handleDomainChange = (value) => {
    setDomain(value);
    // Clear error when domain changes
    if (error) {
      setError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!resumeText) {
      setError('Please upload a valid text-based resume PDF');
      return;
    }
    
    // Use the improved domain validation with scores
    if (!validateDomainMatch(domain, resumeText, domainScores)) {
      // Get recommended domains based on scores
      const sortedDomains = Object.entries(domainScores)
        .sort((a, b) => b[1].normalizedScore - a[1].normalizedScore)
        .slice(0, 2)
        .map(([name]) => name);
      
      let errorMessage = 'The selected domain does not match your resume content.';
      
      if (sortedDomains.length > 0) {
        errorMessage += ` Your resume appears to be more suitable for: ${sortedDomains.join(' or ')}.`;
      }
      
      setError(errorMessage);
      return;
    }

    // If all checks pass, proceed with the interview
    onNext(domain, resumeText, difficulty, practiceMode);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-ambient text-text-primary p-4">
      <div className="w-full max-w-2xl glass-card p-10 animate-scale-in">
        <h1 className="text-4xl font-bold mb-8 text-center tracking-tight gradient-text">
          Start Your Interview Prep
        </h1>
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/40 rounded-xl text-red-300 animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 stagger">
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-text-secondary">Select Target Domain</span>
              <select
                value={domain}
                onChange={(e) => handleDomainChange(e.target.value)}
                className="w-full p-3 rounded-xl input-field appearance-none cursor-pointer"
              >
                <option value="" disabled>Choose a domain...</option>
                {domains.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-text-secondary">Upload Resume</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="w-full p-3 rounded-xl input-field file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white cursor-pointer"
              />
              {resumeFile && (
                <p className={`text-sm ${isProcessing ? 'text-accent' : 'text-green-400'}`}>
                  {isProcessing ? 'Analyzing PDF...' : `Loaded: ${resumeFile.name}`}
                </p>
              )}
            </label>

            {resumeText && Object.keys(domainScores).length > 0 && !isProcessing && (
              <div className="p-4 bg-surface-2/50 rounded-xl border border-border-subtle animate-fade-in">
                <h3 className="font-medium text-sm mb-2 text-text-secondary">Resume Analysis</h3>
                <ul className="space-y-1 text-sm">
                  {Object.entries(domainScores)
                    .sort((a, b) => b[1].normalizedScore - a[1].normalizedScore)
                    .slice(0, 3)
                    .map(([domainName, scoreData], index) => (
                      <li key={index} className={`flex justify-between ${domainName === domain ? "text-accent" : "text-text-secondary"}`}>
                        <span>{domainName}</span>
                        <span className="text-text-muted">{Math.round(scoreData.normalizedScore)} pts</span>
                      </li>
                    ))
                  }
                </ul>
              </div>
            )}
          </div>

          {/* Difficulty Selector */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-text-secondary block">Difficulty</span>
            <div className="flex gap-3">
              {[
                {
                  value: 'easy', label: 'Easy', desc: 'Basic concepts',
                  active: 'border-green-500 bg-green-900/20 ring-2 ring-green-500/50',
                  activeText: 'text-green-400',
                },
                {
                  value: 'medium', label: 'Medium', desc: 'Practical scenarios',
                  active: 'border-yellow-500 bg-yellow-900/20 ring-2 ring-yellow-500/50',
                  activeText: 'text-yellow-400',
                },
                {
                  value: 'hard', label: 'Hard', desc: 'Advanced & system design',
                  active: 'border-red-500 bg-red-900/20 ring-2 ring-red-500/50',
                  activeText: 'text-red-400',
                },
              ].map(({ value, label, desc, active, activeText }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDifficulty(value)}
                  className={`flex-1 p-3 rounded-xl border transition-all duration-200 text-center hover:scale-[1.02] active:scale-[0.98] ${
                    difficulty === value
                      ? active
                      : 'border-border-subtle bg-surface-2 hover:border-border-default'
                  }`}
                >
                  <div className={`font-semibold text-sm ${difficulty === value ? activeText : 'text-text-secondary'}`}>
                    {label}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Practice Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl border border-border-subtle">
            <div>
              <span className="font-medium text-sm">Practice Mode</span>
              <p className="text-xs text-text-muted mt-0.5">
                No proctoring. Focus on answers only.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPracticeMode(!practiceMode)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                practiceMode ? 'bg-accent' : 'bg-surface-3'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                practiceMode ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <button
            type="submit"
            disabled={isProcessing || !domain || !resumeText}
            className="w-full py-4 rounded-xl btn-gradient text-lg flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}