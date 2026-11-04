const {
  SESSION_TTL_MS,
  authenticate,
  createSession,
  endSession,
  getSession,
} = require("../services/authService");

function publicUser(user) {
  return { name: user.nome, login: user.login, profile: user.perfil };
}

function sessionCookie(token, req, maxAge) {
  const secure = req.socket.encrypted ? "; Secure" : "";
  return `sgcv_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

async function handleAuthRoute(req, res, url, { sendJson, readJsonBody }) {
  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readJsonBody(req);
    const user = authenticate(body.login, body.password);
    if (!user) {
      sendJson(res, 401, { error: "Login ou senha inválidos" });
      return true;
    }

    const token = createSession(user.id);
    sendJson(
      res,
      200,
      { user: publicUser(user) },
      { "Set-Cookie": sessionCookie(token, req, SESSION_TTL_MS / 1000) },
    );
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/session") {
    const authenticated = getSession(req);
    sendJson(
      res,
      200,
      { user: authenticated ? publicUser(authenticated.user) : null },
      authenticated
        ? { "Set-Cookie": sessionCookie(authenticated.token, req, SESSION_TTL_MS / 1000) }
        : {},
    );
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    endSession(req);
    sendJson(res, 200, { message: "Sessão encerrada." }, {
      "Set-Cookie": sessionCookie("", req, 0),
    });
    return true;
  }

  return false;
}

module.exports = { handleAuthRoute };
