const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");

const diretorioTemporario = fs.mkdtempSync(path.join(os.tmpdir(), "sgcv-backup-test-"));
process.env.SGCV_DB_PATH = path.join(diretorioTemporario, "sgcv.db");

const Database = require("better-sqlite3");
const { db } = require("../database");
const { criarBackupDiario } = require("../src/services/backupService");

after(() => {
  if (db.open) db.close();
  fs.rmSync(diretorioTemporario, { recursive: true, force: true });
});

test("cria backup do banco e mantém as sete cópias mais recentes", async () => {
  db.prepare(`
    INSERT INTO usuarios (nome, login, senha_hash, perfil)
    VALUES (?, ?, ?, ?)
  `).run("Recepcionista", "backup-teste", "hash", "Recepcionista");

  const pastaBackups = path.join(diretorioTemporario, "backups");
  fs.mkdirSync(pastaBackups);
  for (let dia = 1; dia <= 8; dia += 1) {
    const data = `2020-01-${String(dia).padStart(2, "0")}`;
    fs.writeFileSync(path.join(pastaBackups, `sgcv-${data}.db`), "");
  }

  const caminhoBackup = await criarBackupDiario(pastaBackups);
  assert.equal(fs.existsSync(caminhoBackup), true);

  const dbBackup = new Database(caminhoBackup, { readonly: true });
  assert.equal(
    dbBackup.prepare("SELECT nome FROM usuarios WHERE login = ?").get("backup-teste").nome,
    "Recepcionista",
  );
  dbBackup.close();

  const arquivos = fs.readdirSync(pastaBackups).sort().reverse();
  assert.equal(arquivos.length, 7);
  assert.equal(arquivos[0], path.basename(caminhoBackup));
  assert.equal(arquivos.includes("sgcv-2020-01-01.db"), false);
  assert.equal(arquivos.includes("sgcv-2020-01-08.db"), true);
});
