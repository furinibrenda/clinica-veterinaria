const {
  agendarConsulta: criarConsulta,
  listarAnimaisAtivosDoTutor: buscarAnimaisAtivosDoTutor,
  listarConsultas: buscarConsultas,
  listarVeterinarios: buscarVeterinarios,
  listarVeterinariosDaAgenda: buscarVeterinariosDaAgenda,
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
    });
  } catch (error) {
    if (error.status === 400) {
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
  listarAnimaisDoTutor,
  listarConsultas,
  listarVeterinarios,
  listarVeterinariosDaAgenda,
};
