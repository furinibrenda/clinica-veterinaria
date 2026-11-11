const agendaFilters = document.querySelector("#agenda-filters");
const veterinarianSelect = document.querySelector("#agenda-veterinarian");
const agendaList = document.querySelector("#agenda-list");
const agendaMessage = document.querySelector("#agenda-message");
const editDialog = document.querySelector("#edit-consultation-dialog");
const editForm = document.querySelector("#edit-consultation-form");
const editDate = document.querySelector("#edit-consultation-date");
const editTime = document.querySelector("#edit-consultation-time");
const editVeterinarian = document.querySelector("#edit-consultation-veterinarian");
const editMessage = document.querySelector("#edit-consultation-message");
const editSubmit = document.querySelector("#save-edit-consultation");
const visitDialog = document.querySelector("#register-visit-dialog");
const visitForm = document.querySelector("#register-visit-form");
const visitMessage = document.querySelector("#register-visit-message");
const visitSubmit = document.querySelector("#save-register-visit");
const viewVisitDialog = document.querySelector("#view-visit-dialog");
const viewVisitDetails = document.querySelector("#view-visit-details");
const addendumForm = document.querySelector("#addendum-form");
const addendumMessage = document.querySelector("#addendum-message");
const addendumSubmit = document.querySelector("#save-addendum");
let consultaAtendimentoAtual;
let consultasAtuais = [];
let veterinariosEdicao = [];
let veterinariosEdicaoCarregados = false;

function renderConsultas(
  consultas,
  podeCancelar,
  podeAlterar,
  podeRegistrarAtendimento,
  podeVerAtendimento,
) {
  consultasAtuais = consultas;
  agendaList.replaceChildren();

  if (consultas.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "empty-row";
    cell.colSpan = 7;
    cell.textContent = "Nenhuma consulta encontrada para os filtros selecionados.";
    row.append(cell);
    agendaList.append(row);
    return;
  }

  const statusNomes = {
    AGENDADA: "Agendada",
    REALIZADA: "Realizada",
    CANCELADA: "Cancelada",
  };
  const statusClasses = {
    AGENDADA: "is-scheduled",
    REALIZADA: "is-completed",
    CANCELADA: "is-cancelled",
  };

  for (const consulta of consultas) {
    const row = document.createElement("tr");
    const data = new Date(`${consulta.data}T00:00:00`);
    const valores = [
      Number.isNaN(data.getTime()) ? consulta.data : data.toLocaleDateString("pt-BR"),
      consulta.hora,
      consulta.tutor,
      consulta.animal,
      consulta.veterinario,
    ];
    for (const value of valores) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `appointment-status ${statusClasses[consulta.status] || ""}`;
    status.textContent = statusNomes[consulta.status] || consulta.status;
    statusCell.append(status);
    row.append(statusCell);

    const actionsCell = document.createElement("td");
    if (consulta.status === "REALIZADA" && podeVerAtendimento) {
      const viewButton = document.createElement("button");
      viewButton.className = "client-edit-button";
      viewButton.dataset.verAtendimentoId = consulta.id;
      viewButton.type = "button";
      viewButton.textContent = "Ver atendimento";
      actionsCell.append(viewButton);
    } else if (
      consulta.status === "AGENDADA"
      && (podeAlterar || podeCancelar || podeRegistrarAtendimento)
    ) {
      if (podeAlterar) {
        const editButton = document.createElement("button");
        editButton.className = "client-edit-button";
        editButton.dataset.editarConsultaId = consulta.id;
        editButton.type = "button";
        editButton.textContent = "Alterar";
        actionsCell.append(editButton);
      }
      if (podeRegistrarAtendimento) {
        const visitButton = document.createElement("button");
        visitButton.className = "client-edit-button";
        visitButton.dataset.registrarAtendimentoId = consulta.id;
        visitButton.type = "button";
        visitButton.textContent = "Registrar atendimento";
        actionsCell.append(visitButton);
      }
      if (podeCancelar) {
        const cancelButton = document.createElement("button");
        cancelButton.className = "client-inactivate-button";
        cancelButton.dataset.consultaId = consulta.id;
        cancelButton.type = "button";
        cancelButton.textContent = "Cancelar";
        actionsCell.append(cancelButton);
      }
    } else {
      actionsCell.textContent = "—";
    }
    row.append(actionsCell);
    agendaList.append(row);
  }
}

async function carregarVeterinarios() {
  try {
    const response = await fetch("/api/agenda/veterinarios");
    const result = await response.json();

    if (!response.ok) {
      agendaMessage.textContent = result.error || "Não foi possível carregar os veterinários.";
      return false;
    }

    for (const veterinario of result.veterinarios) {
      veterinarianSelect.add(new Option(veterinario.nome, veterinario.id));
    }
    return true;
  } catch {
    agendaMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
    return false;
  }
}

