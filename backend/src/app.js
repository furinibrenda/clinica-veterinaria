const express = require("express");
const path = require("node:path");
const { publicDirectory } = require("./config");
const authRoutes = require("./routes/authRoutes");
const clienteRoutes = require("./routes/clienteRoutes");
const { securityHeaders } = require("./middleware/securityHeaders");
const { errorHandler } = require("./middleware/errorHandler");
const { getSession } = require("./services/sessionService");
const { getSessionToken, setSessionCookie } = require("./utils/sessionCookie");

const app = express();
app.disable("x-powered-by");
app.set("case sensitive routing", true);
app.set("strict routing", true);
app.use(securityHeaders);

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, authRoutes, clienteRoutes, (req, res) => {
  res.status(404).json({ error: "Rota não encontrada." });
});

app.get(["/clientes/novo", "/cadastro-cliente.html"], (req, res, next) => {
  const authenticated = getSession(getSessionToken(req));
  if (!authenticated || authenticated.user.perfil !== "Recepcionista") {
    return res.redirect("/");
  }

  setSessionCookie(res, req, authenticated.token);
  res.sendFile(path.join(publicDirectory, "cadastro-cliente.html"), (error) => {
    if (error) next(error);
  });
});

app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  res.set("Allow", "GET, HEAD").status(405).json({ error: "Método não permitido." });
});
app.use(express.static(publicDirectory, {
  dotfiles: "ignore",
  redirect: false,
  setHeaders(res) {
    res.setHeader("Cache-Control", "no-cache");
  },
}));
app.use((req, res) => {
  res.set("Cache-Control", "no-store").status(404).json({ error: "Arquivo não encontrado." });
});
app.use(errorHandler);

module.exports = app;
