const { db } = require("../../database");
const Consulta = require("../models/consulta");
const StatusConsulta = require("../models/statusConsulta");
const Veterinario = require("../models/veterinario");

const tutorPorId = db.prepare("SELECT id, ativo FROM clientes WHERE id = ?");
const animalPorTutor = db.prepare(`
  SELECT id, ativo
  FROM animais
  WHERE id = ? AND cliente_id = ?
`);
const veterinarioPorId = db.prepare(`
  SELECT id, nome
  FROM usuarios
  WHERE id = ? AND perfil = 'Veterinário' AND ativo = 1
`);
const veterinariosAtivos = db.prepare(`
  SELECT id, nome
  FROM usuarios
  WHERE perfil = 'Veterinário' AND ativo = 1
  ORDER BY nome COLLATE NOCASE, id
`);
const veterinariosDaAgenda = db.prepare(`
  SELECT id, nome
  FROM usuarios
  WHERE perfil = 'Veterinário'
  ORDER BY nome COLLATE NOCASE, id
`);
const animaisAtivosDoTutor = db.prepare(`
  SELECT id, nome, especie
  FROM animais
  WHERE cliente_id = ? AND ativo = 1
  ORDER BY nome COLLATE NOCASE, id
`);
const inserirConsulta = db.prepare(`
  INSERT INTO consultas (animal_id, veterinario_id, agendado_por, data, hora, status)
  VALUES (@animal_id, @veterinario_id, @agendado_por, @data, @hora, @status)
`);
const consultasDaAgenda = db.prepare(`
  SELECT consultas.id, consultas.veterinario_id, consultas.data, consultas.hora, consultas.status,
    clientes.nome AS tutor, animais.nome AS animal, usuarios.nome AS veterinario
  FROM consultas
  JOIN animais ON animais.id = consultas.animal_id
  JOIN clientes ON clientes.id = animais.cliente_id
  JOIN usuarios ON usuarios.id = consultas.veterinario_id
  WHERE (@data IS NULL OR consultas.data = @data)
    AND (@veterinario_id IS NULL OR consultas.veterinario_id = @veterinario_id)
  ORDER BY consultas.data, consultas.hora, usuarios.nome COLLATE NOCASE
`);
const cancelarConsultaPorId = db.prepare(`
  UPDATE consultas
  SET status = @cancelada
  WHERE id = @id AND status = @agendada
`);
const consultaPorId = db.prepare(`
  SELECT id, animal_id, agendado_por, status
  FROM consultas
  WHERE id = ?
`);
const alterarConsultaPorId = db.prepare(`
  UPDATE consultas
  SET veterinario_id = @veterinario_id, data = @data, hora = @hora
  WHERE id = @id AND status = @status
`);
const statusConsultaPorId = db.prepare("SELECT status FROM consultas WHERE id = ?");

