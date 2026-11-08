const { db } = require("../../database");

const findActiveUser = db.prepare(
  "SELECT id, nome, login, perfil FROM usuarios WHERE id = ? AND ativo = 1",
);
const findUserByLogin = db.prepare(
  "SELECT id, nome, login, perfil, senha_hash FROM usuarios WHERE login = ? COLLATE NOCASE AND ativo = 1",
);
const insertUser = db.prepare(`
  INSERT INTO usuarios (nome, login, senha_hash, perfil)
  VALUES (@nome, @login, @senha_hash, @perfil)
`);

module.exports = {
  findActiveById: (id) => findActiveUser.get(id),
  findActiveByLogin: (login) => findUserByLogin.get(login),
  create: ({ nome, login, senha_hash, perfil }) => {
    const result = insertUser.run({ nome, login, senha_hash, perfil });
    return { id: Number(result.lastInsertRowid), nome, login, perfil };
  },
};
