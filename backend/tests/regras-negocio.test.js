const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const diretorioTemporario = fs.mkdtempSync(path.join(os.tmpdir(), "sgcv-testes-"));
process.env.SGCV_DB_PATH = path.join(diretorioTemporario, "sgcv.db");

const bcrypt = require("bcryptjs");
const request = require("supertest");
const { databasePath, db } = require("../database");
const app = require("../src/app");

const senha = "senha-teste";
const recepcionista = request.agent(app);
const veterinario = request.agent(app);
let veterinarioId;
let clienteId;
let animalId;

before(async () => {
  assert.equal(path.dirname(databasePath), diretorioTemporario);

  const senhaHash = bcrypt.hashSync(senha, 4);
  const inserirUsuario = db.prepare(`
    INSERT INTO usuarios (nome, login, senha_hash, perfil)
    VALUES (?, ?, ?, ?)
  `);
  inserirUsuario.run("Recepcionista Teste", "recepcionista-teste", senhaHash, "Recepcionista");
  veterinarioId = Number(inserirUsuario.run(
    "Veterinário Teste",
    "veterinario-teste",
    senhaHash,
    "Veterinário",
  ).lastInsertRowid);

  clienteId = Number(db.prepare(`
    INSERT INTO clientes (nome, cpf, telefone)
    VALUES (?, ?, ?)
  `).run("Cliente Teste", "52998224725", "11999990000").lastInsertRowid);
  animalId = Number(db.prepare(`
    INSERT INTO animais (cliente_id, nome, especie)
    VALUES (?, ?, ?)
  `).run(clienteId, "Animal Teste", "Cão").lastInsertRowid);

  assert.equal((await recepcionista.post("/api/login").send({
    login: "recepcionista-teste",
    password: senha,
  })).status, 200);
  assert.equal((await veterinario.post("/api/login").send({
    login: "veterinario-teste",
    password: senha,
  })).status, 200);
});

after(() => {
  if (db.open) db.close();
  fs.rmSync(diretorioTemporario, { recursive: true, force: true });
});

test("RN-03 impede agendar duas consultas para o mesmo veterinário no mesmo horário", async () => {
  const dados = {
    cliente_id: clienteId,
    animal_id: animalId,
    veterinario_id: veterinarioId,
    data: "2035-05-10",
    hora: "10:00",
  };

  const primeiraConsulta = await recepcionista.post("/api/consultas").send(dados);
  assert.equal(primeiraConsulta.status, 201);

  const conflito = await recepcionista.post("/api/consultas").send(dados);
  assert.equal(conflito.status, 409);
  assert.match(conflito.body.error, /já possui uma consulta agendada nesse horário/);
});

test("RN-06 impede cadastrar clientes com CPF duplicado", async () => {
  const duplicado = await recepcionista.post("/api/clientes").send({
    nome: "Outro Cliente",
    cpf: "529.982.247-25",
    telefone: "11988887777",
  });

  assert.equal(duplicado.status, 409);
  assert.equal(
    duplicado.body.error,
    "Já existe um cliente cadastrado com este CPF.",
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM clientes WHERE cpf = ?")
    .get("52998224725").total, 1);
});

test("RN-05 não permite editar diagnóstico registrado", async () => {
  const cadastro = await recepcionista.post("/api/consultas").send({
    cliente_id: clienteId,
    animal_id: animalId,
    veterinario_id: veterinarioId,
    data: "2035-05-10",
    hora: "11:00",
  });
  assert.equal(cadastro.status, 201);

  const consultaId = cadastro.body.consulta.id;
  const atendimento = await veterinario.post(
    `/api/consultas/${consultaId}/atendimento`,
  ).send({ diagnostico: "Diagnóstico original" });
  assert.equal(atendimento.status, 201);

  const edicao = await veterinario.patch(
    `/api/consultas/${consultaId}/atendimento`,
  ).send({ diagnostico: "Diagnóstico alterado" });
  assert.equal(edicao.status, 404);
  assert.equal(
    db.prepare("SELECT diagnostico FROM atendimentos WHERE consulta_id = ?")
      .get(consultaId).diagnostico,
    "Diagnóstico original",
  );
});
