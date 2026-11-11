const tutorSearchForm = document.querySelector("#tutor-search-form");
const tutorSearch = document.querySelector("#tutor-search");
const tutorSelect = document.querySelector("#appointment-tutor");
const animalSelect = document.querySelector("#appointment-animal");
const veterinarianSelect = document.querySelector("#appointment-veterinarian");
const timeSelect = document.querySelector("#appointment-time");
const appointmentDate = document.querySelector("#appointment-date");
const appointmentForm = document.querySelector("#appointment-form");
const appointmentMessage = document.querySelector("#appointment-message");
const appointmentSubmit = document.querySelector("#appointment-submit");

function showAppointmentMessage(text, isSuccess = false) {
  appointmentMessage.textContent = text;
  appointmentMessage.classList.toggle("is-success", isSuccess);
}

function preencherHorarios() {
  for (let minutos = 8 * 60; minutos <= 17 * 60 + 30; minutos += 30) {
    const hora = String(Math.floor(minutos / 60)).padStart(2, "0");
    const minuto = String(minutos % 60).padStart(2, "0");
    const valor = `${hora}:${minuto}`;
    timeSelect.add(new Option(valor, valor));
  }
}

function limparAnimais() {
  animalSelect.replaceChildren(new Option("Selecione primeiro um tutor", ""));
  animalSelect.disabled = true;
}

async function carregarVeterinarios() {
  try {
    const response = await fetch("/api/veterinarios");
    const result = await response.json();

    if (!response.ok) {
      showAppointmentMessage(result.error || "Não foi possível carregar os veterinários.");
      return;
    }

    veterinarianSelect.replaceChildren(new Option("Selecione um veterinário", ""));
    for (const veterinario of result.veterinarios) {
      veterinarianSelect.add(new Option(veterinario.nome, veterinario.id));
    }
    appointmentSubmit.disabled = result.veterinarios.length === 0;
    if (result.veterinarios.length === 0) {
      showAppointmentMessage("Nenhum veterinário ativo cadastrado.");
    }
  } catch {
    showAppointmentMessage("Não foi possível conectar ao servidor. Tente novamente.");
  }
}

async function buscarTutores() {
  const termo = tutorSearch.value.trim();
  showAppointmentMessage("");
  tutorSelect.replaceChildren(new Option("Busque e selecione um tutor", ""));
  limparAnimais();

  if (!termo) {
    showAppointmentMessage("Informe o nome ou CPF do tutor.");
    return;
  }

  const botao = tutorSearchForm.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    const params = new URLSearchParams({ busca: termo });
    const response = await fetch(`/api/clientes?${params}`);
    const result = await response.json();

    if (!response.ok) {
      showAppointmentMessage(result.error || "Não foi possível buscar os tutores.");
      return;
    }

    const tutores = result.clientes.filter((cliente) => cliente.ativo === 1);
    if (tutores.length === 0) {
      showAppointmentMessage("Nenhum tutor ativo encontrado.");
      return;
    }

    for (const tutor of tutores) {
      tutorSelect.add(new Option(`${tutor.nome} — CPF ${tutor.cpf}`, tutor.id));
    }
    showAppointmentMessage("Selecione o tutor encontrado.");
  } catch {
    showAppointmentMessage("Não foi possível conectar ao servidor. Tente novamente.");
  } finally {
    botao.disabled = false;
  }
}

async function carregarAnimais(tutorId) {
  limparAnimais();
  if (!tutorId) return;

  try {
    const response = await fetch(`/api/clientes/${tutorId}/animais`);
    const result = await response.json();

    if (!response.ok) {
      showAppointmentMessage(result.error || "Não foi possível carregar os animais.");
      return;
    }

    animalSelect.replaceChildren(new Option("Selecione um animal", ""));
    for (const animal of result.animais) {
      animalSelect.add(new Option(`${animal.nome} (${animal.especie})`, animal.id));
    }
    animalSelect.disabled = result.animais.length === 0;
    if (result.animais.length === 0) {
      showAppointmentMessage("O tutor selecionado não possui animais ativos.");
    }
  } catch {
    showAppointmentMessage("Não foi possível conectar ao servidor. Tente novamente.");
  }
}

async function agendarConsulta() {
  showAppointmentMessage("");
  appointmentSubmit.disabled = true;

  try {
    const response = await fetch("/api/consultas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(appointmentForm))),
    });
    const result = await response.json();

    if (!response.ok) {
      showAppointmentMessage(result.error || "Não foi possível agendar a consulta.");
      return;
    }

    appointmentForm.reset();
    tutorSearchForm.reset();
    limparAnimais();
    showAppointmentMessage("Consulta agendada com sucesso.", true);
  } catch {
    showAppointmentMessage("Não foi possível conectar ao servidor. Tente novamente.");
  } finally {
    appointmentSubmit.disabled = false;
  }
}

tutorSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  buscarTutores();
});

tutorSearch.addEventListener("input", () => {
  tutorSelect.replaceChildren(new Option("Busque e selecione um tutor", ""));
  limparAnimais();
});

tutorSelect.addEventListener("change", () => carregarAnimais(tutorSelect.value));

appointmentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  agendarConsulta();
});

const hoje = new Date();
appointmentDate.min = [
  hoje.getFullYear(),
  String(hoje.getMonth() + 1).padStart(2, "0"),
  String(hoje.getDate()).padStart(2, "0"),
].join("-");

preencherHorarios();
carregarVeterinarios();
