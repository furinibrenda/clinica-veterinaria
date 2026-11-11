const {
  agendarConsulta: criarConsulta,
  listarAnimaisAtivosDoTutor: buscarAnimaisAtivosDoTutor,
  listarVeterinarios: buscarVeterinarios,
} = require("../services/consultaService");

function listarVeterinarios(req, res) {
  res.json({ veterinarios: buscarVeterinarios() });
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

module.exports = { agendarConsulta, listarAnimaisDoTutor, listarVeterinarios };
