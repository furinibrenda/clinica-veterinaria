const bcrypt = require("bcryptjs");
const users = require("../repositories/userRepository");

function registrationError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function registerUser(dados) {
  const nome = typeof dados?.nome === "string" ? dados.nome.trim() : "";
  const login = typeof dados?.login === "string" ? dados.login.trim().toLowerCase() : "";
  const password = dados?.password;
  const perfil = dados?.perfil;

  if (!nome || !login || typeof password !== "string" || !perfil) {
    throw registrationError("Nome, login, senha e perfil são obrigatórios.");
  }
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(login)) {
    throw registrationError("Login deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.");
  }
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw registrationError("A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.");
  }
  if (perfil !== "Recepcionista" && perfil !== "Veterinário") {
    throw registrationError("Perfil inválido.");
  }

  const senha_hash = await bcrypt.hash(password, 12);
  try {
    return users.create({ nome, login, senha_hash, perfil });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw registrationError("Já existe um usuário cadastrado com este login.", 409);
    }
    throw error;
  }
}

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

module.exports = { authenticate, registerUser };
