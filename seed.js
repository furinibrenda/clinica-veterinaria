const { randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { db } = require("./database");

const users = [
  { nome: "Recepcionista", login: "recepcionista", perfil: "Recepcionista" },
  { nome: "Veterinário", login: "veterinario", perfil: "Veterinário" },
];

try {
  const insertUser = db.prepare(`
    INSERT INTO usuarios (nome, login, senha_hash, perfil)
    VALUES (@nome, @login, @senha_hash, @perfil)
  `);
  const findUser = db.prepare("SELECT perfil FROM usuarios WHERE login = ?");
  const created = [];

  const seedUsers = db.transaction(() => {
    for (const user of users) {
      const existing = findUser.get(user.login);
      if (existing) {
        if (existing.perfil !== user.perfil) {
          throw new Error(`O login "${user.login}" já está associado a outro perfil.`);
        }
        continue;
      }

      const password = randomBytes(18).toString("base64url");
      insertUser.run({
        ...user,
        senha_hash: bcrypt.hashSync(password, 12),
      });
      created.push({ login: user.login, password });
    }
  });

  seedUsers();

  for (const user of created) {
    console.log(`Login: ${user.login}\nSenha inicial: ${user.password}\n`);
  }
  for (const user of users.filter((item) => !created.some((createdUser) => createdUser.login === item.login))) {
    console.log(`Login "${user.login}" já existe; senha mantida.`);
  }
  if (created.length === 0) {
    console.log("Os usuários iniciais já existem. Nenhuma senha foi alterada.");
  }
} finally {
  db.close();
}
