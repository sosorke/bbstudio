// Regras do painel: cadastros, filtros, agenda, relatórios e backup local.
document.addEventListener("DOMContentLoaded", async () => {
  const api = window.BBS;
  if (api?.ready) await api.ready;
  const user = api?.session();
  if (!user?.active) return;
  const admin = api.isAdmin(user.role);
  const $ = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const read = (key) => api.read(key);
  const write = (key, value) => api.write(key, value);
  const clients = () => read(api.keys.clients);
  const appointments = () => read(api.keys.appointments);
  const toast = (message) => {
    const node = $("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("show"), 3200);
  };
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const dateDisplay = (value) => {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  };
  const statusClass = (value) =>
    `status-${String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")}`;
  const displayName = (record) => api.fullName(record) || "Cliente";
  const ownClient = () => api.clientOfUser(user);
  const belongsToUser = (item) => {
    const mine = ownClient();
    return (
      item.clientId === mine?.id ||
      item.clientId === user.id ||
      item.userId === user.id
    );
  };
  const clientFor = (id) =>
    clients().find(
      (client) => client.id === id || client.userId === id,
    );
  const visibleAppointments = () =>
    (admin ? appointments() : appointments().filter(belongsToUser)).sort(
      (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    );
  const statusMarkup = (value) =>
    `<span class="status-pill ${statusClass(value)}">${esc(value)}</span>`;
  const times = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
  ];

  $("#session-name").textContent = `${user.name} • ${user.role}`;
  $("#welcome-name").textContent = user.name.split(" ")[0];
  $("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(new Date());
  $("#logout-button").addEventListener("click", () => {
    api.clearSession();
    location.replace("login.html");
  });

  function switchSection(name) {
    const section = $(`#section-${name}`);
    if (!section || (!admin && section.hasAttribute("data-admin"))) {
      toast("Acesso não permitido.");
      return;
    }
    all(".system-section").forEach((node) =>
      node.classList.toggle("active", node === section),
    );
    all("#system-nav button").forEach((node) =>
      node.classList.toggle("selected", node.dataset.section === name),
    );
    if (name === "inicio") renderHome();
    if (name === "clientes") renderClients();
    if (name === "agendamentos") renderAppointments();
    if (name === "perfil") renderProfile();
    if (name === "relatorios") renderReport();
    if (name === "acesso") renderAccess();
    if (name === "consultas") renderConsultas();
  }
  all("#system-nav button").forEach((button) =>
    button.addEventListener("click", () =>
      switchSection(button.dataset.section),
    ),
  );
  all("[data-go]").forEach((button) =>
    button.addEventListener("click", () => switchSection(button.dataset.go)),
  );
  all("[data-close]").forEach((button) =>
    button.addEventListener("click", () => {
      const form = $(`#${button.dataset.close}`);
      form.classList.add("hidden");
      form.reset();
      const msg = form.querySelector(".form-message");
      if (msg) msg.textContent = "";
    }),
  );

  function countByStatus(list, status) {
    return list.filter((item) => item.status === status).length;
  }

  function renderHome() {
    const list = visibleAppointments();
    const today = new Date().toISOString().slice(0, 10);
    const future = list
      .filter((item) => item.date >= today && item.status !== "Cancelado")
      .slice(0, 5);
    const stats = admin
      ? [
          ["Clientes", clients().length],
          ["Agendamentos", appointments().length],
          ["Pendentes", countByStatus(appointments(), "Pendente")],
          ["Confirmados", countByStatus(appointments(), "Confirmado")],
          ["Concluídos", countByStatus(appointments(), "Concluído")],
          ["Cancelados", countByStatus(appointments(), "Cancelado")],
        ]
      : [
          ["Meus agendamentos", list.length],
          ["Pendentes", countByStatus(list, "Pendente")],
          ["Confirmados", countByStatus(list, "Confirmado")],
          ["Concluídos", countByStatus(list, "Concluído")],
        ];
    $("#stats-grid").innerHTML = stats
      .map(
        ([label, value]) =>
          `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`,
      )
      .join("");
    $("#upcoming-list").innerHTML = future.length
      ? future
          .map((item) => {
            const client = clientFor(item.clientId);
            return [
              '<div class="appointment-row"><div><strong>',
              esc(displayName(client) || user.name),
              "</strong><small>",
              esc(item.service),
              " · ",
              statusMarkup(item.status),
              '</small></div><span class="appointment-date">',
              dateDisplay(item.date),
              "<br>",
              esc(item.time),
              "</span></div>",
            ].join("");
          })
          .join("")
      : '<p class="empty-state">Nenhum agendamento encontrado.</p>';
  }

  function showFormMessage(form, message, success = false) {
    const node = form.querySelector(".form-message");
    node.textContent = message;
    node.classList.toggle("success", success);
  }

  const clientForm = $("#client-form");
  $("#new-client-button")?.addEventListener("click", () => {
    clientForm.reset();
    clientForm.elements.id.value = "";
    $("#client-form-title").textContent = "Nova cliente";
    clientForm.querySelector(".form-message").textContent = "";
    clientForm.classList.remove("hidden");
    clientForm.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  clientForm?.elements.cpf?.addEventListener(
    "input",
    (event) => (event.target.value = api.maskCPF(event.target.value)),
  );
  clientForm?.elements.phone?.addEventListener(
    "input",
    (event) => (event.target.value = api.maskPhone(event.target.value)),
  );
  clientForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(clientForm);
    const id = data.get("id");
    const firstName = String(data.get("firstName")).trim();
    const lastName = String(data.get("lastName")).trim();
    const name = `${firstName} ${lastName}`.trim();
    const cpf = String(data.get("cpf")).trim();
    const phone = String(data.get("phone")).trim();
    const email = String(data.get("email")).trim().toLowerCase();
    const list = clients();
    if (firstName.length < 2) {
      showFormMessage(clientForm, "Informe um nome válido.");
      return;
    }
    if (lastName.length < 2) {
      showFormMessage(clientForm, "Informe um sobrenome válido.");
      return;
    }
    if (!api.validCPF(cpf)) {
      showFormMessage(clientForm, "Informe um CPF válido.");
      return;
    }
    if (!api.validPhone(phone)) {
      showFormMessage(clientForm, "Informe um telefone válido.");
      return;
    }
    if (!api.validEmail(email)) {
      showFormMessage(clientForm, "Informe um e-mail válido.");
      return;
    }
    if (
      list.some(
        (item) =>
          item.id !== id &&
          item.cpf.replace(/\D/g, "") === cpf.replace(/\D/g, ""),
      )
    ) {
      showFormMessage(clientForm, "Este CPF já está cadastrado.");
      return;
    }
    if (
      list.some((item) => item.id !== id && item.email.toLowerCase() === email)
    ) {
      showFormMessage(clientForm, "Este e-mail já está cadastrado.");
      return;
    }
    const existing = list.find((item) => item.id === id);
    const record = {
      ...(existing || {}),
      id: id || crypto.randomUUID(),
      firstName,
      lastName,
      name,
      cpf,
      phone,
      email,
    };
    write(
      api.keys.clients,
      id
        ? list.map((item) => (item.id === id ? record : item))
        : [...list, record],
    );
    const users = read(api.keys.users);
    const linked = users.findIndex((item) => item.id === existing?.userId);
    if (linked >= 0) {
      users[linked] = { ...users[linked], firstName, lastName, name, email };
      write(api.keys.users, users);
    }
    showFormMessage(
      clientForm,
      id ? "Cliente atualizada com sucesso." : "Cliente cadastrada com sucesso.",
      true,
    );
    renderClients();
    renderHome();
    setTimeout(() => clientForm.classList.add("hidden"), 650);
    toast(
      id ? "Cliente atualizada com sucesso." : "Cliente cadastrada com sucesso.",
    );
  });

  function splitName(item) {
    if (item.firstName || item.lastName) {
      return {
        firstName: item.firstName || "",
        lastName: item.lastName || "",
      };
    }
    const parts = String(item.name || "").trim().split(/\s+/);
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
    };
  }

  function renderClients() {
    if (!admin || !$("#clients-table")) return;
    const query = ($("#client-search").value || "").trim().toLowerCase();
    const list = clients().filter((item) =>
      [displayName(item), item.cpf, item.phone, item.email].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    );
    $("#client-count").textContent =
      `${list.length} ${list.length === 1 ? "cliente" : "clientes"}`;
    $("#clients-empty").classList.toggle("hidden", list.length > 0);
    $("#clients-table").innerHTML = list
      .map(
        (item) =>
          [
            "<tr><td>",
            esc(displayName(item)),
            "</td><td>",
            esc(item.cpf),
            "</td><td>",
            esc(item.phone),
            "</td><td>",
            esc(item.email),
            '</td><td><div class="table-actions"><button type="button" data-edit-client="',
            esc(item.id),
            '">Editar</button><button type="button" class="delete-action" data-delete-client="',
            esc(item.id),
            '">Excluir</button></div></td></tr>',
          ].join(""),
      )
      .join("");
    all("[data-edit-client]").forEach((button) =>
      button.addEventListener("click", () => {
        const item = clients().find(
          (client) => client.id === button.dataset.editClient,
        );
        if (!item) return;
        const names = splitName(item);
        for (const [key, value] of Object.entries({
          id: item.id,
          firstName: names.firstName,
          lastName: names.lastName,
          cpf: item.cpf,
          phone: item.phone,
          email: item.email,
        }))
          clientForm.elements[key].value = value;
        $("#client-form-title").textContent = "Editar cliente";
        clientForm.classList.remove("hidden");
        clientForm.scrollIntoView({ behavior: "smooth", block: "center" });
      }),
    );
    all("[data-delete-client]").forEach((button) =>
      button.addEventListener("click", () => {
        const item = clients().find(
          (client) => client.id === button.dataset.deleteClient,
        );
        if (
          !item ||
          !confirm("Tem certeza que deseja excluir esta cliente?")
        )
          return;
        write(
          api.keys.clients,
          clients().filter((client) => client.id !== item.id),
        );
        write(
          api.keys.appointments,
          appointments().filter(
            (appointment) =>
              appointment.clientId !== item.id &&
              appointment.clientId !== item.userId,
          ),
        );
        write(
          api.keys.users,
          read(api.keys.users).filter((account) => account.id !== item.userId),
        );
        renderClients();
        renderHome();
        toast("Cliente excluída com sucesso.");
      }),
    );
  }
  $("#client-search")?.addEventListener("input", renderClients);

  const appointmentForm = $("#appointment-form");
  function populateAppointmentForm(selectedId = "") {
    const select = appointmentForm.elements.clientId;
    if (select) {
      select.innerHTML = clients()
        .map((client) => {
          const value = client.id;
          return `<option value="${esc(value)}" ${selectedId === value || selectedId === client.userId ? "selected" : ""}>${esc(displayName(client))}</option>`;
        })
        .join("");
    }
    appointmentForm.elements.time.innerHTML =
      '<option value="">Selecione o horário</option>' +
      times.map((time) => `<option>${time}</option>`).join("");
  }
  $("#new-appointment-button")?.addEventListener("click", () => {
    appointmentForm.reset();
    appointmentForm.elements.id.value = "";
    $("#appointment-form-title").textContent = "Novo agendamento";
    appointmentForm.querySelector(".form-message").textContent = "";
    populateAppointmentForm();
    appointmentForm.classList.remove("hidden");
    appointmentForm.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  if (!admin) {
    if ($("#appointment-intro"))
      $("#appointment-intro").textContent =
        "Consulte seus horários e solicite um novo agendamento.";
    if ($("#new-appointment-button"))
      $("#new-appointment-button").textContent = "+ Solicitar horário";
  }
  if (appointmentForm?.elements.date)
    appointmentForm.elements.date.min = new Date().toISOString().slice(0, 10);
  appointmentForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(appointmentForm);
    const id = data.get("id");
    const mine = ownClient();
    const clientId = admin ? data.get("clientId") : mine?.id;
    const service = data.get("service");
    const date = data.get("date");
    const time = data.get("time");
    const status = admin ? data.get("status") : "Pendente";
    const list = appointments();
    if (!service || !date || !time || !clientId) {
      showFormMessage(
        appointmentForm,
        "Preencha todos os campos obrigatórios.",
      );
      return;
    }
    if (date < new Date().toISOString().slice(0, 10)) {
      showFormMessage(appointmentForm, "Escolha uma data a partir de hoje.");
      return;
    }
    if (
      list.some(
        (item) =>
          item.id !== id &&
          item.date === date &&
          item.time === time &&
          item.status !== "Cancelado",
      )
    ) {
      showFormMessage(appointmentForm, "Este horário já está ocupado.");
      return;
    }
    const record = {
      id: id || crypto.randomUUID(),
      clientId,
      service,
      date,
      time,
      status,
    };
    write(
      api.keys.appointments,
      id
        ? list.map((item) => (item.id === id ? record : item))
        : [...list, record],
    );
    appointmentForm.classList.add("hidden");
    appointmentForm.reset();
    renderAppointments();
    renderHome();
    renderProfile();
    toast(
      id
        ? "Agendamento atualizado com sucesso."
        : "Agendamento realizado com sucesso.",
    );
  });

  function renderAppointments() {
    const list = visibleAppointments();
    $("#appointment-count").textContent =
      `${list.length} ${list.length === 1 ? "horário" : "horários"}`;
    $("#appointments-empty").classList.toggle("hidden", list.length > 0);
    $("#appointments-table").innerHTML = list
      .map((item) => {
        const client = clientFor(item.clientId);
        const actions = admin
          ? [
              '<div class="table-actions"><button type="button" data-edit-appointment="',
              esc(item.id),
              '">Editar</button><button type="button" class="delete-action" data-delete-appointment="',
              esc(item.id),
              '">Excluir</button></div>',
            ].join("")
          : "—";
        return [
          "<tr><td>",
          esc(displayName(client) || user.name),
          "</td><td>",
          esc(item.service),
          "</td><td>",
          dateDisplay(item.date),
          "</td><td>",
          esc(item.time),
          "</td><td>",
          admin
            ? [
                '<select class="status-select" data-status-appointment="',
                esc(item.id),
                '" aria-label="Alterar status">',
                ["Pendente", "Confirmado", "Concluído", "Cancelado"]
                  .map(
                    (value) =>
                      `<option ${value === item.status ? "selected" : ""}>${value}</option>`,
                  )
                  .join(""),
                "</select>",
              ].join("")
            : statusMarkup(item.status),
          "</td><td>",
          actions,
          "</td></tr>",
        ].join("");
      })
      .join("");
    all("[data-status-appointment]").forEach((select) =>
      select.addEventListener("change", () => {
        write(
          api.keys.appointments,
          appointments().map((item) =>
            item.id === select.dataset.statusAppointment
              ? { ...item, status: select.value }
              : item,
          ),
        );
        renderHome();
        toast("Status atualizado.");
      }),
    );
    all("[data-edit-appointment]").forEach((button) =>
      button.addEventListener("click", () => {
        const item = appointments().find(
          (a) => a.id === button.dataset.editAppointment,
        );
        if (!item) return;
        populateAppointmentForm(item.clientId);
        for (const [key, value] of Object.entries({
          id: item.id,
          service: item.service,
          date: item.date,
          time: item.time,
          status: item.status,
        }))
          appointmentForm.elements[key].value = value;
        $("#appointment-form-title").textContent = "Editar agendamento";
        appointmentForm.classList.remove("hidden");
        appointmentForm.scrollIntoView({ behavior: "smooth", block: "center" });
      }),
    );
    all("[data-delete-appointment]").forEach((button) =>
      button.addEventListener("click", () => {
        if (!confirm("Tem certeza que deseja excluir este agendamento?"))
          return;
        write(
          api.keys.appointments,
          appointments().filter(
            (a) => a.id !== button.dataset.deleteAppointment,
          ),
        );
        renderAppointments();
        renderHome();
        toast("Agendamento excluído.");
      }),
    );
  }

  function renderProfile() {
    const card = $("#profile-card");
    if (!card) return;
    const client = ownClient();
    const names = splitName(client || user);
    const mine = visibleAppointments();
    card.innerHTML = [
      '<p class="eyebrow">MEUS DADOS</p><h2>Perfil da cliente</h2>',
      [
        ["Nome", names.firstName || user.name],
        ["Sobrenome", names.lastName || "—"],
        ["CPF", client?.cpf || "Não informado"],
        ["Telefone", client?.phone || "Não informado"],
        ["E-mail", client?.email || user.email],
      ]
        .map(
          ([label, value]) =>
            `<div class="profile-line"><span>${label}</span><strong>${esc(value)}</strong></div>`,
        )
        .join(""),
      '<p class="eyebrow profile-appointments">MEUS AGENDAMENTOS</p>',
      mine.length
        ? `<div class="table-wrap"><table><thead><tr><th>Serviço</th><th>Data</th><th>Horário</th><th>Status</th></tr></thead><tbody>${mine
            .map(
              (item) =>
                `<tr><td>${esc(item.service)}</td><td>${dateDisplay(item.date)}</td><td>${esc(item.time)}</td><td>${statusMarkup(item.status)}</td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : '<p class="empty-state">Nenhum agendamento encontrado.</p>',
    ].join("");
  }

  function filterAppointments(filters) {
    const name = (filters.name || "").trim().toLowerCase();
    const cpf = (filters.cpf || "").replace(/\D/g, "");
    const phone = (filters.phone || "").replace(/\D/g, "");
    const service = filters.service || "";
    const status = filters.status || "";
    const start = filters.start || "";
    const end = filters.end || "";
    if (start && end && start > end)
      return { error: "A data inicial deve ser anterior à data final." };
    return {
      rows: appointments()
        .filter((item) => {
          const client = clientFor(item.clientId);
          if (name && !displayName(client).toLowerCase().includes(name))
            return false;
          if (cpf && !(client?.cpf || "").replace(/\D/g, "").includes(cpf))
            return false;
          if (phone && !(client?.phone || "").replace(/\D/g, "").includes(phone))
            return false;
          if (service && item.service !== service) return false;
          if (status && item.status !== status) return false;
          if (start && item.date < start) return false;
          if (end && item.date > end) return false;
          return true;
        })
        .sort((a, b) =>
          `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
        ),
    };
  }

  function fillAppointmentRows(tbody, rows) {
    tbody.innerHTML = rows
      .map((item) => {
        const client = clientFor(item.clientId);
        return [
          "<tr><td>",
          esc(displayName(client)),
          "</td><td>",
          esc(item.service),
          "</td><td>",
          dateDisplay(item.date),
          "</td><td>",
          esc(item.time),
          "</td><td>",
          statusMarkup(item.status),
          "</td></tr>",
        ].join("");
      })
      .join("");
  }

  function renderConsultas() {
    const form = $("#period-form");
    const tbody = $("#period-table");
    const message = $("#period-message");
    const empty = $("#period-empty");
    if (!form || !tbody) return;
    const result = filterAppointments({
      name: form.elements.name?.value,
      cpf: form.elements.cpf?.value,
      phone: form.elements.phone?.value,
      service: form.elements.service?.value,
      status: form.elements.status?.value,
      start: form.elements.start.value,
      end: form.elements.end.value,
    });
    if (result.error) {
      message.textContent = result.error;
      return;
    }
    message.textContent = "";
    empty.classList.toggle("hidden", result.rows.length > 0);
    empty.textContent = "Nenhum resultado encontrado.";
    fillAppointmentRows(tbody, result.rows);
  }

  $("#period-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    renderConsultas();
  });
  $("#period-form")?.addEventListener("reset", () =>
    setTimeout(renderConsultas, 0),
  );
  $("#period-form")?.elements.cpf?.addEventListener(
    "input",
    (event) => (event.target.value = api.maskCPF(event.target.value)),
  );
  $("#period-form")?.elements.phone?.addEventListener(
    "input",
    (event) => (event.target.value = api.maskPhone(event.target.value)),
  );

  function renderReport() {
    if (!$("#report-stats")) return;
    if ($("#report-generated")) {
      $("#report-generated").textContent =
        `Gerado em ${new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(new Date())}`;
    }
    const list = appointments();
    const values = [
      ["Clientes", clients().length],
      ["Agendamentos", list.length],
      ["Pendentes", countByStatus(list, "Pendente")],
      ["Confirmados", countByStatus(list, "Confirmado")],
      ["Concluídos", countByStatus(list, "Concluído")],
      ["Cancelados", countByStatus(list, "Cancelado")],
    ];
    $("#report-stats").innerHTML = values
      .map(
        ([label, value]) =>
          `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`,
      )
      .join("");
    const services = [
      "Manicure",
      "Pedicure",
      "Alongamento",
      "Nail Art",
      "Esmaltação em Gel",
    ].map((service) => [
      service,
      list.filter((item) => item.service === service).length,
    ]);
    if ($("#report-services")) {
      $("#report-services").innerHTML = services
        .map(
          ([label, value]) =>
            `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`,
        )
        .join("");
    }
  }

  $("#report-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const result = filterAppointments({
      start: form.elements.start.value,
      end: form.elements.end.value,
    });
    const message = $("#report-message");
    const empty = $("#report-empty");
    if (result.error) {
      message.textContent = result.error;
      return;
    }
    message.textContent = "";
    fillAppointmentRows($("#report-table"), result.rows);
    empty.classList.toggle("hidden", result.rows.length > 0);
  });
  $("#print-report")?.addEventListener("click", () => window.print());

  function renderAccess() {
    const tbody = $("#access-table");
    if (!tbody) return;
    const list = read(api.keys.users);
    $("#access-empty")?.classList.toggle("hidden", list.length > 0);
    tbody.innerHTML = list
      .map(
        (item) =>
          `<tr><td>${esc(api.fullName(item) || item.name)}</td><td>${esc(item.email)}</td><td>${esc(item.role || item.tipo)}</td><td>${esc(item.status || "ativo")}</td></tr>`,
      )
      .join("");
  }

  $("#export-backup")?.addEventListener("click", () => {
    const backup = {
      app: "Brenda Beauty Studio",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: {
        studio: "Brenda Beauty Studio",
        timezone: "America/Sao_Paulo",
        services: [
          "Manicure",
          "Pedicure",
          "Alongamento",
          "Nail Art",
          "Esmaltação em Gel",
        ],
      },
      clients: clients(),
      users: read(api.keys.users),
      appointments: appointments(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `brenda-beauty-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Backup exportado com sucesso.");
  });
  $("#backup-file")?.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const message = $("#backup-message");
    try {
      const backup = JSON.parse(await file.text());
      if (
        !Array.isArray(backup.clients) ||
        !Array.isArray(backup.users) ||
        !Array.isArray(backup.appointments)
      )
        throw new Error("Arquivo de backup inválido.");
      if (!backup.users.some((account) => api.isAdmin(account.role)))
        throw new Error("O backup precisa conter uma conta ADMIN.");
      if (
        !confirm(
          "A restauração poderá substituir os dados atuais.\nDeseja continuar?",
        )
      )
        return;
      if (!confirm("Deseja realmente restaurar este backup?")) return;
      write(api.keys.clients, backup.clients);
      write(api.keys.users, backup.users);
      write(api.keys.appointments, backup.appointments);
      message.textContent = "Backup restaurado com sucesso.";
      message.classList.add("success");
      renderHome();
      renderAccess();
      toast("Backup restaurado com sucesso.");
    } catch (error) {
      message.textContent =
        error instanceof SyntaxError
          ? "Arquivo de backup inválido."
          : error.message || "Arquivo de backup inválido.";
      message.classList.remove("success");
    } finally {
      event.target.value = "";
    }
  });

  renderHome();
  renderClients();
  renderAppointments();
  renderProfile();
  renderReport();
  renderAccess();
  if (!admin) switchSection("perfil");
});
