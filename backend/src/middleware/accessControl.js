const { getSession } = require("../services/sessionService");
const { getSessionToken, setSessionCookie } = require("../utils/sessionCookie");

function requireAuth(req, res, next) {
  const authenticated = getSession(getSessionToken(req));
  if (!authenticated) return res.status(401).json({ error: "Acesso negado" });

  req.user = authenticated.user;
  setSessionCookie(res, req, authenticated.token);
  next();
}

// Use after requireAuth so each request resolves its session only once.
function requireProfile(...allowedProfiles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Acesso negado" });
    if (!allowedProfiles.includes(req.user.perfil)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
}

module.exports = { requireAuth, requireProfile };
