import React, { useState } from 'react';

function MeetingPage({ interviewType, onMeetingEnd }) {
  const [meetingLink, setMeetingLink] = useState('');
  const [inMeeting, setInMeeting] = useState(false);

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (meetingLink) {
      setInMeeting(true);
      window.open(meetingLink, '_blank');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-xl font-semibold text-center mb-2 text-text-primary">
        {interviewType === 'peer' ? 'Peer to Peer' : 'Expert'} Interview
      </h2>

      {!inMeeting ? (
        <form onSubmit={handleJoinMeeting} className="space-y-4">
          <div>
            <label htmlFor="meetingLink" className="block text-sm font-medium mb-1 text-text-secondary">
              Enter Digital Samba Meeting Link
            </label>
            <input
              type="url"
              id="meetingLink"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              className="w-full p-3 rounded-xl input-field"
              placeholder="https://..."
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl btn-gradient"
            disabled={!meetingLink}
          >
            Join Meeting
          </button>

          <button
            type="button"
            onClick={onMeetingEnd}
            className="w-full py-2 rounded-xl btn-surface text-text-muted"
          >
            Back
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="border-2 border-border-subtle rounded-xl p-4 min-h-48 flex items-center justify-center bg-surface-2/30">
            <p className="text-center text-text-muted">
              Meeting in progress... <br />
              (Your meeting has been opened in a new tab)
            </p>
          </div>

          <button
            onClick={onMeetingEnd}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
          >
            End Meeting & Return to Home
          </button>
        </div>
      )}
    </div>
  );
}

export default MeetingPage;
