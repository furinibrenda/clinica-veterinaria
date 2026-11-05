class Cliente {
  constructor({ id, nome, cpf, telefone, email = null, endereco = null, ativo = true }) {
    this.id = id;
    this.nome = nome;
    this.cpf = cpf;
    this.telefone = telefone;
    this.email = email;
    this.endereco = endereco;
    this.ativo = ativo;
  }

  validarCPF() {
    const cpf = typeof this.cpf === "string" ? this.cpf.replace(/[.-]/g, "") : "";
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

    const digitos = cpf.split("").map(Number);
    for (let posicao = 9; posicao <= 10; posicao += 1) {
      let soma = 0;
      for (let indice = 0; indice < posicao; indice += 1) {
        soma += digitos[indice] * (posicao + 1 - indice);
      }

      const resto = (soma * 10) % 11;
      const digito = resto === 10 ? 0 : resto;
      if (digito !== digitos[posicao]) return false;
    }

    return true;
  }
}

module.exports = Cliente;