async function buscarConsultas() {
  agendaMessage.textContent = "";
  agendaMessage.classList.remove("is-success");
  agendaList.replaceChildren();

  try {
    const filtros = new FormData(agendaFilters);
    const params = new URLSearchParams();
    const data = filtros.get("data");
    const veterinarioId = filtros.get("veterinario_id");
    if (data) params.set("data", data);
    if (veterinarioId) params.set("veterinario_id", veterinarioId);

    const response = await fetch(`/api/consultas?${params}`);
    const result = await response.json();

    if (!response.ok) {
      agendaMessage.textContent = result.error || "Não foi possível carregar a agenda.";
      return false;
    }
    if (result.pode_alterar && !veterinariosEdicaoCarregados) {
      if (!await carregarVeterinariosEdicao()) {
        renderConsultas(
          result.consultas,
          result.pode_cancelar,
          false,
          result.pode_registrar_atendimento,
          result.pode_ver_atendimento,
        );
        return false;
      }
    }
    renderConsultas(
      result.consultas,
      result.pode_cancelar,
      result.pode_alterar && veterinariosEdicao.length > 0,
      result.pode_registrar_atendimento,
      result.pode_ver_atendimento,
    );
    return true;
  } catch {
    agendaMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
    return false;
  }
}

async function carregarVeterinariosEdicao() {
  try {
    const response = await fetch("/api/veterinarios");
    const result = await response.json();

    if (!response.ok) {
      agendaMessage.textContent = result.error || "Não foi possível carregar os veterinários.";
      return false;
    }

    veterinariosEdicao = result.veterinarios;
    veterinariosEdicaoCarregados = true;
    return true;
  } catch {
    agendaMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
    return false;
  }
}

function preencherHorariosEdicao() {
  for (let minutos = 8 * 60; minutos <= 17 * 60 + 30; minutos += 30) {
    const hora = String(Math.floor(minutos / 60)).padStart(2, "0");
    const minuto = String(minutos % 60).padStart(2, "0");
    const valor = `${hora}:${minuto}`;
    editTime.add(new Option(valor, valor));
  }
}

function abrirAlteracao(id) {
  const consulta = consultasAtuais.find((item) => item.id === Number(id));
  if (!consulta) return;

  editForm.dataset.consultaId = consulta.id;
  editDate.value = consulta.data;
  const hoje = new Date();
  editDate.min = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0"),
  ].join("-");
  editTime.value = consulta.hora;
  editVeterinarian.replaceChildren(new Option("Selecione um veterinário", ""));
  for (const veterinario of veterinariosEdicao) {
    editVeterinarian.add(new Option(veterinario.nome, veterinario.id));
  }
  editVeterinarian.value = String(
    veterinariosEdicao.some((item) => item.id === consulta.veterinario_id)
      ? consulta.veterinario_id
      : "",
  );
  editMessage.textContent = "";
  editMessage.classList.remove("is-success");
  editDialog.showModal();
}

