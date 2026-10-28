import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, getSessions, deleteSession, clearHistory, getSessionCount } from '../utils/interviewHistory';

beforeEach(() => {
  localStorage.clear();
});

describe('interviewHistory', () => {
  const mockSession = {
    domain: 'Artificial Intelligence',
    difficulty: 'medium',
    scores: { mlFundamentals: 80, toolsAndFrameworks: 70, problemSolving: 90 },
    violations: { tabSwitches: 1, lookAways: 2, penaltyApplied: 9, terminated: false },
    messages: [{ sender: 'ai', text: 'Hello' }],
    qaReview: [{ questionIndex: 0, rating: 'strong', feedback: 'Great answer' }],
    personalizedAdvice: 'Keep practicing ML fundamentals.',
  };

  describe('saveSession', () => {
    it('saves a session and returns it with id and timestamp', () => {
      const saved = saveSession(mockSession);
      expect(saved).toHaveProperty('id');
      expect(saved).toHaveProperty('timestamp');
      expect(saved.domain).toBe('Artificial Intelligence');
    });

    it('retrieves saved sessions', () => {
      saveSession(mockSession);
      const sessions = getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].domain).toBe('Artificial Intelligence');
      expect(sessions[0].scores.mlFundamentals).toBe(80);
    });

    it('saves domain-specific score keys correctly', () => {
      const webSession = {
        ...mockSession,
        domain: 'Web Development',
        scores: { frontendSkills: 75, backendSkills: 85, systemDesign: 60 },
      };
      saveSession(webSession);
      const sessions = getSessions();
      expect(sessions[0].scores.frontendSkills).toBe(75);
      expect(sessions[0].scores.backendSkills).toBe(85);
      expect(sessions[0].scores.systemDesign).toBe(60);
    });

    it('newest session is first (unshift order)', () => {
      saveSession({ ...mockSession, domain: 'First' });
      saveSession({ ...mockSession, domain: 'Second' });
      const sessions = getSessions();
      expect(sessions[0].domain).toBe('Second');
      expect(sessions[1].domain).toBe('First');
    });

    it('limits sessions to 20 max', () => {
      for (let i = 0; i < 25; i++) {
        saveSession({ ...mockSession, domain: `Domain ${i}` });
      }
      expect(getSessionCount()).toBe(20);
    });
  });

  describe('deleteSession', () => {
    it('removes a session by id', () => {
      const saved = saveSession(mockSession);
      expect(getSessionCount()).toBe(1);
      deleteSession(saved.id);
      expect(getSessionCount()).toBe(0);
    });
  });

  describe('clearHistory', () => {
    it('removes all sessions', () => {
      saveSession(mockSession);
      saveSession(mockSession);
      clearHistory();
      expect(getSessionCount()).toBe(0);
    });
  });

  describe('getSessions', () => {
    it('returns empty array when no history exists', () => {
      expect(getSessions()).toEqual([]);
    });

    it('returns empty array on corrupted localStorage data', () => {
      localStorage.setItem('interview_history', 'not-json');
      expect(getSessions()).toEqual([]);
    });
  });
});
