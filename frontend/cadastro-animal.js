const tutorSearchForm = document.querySelector("#tutor-search-form");
const tutorSearch = document.querySelector("#tutor-search");
const tutorSelect = document.querySelector("#animal-tutor");
const animalForm = document.querySelector("#animal-form");
const animalMessage = document.querySelector("#animal-form-message");

function showAnimalMessage(text, isSuccess = false) {
  animalMessage.textContent = text;
  animalMessage.classList.toggle("is-success", isSuccess);
}

function limparTutores() {
  tutorSelect.replaceChildren(new Option("Busque e selecione um tutor", ""));
}

async function buscarTutores() {
  const termo = tutorSearch.value.trim();
  showAnimalMessage("");
  limparTutores();

  if (!termo) {
    showAnimalMessage("Informe o nome ou CPF do tutor.");
    return;
  }

  const botao = tutorSearchForm.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    const params = new URLSearchParams({ busca: termo });
    const response = await fetch(`/api/clientes?${params}`);
    const result = await response.json();

    if (!response.ok) {
      showAnimalMessage(result.error || "Não foi possível buscar os tutores.");
      return;
    }

    const tutores = result.clientes.filter((cliente) => cliente.ativo === 1);
    if (tutores.length === 0) {
      showAnimalMessage("Nenhum tutor ativo encontrado.");
      return;
    }

    for (const tutor of tutores) {
      tutorSelect.add(new Option(`${tutor.nome} — CPF ${tutor.cpf}`, tutor.id));
    }
    showAnimalMessage("Selecione o tutor encontrado.");
  } catch {
    showAnimalMessage("Não foi possível conectar ao servidor. Tente novamente.");
  } finally {
    botao.disabled = false;
  }
}

async function cadastrarAnimal(form) {
  showAnimalMessage("");
  const botao = form.querySelector('button[type="submit"]');
  botao.disabled = true;

  try {
    const dados = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/animais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const result = await response.json();

    if (!response.ok) {
      showAnimalMessage(result.error || "Não foi possível cadastrar o animal.");
      return;
    }

    form.reset();
    limparTutores();
    tutorSearchForm.reset();
    showAnimalMessage("Animal cadastrado com sucesso.", true);
  } catch {
    showAnimalMessage("Não foi possível conectar ao servidor. Tente novamente.");
  } finally {
    botao.disabled = false;
  }
}

tutorSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  buscarTutores();
});

tutorSearch.addEventListener("input", limparTutores);

animalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  cadastrarAnimal(animalForm);
});
