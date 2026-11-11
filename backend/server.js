const app = require("./src/app");
const { port } = require("./src/config");
const { db } = require("./database");
const { iniciarBackupDiario } = require("./src/services/backupService");

function startServer() {
  const pararBackupDiario = iniciarBackupDiario();
  const server = app.listen(port, () => {
    console.log(`SGCV disponível em http://localhost:${server.address().port}`);
  });

  server.once("close", () => {
    pararBackupDiario();
    if (db.open) db.close();
  });
  server.once("error", (error) => {
    console.error("Não foi possível iniciar o servidor:", error);
    pararBackupDiario();
    if (db.open) db.close();
    process.exitCode = 1;
  });
  return server;
}

if (require.main === module) startServer();

module.exports = { startServer };
