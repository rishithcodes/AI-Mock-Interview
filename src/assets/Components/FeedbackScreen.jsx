import React, { useState } from 'react';
import { getRubric, computeOverallScore } from '../../utils/domainRubrics';

const PROGRESS_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-cyan-500'];

function FeedbackScreen({ scores, domain, difficulty, violations, messages, qaReview, personalizedAdvice, onFinish, onViewHistory }) {
  const [expandedQA, setExpandedQA] = useState(null);

  const rubric = getRubric(domain);
  const defaultScores = Object.fromEntries(rubric.categories.map(c => [c.key, 10]));
  const finalScores = scores || defaultScores;
  const totalScore = computeOverallScore(finalScores, rubric);

  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    if (score >= 55) return "text-orange-400";
    return "text-red-500";
  };

  const getFeedbackTier = (score) => {
    const tiers = [
      { min: 85, label: "Exceptional", class: "excellent" },
      { min: 70, label: "Strong", class: "good" },
      { min: 55, label: "Developing", class: "satisfactory" },
      { min: 40, label: "Needs Work", class: "needsImprovement" },
      { min: 0, label: "Requires Attention", class: "insufficient" }
    ];
    return tiers.find(t => score >= t.min);
  };

  const getDifficultyColor = (d) => {
    if (d === 'easy') return 'text-green-400';
    if (d === 'hard') return 'text-red-400';
    return 'text-yellow-400';
  };

  const getRatingBadge = (rating) => {
    const styles = {
      strong: 'bg-green-900/30 text-green-400 border-green-700',
      adequate: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
      weak: 'bg-red-900/30 text-red-400 border-red-700',
    };
    return styles[rating] || styles.adequate;
  };

  const getDetailedFeedback = (label, description, score) => {
    const tier = getFeedbackTier(score);
    const templates = {
      excellent: `Exceptional performance in ${label}. You demonstrated deep understanding of ${description.toLowerCase()}.`,
      good: `Strong showing in ${label}. Continue deepening your expertise in ${description.toLowerCase()}.`,
      satisfactory: `Basic competency in ${label}. Focus on improving ${description.toLowerCase()}.`,
      needsImprovement: `${label} needs strengthening. Revisit fundamentals of ${description.toLowerCase()}.`,
      insufficient: `Significant gaps in ${label}. Prioritize learning ${description.toLowerCase()}.`,
    };
    return templates[tier.class];
  };

  const handlePrintReport = () => {
    window.print();
  };

  const ProgressBar = ({ percentage, label, color }) => (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-semibold text-text-primary">{label}</span>
        <span className={`text-xl font-bold ${getScoreColor(percentage)}`}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-surface-2 rounded-full h-3 print:bg-gray-300">
        <div
          className={`h-3 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%`, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
        />
      </div>
      <div className="mt-2 text-right text-text-secondary">
        {getFeedbackTier(percentage).label}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ambient text-text-primary flex flex-col print:bg-white print:text-black">
      <header className="bg-surface-1/80 backdrop-blur-md p-6 border-b border-border-subtle print:bg-white print:border-gray-300">
        <h1 className="text-3xl font-bold text-center">Interview Feedback</h1>
        <p className="text-text-secondary text-center mt-2 print:text-gray-600">
          {domain} Position
          {difficulty && (
            <span className={`ml-2 ${getDifficultyColor(difficulty)} print:text-gray-600`}>
              &middot; {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Difficulty
            </span>
          )}
        </p>
      </header>

      <div className="flex-grow p-8 max-w-4xl mx-auto w-full">
        {/* Terminated banner */}
        {violations?.terminated && (
          <div className="bg-red-900/30 border border-red-500 rounded-xl p-4 mb-6 text-center print:bg-red-50 print:border-red-300">
            <p className="text-red-400 font-semibold text-lg print:text-red-600">
              Interview was terminated early due to repeated tab switching.
            </p>
          </div>
        )}

        {/* Overall Score */}
        <div className="glass-card rounded-xl p-6 mb-8 text-center border border-border-subtle animate-scale-in print:bg-gray-50 print:border-gray-300">
          <h2 className="text-2xl font-semibold mb-2">Overall Evaluation</h2>
          <div className={`text-6xl font-bold mb-3 ${getScoreColor(totalScore)}`}>
            {totalScore}%
          </div>
          <p className="text-xl text-text-secondary print:text-gray-600">
            {getFeedbackTier(totalScore).label} Performance
          </p>
        </div>

        {/* Skill Breakdown */}
        <div className="glass-card rounded-xl p-6 border border-border-subtle animate-fade-in-up print:bg-gray-50 print:border-gray-300" style={{animationDelay: '100ms'}}>
          <h2 className="text-2xl font-semibold mb-6">Skill Breakdown</h2>

          {rubric.categories.map((cat, i) => (
            <ProgressBar
              key={cat.key}
              percentage={finalScores[cat.key] || 0}
              label={cat.label}
              color={PROGRESS_COLORS[i % PROGRESS_COLORS.length]}
            />
          ))}

          <div className="mt-8 p-4 bg-surface-2/50 rounded-lg border border-border-subtle print:bg-gray-100 print:border-gray-300">
            <h3 className="text-xl font-semibold mb-4">Detailed Feedback</h3>
            {rubric.categories.map((cat) => (
              <p key={cat.key} className="text-text-secondary mb-3 last:mb-0 print:text-gray-700">
                {getDetailedFeedback(cat.label, cat.description, finalScores[cat.key] || 0)}
              </p>
            ))}
          </div>

          {/* AI-Generated Personalized Advice */}
          {personalizedAdvice && (
            <div className="mt-4 p-4 bg-accent/5 rounded-lg border border-accent/20 print:bg-blue-50 print:border-blue-300">
              <h3 className="text-lg font-semibold mb-3 text-blue-400 print:text-blue-700">What to Improve Next</h3>
              <p className="text-text-secondary leading-relaxed print:text-gray-700">
                {personalizedAdvice}
              </p>
            </div>
          )}
        </div>

        {/* Q&A Review */}
        {qaReview && qaReview.length > 0 && (
          <div className="glass-card rounded-xl p-6 mt-6 border border-border-subtle animate-fade-in-up print:bg-gray-50 print:border-gray-300" style={{animationDelay: '200ms'}}>
            <h2 className="text-2xl font-semibold mb-4">Question-by-Question Review</h2>
            <div className="space-y-3">
              {qaReview.map((item, index) => (
                <div
                  key={index}
                  className="bg-surface-2 rounded-lg border border-border-subtle overflow-hidden print:bg-white print:border-gray-300"
                >
                  <button
                    onClick={() => setExpandedQA(expandedQA === index ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-surface-3 transition-colors print:hover:bg-white"
                  >
                    <div className="flex items-center gap-3 flex-grow min-w-0">
                      <span className="text-text-muted text-sm shrink-0">Q{index + 1}</span>
                      <span className="text-text-primary truncate print:text-gray-800">
                        {item.question}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getRatingBadge(item.rating)}`}>
                        {item.rating}
                      </span>
                      <span className={`text-text-muted transition-transform duration-200 print:hidden ${expandedQA === index ? 'rotate-180' : ''}`}>
                        &#9660;
                      </span>
                    </div>
                  </button>

                  {(expandedQA === index) && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border-subtle pt-3 print:border-gray-300">
                      <div>
                        <p className="text-xs text-text-muted mb-1">Your Answer:</p>
                        <p className="text-text-secondary text-sm bg-surface-1 p-3 rounded print:bg-gray-50 print:text-gray-700">
                          {item.answer || 'No answer recorded'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted mb-1">Feedback:</p>
                        <p className="text-text-secondary text-sm print:text-gray-700">{item.feedback}</p>
                      </div>
                      {item.modelAnswer && (
                        <div>
                          <p className="text-xs text-green-500 mb-1">Example Strong Answer:</p>
                          <p className="text-text-secondary text-sm bg-green-900/10 border border-green-800/30 p-3 rounded print:bg-green-50 print:text-gray-700 print:border-green-300">
                            {item.modelAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Print view: always show expanded */}
                  <div className="hidden print:block px-4 pb-4 space-y-3 border-t border-gray-300 pt-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Your Answer:</p>
                      <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded">{item.answer || 'No answer recorded'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Feedback:</p>
                      <p className="text-gray-700 text-sm">{item.feedback}</p>
                    </div>
                    {item.modelAnswer && (
                      <div>
                        <p className="text-xs text-green-700 mb-1">Example Strong Answer:</p>
                        <p className="text-gray-700 text-sm bg-green-50 border border-green-300 p-3 rounded">{item.modelAnswer}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proctoring Notes */}
        {violations && (violations.tabSwitches > 0 || violations.lookAways > 0) && (
          <div className="glass-card rounded-xl p-6 mt-6 border border-yellow-700/50 print:bg-yellow-50 print:border-yellow-300">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400 print:text-yellow-700">Proctoring Notes</h2>
            <div className="space-y-2 text-text-secondary print:text-gray-700">
              {violations.tabSwitches > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-red-400">&#x2022;</span>
                  <span>Tab switches detected: <strong className="text-red-400 print:text-red-600">{violations.tabSwitches}</strong></span>
                </div>
              )}
              {violations.lookAways > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">&#x2022;</span>
                  <span>Look-away warnings: <strong className="text-yellow-400 print:text-yellow-600">{violations.lookAways}</strong></span>
                </div>
              )}
              {violations.penaltyApplied > 0 && (
                <div className="mt-3 p-3 bg-red-900/20 rounded-lg border border-red-700/30 print:bg-red-50 print:border-red-300">
                  <p className="text-red-400 text-sm print:text-red-600">
                    A <strong>{violations.penaltyApplied}%</strong> penalty was applied to all scores due to proctoring violations.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4 print:hidden">
          <button
            onClick={handlePrintReport}
            className="btn-surface rounded-xl font-bold py-3 px-6 transition-all duration-300"
          >
            Download Report
          </button>
          {onViewHistory && (
            <button
              onClick={onViewHistory}
              className="btn-surface rounded-xl font-bold py-3 px-6 transition-all duration-300"
            >
              View History
            </button>
          )}
          <button
            onClick={onFinish}
            className="btn-gradient rounded-xl font-bold py-3 px-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            New Interview
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedbackScreen;
