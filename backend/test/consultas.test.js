const assert = require("node:assert/strict");
const { after, test } = require("node:test");

process.env.SGCV_DB_PATH = ":memory:";

const bcrypt = require("bcryptjs");
const request = require("supertest");
const { db } = require("../database");
const Consulta = require("../src/models/consulta");
const StatusConsulta = require("../src/models/statusConsulta");
const Veterinario = require("../src/models/veterinario");
const app = require("../src/app");

after(() => {
  if (db.open) db.close();
});

test("Consulta usa AGENDADA como status inicial", () => {
  assert.deepEqual(StatusConsulta, {
    AGENDADA: "AGENDADA",
    REALIZADA: "REALIZADA",
    CANCELADA: "CANCELADA",
  });

  const consulta = new Consulta({
    animal_id: 1,
    veterinario_id: 2,
    agendado_por: 3,
    data: "2026-11-10",
    hora: "10:00",
  });

  assert.equal(consulta.status, StatusConsulta.AGENDADA);
});

test("Veterinario verifica conflito somente com consulta AGENDADA no mesmo horário", () => {
  const inserirUsuario = db.prepare(`
    INSERT INTO usuarios (nome, login, senha_hash, perfil)
    VALUES (?, ?, ?, 'Veterinário')
  `);
  const veterinarioId = Number(inserirUsuario.run("Veterinário A", "vet-a", "hash").lastInsertRowid);
  const outroVeterinarioId = Number(inserirUsuario.run("Veterinário B", "vet-b", "hash").lastInsertRowid);
  const clienteId = Number(db.prepare(`
    INSERT INTO clientes (nome, cpf, telefone) VALUES (?, ?, ?)
  `).run("Ana Silva", "52998224725", "11999990000").lastInsertRowid);
  const animalId = Number(db.prepare(`
    INSERT INTO animais (cliente_id, nome, especie) VALUES (?, ?, ?)
  `).run(clienteId, "Rex", "Cão").lastInsertRowid);
  const inserirConsulta = db.prepare(`
    INSERT INTO consultas (animal_id, veterinario_id, agendado_por, data, hora, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  inserirConsulta.run(
    animalId,
    veterinarioId,
    veterinarioId,
    "2026-11-10",
    "10:00",
    StatusConsulta.AGENDADA,
  );

  const veterinario = new Veterinario({ id: veterinarioId, nome: "Veterinário A" });
  const outroVeterinario = new Veterinario({ id: outroVeterinarioId, nome: "Veterinário B" });
  assert.equal(veterinario.estaDisponivel("2026-11-10", "10:00"), false);
  assert.equal(veterinario.estaDisponivel("2026-11-10", "11:00"), true);
  assert.equal(veterinario.estaDisponivel("2026-11-11", "10:00"), true);
  assert.equal(outroVeterinario.estaDisponivel("2026-11-10", "10:00"), true);

  db.prepare("UPDATE consultas SET status = ?").run(StatusConsulta.REALIZADA);
  assert.equal(veterinario.estaDisponivel("2026-11-10", "10:00"), true);
  db.prepare("UPDATE consultas SET status = ?").run(StatusConsulta.CANCELADA);
  assert.equal(veterinario.estaDisponivel("2026-11-10", "10:00"), true);

  assert.throws(() => {
    inserirConsulta.run(
      animalId,
      veterinarioId,
      veterinarioId,
      "2026-11-10",
      "10:00",
      "INVALIDA",
    );
  });
});

test("agendamento valida horário, conflito e acesso de Recepcionista", async () => {
  const inserirUsuario = db.prepare(`
    INSERT INTO usuarios (nome, login, senha_hash, perfil)
    VALUES (?, ?, ?, ?)
  `);
  const senhaHash = bcrypt.hashSync("senha-teste", 4);
  const recepcionistaId = Number(inserirUsuario.run(
    "Recepcionista Teste",
    "recepcao-consulta",
    senhaHash,
    "Recepcionista",
  ).lastInsertRowid);
  const veterinarioId = db.prepare(`
    SELECT id FROM usuarios WHERE login = ?
  `).get("vet-a").id;
  const outroVeterinarioId = db.prepare(`
    SELECT id FROM usuarios WHERE login = ?
  `).get("vet-b").id;
  db.prepare("UPDATE usuarios SET senha_hash = ? WHERE id IN (?, ?)").run(
    senhaHash,
    veterinarioId,
    outroVeterinarioId,
  );
  const tutorId = db.prepare(`
    SELECT id FROM clientes WHERE cpf = ?
  `).get("52998224725").id;
  const animalId = db.prepare(`
    SELECT id FROM animais WHERE cliente_id = ?
  `).get(tutorId).id;

  const visitante = request.agent(app);
  assert.equal((await visitante.get("/consultas/novo")).status, 302);
  assert.equal((await visitante.get("/api/veterinarios")).status, 401);
  assert.equal((await visitante.get(`/api/clientes/${tutorId}/animais`)).status, 401);
  assert.equal((await visitante.post("/api/consultas").send({})).status, 401);

  const recepcionista = request.agent(app);
  assert.equal(
    (await recepcionista.post("/api/login").send({
      login: "recepcao-consulta",
      password: "senha-teste",
    })).status,
    200,
  );
  const pagina = await recepcionista.get("/consultas/novo");
  assert.equal(pagina.status, 200);
  assert.match(pagina.text, /Agendar consulta/);

  const veterinarios = await recepcionista.get("/api/veterinarios");
  assert.deepEqual(veterinarios.body.veterinarios.map(({ id }) => id), [
    veterinarioId,
    outroVeterinarioId,
  ]);
  const animais = await recepcionista.get(`/api/clientes/${tutorId}/animais`);
  assert.deepEqual(animais.body.animais.map(({ id }) => id), [animalId]);

  const dados = {
    cliente_id: tutorId,
    animal_id: animalId,
    veterinario_id: veterinarioId,
    data: "2035-05-10",
    hora: "08:00",
  };
  const cadastro = await recepcionista.post("/api/consultas").send(dados);
  assert.equal(cadastro.status, 201);
  assert.equal(cadastro.body.consulta.status, StatusConsulta.AGENDADA);
  assert.equal(cadastro.body.consulta.agendado_por, recepcionistaId);

  const conflito = await recepcionista.post("/api/consultas").send(dados);
  assert.equal(conflito.status, 409);
  assert.match(conflito.body.error, /já possui uma consulta agendada nesse horário/);

  for (const tentativa of [
    { ...dados, data: "2000-01-01" },
    { ...dados, data: "2035-02-30" },
    { ...dados, hora: "17:45" },
    { ...dados, hora: "07:30" },
  ]) {
    const resposta = await recepcionista.post("/api/consultas").send(tentativa);
    assert.equal(resposta.status, 400);
  }

  assert.equal(
    (await recepcionista.post("/api/consultas").send({
      ...dados,
      veterinario_id: outroVeterinarioId,
      hora: "08:30",
    })).status,
    201,
  );

  const veterinario = request.agent(app);
  assert.equal(
    (await veterinario.post("/api/login").send({ login: "vet-a", password: "senha-teste" })).status,
    200,
  );
  assert.equal((await veterinario.get("/consultas/novo")).status, 302);
  assert.equal((await veterinario.get("/api/veterinarios")).status, 403);
  assert.equal((await veterinario.get(`/api/clientes/${tutorId}/animais`)).status, 403);
  assert.equal((await veterinario.post("/api/consultas").send(dados)).status, 403);
});
