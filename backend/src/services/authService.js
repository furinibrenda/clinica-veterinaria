const bcrypt = require("bcryptjs");
const users = require("../repositories/userRepository");

async function authenticate(login, password) {
  const normalizedLogin = typeof login === "string" ? login.trim().toLowerCase() : "";
  if (
    !/^[a-zA-Z0-9._-]{3,30}$/.test(normalizedLogin) ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return null;
  }

  const user = users.findActiveByLogin(normalizedLogin);
  if (!user || !(await bcrypt.compare(password, user.senha_hash))) return null;
  return { id: user.id, nome: user.nome, login: user.login, perfil: user.perfil };
}

module.exports = { authenticate };
