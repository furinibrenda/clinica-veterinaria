const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const databasePath = process.env.SGCV_DB_PATH === ":memory:" ? ":memory:" : path.resolve(
  process.env.SGCV_DB_PATH || path.join(__dirname, "data", "sgcv.db"),
);
if (databasePath !== ":memory:") fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    login TEXT NOT NULL COLLATE NOCASE UNIQUE,
    senha_hash TEXT NOT NULL,
    perfil TEXT NOT NULL CHECK (perfil IN ('Recepcionista', 'Veterinário')),
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    telefone TEXT NOT NULL,
    email TEXT,
    endereco TEXT,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS animais (
    id INTEGER PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    nome TEXT NOT NULL,
    especie TEXT NOT NULL,
    raca TEXT,
    data_nascimento TEXT,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS consultas (
    id INTEGER PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animais(id) ON DELETE RESTRICT,
    veterinario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    agendado_por INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    data TEXT NOT NULL,
    hora TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AGENDADA'
      CHECK (status IN ('AGENDADA', 'REALIZADA', 'CANCELADA')),
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_consultas_agenda
    ON consultas(veterinario_id, data, hora, status);
  CREATE INDEX IF NOT EXISTS idx_animais_cliente ON animais(cliente_id);

  CREATE TABLE IF NOT EXISTS atendimentos (
    id INTEGER PRIMARY KEY,
    consulta_id INTEGER NOT NULL UNIQUE REFERENCES consultas(id) ON DELETE RESTRICT,
    veterinario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    sintomas TEXT,
    observacoes TEXT,
    prescricao TEXT,
    diagnostico TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS adendos (
    id INTEGER PRIMARY KEY,
    atendimento_id INTEGER NOT NULL REFERENCES atendimentos(id) ON DELETE RESTRICT,
    autor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    texto TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const tabelaConsultas = db.prepare(`
  SELECT sql FROM sqlite_master
  WHERE type = 'table' AND name = 'consultas'
`).get();

if (tabelaConsultas.sql.includes("'Agendada'")) {
  const migrarConsultas = db.transaction(() => {
    db.exec(`
      CREATE TABLE consultas_nova (
        id INTEGER PRIMARY KEY,
        animal_id INTEGER NOT NULL REFERENCES animais(id) ON DELETE RESTRICT,
        veterinario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        agendado_por INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        data TEXT NOT NULL,
        hora TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'AGENDADA'
          CHECK (status IN ('AGENDADA', 'REALIZADA', 'CANCELADA')),
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO consultas_nova (
        id, animal_id, veterinario_id, agendado_por, data, hora, status, criado_em
      )
      SELECT id, animal_id, veterinario_id, agendado_por, data, hora,
        CASE status
          WHEN 'Agendada' THEN 'AGENDADA'
          WHEN 'Realizada' THEN 'REALIZADA'
          WHEN 'Cancelada' THEN 'CANCELADA'
        END,
        criado_em
      FROM consultas;

      DROP TABLE consultas;
      ALTER TABLE consultas_nova RENAME TO consultas;
      CREATE INDEX idx_consultas_agenda
        ON consultas(veterinario_id, data, hora, status);
    `);
  });

  db.pragma("foreign_keys = OFF");
  try {
    migrarConsultas();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

module.exports = { db, databasePath };
