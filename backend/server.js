const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createAccessControl } = require("./src/middleware/accessControl");
const { getSession } = require("./src/services/authService");
const { handleAuthRoute } = require("./src/routes/authRoutes");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "../frontend");

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
          throw new Error("O corpo precisa ser um objeto JSON.");
        }
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error("Envie os dados em formato JSON válido."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

const { requireAuth, requireProfile } = createAccessControl(getSession, sendJson);

async function handleApi(req, res, url) {
  if (await handleAuthRoute(req, res, url, { sendJson, readJsonBody })) return;
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

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`SGCV disponível em http://localhost:${PORT}`);
  });
}

module.exports = { requireAuth, requireProfile, server };