async function salvarAlteracao() {
  editMessage.textContent = "";
  editMessage.classList.remove("is-success");
  editSubmit.disabled = true;

  try {
    const response = await fetch(`/api/consultas/${editForm.dataset.consultaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(editForm))),
    });
    const result = await response.json();

    if (!response.ok) {
      editMessage.textContent = result.error || "Não foi possível alterar a consulta.";
      return;
    }

    editDialog.close();
    if (await buscarConsultas()) {
      agendaMessage.textContent = result.message;
      agendaMessage.classList.add("is-success");
    }
  } catch {
    editMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
  } finally {
    editSubmit.disabled = false;
  }
}

function abrirRegistroAtendimento(id) {
  const consulta = consultasAtuais.find((item) => item.id === Number(id));
  if (!consulta) return;

  visitForm.dataset.consultaId = consulta.id;
  visitForm.reset();
  visitMessage.textContent = "";
  visitMessage.classList.remove("is-success");
  visitDialog.showModal();
}

async function salvarAtendimento() {
  visitMessage.textContent = "";
  visitMessage.classList.remove("is-success");
  visitSubmit.disabled = true;

  try {
    const response = await fetch(
      `/api/consultas/${visitForm.dataset.consultaId}/atendimento`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(visitForm))),
      },
    );
    const result = await response.json();

    if (!response.ok) {
      visitMessage.textContent = result.error || "Não foi possível registrar o atendimento.";
      return;
    }

    visitDialog.close();
    if (await buscarConsultas()) {
      agendaMessage.textContent = result.message;
      agendaMessage.classList.add("is-success");
    }
  } catch {
    visitMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
  } finally {
    visitSubmit.disabled = false;
  }
}

function adicionarCampoAtendimento(rotulo, valor) {
  const campo = document.createElement("section");
  campo.className = "visit-detail";
  const titulo = document.createElement("h3");
  titulo.textContent = rotulo;
  const texto = document.createElement("p");
  texto.textContent = valor || "Não informado.";
  campo.append(titulo, texto);
  viewVisitDetails.append(campo);
}

function formatarDataHora(valor) {
  const data = new Date(`${valor.replace(" ", "T")}Z`);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR");
}

async function verAtendimento(id) {
  agendaMessage.textContent = "";
  agendaMessage.classList.remove("is-success");
  viewVisitDetails.replaceChildren();

  try {
    const response = await fetch(`/api/consultas/${id}/atendimento`);
    const result = await response.json();

    if (!response.ok) {
      agendaMessage.textContent = result.error || "Não foi possível carregar o atendimento.";
      return;
    }

    consultaAtendimentoAtual = id;
    addendumForm.hidden = !result.pode_adicionar_adendo;
    addendumForm.reset();
    addendumMessage.textContent = "";
    adicionarCampoAtendimento("Sintomas", result.atendimento.sintomas);
    adicionarCampoAtendimento("Observações", result.atendimento.observacoes);
    adicionarCampoAtendimento("Prescrição", result.atendimento.prescricao);
    adicionarCampoAtendimento("Diagnóstico", result.atendimento.diagnostico);

    const secaoAdendos = document.createElement("section");
    secaoAdendos.className = "visit-detail";
    const tituloAdendos = document.createElement("h3");
    tituloAdendos.textContent = "Adendos";
    secaoAdendos.append(tituloAdendos);
    if (result.adendos.length === 0) {
      const vazio = document.createElement("p");
      vazio.textContent = "Nenhum adendo registrado.";
      secaoAdendos.append(vazio);
    } else {
      for (const adendo of result.adendos) {
        const item = document.createElement("article");
        item.className = "visit-addendum";
        const texto = document.createElement("p");
        texto.textContent = adendo.texto;
        const autoria = document.createElement("p");
        autoria.className = "visit-addendum-author";
        autoria.textContent = `${adendo.autor} · ${formatarDataHora(adendo.criado_em)}`;
        item.append(texto, autoria);
        secaoAdendos.append(item);
      }
    }
    viewVisitDetails.append(secaoAdendos);
    if (!viewVisitDialog.open) viewVisitDialog.showModal();
  } catch {
    agendaMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
  }
}

async function registrarAdendo() {
  addendumMessage.textContent = "";
  addendumSubmit.disabled = true;

  try {
    const response = await fetch(
      `/api/consultas/${consultaAtendimentoAtual}/atendimento/adendos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(addendumForm))),
      },
    );
    const result = await response.json();

    if (!response.ok) {
      addendumMessage.textContent = result.error || "Não foi possível registrar o adendo.";
      return;
    }

    await verAtendimento(consultaAtendimentoAtual);
  } catch {
    addendumMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
  } finally {
    addendumSubmit.disabled = false;
  }
}

async function cancelarConsulta(button) {
  const confirmado = window.confirm("Deseja realmente cancelar esta consulta?");
  if (!confirmado) return;

  agendaMessage.textContent = "";
  agendaMessage.classList.remove("is-success");
  button.disabled = true;
  try {
    const response = await fetch(`/api/consultas/${button.dataset.consultaId}/cancelar`, {
      method: "PATCH",
    });
    const result = await response.json();

    if (!response.ok) {
      agendaMessage.textContent = result.error || "Não foi possível cancelar a consulta.";
      button.disabled = false;
      return;
    }

    if (await buscarConsultas()) {
      agendaMessage.textContent = result.message;
      agendaMessage.classList.add("is-success");
    }
  } catch {
    agendaMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
    button.disabled = false;
  }
}

agendaFilters.addEventListener("submit", (event) => {
  event.preventDefault();
  buscarConsultas();
});

agendaList.addEventListener("click", (event) => {
  const botaoVerAtendimento = event.target.closest("[data-ver-atendimento-id]");
  if (botaoVerAtendimento) {
    verAtendimento(botaoVerAtendimento.dataset.verAtendimentoId);
    return;
  }
  const botaoAtendimento = event.target.closest("[data-registrar-atendimento-id]");
  if (botaoAtendimento) {
    abrirRegistroAtendimento(botaoAtendimento.dataset.registrarAtendimentoId);
    return;
  }
  const botaoAlterar = event.target.closest("[data-editar-consulta-id]");
  if (botaoAlterar) {
    abrirAlteracao(botaoAlterar.dataset.editarConsultaId);
    return;
  }
  const botaoCancelar = event.target.closest("[data-consulta-id]");
  if (botaoCancelar) cancelarConsulta(botaoCancelar);
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  salvarAlteracao();
});

document.querySelector("#close-edit-consultation").addEventListener("click", () => {
  editDialog.close();
});

visitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  salvarAtendimento();
});

document.querySelector("#close-register-visit").addEventListener("click", () => {
  visitDialog.close();
});

document.querySelector("#close-view-visit").addEventListener("click", () => {
  viewVisitDialog.close();
});

addendumForm.addEventListener("submit", (event) => {
  event.preventDefault();
  registrarAdendo();
});

async function iniciarAgenda() {
  preencherHorariosEdicao();
  if (await carregarVeterinarios()) await buscarConsultas();
}

iniciarAgenda();
