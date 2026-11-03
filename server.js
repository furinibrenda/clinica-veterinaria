const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} = require("node:crypto");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]\n", "utf8");
}

function readUsers() {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  if (!Array.isArray(users)) {
    throw new Error("O arquivo de usuários precisa conter uma lista.");
  }
  return users;
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, `${JSON.stringify(users, null, 2)}\n`, "utf8");
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body) > 16 * 1024) {
        tooLarge = true;
        reject(Object.assign(new Error("A solicitação é muito grande."), { status: 413 }));
      }
    });
    req.on("end", () => {
      if (tooLarge) return;
      try {
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw Object.assign(new Error("Envie um objeto JSON válido."), { status: 400 });
        }
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error("Envie os dados em formato JSON válido."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function publicUser(user) {
  return { name: user.name, login: user.login, profile: user.profile };
}

function sessionCookie(token, req, maxAge) {
  const secure = req.socket.encrypted ? "; Secure" : "";
  return `sgcv_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function getSession(req) {
  const cookies = req.headers.cookie || "";
  const token = cookies
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("sgcv_session="))
    ?.slice("sgcv_session=".length);

  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function validateCredentials(login, password) {
  return (
    typeof login === "string" &&
    /^[a-zA-Z0-9._-]{3,30}$/.test(login) &&
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 128
  );
}

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/register") {
    const body = await readJsonBody(req);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const login = typeof body.login === "string" ? body.login.trim().toLowerCase() : "";
    const password = body.password;
    const profile = body.profile;

    if (name.length < 2 || name.length > 80) {
      return sendJson(res, 400, { error: "Informe um nome com 2 a 80 caracteres." });
    }
    if (!validateCredentials(login, password)) {
      return sendJson(res, 400, {
        error: "O login deve ter 3 a 30 caracteres válidos e a senha, 8 a 128 caracteres.",
      });
    }
    if (!["Veterinário", "Recepcionista"].includes(profile)) {
      return sendJson(res, 400, { error: "Selecione um perfil válido." });
    }

    const users = readUsers();
    if (users.some((user) => user.login === login)) {
      return sendJson(res, 409, { error: "Este login já está cadastrado." });
    }

    const salt = randomBytes(16).toString("hex");
    const passwordHash = scryptSync(password, salt, 64).toString("hex");
    users.push({ name, login, profile, salt, passwordHash });
    writeUsers(users);

    return sendJson(res, 201, { message: "Cadastro realizado. Você já pode entrar." });
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readJsonBody(req);
    const login = typeof body.login === "string" ? body.login.trim().toLowerCase() : "";
    const password = body.password;

    if (!validateCredentials(login, password)) {
      return sendJson(res, 400, {
        error: "Informe um login válido e uma senha com pelo menos 8 caracteres.",
      });
    }

    const user = readUsers().find((item) => item.login === login);
    if (!user) {
      return sendJson(res, 401, { error: "Login ou senha incorretos." });
    }

    const suppliedHash = scryptSync(password, user.salt, 64);
    const storedHash = Buffer.from(user.passwordHash, "hex");
    if (storedHash.length !== suppliedHash.length || !timingSafeEqual(suppliedHash, storedHash)) {
      return sendJson(res, 401, { error: "Login ou senha incorretos." });
    }

    const token = randomBytes(32).toString("hex");
    sessions.set(token, { user, expiresAt: Date.now() + SESSION_TTL_MS });
    return sendJson(
      res,
      200,
      { user: publicUser(user) },
      { "Set-Cookie": sessionCookie(token, req, SESSION_TTL_MS / 1000) },
    );
  }

  if (req.method === "GET" && url.pathname === "/api/session") {
    const session = getSession(req);
    return sendJson(res, 200, { user: session ? publicUser(session.user) : null });
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    const cookies = req.headers.cookie || "";
    const token = cookies
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("sgcv_session="))
      ?.slice("sgcv_session=".length);
    if (token) sessions.delete(token);

    return sendJson(res, 200, { message: "Sessão encerrada." }, {
      "Set-Cookie": sessionCookie("", req, 0),
    });
  }

  return sendJson(res, 404, { error: "Rota não encontrada." });
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendJson(res, 405, { error: "Método não permitido." }, { Allow: "GET, HEAD" });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return sendJson(res, 400, { error: "Endereço inválido." });
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(PUBLIC_DIR, relativePath);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    return sendJson(res, 404, { error: "Arquivo não encontrado." });
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT" || error.code === "EISDIR") {
        return sendJson(res, 404, { error: "Arquivo não encontrado." });
      }
      console.error("Erro ao ler arquivo público:", error);
      return sendJson(res, 500, { error: "Não foi possível carregar a página." });
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    res.end(req.method === "HEAD" ? undefined : content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      serveStatic(req, res, url);
    }
  } catch (error) {
    if (res.headersSent || res.destroyed) return;
    if (error.status) {
      return sendJson(res, error.status, { error: error.message });
    }
    console.error("Erro ao processar solicitação:", error);
    return sendJson(res, 500, { error: "Ocorreu um erro interno. Tente novamente." });
  }
});

server.listen(PORT, () => {
  console.log(`SGCV disponível em http://localhost:${PORT}`);
});
