const fs = require("node:fs");
const path = require("node:path");
const { db, databasePath } = require("../../database");

const diretorioBackups = path.join(__dirname, "..", "..", "backups");
const nomeArquivoBackup = /^sgcv-\d{4}-\d{2}-\d{2}\.db$/;

function dataAtual() {
  const data = new Date();
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

function removerBackupsAntigos(pasta) {
  const backups = fs.readdirSync(pasta)
    .filter((nome) => nomeArquivoBackup.test(nome))
    .sort()
    .reverse();

  for (const nome of backups.slice(7)) {
    fs.unlinkSync(path.join(pasta, nome));
  }
}

async function criarBackupDiario(pasta = diretorioBackups) {
  if (databasePath === ":memory:") return null;

  fs.mkdirSync(pasta, { recursive: true });
  const caminhoBackup = path.join(pasta, `sgcv-${dataAtual()}.db`);
  await db.backup(caminhoBackup);
  removerBackupsAntigos(pasta);
  return caminhoBackup;
}

function iniciarBackupDiario() {
  let temporizador;
  let encerrado = false;

  async function executarBackup() {
    try {
      await criarBackupDiario();
    } catch (error) {
      console.error("Não foi possível criar o backup diário:", error);
    }

    if (encerrado) return;
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(0, 0, 0, 0);
    temporizador = setTimeout(executarBackup, amanha.getTime() - Date.now());
  }

  executarBackup();
  return () => {
    encerrado = true;
    clearTimeout(temporizador);
  };
}

module.exports = { criarBackupDiario, iniciarBackupDiario };
