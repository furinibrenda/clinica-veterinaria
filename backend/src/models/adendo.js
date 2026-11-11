class Adendo {
  constructor({ id, atendimento_id, autor_id, texto, criado_em }) {
    this.id = id;
    this.atendimento_id = atendimento_id;
    this.autor_id = autor_id;
    this.texto = texto;
    this.criado_em = criado_em;
  }
}

module.exports = Adendo;
