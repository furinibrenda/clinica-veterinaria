const { cadastrarAnimal: criarAnimal } = require("../services/animalService");

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

module.exports = { cadastrarAnimal };
