import React, { useState, useEffect } from 'react';
import BookInterviewOptions from './BookInterviewOptions';
import MeetingPage from './MeetingPage';
import { getSessionCount } from '../../utils/interviewHistory';

function CandidateSelectPage({ onStartMockInterview, onViewHistory }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [interviewType, setInterviewType] = useState(null);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    setHistoryCount(getSessionCount());
  }, []);

  const resetSelection = () => {
    setSelectedOption(null);
    setInterviewType(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-ambient text-text-primary p-4">
      <div className="w-full max-w-xl glass-card p-10 animate-scale-in">
        <h1 className="text-4xl font-bold mb-2 text-center tracking-tight gradient-text">
          AI Mock Interview
        </h1>
        <p className="text-text-muted text-center mb-10 text-sm">Practice smarter. Interview better.</p>

        {!selectedOption && (
          <div className="space-y-3 stagger">
            <button
              onClick={onStartMockInterview}
              className="w-full py-4 rounded-xl text-lg btn-gradient"
            >
              Take AI Mock Interview
            </button>
            <button
              onClick={() => setSelectedOption('book')}
              className="w-full py-4 rounded-xl text-lg btn-surface"
            >
              Book Interview with an Expert
            </button>
            <button
              onClick={onViewHistory}
              className="w-full py-3 rounded-xl btn-surface flex items-center justify-center gap-2 text-text-secondary"
            >
              View Past Interviews
              {historyCount > 0 && (
                <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  {historyCount}
                </span>
              )}
            </button>
          </div>
        )}

        {selectedOption === 'book' && !interviewType && (
          <BookInterviewOptions
            onSelect={(type) => setInterviewType(type)}
            onBack={resetSelection}
          />
        )}

        {selectedOption === 'book' && interviewType && (
          <MeetingPage
            interviewType={interviewType}
            onMeetingEnd={resetSelection}
          />
        )}
      </div>
    </div>
  );
}

export default CandidateSelectPage;
