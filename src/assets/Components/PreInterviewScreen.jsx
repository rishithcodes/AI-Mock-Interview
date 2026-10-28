import React, { useState, useEffect } from 'react';

const DIFFICULTY_LABELS = {
  easy: { label: 'Easy', desc: 'Basic conceptual questions. Great for beginners.', color: 'text-green-400' },
  medium: { label: 'Medium', desc: 'Practical scenario-based questions with concrete examples.', color: 'text-yellow-400' },
  hard: { label: 'Hard', desc: 'System design, edge cases, and deep technical challenges.', color: 'text-red-400' },
};

export default function PreInterviewScreen({ domain, difficulty, practiceMode, onStart, onBack }) {
  const [cameraReady, setCameraReady] = useState(null);
  const [micReady, setMicReady] = useState(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    // Check camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCameraReady(true);
    } catch {
      setCameraReady(false);
    }

    // Check mic
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicReady(true);
    } catch {
      setMicReady(false);
    }
  };

  const diffInfo = DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS.medium;

  const StatusDot = ({ ready }) => (
    <span className={`inline-block w-3 h-3 rounded-full ${
      ready === null ? 'bg-gray-500 animate-pulse' : ready ? 'bg-green-500' : 'bg-red-500'
    }`} />
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-ambient text-text-primary p-4">
      <div className="w-full max-w-2xl glass-card animate-scale-in p-10 shadow-2xl">
        <h1 className="text-4xl tracking-tight font-bold mb-2 text-center gradient-text">
          Interview Briefing
        </h1>
        <p className="text-text-secondary text-center mb-8">
          {domain} &middot; <span className={diffInfo.color}>{diffInfo.label}</span>
          {practiceMode && <span className="ml-2 text-accent">&middot; Practice Mode</span>}
        </p>

        {/* Rules */}
        <div className="bg-surface-2/50 rounded-lg p-5 mb-6 border border-border-subtle animate-fade-in-up" style={{animationDelay: '100ms'}}>
          <h2 className="text-lg font-semibold mb-3">
            {practiceMode ? 'Practice Mode' : 'Interview Rules'}
          </h2>
          {practiceMode ? (
            <div className="space-y-2 text-gray-300 text-sm">
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/20 mb-3">
                <p className="text-accent text-sm">Proctoring is disabled. No webcam monitoring, no tab-switch penalties. Focus purely on your answers.</p>
              </div>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">&#9679;</span>
                <span>Duration: <strong>20 minutes</strong>, approximately <strong>7 questions</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">&#9679;</span>
                <span>Your webcam is still shown for a realistic experience, but <strong>not monitored</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">&#10003;</span>
                <span>You can freely switch tabs, look away, or take notes without penalties.</span>
              </li>
            </div>
          ) : (
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">&#9679;</span>
                <span>Duration: <strong>20 minutes</strong>, approximately <strong>7 questions</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">&#9679;</span>
                <span>Your webcam will be monitored. <strong>Face the camera</strong> at all times.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#9679;</span>
                <span><strong>Do not switch tabs.</strong> After 3 tab switches, the interview will be terminated automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#9679;</span>
                <span>Looking away from the screen will trigger warnings. Each violation <strong>reduces your score by 3%.</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">&#9679;</span>
                <span>Asking the AI for answers will be detected and <strong>will not be answered.</strong></span>
              </li>
            </ul>
          )}
        </div>

        {/* Tips */}
        <div className="bg-surface-2/50 rounded-lg p-5 mb-6 border border-border-subtle animate-fade-in-up" style={{animationDelay: '200ms'}}>
          <h2 className="text-lg font-semibold mb-3">Tips</h2>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">&#10003;</span>
              <span>You can type or use voice input. Press <kbd className="bg-surface-3 border border-border-subtle px-1.5 py-0.5 rounded text-xs">Ctrl+M</kbd> to toggle the microphone.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">&#10003;</span>
              <span>The AI will read questions aloud. Press <kbd className="bg-surface-3 border border-border-subtle px-1.5 py-0.5 rounded text-xs">Esc</kbd> to stop AI speech.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">&#10003;</span>
              <span>Be specific in your answers. Mention technologies, projects, and examples from your experience.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">&#10003;</span>
              <span>If unsure, explain your thought process rather than saying "I don't know."</span>
            </li>
          </ul>
        </div>

        {/* Device Check */}
        <div className="bg-surface-2/50 rounded-lg p-5 mb-8 border border-border-subtle animate-fade-in-up" style={{animationDelay: '300ms'}}>
          <h2 className="text-lg font-semibold mb-3">Device Check</h2>
          <div className="flex gap-8 text-sm">
            <div className="flex items-center gap-2">
              <StatusDot ready={cameraReady} />
              <span>Camera {cameraReady === null ? 'checking...' : cameraReady ? 'ready' : 'not available'}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot ready={micReady} />
              <span>Microphone {micReady === null ? 'checking...' : micReady ? 'ready' : 'not available'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 btn-surface rounded-xl py-3 font-semibold transition-colors"
          >
            Back
          </button>
          <button
            onClick={onStart}
            disabled={cameraReady === false}
            className="flex-1 btn-gradient rounded-xl py-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Interview
          </button>
        </div>
      </div>
    </div>
  );
}
