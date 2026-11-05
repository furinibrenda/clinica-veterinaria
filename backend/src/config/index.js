const path = require("node:path");

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error("PORT precisa ser um número inteiro entre 0 e 65535.");
}

module.exports = {
  port,
  publicDirectory: path.resolve(__dirname, "../../../frontend"),
  sessionTtlMs: 30 * 60 * 1000,
};
