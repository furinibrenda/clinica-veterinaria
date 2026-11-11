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

test("cadastro e listagem de clientes permitem apenas Recepcionista", async () => {
  const dadosCliente = {
    nome: "Ana Silva",
    cpf: "529.982.247-25",
    telefone: "(11) 99999-0000",
    email: "ana@example.com",
    endereco: "Rua A, 1",
  };
  const visitante = request.agent(app);

  assert.equal((await visitante.get("/clientes")).status, 302);
  assert.equal((await visitante.get("/clientes/novo")).status, 302);
  assert.equal((await visitante.post("/api/clientes").send(dadosCliente)).status, 401);
  assert.equal((await visitante.patch("/api/clientes/1/inativar")).status, 401);

  const recepcionista = request.agent(app);
  assert.equal(
    (await recepcionista.post("/api/login").send({ login: "recepcao", password: "senha-teste" })).status,
    200,
  );
  const paginaClientes = await recepcionista.get("/clientes");
  assert.equal(paginaClientes.status, 200);
  assert.match(paginaClientes.text, /Lista de clientes/);
  assert.equal((await recepcionista.get("/clientes/novo")).status, 200);

  const cadastro = await recepcionista.post("/api/clientes").send(dadosCliente);
  assert.equal(cadastro.status, 201);
  assert.equal(cadastro.body.cliente.nome, dadosCliente.nome);

  const veterinarioId = db.prepare("SELECT id FROM usuarios WHERE login = ?").get("vet").id;
  const animalId = Number(db.prepare(`
    INSERT INTO animais (cliente_id, nome, especie)
    VALUES (?, ?, ?)
  `).run(cadastro.body.cliente.id, "Rex", "Cão").lastInsertRowid);
  const consultaId = Number(db.prepare(`
    INSERT INTO consultas (animal_id, veterinario_id, agendado_por, data, hora)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    animalId,
    veterinarioId,
    veterinarioId,
    "2035-05-10",
    "10:00",
  ).lastInsertRowid);
  const clienteComConsulta = await recepcionista.patch(
    `/api/clientes/${cadastro.body.cliente.id}/inativar`,
  );
  assert.equal(clienteComConsulta.status, 409);
  assert.equal(
    clienteComConsulta.body.error,
    "Não é possível inativar o cliente porque possui animal com consulta agendada.",
  );
  assert.equal(
    db.prepare("SELECT ativo FROM clientes WHERE id = ?").get(cadastro.body.cliente.id).ativo,
    1,
  );
  db.prepare("UPDATE consultas SET status = 'CANCELADA' WHERE id = ?").run(consultaId);

  const totalClientesAntesInativar = db.prepare("SELECT COUNT(*) AS total FROM clientes").get().total;
  const dadosAntesInativar = db.prepare(
    "SELECT nome, cpf, telefone, email, endereco FROM clientes WHERE id = ?",
  ).get(cadastro.body.cliente.id);
  assert.equal((await recepcionista.patch(`/api/clientes/${cadastro.body.cliente.id}/inativar`)).status, 200);
  const clienteInativado = db.prepare(
    "SELECT nome, cpf, telefone, email, endereco, ativo FROM clientes WHERE id = ?",
  ).get(cadastro.body.cliente.id);
  assert.deepEqual(
    {
      nome: clienteInativado.nome,
      cpf: clienteInativado.cpf,
      telefone: clienteInativado.telefone,
      email: clienteInativado.email,
      endereco: clienteInativado.endereco,
      ativo: clienteInativado.ativo,
    },
    { ...dadosAntesInativar, ativo: 0 },
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM clientes").get().total, totalClientesAntesInativar);
  assert.equal((await recepcionista.post("/api/clientes").send(dadosCliente)).status, 409);
  assert.equal(
    (await recepcionista.post("/api/clientes").send({ ...dadosCliente, cpf: "11111111111" })).status,
    400,
  );

  db.prepare(`
    INSERT INTO clientes (nome, cpf, telefone, ativo)
    VALUES (?, ?, ?, ?)
  `).run("Bruno Costa", "12345678909", "11988887777", 0);

  const buscaNome = await recepcionista.get("/api/clientes").query({ busca: "Ana" });
  assert.equal(buscaNome.status, 200);
  assert.deepEqual(buscaNome.body.clientes.map(({ nome, ativo }) => ({ nome, ativo })), [
    { nome: "Ana Silva", ativo: 0 },
  ]);
  const buscaCpf = await recepcionista.get("/api/clientes").query({ busca: "123.456" });
  assert.deepEqual(buscaCpf.body.clientes.map(({ nome, ativo }) => ({ nome, ativo })), [
    { nome: "Bruno Costa", ativo: 0 },
  ]);
  assert.equal((await recepcionista.get("/api/clientes").query({ busca: ["Ana", "Bruno"] })).status, 400);
  assert.equal((await recepcionista.get("/api/clientes").query({ busca: "inexistente" })).body.clientes.length, 0);
  assert.equal((await recepcionista.patch("/api/clientes/99999/inativar")).status, 404);
  assert.equal((await recepcionista.patch("/api/clientes/0/inativar")).status, 400);

  const veterinario = request.agent(app);
  assert.equal(
    (await veterinario.post("/api/login").send({ login: "vet", password: "senha-teste" })).status,
    200,
  );
  assert.equal((await veterinario.get("/clientes/novo")).status, 302);
  assert.equal((await veterinario.post("/api/clientes").send(dadosCliente)).status, 403);
  assert.equal((await veterinario.get("/clientes")).status, 302);
  assert.equal((await veterinario.get("/api/clientes")).status, 403);
  assert.equal((await veterinario.patch("/api/clientes/1/inativar")).status, 403);
});
