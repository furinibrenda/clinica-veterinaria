const loginTab = document.querySelector("#login-tab");
const registerTab = document.querySelector("#register-tab");
const loginForm = document.querySelector("#login-panel");
const registerForm = document.querySelector("#register-panel");
const message = document.querySelector("#form-message");
const authView = document.querySelector("#auth-view");
const signedInView = document.querySelector("#signed-in-view");

function showMessage(text, isSuccess = false) {
  message.textContent = text;
  message.classList.toggle("is-success", isSuccess);
}

function selectTab(tab) {
  const isLogin = tab === "login";
  loginTab.classList.toggle("is-active", isLogin);
  registerTab.classList.toggle("is-active", !isLogin);
  loginTab.setAttribute("aria-selected", String(isLogin));
  registerTab.setAttribute("aria-selected", String(!isLogin));
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  document.querySelector("#form-title").textContent = isLogin ? "Acesse sua conta" : "Crie sua conta";
  document.querySelector("#form-description").textContent = isLogin
    ? "Informe seu login e senha para continuar."
    : "Preencha seus dados para fazer parte da equipe.";
  showMessage("");
}

function showUser(user) {
  document.querySelector("#signed-in-name").textContent = user.name;
  document.querySelector("#signed-in-profile").textContent = user.profile;
  authView.hidden = true;
  signedInView.hidden = false;
}

async function submitForm(endpoint, form, getData) {
  showMessage("");
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getData(new FormData(form))),
    });
    const result = await response.json();

    if (!response.ok) {
      showMessage(result.error || "Não foi possível concluir a solicitação.");
      return result;
    }
    return result;
  } catch {
    showMessage("Não foi possível conectar ao servidor. Verifique se ele está em execução.");
    return null;
  } finally {
    submitButton.disabled = false;
  }
}

loginTab.addEventListener("click", () => selectTab("login"));
registerTab.addEventListener("click", () => selectTab("register"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const result = await submitForm("/api/login", loginForm, (data) => ({
    login: data.get("username"),
    password: data.get("password"),
  }));
  if (result?.user) showUser(result.user);
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const result = await submitForm("/api/register", registerForm, (data) => ({
    name: data.get("name"),
    login: data.get("username"),
    password: data.get("password"),
    profile: data.get("profile"),
  }));
  if (result && !result.error) {
    registerForm.reset();
    selectTab("login");
    document.querySelector("#login-username").value = "";
    showMessage(result.message, true);
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/logout", { method: "POST" });
    if (!response.ok) throw new Error("Falha ao encerrar sessão.");
    signedInView.hidden = true;
    authView.hidden = false;
    loginForm.reset();
    selectTab("login");
  } catch (error) {
    console.error(error);
    alert("Não foi possível encerrar a sessão. Tente novamente.");
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
