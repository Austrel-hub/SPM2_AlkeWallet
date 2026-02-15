(() => {
  "use strict";

  const STORAGE = {
    USERS: "alke_users",
    SESSION: "alke_session",
    BALANCE: "alke_balance",
    CONTACTS: "alke_contacts",
    TX: "alke_transactions",
    SEEDED: "alke_seeded_v1",
  };

  const ROUTES = {
    LOGIN: "login.html",
    REGISTER: "register.html",
    MENU: "menu.html",
    TX: "transactions.html",
    INDEX_FROM_PAGES: "../index.html",
  };

  // ---------- Utilidades ----------
  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function moneyCLP(value) {
    const n = Number(value) || 0;
    return n.toLocaleString("es-CL");
  }

  function nowISODate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getBalance() {
    const n = Number(localStorage.getItem(STORAGE.BALANCE));
    return Number.isFinite(n) ? n : 0;
  }

  function setBalance(value) {
    localStorage.setItem(STORAGE.BALANCE, String(Number(value) || 0));
  }

  function getSession() {
    return readJSON(STORAGE.SESSION, null);
  }

  function setSession(sessionObj) {
    writeJSON(STORAGE.SESSION, sessionObj);
  }

  function clearSession() {
    localStorage.removeItem(STORAGE.SESSION);
  }

  function addTransaction({ type, amount, detail }) {
    const tx = readJSON(STORAGE.TX, []);
    tx.unshift({
      date: nowISODate(),
      type,
      amount: Number(amount) || 0,
      detail: detail || "",
    });

    const MAX_TX = 100;
    writeJSON(STORAGE.TX, tx.slice(0, MAX_TX));
  }

  function showAlertBeforeForm(form, id, type, message) {
    let box = $("#" + id);
    if (!box) {
      box = document.createElement("div");
      box.id = id;
      box.className = "alert d-none";
      form.parentElement?.insertBefore(box, form);
    }
    box.className = `alert alert-${type}`;
    box.textContent = message;
    box.classList.remove("d-none");

    if (window.jQuery) {
      window.jQuery(box).stop(true, true).hide().fadeIn(180);
    }
    return box;
  }

  function hideAlert(id) {
    const el = $("#" + id);
    if (!el) return;
    el.classList.add("d-none");
  }

  function sameEmail(a, b) {
    return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
  }

  // ---------- Seed inicial (una sola vez) ----------
  function seedIfNeeded() {
    if (localStorage.getItem(STORAGE.SEEDED)) return;

    if (!localStorage.getItem(STORAGE.USERS)) {
      writeJSON(STORAGE.USERS, [
        { email: "demo@alkewallet.cl", password: "1234", name: "Usuario Demo" },
        { email: "admin@alkewallet.cl", password: "admin", name: "Administrador" },
      ]);
    }

    if (!localStorage.getItem(STORAGE.BALANCE)) {
      setBalance(100000);
    }

    if (!localStorage.getItem(STORAGE.CONTACTS)) {
      writeJSON(STORAGE.CONTACTS, ["María Pérez", "Juan Soto", "Camila Rojas"]);
    }

    if (!localStorage.getItem(STORAGE.TX)) {
      writeJSON(STORAGE.TX, []);
      addTransaction({ type: "Info", amount: 0, detail: "Cuenta inicializada" });
    }

    localStorage.setItem(STORAGE.SEEDED, "1");
  }

  // ---------- Protección de páginas internas ----------
  function protectPrivatePages() {
    const isPrivate =
      !!$("#balanceView") ||
      !!$("#amount") ||
      (!!$("#transferAmount") && !!$("#contact")) ||
      !!$("#transactionsBody");

    if (!isPrivate) return;

    if (!getSession()) {
      window.location.href = ROUTES.LOGIN;
    }
  }

  // ---------- Navbar: Bienvenido/a ----------
  function initNavbarWelcome() {
    const el = $("#navWelcome");
    if (!el) return;

    const session = getSession();
    if (!session || !session.name) {
      el.textContent = "";
      return;
    }

    el.textContent = `Bienvenido/a, ${session.name}`;
  }

  // ---------- Logout ----------
  function initLogoutLinks() {
    // Detecta por texto “Cerrar sesión” o por id btnLogout
    const links = Array.from(document.querySelectorAll("a")).filter((a) => {
      const txt = (a.textContent || "").trim().toLowerCase();
      return a.id === "btnLogout" || txt === "cerrar sesión";
    });

    links.forEach((a) => {
      a.addEventListener("click", () => {
        clearSession();
      });
    });
  }

  // ---------- Login ----------
  function initLoginPage() {
    const form = $("form.needs-validation");
    if (!form) return;

    if (getSession()) {
      window.location.href = ROUTES.MENU;
      return;
    }

    form.addEventListener("submit", (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        form.classList.add("was-validated");
        return;
      }

      event.preventDefault();

      const email = $("#email")?.value?.trim() || "";
      const password = $("#password")?.value || "";

      const users = readJSON(STORAGE.USERS, []);
      const found = users.find((u) => sameEmail(u.email, email) && u.password === password);

      if (!found) {
        showAlertBeforeForm(
          form,
          "loginMsg",
          "danger",
          "No fue posible iniciar sesión. Verifique su correo y contraseña."
        );
        return;
      }

      setSession({ email: found.email, name: found.name });

      showAlertBeforeForm(form, "loginMsg", "success", `Bienvenido/a, ${found.name}.`);

      setTimeout(() => {
        window.location.href = ROUTES.MENU;
      }, 350);
    });

    $("#email")?.addEventListener("input", () => hideAlert("loginMsg"));
    $("#password")?.addEventListener("input", () => hideAlert("loginMsg"));
  }

  // ---------- Registro ----------
  function initRegisterPage() {
    const form = $("form.needs-validation");
    const fullName = $("#fullName");
    const emailEl = $("#regEmail");
    const pass1 = $("#regPassword");
    const pass2 = $("#regPassword2");

    if (!form || !fullName || !emailEl || !pass1 || !pass2) return;

    if (getSession()) {
      window.location.href = ROUTES.MENU;
      return;
    }

    form.addEventListener("submit", (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        form.classList.add("was-validated");
        return;
      }

      event.preventDefault();

      const name = fullName.value.trim();
      const email = emailEl.value.trim().toLowerCase();
      const p1 = pass1.value;
      const p2 = pass2.value;

      if (p1 !== p2) {
        showAlertBeforeForm(form, "registerMsg", "danger", "Las contraseñas no coinciden.");
        return;
      }

      const users = readJSON(STORAGE.USERS, []);
      const exists = users.some((u) => sameEmail(u.email, email));

      if (exists) {
        showAlertBeforeForm(form, "registerMsg", "danger", "Este correo ya se encuentra registrado.");
        return;
      }

      users.push({ email, password: p1, name });
      writeJSON(STORAGE.USERS, users);

      setSession({ email, name });

      addTransaction({ type: "Info", amount: 0, detail: "Cuenta creada" });

      showAlertBeforeForm(form, "registerMsg", "success", "Cuenta creada con éxito. Redirigiendo...");

      setTimeout(() => {
        window.location.href = ROUTES.MENU;
      }, 450);
    });

    fullName.addEventListener("input", () => hideAlert("registerMsg"));
    emailEl.addEventListener("input", () => hideAlert("registerMsg"));
    pass1.addEventListener("input", () => hideAlert("registerMsg"));
    pass2.addEventListener("input", () => hideAlert("registerMsg"));
  }

  // ---------- Menú ----------
  function initMenuPage() {
    const balanceView = $("#balanceView");
    if (!balanceView) return;

    const balance = getBalance();
    balanceView.textContent = moneyCLP(balance);

    if (window.jQuery) {
      window.jQuery(balanceView).stop(true, true).hide().fadeIn(220);
    }
  }

  // ---------- Depósito (con origen) ----------
  function initDepositPage() {
    const form = $("form.needs-validation");
    const amountInput = $("#amount");
    const sourceSelect = $("#fundingSource");
    if (!form || !amountInput || !sourceSelect) return;

    form.addEventListener("submit", (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        form.classList.add("was-validated");
        return;
      }

      event.preventDefault();

      const amount = Number(amountInput.value);
      const sourceLabel = sourceSelect.options[sourceSelect.selectedIndex]?.text || "Origen no especificado";

      if (!Number.isFinite(amount) || amount <= 0) {
        showAlertBeforeForm(form, "depositMsg", "danger", "Ingrese un monto válido (mayor a 0).");
        return;
      }

      const newBalance = getBalance() + amount;
      setBalance(newBalance);

      addTransaction({
        type: "Depósito",
        amount,
        detail: `Depósito recibido · Origen: ${sourceLabel}`,
      });

      showAlertBeforeForm(
        form,
        "depositMsg",
        "success",
        `Depósito realizado con éxito: $${moneyCLP(amount)}. Saldo actual: $${moneyCLP(newBalance)}.`
      );

      amountInput.value = "";
      sourceSelect.selectedIndex = 0;
      form.classList.remove("was-validated");

      setTimeout(() => {
        window.location.href = ROUTES.TX;
      }, 650);
    });

    amountInput.addEventListener("input", () => hideAlert("depositMsg"));
    sourceSelect.addEventListener("change", () => hideAlert("depositMsg"));
  }

  // ---------- Contactos + Transferencias ----------
  function initSendMoneyPage() {
    const form = $("form.needs-validation");
    const inputContact = $("#contact");
    const inputAmount = $("#transferAmount");
    const inputMessage = $("#message");

    if (!form || !inputContact || !inputAmount) return;

    const contactsList = $("#contactsList");
    const contactsDatalist = $("#contactsDatalist");

    function getContacts() {
      return readJSON(STORAGE.CONTACTS, []);
    }

    function setContacts(arr) {
      writeJSON(STORAGE.CONTACTS, arr);
    }

    function renderContacts() {
      const contacts = getContacts();

      if (contactsList) {
        contactsList.innerHTML = "";

        if (!contacts.length) {
          const empty = document.createElement("div");
          empty.className = "text-muted-2 small";
          empty.textContent = "Aún no tiene contactos registrados.";
          contactsList.appendChild(empty);
        } else {
          contacts.forEach((name) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "list-group-item list-group-item-action";
            btn.textContent = name;
            btn.addEventListener("click", () => {
              inputContact.value = name;
              inputContact.focus();
            });
            contactsList.appendChild(btn);
          });
        }
      }

      if (contactsDatalist) {
        contactsDatalist.innerHTML = "";
        contacts.forEach((name) => {
          const opt = document.createElement("option");
          opt.value = name;
          contactsDatalist.appendChild(opt);
        });
      }
    }

    renderContacts();

    const btnSaveContact = $("#btnSaveContact");
    const newContactInput = $("#newContact");

    if (btnSaveContact && newContactInput) {
      btnSaveContact.addEventListener("click", () => {
        const name = (newContactInput.value || "").trim();

        if (name.length < 2) return;

        const contacts = getContacts();
        const exists = contacts.some((c) => c.toLowerCase() === name.toLowerCase());

        if (!exists) {
          contacts.push(name);
          setContacts(contacts);
          addTransaction({ type: "Info", amount: 0, detail: `Contacto agregado: ${name}` });
        }

        newContactInput.value = "";
        renderContacts();

        if (window.jQuery && contactsList) {
          window.jQuery(contactsList).stop(true, true).hide().fadeIn(180);
        }
      });
    }

    form.addEventListener("submit", (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        form.classList.add("was-validated");
        return;
      }

      event.preventDefault();

      const contact = inputContact.value.trim();
      const amount = Number(inputAmount.value);
      const message = (inputMessage?.value || "").trim();

      if (!contact) {
        showAlertBeforeForm(form, "sendMsg", "danger", "Debe indicar el destinatario.");
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        showAlertBeforeForm(form, "sendMsg", "danger", "Ingrese un monto válido (mayor a 0).");
        return;
      }

      const balance = getBalance();
      if (amount > balance) {
        showAlertBeforeForm(
          form,
          "sendMsg",
          "danger",
          `Saldo insuficiente. Su saldo disponible es $${moneyCLP(balance)}.`
        );
        return;
      }

      const newBalance = balance - amount;
      setBalance(newBalance);

      const detail = message
        ? `Transferencia a ${contact} · ${message}`
        : `Transferencia a ${contact}`;

      addTransaction({ type: "Envío", amount, detail });

      showAlertBeforeForm(
        form,
        "sendMsg",
        "success",
        `Transferencia realizada con éxito. Se enviaron $${moneyCLP(amount)} a ${contact}. Saldo actual: $${moneyCLP(newBalance)}.`
      );

      inputContact.value = "";
      inputAmount.value = "";
      if (inputMessage) inputMessage.value = "";
      form.classList.remove("was-validated");

      setTimeout(() => {
        window.location.href = ROUTES.TX;
      }, 650);
    });

    inputContact.addEventListener("input", () => hideAlert("sendMsg"));
    inputAmount.addEventListener("input", () => hideAlert("sendMsg"));
    inputMessage?.addEventListener("input", () => hideAlert("sendMsg"));
  }

  // ---------- Movimientos ----------
  function initTransactionsPage() {
    const tbody = $("#transactionsBody");
    if (!tbody) return;

    const tx = readJSON(STORAGE.TX, []);

    tbody.innerHTML = "";

    if (!tx.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" class="text-muted-2">No hay movimientos registrados.</td>`;
      tbody.appendChild(tr);
      return;
    }

    tx.forEach((t) => {
      const tr = document.createElement("tr");

      const badgeClass =
        t.type === "Depósito" ? "text-bg-success" :
        t.type === "Envío" ? "text-bg-primary" :
        "text-bg-secondary";

      tr.innerHTML = `
        <td>${t.date}</td>
        <td><span class="badge ${badgeClass}">${t.type}</span></td>
        <td>$${moneyCLP(t.amount)}</td>
        <td>${t.detail || ""}</td>
      `;
      tbody.appendChild(tr);
    });

    if (window.jQuery) {
      window.jQuery(tbody).stop(true, true).hide().fadeIn(180);
    }
  }

  // ---------- Router ----------
  function runByPage() {
    if ($("#email") && $("#password")) initLoginPage();
    if ($("#fullName") && $("#regEmail") && $("#regPassword") && $("#regPassword2")) initRegisterPage();

    if ($("#balanceView")) initMenuPage();
    if ($("#amount") && $("#fundingSource")) initDepositPage();
    if ($("#transferAmount") && $("#contact")) initSendMoneyPage();
    if ($("#transactionsBody")) initTransactionsPage();

    initNavbarWelcome();
    initLogoutLinks();
  }

  // ---------- Arranque ----------
  document.addEventListener("DOMContentLoaded", () => {
    seedIfNeeded();
    protectPrivatePages();
    runByPage();
  });
})();
