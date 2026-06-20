const tabs = document.querySelectorAll('.tab');
const forms = {
  login: document.querySelector('#loginForm'),
  register: document.querySelector('#registerForm')
};
const message = document.querySelector('#authMessage');

function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `auth-message ${type}`.trim();
}

const authQueryMessages = {
  discord_state_error: 'A autenticação com Discord expirou ou falhou. Tente novamente.',
  discord_not_configured: 'O login com Discord ainda não está configurado corretamente no .env.',
  discord_failed: 'Não foi possível concluir o login com Discord agora. Tente novamente.'
};

const authStatus = new URLSearchParams(window.location.search).get('auth');
if (authStatus && authQueryMessages[authStatus]) {
  setMessage(authQueryMessages[authStatus], 'error');
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const selected = tab.dataset.tab;

    tabs.forEach((item) => item.classList.toggle('active', item === tab));
    Object.entries(forms).forEach(([key, form]) => {
      form.classList.toggle('active', key === selected);
    });

    if (!authStatus) setMessage('');
  });
});

async function sendAuth(endpoint, form) {
  const payload = Object.fromEntries(new FormData(form).entries());

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Não foi possível entrar agora.');
  }

  return data;
}

forms.login.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Entrando...', '');

  try {
    await sendAuth('/api/auth/login', forms.login);
    setMessage('Login feito com sucesso. Redirecionando...', 'success');
    window.location.href = '/pages/dashboard.html';
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

forms.register.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Criando conta...', '');

  try {
    await sendAuth('/api/auth/register', forms.register);
    setMessage('Conta criada com sucesso. Redirecionando...', 'success');
    window.location.href = '/pages/dashboard.html';
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

fetch('/api/me')
  .then((response) => {
    if (response.ok) window.location.href = '/pages/dashboard.html';
  })
  .catch(() => {});

async function loadBotProfileOnLogin() {
  try {
    const response = await fetch('/api/bot');
    const data = await response.json();

    if (data.avatar) {
      document.querySelectorAll('.brand-image img').forEach((img) => {
        img.src = data.avatar;
      });
    }
  } catch {}
}

loadBotProfileOnLogin();
