const loginForm = document.querySelector("#login-panel");
const message = document.querySelector("#form-message");
const authView = document.querySelector("#auth-view");
const signedInView = document.querySelector("#signed-in-view");
const listClientsLink = document.querySelector("#list-clients-link");
const registerClientLink = document.querySelector("#register-client-link");
const registerAnimalLink = document.querySelector("#register-animal-link");
const listAnimalsLink = document.querySelector("#list-animals-link");
const scheduleAppointmentLink = document.querySelector("#schedule-appointment-link");
const viewAgendaLink = document.querySelector("#view-agenda-link");

function showMessage(text, isSuccess = false) {
  message.textContent = text;
  message.classList.toggle("is-success", isSuccess);
}

function showUser(user) {
  document.querySelector("#signed-in-name").textContent = user.name;
  document.querySelector("#signed-in-profile").textContent = user.profile;
  listClientsLink.hidden = user.profile !== "Recepcionista";
  registerClientLink.hidden = user.profile !== "Recepcionista";
  registerAnimalLink.hidden = user.profile !== "Recepcionista";
  listAnimalsLink.hidden = user.profile !== "Recepcionista";
  scheduleAppointmentLink.hidden = user.profile !== "Recepcionista";
  viewAgendaLink.hidden = false;
  authView.hidden = true;
  signedInView.hidden = false;
}

async function submitLogin(form) {
  showMessage("");
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const formData = new FormData(form);
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: formData.get("username"),
        password: formData.get("password"),
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      showMessage(result.error || "Não foi possível concluir a solicitação.");
      return;
    }
    showUser(result.user);
  } catch {
    showMessage("Não foi possível conectar ao servidor. Verifique se ele está em execução.");
  } finally {
    submitButton.disabled = false;
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitLogin(loginForm);
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/logout", { method: "POST" });
    if (!response.ok) throw new Error("Falha ao encerrar sessão.");
    signedInView.hidden = true;
    listClientsLink.hidden = true;
    registerClientLink.hidden = true;
    registerAnimalLink.hidden = true;
    listAnimalsLink.hidden = true;
    scheduleAppointmentLink.hidden = true;
    viewAgendaLink.hidden = true;
    authView.hidden = false;
    loginForm.reset();
    showMessage("");
  } catch (error) {
    console.error(error);
    showMessage("Não foi possível encerrar a sessão. Tente novamente.");
  }
});

async function restoreSession() {
  try {
    const response = await fetch("/api/session");
    if (!response.ok) throw new Error("Falha ao consultar sessão.");
    const result = await response.json();
    if (result.user) showUser(result.user);
  } catch (error) {
    console.error("Não foi possível verificar a sessão:", error);
    showMessage("Não foi possível verificar sua sessão. Atualize a página para tentar novamente.");
  }
}

restoreSession();
