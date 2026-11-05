const { authenticate } = require("../services/authService");
const sessions = require("../services/sessionService");
const {
  getSessionToken,
  setSessionCookie,
  clearSessionCookie,
} = require("../utils/sessionCookie");

function publicUser(user) {
  return {
    name: user.nome,
    login: user.login,
    profile: user.perfil,
  };
}

async function login(req, res) {
  const user = await authenticate(req.body.login, req.body.password);
  if (!user) return res.status(401).json({ error: "Login ou senha inválidos" });

  // Replace an existing session when signing in again on the same browser.
  sessions.endSession(getSessionToken(req));
  setSessionCookie(res, req, sessions.createSession(user.id));
  res.json({ user: publicUser(user) });
}

function session(req, res) {
  const authenticated = sessions.getSession(getSessionToken(req));
  if (authenticated) setSessionCookie(res, req, authenticated.token);
  res.json({
    user: authenticated ? publicUser(authenticated.user) : null,
  });
}

function logout(req, res) {
  sessions.endSession(getSessionToken(req));
  clearSessionCookie(res, req);
  res.json({ message: "Sessão encerrada." });
}

module.exports = { login, session, logout };
