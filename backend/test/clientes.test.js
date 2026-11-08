const assert = require("node:assert/strict");
const { after, test } = require("node:test");

process.env.SGCV_DB_PATH = ":memory:";

const bcrypt = require("bcryptjs");
const request = require("supertest");
const { db } = require("../database");
const app = require("../src/app");

const inserirUsuario = db.prepare(`
  INSERT INTO usuarios (nome, login, senha_hash, perfil)
  VALUES (?, ?, ?, ?)
`);
const senhaHash = bcrypt.hashSync("senha-teste", 4);
inserirUsuario.run("Recepcionista Teste", "recepcao", senhaHash, "Recepcionista");
inserirUsuario.run("Veterinario Teste", "vet", senhaHash, `Veterin${String.fromCharCode(225)}rio`);

after(() => {
  if (db.open) db.close();
});

test("cadastro de cliente permite apenas Recepcionista e valida os dados", async () => {
  const dadosCliente = {
    nome: "Ana Silva",
    cpf: "529.982.247-25",
    telefone: "(11) 99999-0000",
    email: "ana@example.com",
    endereco: "Rua A, 1",
  };
  const visitante = request.agent(app);

  assert.equal((await visitante.get("/clientes/novo")).status, 302);
  assert.equal((await visitante.post("/api/clientes").send(dadosCliente)).status, 401);

  const recepcionista = request.agent(app);
  assert.equal(
    (await recepcionista.post("/api/login").send({ login: "recepcao", password: "senha-teste" })).status,
    200,
  );
  assert.equal((await recepcionista.get("/clientes/novo")).status, 200);

  const cadastro = await recepcionista.post("/api/clientes").send(dadosCliente);
  assert.equal(cadastro.status, 201);
  assert.equal(cadastro.body.cliente.nome, dadosCliente.nome);
  assert.equal((await recepcionista.post("/api/clientes").send(dadosCliente)).status, 409);
  assert.equal(
    (await recepcionista.post("/api/clientes").send({ ...dadosCliente, cpf: "11111111111" })).status,
    400,
  );

  const veterinario = request.agent(app);
  assert.equal(
    (await veterinario.post("/api/login").send({ login: "vet", password: "senha-teste" })).status,
    200,
  );
  assert.equal((await veterinario.get("/clientes/novo")).status, 302);
  assert.equal((await veterinario.post("/api/clientes").send(dadosCliente)).status, 403);
});
