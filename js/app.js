// Interações compartilhadas pelas páginas públicas.
document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll("[data-year]")
    .forEach((node) => (node.textContent = new Date().getFullYear()));

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    toggle.textContent = open ? "✕" : "☰";
  });

  const closeMenu = () => {
    if (!nav?.classList.contains("open")) return;
    nav.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-label", "Abrir menu");
    if (toggle) toggle.textContent = "☰";
  };

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav?.classList.contains("open")) {
      closeMenu();
      toggle?.focus();
    }
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) closeMenu();
  });

  const phone = document.querySelector("#contact-phone");
  phone?.addEventListener("input", (event) => {
    event.target.value = window.BBS
      ? window.BBS.maskPhone(event.target.value)
      : maskPhoneLocal(event.target.value);
  });

  document
    .querySelector("#contact-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = form.querySelector(".form-message");
      const fields = {
        name: { required: true, label: "Informe o nome." },
        email: { required: true, email: true, label: "Informe um e-mail válido." },
        phone: { required: true, phone: true, label: "Informe um telefone válido." },
        subject: { required: true, label: "Informe o assunto." },
        message: { required: true, label: "Escreva uma mensagem." },
      };
      let valid = true;
      Object.entries(fields).forEach(([name, rule]) => {
        const input = form.elements[name];
        const error = document.querySelector(`#contact-${name === "name" ? "name" : name}-error`);
        const value = String(input?.value || "").trim();
        let text = "";
        if (rule.required && !value) text = rule.label;
        else if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          text = "Informe um e-mail válido.";
        else if (rule.phone && value.replace(/\D/g, "").length < 10)
          text = "Informe um telefone no formato (00) 00000-0000.";
        if (error) error.textContent = text;
        input?.classList.toggle("invalid", Boolean(text));
        if (text) valid = false;
      });
      if (!valid) {
        message.textContent = "Confira os campos destacados e tente novamente.";
        message.classList.remove("success");
        return;
      }
      message.textContent = `Obrigada, ${form.elements.name.value.trim()}! Mensagem enviada com sucesso.`;
      message.classList.add("success");
      form.querySelectorAll(".field-error").forEach((node) => (node.textContent = ""));
      form.querySelectorAll(".invalid").forEach((node) => node.classList.remove("invalid"));
      form.reset();
    });
});

function maskPhoneLocal(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
