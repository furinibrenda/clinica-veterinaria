const assert = require("node:assert/strict");
const { after, test } = require("node:test");

process.env.SGCV_DB_PATH = ":memory:";

const bcrypt = require("bcryptjs");
const request = require("supertest");
const { db } = require("../database");
const app = require("../src/app");
const { cadastrarAnimal } = require("../src/services/animalService");

after(() => {
  if (db.open) db.close();
});

test("cadastra animal com tutor existente e ativo", () => {
  const tutor = db.prepare(`
    INSERT INTO clientes (nome, cpf, telefone)
    VALUES (?, ?, ?)
  `).run("Ana Silva", "52998224725", "11999990000");

  const animal = cadastrarAnimal({
    nome: "Rex",
    especie: "Cão",
    cliente_id: Number(tutor.lastInsertRowid),
    raca: "Labrador",
    data_nascimento: "2020-03-15",
  });

  assert.equal(animal.id > 0, true);
  assert.equal(animal.nome, "Rex");
  assert.equal(animal.especie, "Cão");
  assert.equal(animal.raca, "Labrador");
  assert.equal(animal.data_nascimento, "2020-03-15");
  assert.equal(animal.cliente_id, Number(tutor.lastInsertRowid));
  assert.equal(animal.ativo, true);
  assert.deepEqual(
    db.prepare("SELECT nome, especie, raca, data_nascimento, cliente_id FROM animais WHERE id = ?").get(animal.id),
    {
      nome: "Rex",
      especie: "Cão",
      raca: "Labrador",
      data_nascimento: "2020-03-15",
      cliente_id: Number(tutor.lastInsertRowid),
    },
  );
});

test("exige nome, espécie e tutor válido e ativo", () => {
  const tutorInativo = db.prepare(`
    INSERT INTO clientes (nome, cpf, telefone, ativo)
    VALUES (?, ?, ?, 0)
  `).run("Bruno Costa", "12345678909", "11988887777");
  const dadosValidos = { nome: "Mimi", especie: "Gato", cliente_id: 1 };

  for (const dados of [
    { ...dadosValidos, nome: " " },
    { ...dadosValidos, especie: "" },
    { ...dadosValidos, cliente_id: undefined },
    { ...dadosValidos, data_nascimento: "2023-02-29" },
  ]) {
    assert.throws(() => cadastrarAnimal(dados), { status: 400 });
  }

  assert.throws(
    () => cadastrarAnimal({ ...dadosValidos, cliente_id: 9999 }),
    { status: 404, message: "Tutor não encontrado." },
  );
  assert.throws(
    () => cadastrarAnimal({ ...dadosValidos, cliente_id: Number(tutorInativo.lastInsertRowid) }),
    { status: 409, message: "O tutor está inativo." },
  );
});

test("cadastro de animal permite apenas Recepcionista", async () => {
  const inserirUsuario = db.prepare(`
    INSERT INTO usuarios (nome, login, senha_hash, perfil)
    VALUES (?, ?, ?, ?)
  `);
  const senhaHash = bcrypt.hashSync("senha-teste", 4);
  inserirUsuario.run("Recepcionista Teste", "recepcao", senhaHash, "Recepcionista");
  inserirUsuario.run("Veterinario Teste", "vet", senhaHash, "Veterinário");

  const tutorId = db.prepare("SELECT id FROM clientes WHERE cpf = ?").get("52998224725").id;
  const dadosAnimal = {
    cliente_id: tutorId,
    nome: "Luna",
    especie: "Gato",
    raca: "Siamês",
    data_nascimento: "2022-06-10",
  };
  const visitante = request.agent(app);
  assert.equal((await visitante.get("/animais/novo")).status, 302);
  assert.equal((await visitante.post("/api/animais").send(dadosAnimal)).status, 401);

  const recepcionista = request.agent(app);
  assert.equal(
    (await recepcionista.post("/api/login").send({ login: "recepcao", password: "senha-teste" })).status,
    200,
  );
  const pagina = await recepcionista.get("/animais/novo");
  assert.equal(pagina.status, 200);
  assert.match(pagina.text, /Cadastrar animal/);
  assert.equal((await recepcionista.get("/api/clientes").query({ busca: "Ana" })).body.clientes.length, 1);
  const cadastro = await recepcionista.post("/api/animais").send(dadosAnimal);
  assert.equal(cadastro.status, 201);
  assert.equal(cadastro.body.animal.raca, dadosAnimal.raca);
  assert.equal(cadastro.body.animal.data_nascimento, dadosAnimal.data_nascimento);

  const veterinario = request.agent(app);
  assert.equal(
    (await veterinario.post("/api/login").send({ login: "vet", password: "senha-teste" })).status,
    200,
  );
  assert.equal((await veterinario.get("/animais/novo")).status, 302);
  assert.equal((await veterinario.post("/api/animais").send(dadosAnimal)).status, 403);
});
