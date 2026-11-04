const { randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { db } = require("../../database");

const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map();
const findActiveUser = db.prepare(
  "SELECT id, nome, login, perfil FROM usuarios WHERE id = ? AND ativo = 1",
);
const findUserByLogin = db.prepare(
  "SELECT id, nome, login, perfil, senha_hash FROM usuarios WHERE login = ? COLLATE NOCASE AND ativo = 1",
);

function authenticate(login, password) {
  const normalizedLogin = typeof login === "string" ? login.trim().toLowerCase() : "";
  if (
    !/^[a-zA-Z0-9._-]{3,30}$/.test(normalizedLogin) ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return null;
  }

  const user = findUserByLogin.get(normalizedLogin);
  if (!user || !bcrypt.compareSync(password, user.senha_hash)) return null;
  return { id: user.id, nome: user.nome, login: user.login, perfil: user.perfil };
}

function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { userId, lastActivityAt: Date.now() });
  return token;
}

function getSessionToken(req) {
  return (req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("sgcv_session="))
    ?.slice("sgcv_session=".length);
}

function getSession(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;
  const now = Date.now();
  if (now - session.lastActivityAt >= SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }

  const user = findActiveUser.get(session.userId);
  if (!user) {
    sessions.delete(token);
    return null;
  }

  session.lastActivityAt = now;
  return { token, session, user };
}

function endSession(req) {
  const token = getSessionToken(req);
  if (token) sessions.delete(token);
}

module.exports = {
  SESSION_TTL_MS,
  authenticate,
  createSession,
  endSession,
  getSession,
};
