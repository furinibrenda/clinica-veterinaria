class Atendimento {
  constructor({
    id,
    consulta_id,
    veterinario_id,
    sintomas = null,
    observacoes = null,
    prescricao = null,
    diagnostico,
    criado_em,
  }) {
    this.id = id;
    this.consulta_id = consulta_id;
    this.veterinario_id = veterinario_id;
    this.sintomas = sintomas;
    this.observacoes = observacoes;
    this.prescricao = prescricao;
    this.diagnostico = diagnostico;
    this.criado_em = criado_em;
  }
}

module.exports = Atendimento;
