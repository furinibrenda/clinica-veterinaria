const { randomBytes } = require("node:crypto");
const { sessionTtlMs } = require("../config");
const users = require("../repositories/userRepository");

// Process-local sessions intentionally expire on restart.
const sessions = new Map();

function pruneExpiredSessions(now) {
  for (const [token, session] of sessions) {
    if (now - session.lastActivityAt >= sessionTtlMs) sessions.delete(token);
  }
}

const cleanup = setInterval(() => pruneExpiredSessions(Date.now()), sessionTtlMs);
cleanup.unref();

function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { userId, lastActivityAt: Date.now() });
  return token;
}

function getSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  const now = Date.now();
  if (now - session.lastActivityAt >= sessionTtlMs) {
    sessions.delete(token);
    return null;
  }

  const user = users.findActiveById(session.userId);
  if (!user) {
    sessions.delete(token);
    return null;
  }

  session.lastActivityAt = now;
  return { token, user };
}

function endSession(token) {
  sessions.delete(token);
}

module.exports = { createSession, getSession, endSession };
