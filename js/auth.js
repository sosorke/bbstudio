// Persistência, sessão e permissões para demonstração acadêmica.
(() => {
  const K = {
    users: "bbs_users",
    clients: "bbs_clients",
    appointments: "bbs_appointments",
    session: "bbs_session",
  };

  const read = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  };

  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const looksHashed = (value) =>
    typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

  const hashPassword = async (password) => {
    const buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(password),
    );
    return [...new Uint8Array(buffer)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  const verifyPassword = async (plain, stored) => {
    if (!stored) return false;
    if (looksHashed(stored)) return (await hashPassword(plain)) === stored.toLowerCase();
    return plain === stored;
  };

  const maskDigits = (value, pattern) => {
    const digits = String(value).replace(/\D/g, "");
    let result = "";
    let index = 0;
    for (const char of pattern) {
      if (index >= digits.length) break;
      if (char === "0") result += digits[index++];
      else result += char;
    }
    return result;
  };

  const validCPF = (raw) => {
    const cpf = String(raw).replace(/\D/g, "");
    if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
    let digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    if (digit !== Number(cpf[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
    digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    return digit === Number(cpf[10]);
  };

  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  const validPhone = (value) => String(value).replace(/\D/g, "").length >= 10;
  const validPassword = (value) =>
    String(value).length >= 8 && /[A-Za-zÀ-ÿ]/.test(value) && /\d/.test(value);

  const fullName = (record) =>
    [record?.firstName, record?.lastName].filter(Boolean).join(" ").trim() ||
    record?.nome ||
    record?.name ||
    "";

  const normalizeRole = (user) =>
    String(user?.role || user?.tipo || "CLIENTE").toUpperCase();

  const isAdmin = (role) => String(role).toUpperCase() === "ADMIN";
  const isClient = (role) => {
    const value = String(role).toUpperCase();
    return value === "CLIENTE" || value === "USUARIO";
  };

  const isoDateOffset = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const session = () => {
    try {
      return JSON.parse(sessionStorage.getItem(K.session) || "null");
    } catch {
      return null;
    }
  };

  const setSession = (user) => {
    const role = normalizeRole(user);
    sessionStorage.setItem(
      K.session,
      JSON.stringify({
        id: user.id,
        name: fullName(user) || user.name,
        email: user.email,
        role,
        tipo: role,
        active: true,
      }),
    );
  };

  const clearSession = () => sessionStorage.removeItem(K.session);

  const clientOfUser = (user) => {
    if (!user) return null;
    const list = read(K.clients);
    return (
      list.find((item) => item.userId === user.id) ||
      list.find((item) => item.email?.toLowerCase() === user.email?.toLowerCase())
    );
  };

  const onSystemPage = () =>
    document.body?.classList.contains("system-page") ||
    /sistema\.html$/i.test(location.pathname) ||
    /sistema\.html$/i.test(location.href.split("?")[0]);

  const protectSystem = () => {
    if (!onSystemPage()) return true;
    const current = session();
    if (!current?.active) {
      location.replace("login.html");
      return false;
    }
    if (isClient(current.role)) {
      document.querySelectorAll("[data-admin]").forEach((node) => node.remove());
    } else {
      document.querySelectorAll("[data-client]").forEach((node) => node.remove());
    }
    return true;
  };

  const ready = (async () => {
    const now = new Date().toISOString();
    if (!localStorage.getItem(K.users)) {
      write(K.users, [
        {
          id: "user-admin",
          firstName: "Brenda",
          lastName: "Administradora",
          name: "Brenda Administradora",
          nome: "Brenda",
          sobrenome: "Administradora",
          email: "admin@brendabeauty.com",
          telefone: "(11) 98888-0000",
          password: await hashPassword("Admin123"),
          senha_hash: true,
          role: "ADMIN",
          tipo: "ADMIN",
          status: "ativo",
          reset_token: null,
          reset_expires_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: "user-demo",
          firstName: "Cliente",
          lastName: "Demonstração",
          name: "Cliente Demonstração",
          nome: "Cliente",
          sobrenome: "Demonstração",
          email: "cliente@brendabeauty.com",
          telefone: "(11) 99999-9999",
          password: await hashPassword("Cliente123"),
          senha_hash: true,
          role: "CLIENTE",
          tipo: "CLIENTE",
          status: "ativo",
          reset_token: null,
          reset_expires_at: null,
          created_at: now,
          updated_at: now,
        },
      ]);
    } else {
      const users = read(K.users);
      let changed = false;
      for (const account of users) {
        if (account.password && !looksHashed(account.password)) {
          account.password = await hashPassword(account.password);
          account.senha_hash = true;
          changed = true;
        }
        if (!account.tipo && account.role) {
          account.tipo = account.role;
          changed = true;
        }
        if (!account.role && account.tipo) {
          account.role = account.tipo;
          changed = true;
        }
      }
      if (changed) write(K.users, users);
    }
    if (!localStorage.getItem(K.clients)) {
      write(K.clients, [
        {
          id: "client-demo",
          firstName: "Cliente",
          lastName: "Demonstração",
          name: "Cliente Demonstração",
          cpf: "529.982.247-25",
          phone: "(11) 99999-9999",
          email: "cliente@brendabeauty.com",
          userId: "user-demo",
          created_at: now,
          updated_at: now,
        },
      ]);
    }
    if (!localStorage.getItem(K.appointments)) {
      write(K.appointments, [
        {
          id: "apt-demo-1",
          clientId: "client-demo",
          service: "Esmaltação em Gel",
          date: isoDateOffset(2),
          time: "10:00",
          status: "Confirmado",
        },
        {
          id: "apt-demo-2",
          clientId: "client-demo",
          service: "Nail Art",
          date: isoDateOffset(5),
          time: "14:30",
          status: "Pendente",
        },
        {
          id: "apt-demo-3",
          clientId: "client-demo",
          service: "Manicure",
          date: isoDateOffset(-4),
          time: "11:00",
          status: "Concluído",
        },
      ]);
    }
  })();

  window.BBS = {
    keys: K,
    read,
    write,
    session,
    setSession,
    clearSession,
    isAdmin,
    isClient,
    fullName,
    validCPF,
    validEmail,
    validPhone,
    validPassword,
    maskCPF: (value) => maskDigits(value, "000.000.000-00"),
    maskPhone: (value) => maskDigits(value, "(00) 00000-0000"),
    hashPassword,
    looksHashed,
    verifyPassword,
    clientOfUser,
    ready,
  };

  const showPanel = (name) => {
    const login = document.querySelector("#panel-login");
    const register = document.querySelector("#register-form");
    const forgot = document.querySelector("#forgot-form");
    login?.classList.toggle("hidden", name !== "login");
    register?.classList.toggle("hidden", name !== "register");
    forgot?.classList.toggle("hidden", name !== "forgot");
  };

  const setFieldError = (id, text) => {
    const node = document.querySelector(id);
    if (node) node.textContent = text;
  };

  document.addEventListener("DOMContentLoaded", async () => {
    await ready;
    protectSystem();

    const current = session();
    if (current?.active && /login\.html$/i.test(location.pathname)) {
      location.replace("sistema.html");
      return;
    }

    const hash = location.hash.replace("#", "").toLowerCase();
    if (hash === "cadastro") showPanel("register");
    if (hash === "recuperar") showPanel("forgot");

    const loginForm = document.querySelector("#login-form");
    loginForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await ready;
      const email = loginForm.elements.email.value.trim().toLowerCase();
      const password = loginForm.elements.password.value;
      const message = document.querySelector("#login-message");
      setFieldError("#login-email-error", email ? "" : "Informe o e-mail.");
      setFieldError("#login-password-error", password ? "" : "Informe a senha.");
      loginForm.elements.email.classList.toggle("invalid", !email);
      loginForm.elements.password.classList.toggle("invalid", !password);
      if (!email || !password) {
        message.textContent = "Confira os campos destacados e tente novamente.";
        message.classList.remove("success");
        return;
      }
      const users = read(K.users);
      const user = users.find((item) => item.email.toLowerCase() === email);
      const ok = user ? await verifyPassword(password, user.password) : false;
      if (!user || !ok) {
        message.textContent = "E-mail ou senha incorretos.";
        message.classList.remove("success");
        return;
      }
      if (String(user.status || "ativo").toLowerCase() === "inativo") {
        message.textContent = "Esta conta está inativa.";
        message.classList.remove("success");
        return;
      }
      if (user.password && !looksHashed(user.password)) {
        user.password = await hashPassword(password);
        user.senha_hash = true;
        write(K.users, users);
      }
      setSession(user);
      message.textContent = "Login realizado com sucesso.";
      message.classList.add("success");
      location.href = "sistema.html";
    });

    document.querySelector("#show-register")?.addEventListener("click", (event) => {
      event.preventDefault();
      showPanel("register");
    });
    document.querySelector("#show-login")?.addEventListener("click", (event) => {
      event.preventDefault();
      showPanel("login");
    });
    document.querySelector("#show-forgot")?.addEventListener("click", (event) => {
      event.preventDefault();
      showPanel("forgot");
    });
    document.querySelector("#forgot-back")?.addEventListener("click", (event) => {
      event.preventDefault();
      showPanel("login");
    });

    const register = document.querySelector("#register-form");
    register?.elements.cpf?.addEventListener(
      "input",
      (event) => (event.target.value = window.BBS.maskCPF(event.target.value)),
    );
    register?.elements.phone?.addEventListener(
      "input",
      (event) => (event.target.value = window.BBS.maskPhone(event.target.value)),
    );
    register?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await ready;
      const data = new FormData(register);
      const firstName = String(data.get("firstName")).trim();
      const lastName = String(data.get("lastName")).trim();
      const name = `${firstName} ${lastName}`.trim();
      const cpf = String(data.get("cpf")).replace(/\D/g, "");
      const phone = String(data.get("phone")).trim();
      const email = String(data.get("email")).trim().toLowerCase();
      const password = String(data.get("password"));
      const confirm = String(data.get("confirm"));
      const clients = read(K.clients);
      const users = read(K.users);
      const msg = register.querySelector(".form-message");
      msg.classList.remove("success");
      if (firstName.length < 2) msg.textContent = "Informe um nome válido.";
      else if (lastName.length < 2) msg.textContent = "Informe um sobrenome válido.";
      else if (!validCPF(cpf)) msg.textContent = "Informe um CPF válido.";
      else if (!validPhone(phone)) msg.textContent = "Informe um telefone válido.";
      else if (!validEmail(email)) msg.textContent = "Informe um e-mail válido.";
      else if (!validPassword(password))
        msg.textContent =
          "A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra e um número.";
      else if (password !== confirm) msg.textContent = "As senhas não coincidem.";
      else if (clients.some((client) => client.cpf.replace(/\D/g, "") === cpf))
        msg.textContent = "Este CPF já está cadastrado.";
      else if (
        clients.some((client) => client.email.toLowerCase() === email) ||
        users.some((account) => account.email.toLowerCase() === email)
      )
        msg.textContent = "Este e-mail já está cadastrado.";
      else {
        const id = crypto.randomUUID();
        const clientId = crypto.randomUUID();
        const stamp = new Date().toISOString();
        users.push({
          id,
          firstName,
          lastName,
          name,
          nome: firstName,
          sobrenome: lastName,
          email,
          telefone: phone,
          password: await hashPassword(password),
          senha_hash: true,
          role: "CLIENTE",
          tipo: "CLIENTE",
          status: "ativo",
          reset_token: null,
          reset_expires_at: null,
          created_at: stamp,
          updated_at: stamp,
        });
        clients.push({
          id: clientId,
          userId: id,
          firstName,
          lastName,
          name,
          cpf: window.BBS.maskCPF(cpf),
          phone,
          email,
          created_at: stamp,
          updated_at: stamp,
        });
        write(K.users, users);
        write(K.clients, clients);
        setSession({ id, name, email, role: "CLIENTE", tipo: "CLIENTE" });
        msg.textContent = "Cliente cadastrada com sucesso.";
        msg.classList.add("success");
        location.href = "sistema.html";
      }
    });

    const forgot = document.querySelector("#forgot-form");
    forgot?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await ready;
      const email = forgot.elements.email.value.trim().toLowerCase();
      const password = forgot.elements.password.value;
      const confirm = forgot.elements.confirm.value;
      const msg = forgot.querySelector(".form-message");
      const users = read(K.users);
      const user = users.find((item) => item.email.toLowerCase() === email);
      msg.classList.remove("success");
      if (!user) {
        msg.textContent = "E-mail não encontrado.";
        return;
      }
      if (!validPassword(password)) {
        msg.textContent =
          "A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra e um número.";
        return;
      }
      if (password !== confirm) {
        msg.textContent = "As senhas não coincidem.";
        return;
      }
      user.password = await hashPassword(password);
      user.senha_hash = true;
      user.updated_at = new Date().toISOString();
      write(K.users, users);
      msg.textContent = "Senha redefinida com sucesso. Você já pode entrar.";
      msg.classList.add("success");
    });
  });

  window.addEventListener("pageshow", (event) => {
    if (!onSystemPage()) return;
    if (!session()?.active) location.replace("login.html");
    if (event.persisted && !session()?.active) location.replace("login.html");
  });
})();
