const {
  agendarConsulta: criarConsulta,
  alterarConsulta: atualizarConsulta,
  buscarAtendimento: consultarAtendimento,
  cancelarConsulta: marcarConsultaCancelada,
  listarAnimaisAtivosDoTutor: buscarAnimaisAtivosDoTutor,
  listarConsultas: buscarConsultas,
  listarVeterinarios: buscarVeterinarios,
  listarVeterinariosDaAgenda: buscarVeterinariosDaAgenda,
  registrarAtendimento: criarAtendimento,
} = require("../services/consultaService");

function listarConsultas(req, res, next) {
  const data = req.query.data ?? null;
  const veterinarioId = req.query.veterinario_id ?? null;
  if (typeof data !== "string" && data !== null) {
    return res.status(400).json({ error: "Informe uma data válida." });
  }
  if (typeof veterinarioId !== "string" && veterinarioId !== null) {
    return res.status(400).json({ error: "Selecione um veterinário válido." });
  }

  try {
    res.json({
      consultas: buscarConsultas({
        data,
        veterinario_id: veterinarioId === null ? null : Number(veterinarioId),
      }),
      pode_cancelar: req.user.perfil === "Recepcionista",
      pode_alterar: req.user.perfil === "Recepcionista",
      pode_registrar_atendimento: req.user.perfil === "Veterinário",
      pode_ver_atendimento: true,
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

function cancelarConsulta(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: "Identificador de consulta inválido." });
  }

  try {
    marcarConsultaCancelada(id);
    res.json({ message: "Consulta cancelada com sucesso." });
  } catch (error) {
    if ([404, 409].includes(error.status)) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

function alterarConsulta(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: "Identificador de consulta inválido." });
  }

  try {
    const consulta = atualizarConsulta(id, req.body);
    res.json({ consulta, message: "Consulta alterada com sucesso." });
  } catch (error) {
    if ([400, 404, 409].includes(error.status)) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

function registrarAtendimento(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: "Identificador de consulta inválido." });
  }

  try {
    const atendimento = criarAtendimento(id, req.body, req.user.id);
    res.status(201).json({ atendimento, message: "Atendimento registrado com sucesso." });
  } catch (error) {
    if ([400, 404, 409].includes(error.status)) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

function buscarAtendimento(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: "Identificador de consulta inválido." });
  }

  try {
    res.json(consultarAtendimento(id));
  } catch (error) {
    if ([404, 409].includes(error.status)) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

function listarVeterinarios(req, res) {
  res.json({ veterinarios: buscarVeterinarios() });
}

function listarVeterinariosDaAgenda(req, res) {
  res.json({ veterinarios: buscarVeterinariosDaAgenda() });
}

function listarAnimaisDoTutor(req, res) {
  const tutorId = Number(req.params.id);
  if (!Number.isSafeInteger(tutorId) || tutorId < 1) {
    return res.status(400).json({ error: "Identificador de tutor inválido." });
  }
  res.json({ animais: buscarAnimaisAtivosDoTutor(tutorId) });
}

function agendarConsulta(req, res, next) {
  try {
    const consulta = criarConsulta(req.body, req.user.id);
    res.status(201).json({ consulta });
  } catch (error) {
    if ([400, 404, 409].includes(error.status)) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = {
  agendarConsulta,
  alterarConsulta,
  buscarAtendimento,
  cancelarConsulta,
  listarAnimaisDoTutor,
  listarConsultas,
  listarVeterinarios,
  listarVeterinariosDaAgenda,
  registrarAtendimento,
};
