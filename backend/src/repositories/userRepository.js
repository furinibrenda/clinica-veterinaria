const { db } = require("../../database");

const findActiveUser = db.prepare(
  "SELECT id, nome, login, perfil FROM usuarios WHERE id = ? AND ativo = 1",
);
const findUserByLogin = db.prepare(
  "SELECT id, nome, login, perfil, senha_hash FROM usuarios WHERE login = ? COLLATE NOCASE AND ativo = 1",
);

module.exports = {
  findActiveById: (id) => findActiveUser.get(id),
  findActiveByLogin: (login) => findUserByLogin.get(login),
};