function consultaError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validarDataHora(data, hora) {
  if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw consultaError("Informe uma data válida.", 400);
  }

  const dataValidada = new Date(`${data}T00:00:00.000Z`);
  if (
    Number.isNaN(dataValidada.getTime())
    || dataValidada.toISOString().slice(0, 10) !== data
  ) {
    throw consultaError("Informe uma data válida.", 400);
  }
  if (typeof hora !== "string" || !/^(?:0[89]|1[0-7]):(?:00|30)$/.test(hora)) {
    throw consultaError("Selecione um horário entre 08:00 e 17:30, de 30 em 30 minutos.", 400);
  }

  const agora = new Date();
  const hoje = [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0"),
  ].join("-");
  const horarioAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(
    agora.getMinutes(),
  ).padStart(2, "0")}`;

  if (data < hoje || (data === hoje && hora <= horarioAtual)) {
    throw consultaError("Não é possível agendar uma consulta em data ou horário no passado.", 400);
  }
}

function listarVeterinarios() {
  return veterinariosAtivos.all();
}

function listarVeterinariosDaAgenda() {
  return veterinariosDaAgenda.all();
}

function listarConsultas(filtros) {
  const data = filtros?.data ?? null;
  const veterinarioId = filtros?.veterinario_id ?? null;

  if (
    data !== null
    && (
      typeof data !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/.test(data)
      || Number.isNaN(new Date(`${data}T00:00:00.000Z`).getTime())
      || new Date(`${data}T00:00:00.000Z`).toISOString().slice(0, 10) !== data
    )
  ) {
    throw consultaError("Informe uma data válida.", 400);
  }
  if (
    veterinarioId !== null
    && (!Number.isSafeInteger(veterinarioId) || veterinarioId < 1)
  ) {
    throw consultaError("Selecione um veterinário válido.", 400);
  }

  return consultasDaAgenda.all({ data, veterinario_id: veterinarioId });
}

function cancelarConsulta(id) {
  const resultado = cancelarConsultaPorId.run({
    id,
    agendada: StatusConsulta.AGENDADA,
    cancelada: StatusConsulta.CANCELADA,
  });
  if (resultado.changes === 1) return;

  const consulta = statusConsultaPorId.get(id);
  if (!consulta) throw consultaError("Consulta não encontrada.", 404);
  throw consultaError("Somente consultas agendadas podem ser canceladas.", 409);
}

function alterarConsulta(id, dados) {
  const alterar = db.transaction(() => {
    const consulta = consultaPorId.get(id);
    if (!consulta) throw consultaError("Consulta não encontrada.", 404);
    if (consulta.status !== StatusConsulta.AGENDADA) {
      throw consultaError("Somente consultas agendadas podem ser alteradas.", 409);
    }

    const veterinarioId = Number(dados?.veterinario_id);
    if (!Number.isSafeInteger(veterinarioId) || veterinarioId < 1) {
      throw consultaError("Selecione um veterinário.", 400);
    }
    validarDataHora(dados?.data, dados?.hora);

    const dadosVeterinario = veterinarioPorId.get(veterinarioId);
    if (!dadosVeterinario) {
      throw consultaError("Veterinário não encontrado ou inativo.", 404);
    }

    const veterinario = new Veterinario(dadosVeterinario);
    if (!veterinario.estaDisponivel(dados.data, dados.hora, id)) {
      throw consultaError("O veterinário já possui uma consulta agendada nesse horário.", 409);
    }

    alterarConsultaPorId.run({
      id,
      veterinario_id: veterinarioId,
      data: dados.data,
      hora: dados.hora,
      status: StatusConsulta.AGENDADA,
    });

    return new Consulta({
      id,
      animal_id: consulta.animal_id,
      veterinario_id: veterinarioId,
      agendado_por: consulta.agendado_por,
      data: dados.data,
      hora: dados.hora,
      status: StatusConsulta.AGENDADA,
    });
  });

  return alterar();
}

function listarAnimaisAtivosDoTutor(tutorId) {
  return animaisAtivosDoTutor.all(tutorId);
}

function agendarConsulta(dados, recepcionistaId) {
  const tutorId = Number(dados?.cliente_id);
  const animalId = Number(dados?.animal_id);
  const veterinarioId = Number(dados?.veterinario_id);

  if (!Number.isSafeInteger(tutorId) || tutorId < 1) {
    throw consultaError("Selecione um tutor.", 400);
  }
  if (!Number.isSafeInteger(animalId) || animalId < 1) {
    throw consultaError("Selecione um animal.", 400);
  }
  if (!Number.isSafeInteger(veterinarioId) || veterinarioId < 1) {
    throw consultaError("Selecione um veterinário.", 400);
  }
  validarDataHora(dados?.data, dados?.hora);

  const agendar = db.transaction(() => {
    const tutor = tutorPorId.get(tutorId);
    if (!tutor) throw consultaError("Tutor não encontrado.", 404);
    if (tutor.ativo !== 1) throw consultaError("O tutor está inativo.", 409);

    const animal = animalPorTutor.get(animalId, tutorId);
    if (!animal) throw consultaError("O animal não pertence ao tutor selecionado.", 400);
    if (animal.ativo !== 1) throw consultaError("O animal está inativo.", 409);

    const dadosVeterinario = veterinarioPorId.get(veterinarioId);
    if (!dadosVeterinario) {
      throw consultaError("Veterinário não encontrado ou inativo.", 404);
    }

    const veterinario = new Veterinario(dadosVeterinario);
    if (!veterinario.estaDisponivel(dados.data, dados.hora)) {
      throw consultaError("O veterinário já possui uma consulta agendada nesse horário.", 409);
    }

    const consulta = new Consulta({
      animal_id: animalId,
      veterinario_id: veterinarioId,
      agendado_por: recepcionistaId,
      data: dados.data,
      hora: dados.hora,
      status: StatusConsulta.AGENDADA,
    });
    const resultado = inserirConsulta.run({
      animal_id: consulta.animal_id,
      veterinario_id: consulta.veterinario_id,
      agendado_por: consulta.agendado_por,
      data: consulta.data,
      hora: consulta.hora,
      status: consulta.status,
    });
    consulta.id = Number(resultado.lastInsertRowid);
    return consulta;
  });

  return agendar();
}

module.exports = {
  agendarConsulta,
  alterarConsulta,
  cancelarConsulta,
  listarAnimaisAtivosDoTutor,
  listarConsultas,
  listarVeterinarios,
  listarVeterinariosDaAgenda,
};
