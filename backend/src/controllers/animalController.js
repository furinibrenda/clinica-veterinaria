const {
  cadastrarAnimal: criarAnimal,
  inativarAnimal: marcarAnimalInativo,
  listarAnimais: buscarAnimais,
} = require("../services/animalService");

function listarAnimais(req, res) {
  res.json({ animais: buscarAnimais() });
}

function cadastrarAnimal(req, res, next) {
  try {
    const animal = criarAnimal(req.body);
    res.status(201).json({ animal });
  } catch (error) {
    if ([400, 404, 409].includes(error.status)) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

function inativarAnimal(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: "Identificador de animal inválido." });
  }

  try {
    marcarAnimalInativo(id);
    res.json({ message: "Animal inativado com sucesso." });
  } catch (error) {
    if ([404, 409].includes(error.status)) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = { cadastrarAnimal, inativarAnimal, listarAnimais };
