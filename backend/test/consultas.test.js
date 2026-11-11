const assert = require("node:assert/strict");
const { after, test } = require("node:test");

process.env.SGCV_DB_PATH = ":memory:";

const { db } = require("../database");
const Consulta = require("../src/models/consulta");
const StatusConsulta = require("../src/models/statusConsulta");
const Veterinario = require("../src/models/veterinario");

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
