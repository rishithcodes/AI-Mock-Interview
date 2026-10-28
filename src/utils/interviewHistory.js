const STORAGE_KEY = "interview_history";
const MAX_SESSIONS = 20;

export function saveSession(sessionData) {
  const sessions = getSessions();
  const session = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...sessionData,
  };
  sessions.unshift(session);
  if (sessions.length > MAX_SESSIONS) {
    sessions.length = MAX_SESSIONS;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  return session;
}

export function getSessions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteSession(id) {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSessionCount() {
  return getSessions().length;
}
