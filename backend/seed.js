const bcrypt = require("bcryptjs");
const { db } = require("./database");

const users = [
  { nome: "Recepcionista", login: "recepcionista", senha: "Recep123@", perfil: "Recepcionista" },
  { nome: "Veterinário", login: "veterinario", senha: "Vet123@", perfil: "Veterinário" },
];

try {
  const upsertUser = db.prepare(`
    INSERT INTO usuarios (nome, login, senha_hash, perfil)
    VALUES (@nome, @login, @senha_hash, @perfil)
    ON CONFLICT(login) DO UPDATE SET
      nome = excluded.nome,
      login = excluded.login,
      senha_hash = excluded.senha_hash,
      perfil = excluded.perfil
  `);

  const seedUsers = db.transaction(() => {
    for (const user of users) {
      upsertUser.run({
        nome: user.nome,
        login: user.login,
        senha_hash: bcrypt.hashSync(user.senha, 12),
        perfil: user.perfil,
      });
    }
  });

  seedUsers();
  console.log("Usuários de teste criados ou atualizados com sucesso.");
} finally {
  db.close();
}
