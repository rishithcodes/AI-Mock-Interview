import React from 'react';

function BookInterviewOptions({ onSelect, onBack }) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <h2 className="text-xl font-semibold text-center mb-4 text-text-primary">Select Interview Type</h2>

      <button
        onClick={() => onSelect('peer')}
        className="w-full py-3 rounded-xl btn-surface text-purple-400 border-purple-500/30 hover:border-purple-500/60 transition-all"
      >
        Peer to Peer
      </button>

      <button
        onClick={() => onSelect('expert')}
        className="w-full py-3 rounded-xl btn-surface text-orange-400 border-orange-500/30 hover:border-orange-500/60 transition-all"
      >
        Expert
      </button>

      <button
        onClick={onBack}
        className="w-full py-2 rounded-xl btn-surface text-text-muted mt-4"
      >
        Back
      </button>
    </div>
  );
}

export default BookInterviewOptions;
