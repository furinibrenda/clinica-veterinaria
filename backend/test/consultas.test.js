const assert = require("node:assert/strict");
const { after, test } = require("node:test");

process.env.SGCV_DB_PATH = ":memory:";

const bcrypt = require("bcryptjs");
const request = require("supertest");
const { db } = require("../database");
const Adendo = require("../src/models/adendo");
const Atendimento = require("../src/models/atendimento");
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

test("Atendimento e Adendo armazenam seus dados", () => {
  const atendimento = new Atendimento({
    consulta_id: 1,
    veterinario_id: 2,
    diagnostico: "Otite",
  });
  const adendo = new Adendo({
    atendimento_id: 1,
    autor_id: 2,
    texto: "Reavaliar em sete dias.",
  });

  assert.equal(atendimento.consulta_id, 1);
  assert.equal(atendimento.sintomas, null);
  assert.equal(atendimento.diagnostico, "Otite");
  assert.equal(adendo.atendimento_id, 1);
  assert.equal(adendo.autor_id, 2);
  assert.equal(adendo.texto, "Reavaliar em sete dias.");
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
  assert.equal((await visitante.get("/agenda")).status, 302);
  assert.equal((await visitante.get("/api/veterinarios")).status, 401);
  assert.equal((await visitante.get("/api/consultas")).status, 401);
  assert.equal((await visitante.patch("/api/consultas/1/cancelar")).status, 401);
  assert.equal((await visitante.post("/api/consultas/1/atendimento").send({})).status, 401);
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
  const agenda = await recepcionista.get("/agenda");
  assert.equal(agenda.status, 200);
  assert.match(agenda.text, /Agenda de consultas/);

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
  const consultasData = await recepcionista.get("/api/consultas").query({ data: dados.data });
  assert.equal(consultasData.status, 200);
  assert.equal(consultasData.body.consultas.length, 1);
  assert.equal(consultasData.body.consultas[0].tutor, "Ana Silva");
  assert.equal(consultasData.body.consultas[0].animal, "Rex");
  assert.equal(consultasData.body.consultas[0].veterinario, "Veterinário A");
  assert.equal(consultasData.body.consultas[0].status, StatusConsulta.AGENDADA);
  assert.equal(consultasData.body.pode_cancelar, true);
  assert.equal(consultasData.body.pode_alterar, true);
  assert.equal(consultasData.body.pode_registrar_atendimento, false);
  assert.equal(
    (await recepcionista.get("/api/consultas").query({ data: "2035-02-30" })).status,
    400,
  );
  assert.equal(
    (await recepcionista.get("/api/consultas").query({ veterinario_id: "abc" })).status,
    400,
  );

  const conflito = await recepcionista.post("/api/consultas").send(dados);
  assert.equal(conflito.status, 409);
  assert.match(conflito.body.error, /já possui uma consulta agendada nesse horário/);

  const consultaId = cadastro.body.consulta.id;
  const consultaAlterada = await recepcionista.patch(`/api/consultas/${consultaId}`).send({
    data: "2035-05-11",
    hora: "09:00",
    veterinario_id: outroVeterinarioId,
  });
  assert.equal(consultaAlterada.status, 200);
  assert.equal(consultaAlterada.body.consulta.data, "2035-05-11");
  assert.equal(consultaAlterada.body.consulta.hora, "09:00");
  assert.equal(consultaAlterada.body.consulta.veterinario_id, outroVeterinarioId);
  assert.equal(
    (await recepcionista.patch(`/api/consultas/${consultaId}`).send(dados)).status,
    200,
  );
  assert.equal((await recepcionista.patch("/api/consultas/0").send(dados)).status, 400);
  assert.equal((await recepcionista.patch("/api/consultas/99999").send(dados)).status, 404);
  for (const tentativa of [
    { ...dados, data: "2000-01-01" },
    { ...dados, data: "2035-02-30" },
    { ...dados, hora: "17:45" },
  ]) {
    assert.equal(
      (await recepcionista.patch(`/api/consultas/${consultaId}`).send(tentativa)).status,
      400,
    );
  }
  assert.equal(
    (await recepcionista.patch(`/api/consultas/${consultaId}/cancelar`)).status,
    200,
  );
  const consultaCancelada = db.prepare(`
    SELECT animal_id, veterinario_id, agendado_por, data, hora, status
    FROM consultas WHERE id = ?
  `).get(consultaId);
  assert.deepEqual(consultaCancelada, {
    animal_id: animalId,
    veterinario_id: veterinarioId,
    agendado_por: recepcionistaId,
    data: dados.data,
    hora: dados.hora,
    status: StatusConsulta.CANCELADA,
  });
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM consultas WHERE id = ?").get(consultaId).total, 1);
  assert.equal(
    (await recepcionista.patch(`/api/consultas/${consultaId}/cancelar`)).status,
    409,
  );
  assert.equal(
    (await recepcionista.patch(`/api/consultas/${consultaId}`).send(dados)).status,
    409,
  );
  assert.equal((await recepcionista.patch("/api/consultas/99999/cancelar")).status, 404);
  assert.equal((await recepcionista.patch("/api/consultas/0/cancelar")).status, 400);

  const reagendamento = await recepcionista.post("/api/consultas").send(dados);
  assert.equal(reagendamento.status, 201);

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
  assert.equal(
    (await recepcionista.patch(`/api/consultas/${reagendamento.body.consulta.id}`).send({
      ...dados,
      veterinario_id: outroVeterinarioId,
      hora: "08:30",
    })).status,
    409,
  );
  const consultasVeterinario = await recepcionista.get("/api/consultas").query({
    veterinario_id: outroVeterinarioId,
  });
  assert.equal(consultasVeterinario.body.consultas.length, 1);
  assert.equal(consultasVeterinario.body.consultas[0].veterinario, "Veterinário B");

  const veterinario = request.agent(app);
  assert.equal(
    (await veterinario.post("/api/login").send({ login: "vet-a", password: "senha-teste" })).status,
    200,
  );
  assert.equal((await veterinario.get("/consultas/novo")).status, 302);
  const agendaVeterinario = await veterinario.get("/agenda");
  assert.equal(agendaVeterinario.status, 200);
  assert.equal((await veterinario.get("/api/veterinarios")).status, 403);
  assert.equal((await veterinario.get("/api/agenda/veterinarios")).status, 200);
  const agendaVeterinarioApi = await veterinario.get("/api/consultas");
  assert.equal(agendaVeterinarioApi.status, 200);
  assert.equal(agendaVeterinarioApi.body.pode_cancelar, false);
  assert.equal(agendaVeterinarioApi.body.pode_alterar, false);
  assert.equal(agendaVeterinarioApi.body.pode_registrar_atendimento, true);
  assert.equal(agendaVeterinarioApi.body.pode_ver_atendimento, true);
  assert.equal(
    (await veterinario.patch(`/api/consultas/${reagendamento.body.consulta.id}/cancelar`)).status,
    403,
  );
  assert.equal(
    (await veterinario.patch(`/api/consultas/${reagendamento.body.consulta.id}`).send(dados)).status,
    403,
  );
  assert.equal((await veterinario.get(`/api/clientes/${tutorId}/animais`)).status, 403);
  assert.equal((await veterinario.post("/api/consultas").send(dados)).status, 403);
  assert.equal(
    (await recepcionista.post("/api/consultas/1/atendimento").send({
      diagnostico: "Consulta de rotina",
    })).status,
    403,
  );
  assert.equal((await recepcionista.get("/api/consultas/0/atendimento")).status, 400);
  assert.equal((await recepcionista.get("/api/consultas/99999/atendimento")).status, 404);

  const consultaParaAtendimento = await recepcionista.post("/api/consultas").send({
    ...dados,
    hora: "09:00",
  });
  assert.equal(consultaParaAtendimento.status, 201);
  const consultaAtendimentoId = consultaParaAtendimento.body.consulta.id;
  assert.equal(
    (await veterinario.get(`/api/consultas/${consultaAtendimentoId}/atendimento`)).status,
    409,
  );
  const semDiagnostico = await veterinario.post(
    `/api/consultas/${consultaAtendimentoId}/atendimento`,
  ).send({ sintomas: "Coceira" });
  assert.equal(semDiagnostico.status, 400);
  assert.equal(semDiagnostico.body.error, "Informe o diagnóstico.");

  const registro = await veterinario.post(
    `/api/consultas/${consultaAtendimentoId}/atendimento`,
  ).send({
    sintomas: "Coceira",
    observacoes: "Sem lesões aparentes.",
    prescricao: "Uso tópico.",
    diagnostico: "Dermatite leve",
  });
  assert.equal(registro.status, 201);
  assert.equal(registro.body.atendimento.consulta_id, consultaAtendimentoId);
  assert.equal(registro.body.atendimento.veterinario_id, veterinarioId);
  assert.equal(registro.body.atendimento.diagnostico, "Dermatite leve");
  assert.equal(
    db.prepare("SELECT status FROM consultas WHERE id = ?").get(consultaAtendimentoId).status,
    StatusConsulta.REALIZADA,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS total FROM atendimentos WHERE consulta_id = ?")
      .get(consultaAtendimentoId).total,
    1,
  );
  const atendimentoRecepcionista = await recepcionista.get(
    `/api/consultas/${consultaAtendimentoId}/atendimento`,
  );
  assert.equal(atendimentoRecepcionista.status, 200);
  assert.equal(atendimentoRecepcionista.body.pode_adicionar_adendo, false);
  const adendoTexto = "Retorno recomendado em sete dias.";
  db.prepare(`
    INSERT INTO adendos (atendimento_id, autor_id, texto)
    VALUES (?, ?, ?)
  `).run(registro.body.atendimento.id, veterinarioId, adendoTexto);
  const atendimentoVisualizado = await veterinario.get(
    `/api/consultas/${consultaAtendimentoId}/atendimento`,
  );
  assert.equal(atendimentoVisualizado.status, 200);
  assert.deepEqual(atendimentoVisualizado.body.atendimento, registro.body.atendimento);
  assert.equal(atendimentoVisualizado.body.adendos.length, 1);
  assert.equal(atendimentoVisualizado.body.adendos[0].texto, adendoTexto);
  assert.equal(atendimentoVisualizado.body.pode_adicionar_adendo, true);
  assert.equal(atendimentoVisualizado.body.adendos[0].autor, "Veterinário A");
  assert.ok(atendimentoVisualizado.body.adendos[0].criado_em);

  const adendoSemTexto = await veterinario.post(
    `/api/consultas/${consultaAtendimentoId}/atendimento/adendos`,
  ).send({ texto: "   " });
  assert.equal(adendoSemTexto.status, 400);
  assert.equal(adendoSemTexto.body.error, "Informe o texto do adendo.");
  assert.equal(
    (await recepcionista.post(
      `/api/consultas/${consultaAtendimentoId}/atendimento/adendos`,
    ).send({ texto: "Adendo não autorizado." })).status,
    403,
  );
  const novoAdendo = await veterinario.post(
    `/api/consultas/${consultaAtendimentoId}/atendimento/adendos`,
  ).send({ texto: "Retorno em sete dias." });
  assert.equal(novoAdendo.status, 201);
  assert.equal(novoAdendo.body.adendo.autor_id, veterinarioId);
  assert.equal(novoAdendo.body.adendo.autor, "Veterinário A");
  assert.ok(novoAdendo.body.adendo.criado_em);

  const atendimentoComNovoAdendo = await recepcionista.get(
    `/api/consultas/${consultaAtendimentoId}/atendimento`,
  );
  assert.equal(atendimentoComNovoAdendo.body.atendimento.diagnostico, "Dermatite leve");
  assert.equal(atendimentoComNovoAdendo.body.adendos.length, 2);
  assert.equal(atendimentoComNovoAdendo.body.adendos[1].texto, "Retorno em sete dias.");
  assert.equal(atendimentoComNovoAdendo.body.adendos[1].autor, "Veterinário A");
  const atendimentoDuplicado = await veterinario.post(
    `/api/consultas/${consultaAtendimentoId}/atendimento`,
  ).send({ diagnostico: "Outro diagnóstico" });
  assert.equal(atendimentoDuplicado.status, 409);
});
