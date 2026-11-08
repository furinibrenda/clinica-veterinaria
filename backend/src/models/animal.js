class Animal {
  constructor({ id, nome, especie, cliente_id, raca = null, data_nascimento = null, ativo = true }) {
    this.id = id;
    this.nome = nome;
    this.especie = especie;
    this.cliente_id = cliente_id;
    this.raca = raca;
    this.data_nascimento = data_nascimento;
    this.ativo = ativo;
  }
}

module.exports = Animal;
