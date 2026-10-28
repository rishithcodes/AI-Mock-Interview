import React, { useState, useEffect } from 'react';
import { getSessions, deleteSession, clearHistory } from '../../utils/interviewHistory';
import { getRubric, computeOverallScore } from '../../utils/domainRubrics';

export default function HistoryScreen({ onBack, onViewSession }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleDelete = (id) => {
    deleteSession(id);
    setSessions(getSessions());
  };

  const handleClearAll = () => {
    if (window.confirm('Delete all interview history? This cannot be undone.')) {
      clearHistory();
      setSessions([]);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    if (score >= 55) return "text-orange-400";
    return "text-red-500";
  };

  const getDifficultyColor = (d) => {
    if (d === 'easy') return 'text-green-400';
    if (d === 'hard') return 'text-red-400';
    return 'text-yellow-400';
  };

  const computeOverall = (scores, sessionDomain) => {
    const rubric = getRubric(sessionDomain);
    return computeOverallScore(scores, rubric);
  };

  return (
    <div className="min-h-screen bg-ambient text-text-primary flex flex-col">
      <header className="bg-surface-1/80 backdrop-blur-md p-6 border-b border-border-subtle flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-text-secondary hover:text-text-primary transition-colors text-sm"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold">Interview History</h1>
        <div className="w-16" />
      </header>

      <div className="flex-grow p-6 max-w-4xl mx-auto w-full">
        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg mb-2">No past interviews yet.</p>
            <p className="text-text-muted text-sm">Complete an AI mock interview to see your history here.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <p className="text-text-secondary text-sm">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
              <button
                onClick={handleClearAll}
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-4 animate-fade-in-up stagger">
              {sessions.map((session) => {
                const overall = computeOverall(session.scores || session, session.domain);
                const date = new Date(session.timestamp);
                const formattedDate = date.toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                });
                const formattedTime = date.toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit'
                });

                return (
                  <div
                    key={session.id}
                    className="glass-card p-5 border border-border-subtle hover:border-border-default transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold">{session.domain}</h3>
                          {session.difficulty && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border border-border-subtle ${getDifficultyColor(session.difficulty)}`}>
                              {session.difficulty}
                            </span>
                          )}
                          {session.violations?.terminated && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-700">
                              Terminated
                            </span>
                          )}
                        </div>
                        <p className="text-text-secondary text-sm">{formattedDate} at {formattedTime}</p>

                        {/* Score bars — dynamic per domain rubric */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-text-secondary">
                          {getRubric(session.domain).categories.map(cat => (
                            <span key={cat.key}>
                              {cat.label}: <strong className={getScoreColor(session.scores?.[cat.key] || 0)}>{session.scores?.[cat.key] || 0}%</strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${getScoreColor(overall)}`}>{overall}%</div>
                          <div className="text-xs text-text-muted">Overall</div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => onViewSession(session)}
                            className="text-accent hover:text-accent-start text-sm transition-colors"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleDelete(session.id)}
                            className="text-text-muted hover:text-red-400 text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
