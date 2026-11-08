const assert = require("node:assert/strict");
const { after, test } = require("node:test");

process.env.SGCV_DB_PATH = ":memory:";

const bcrypt = require("bcryptjs");
const request = require("supertest");
const { db } = require("../database");
const app = require("../src/app");

after(() => {
  if (db.open) db.close();
});

test("cadastro de usuário valida campos, perfil, login único e hash da senha", async () => {
  const usuario = {
    nome: "  Maria Silva  ",
    login: "  Maria.Silva  ",
    password: "senha-segura-123",
    perfil: "Recepcionista",
  };

  const cadastro = await request(app).post("/api/register").send(usuario);
  assert.equal(cadastro.status, 201);
  assert.deepEqual(cadastro.body.user, {
    name: "Maria Silva",
    login: "maria.silva",
    profile: "Recepcionista",
  });

  const armazenado = db.prepare("SELECT nome, login, senha_hash, perfil FROM usuarios WHERE login = ?")
    .get("maria.silva");
  assert.equal(armazenado.nome, "Maria Silva");
  assert.notEqual(armazenado.senha_hash, usuario.password);
  assert.equal(await bcrypt.compare(usuario.password, armazenado.senha_hash), true);

  assert.equal(
    (await request(app).post("/api/register").send({ ...usuario, login: "MARIA.SILVA" })).status,
    409,
  );
  assert.equal(
    (await request(app).post("/api/register").send({ ...usuario, perfil: "Administrador" })).status,
    400,
  );
  const cadastroVeterinario = await request(app).post("/api/register").send({
    ...usuario,
    login: "dr.vet",
    perfil: "Veterinário",
  });
  assert.equal(cadastroVeterinario.status, 201);
  assert.equal(cadastroVeterinario.body.user.profile, "Veterinário");
  assert.equal(
    (await request(app).post("/api/register").send({ ...usuario, password: "curta" })).status,
    400,
  );

  for (const campo of ["nome", "login", "password", "perfil"]) {
    const dadosInvalidos = { ...usuario };
    delete dadosInvalidos[campo];
    assert.equal((await request(app).post("/api/register").send(dadosInvalidos)).status, 400);
  }
});
