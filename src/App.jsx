import { useState } from 'react';
import './App.css';
import DomainAndResume from './assets/Components/DomainAndResume';
import SplitScreen from './assets/Components/SplitScreen';
import FeedbackScreen from './assets/Components/FeedbackScreen';
import CandidateSelectPage from './assets/Components/CandidateSelectPage';
import PreInterviewScreen from './assets/Components/PreInterviewScreen';
import HistoryScreen from './assets/Components/HistoryScreen';
import { saveSession } from './utils/interviewHistory';
import { getRubric } from './utils/domainRubrics';

function App() {
  const [screen, setScreen] = useState('candidateSelect');
  const [domainData, setDomainData] = useState({
    domain: '',
    resumeText: '',
    difficulty: 'medium',
    practiceMode: false,
  });
  const [interviewResults, setInterviewResults] = useState(null);

  const handleDomainResumeNext = (domain, resumeText, difficulty, practiceMode) => {
    setDomainData({ domain, resumeText, difficulty, practiceMode });
    setScreen('preInterview');
  };

  const handlePreInterviewStart = () => {
    setScreen('interview');
  };

  const handlePreInterviewBack = () => {
    setScreen('domainResume');
  };

  const handleInterviewComplete = (results) => {
    // Extract domain-specific score keys dynamically from the rubric
    const rubric = getRubric(domainData.domain);
    const scores = {};
    for (const cat of rubric.categories) {
      scores[cat.key] = results[cat.key] ?? 0;
    }

    const sessionData = {
      domain: domainData.domain,
      difficulty: domainData.difficulty,
      scores,
      violations: results.violations || null,
      messages: results.messages || [],
      qaReview: results.qaReview || [],
      personalizedAdvice: results.personalizedAdvice || '',
    };

    saveSession(sessionData);

    setInterviewResults(sessionData);
    setScreen('feedback');
  };

  const handleFinish = () => {
    setDomainData({ domain: '', resumeText: '', difficulty: 'medium', practiceMode: false });
    setInterviewResults(null);
    setScreen('candidateSelect');
  };

  const handleStartMockInterview = () => {
    setScreen('domainResume');
  };

  const handleViewHistory = () => {
    setScreen('history');
  };

  const handleViewHistorySession = (session) => {
    setInterviewResults(session);
    setDomainData(prev => ({ ...prev, domain: session.domain, difficulty: session.difficulty || 'medium' }));
    setScreen('feedback');
  };

  const getCurrentScreen = () => {
    switch(screen) {
      case 'candidateSelect':
        return (
          <CandidateSelectPage
            onStartMockInterview={handleStartMockInterview}
            onViewHistory={handleViewHistory}
          />
        );

      case 'domainResume':
        return <DomainAndResume onNext={handleDomainResumeNext} />;

      case 'preInterview':
        return (
          <PreInterviewScreen
            domain={domainData.domain}
            difficulty={domainData.difficulty}
            practiceMode={domainData.practiceMode}
            onStart={handlePreInterviewStart}
            onBack={handlePreInterviewBack}
          />
        );

      case 'interview':
        return (
          <SplitScreen
            domain={domainData.domain}
            resumetext={domainData.resumeText}
            difficulty={domainData.difficulty}
            practiceMode={domainData.practiceMode}
            onComplete={handleInterviewComplete}
          />
        );

      case 'feedback':
        return (
          <FeedbackScreen
            scores={interviewResults?.scores}
            domain={interviewResults?.domain || domainData.domain}
            difficulty={interviewResults?.difficulty || domainData.difficulty}
            violations={interviewResults?.violations}
            messages={interviewResults?.messages}
            qaReview={interviewResults?.qaReview}
            personalizedAdvice={interviewResults?.personalizedAdvice}
            onFinish={handleFinish}
            onViewHistory={handleViewHistory}
          />
        );

      case 'history':
        return (
          <HistoryScreen
            onBack={handleFinish}
            onViewSession={handleViewHistorySession}
          />
        );

      default:
        return <CandidateSelectPage onStartMockInterview={handleStartMockInterview} onViewHistory={handleViewHistory} />;
    }
  };

  return (
    <div className="app-container">
      {getCurrentScreen()}
    </div>
  );
}

export default App;
