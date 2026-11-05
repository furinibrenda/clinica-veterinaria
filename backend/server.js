const app = require("./src/app");
const { port } = require("./src/config");
const { db } = require("./database");

function startServer() {
  const server = app.listen(port, () => {
    console.log(`SGCV disponível em http://localhost:${server.address().port}`);
  });

  server.once("close", () => {
    if (db.open) db.close();
  });
  server.once("error", (error) => {
    console.error("Não foi possível iniciar o servidor:", error);
    if (db.open) db.close();
    process.exitCode = 1;
  });
  return server;
}

if (require.main === module) startServer();

module.exports = { startServer };
