/* Kairos — asistente con IA del portafolio de Julian Molineris.
   Nació para hacer la atención al cliente de las pymes más ágil y personal.
   Proactivo + respuestas locales (sin API); fallback a /api/chat solo para texto libre.
   Diseñado para NO disparar consumo de API: saludo, chips e intenciones comunes se resuelven en el cliente. */
(() => {
  const API_BASE = window.JM_API_BASE || "https://personalpage20-backend-production.up.railway.app";
  const KAIRO_IMG = "assets/kairo.png";         // ojos abiertos
  const KAIRO_BLINK = "assets/kairo-blink.png"; // ojos cerrados (parpadeo)
  const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Argentina/Cordoba";
  const sessionId =
    sessionStorage.getItem("jm_session_id") ||
    (() => {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("jm_session_id", id);
      return id;
    })();

  let LANG = localStorage.lang || (document.documentElement.lang || "es");
  window.addEventListener("jm:lang", (e) => {
    LANG = e.detail?.lang || "es";
    syncUITexts();
  });
  const isEN = () => LANG === "en";

  // ===== Textos de UI =====
  const UI = {
    es: {
      title: "Kairos", subtitle: "Asistente de Julian",
      welcome: "¡Hola! 👋 Soy Kairos, un asistente con IA que ayuda a las pymes a dar una atención al cliente más ágil y personal. Me construyó Julian. ¿Qué te gustaría ver de su trabajo?",
      placeholder: "Escribí tu pregunta…", send: "Enviar", writing: "Escribiendo…",
      proactive: "¡Hola! 👋 Soy Kairos. ¿Te muestro los proyectos de Julian?",
      uploadNA: "Adjuntar PDF no está habilitado todavía.",
      netErr: "Error de red. Probá de nuevo en un momento.",
      srvErr: "Tuve un problema para responder. Probá una de las opciones de abajo 👇"
    },
    en: {
      title: "Kairos", subtitle: "Julian's assistant",
      welcome: "Hi! 👋 I'm Kairos, an AI assistant that helps SMEs deliver faster, more personal customer service. Julian built me. What would you like to see of his work?",
      placeholder: "Type your question…", send: "Send", writing: "Typing…",
      proactive: "Hi! 👋 I'm Kairos. Want me to show you Julian's projects?",
      uploadNA: "PDF attachment isn't enabled yet.",
      netErr: "Network error. Please try again in a moment.",
      srvErr: "I had trouble answering. Try one of the options below 👇"
    }
  };
  const t = (k) => (UI[LANG] || UI.es)[k];

  // ===== Quick replies (chips) y respuestas locales: SIN API =====
  const CHIPS = {
    es: [
      { id: "projects", label: "🚀 Proyectos" },
      { id: "ventasimple", label: "🛒 Venta Simple" },
      { id: "stack", label: "🧩 Stack" },
      { id: "contact", label: "✉️ Contacto" },
      { id: "cv", label: "📄 Descargar CV" },
      { id: "meeting", label: "📅 Agendar" }
    ],
    en: [
      { id: "projects", label: "🚀 Projects" },
      { id: "ventasimple", label: "🛒 Venta Simple" },
      { id: "stack", label: "🧩 Stack" },
      { id: "contact", label: "✉️ Contact" },
      { id: "cv", label: "📄 Download CV" },
      { id: "meeting", label: "📅 Book a call" }
    ]
  };

  const ANSWERS = {
    es: {
      projects: "Julian tiene 3 proyectos destacados:\n🛒 Venta Simple — SaaS de gestión EN PRODUCCIÓN\n💬 Kairos — asistente con IA (¡soy yo!)\n🌱 AgriSense — IoT para viveros\n¿Cuál te muestro en detalle?",
      ventasimple: "Venta Simple es el proyecto estrella: POS de escritorio offline-first + panel web + app móvil + facturación AFIP/ARCA. Está en producción con comercios reales.\n👉 Demo en vivo: https://ventasimple.cloud",
      stack: "Stack principal de Julian:\n• Backend: Node.js, TypeScript, Python (FastAPI)\n• Frontend/Mobile: React, Next.js, Flutter\n• Datos/Cloud: Supabase/Postgres, Vercel, Railway\n• IA aplicada a procesos de negocio (análisis de datos y decisiones)\n• QA: Selenium, Postman, Jira",
      contact: "Podés contactar a Julian por:\n✉️ julianmolinerisit@gmail.com\n💼 linkedin.com/in/julianmolineris\n💻 github.com/molinerisit\nO completá el formulario de contacto en la página.",
      cv: "¡Listo! Te abro el CV para descargar 👇",
      meeting: "Para coordinar una reunión, usá la página de agenda y elegí fecha y hora. Te llega la invitación por email.\n👉 reuniones.html",
      whoami: "Soy Kairos, un asistente con IA que nació para hacer la atención al cliente de las pymes más ágil y personal. Acá te ayudo a conocer el trabajo de Julian 😉",
      fallbackHint: "Puedo contarte sobre proyectos, stack, contacto o ayudarte a agendar. ¿Qué necesitás?"
    },
    en: {
      projects: "Julian has 3 featured projects:\n🛒 Venta Simple — management SaaS IN PRODUCTION\n💬 Kairos — AI assistant (that's me!)\n🌱 AgriSense — IoT for nurseries\nWhich one should I show you?",
      ventasimple: "Venta Simple is the flagship: offline-first desktop POS + web dashboard + mobile app + AFIP/ARCA invoicing. It's in production with real businesses.\n👉 Live demo: https://ventasimple.cloud",
      stack: "Julian's main stack:\n• Backend: Node.js, TypeScript, Python (FastAPI)\n• Frontend/Mobile: React, Next.js, Flutter\n• Data/Cloud: Supabase/Postgres, Vercel, Railway\n• AI applied to business processes (data analysis & decisions)\n• QA: Selenium, Postman, Jira",
      contact: "You can reach Julian via:\n✉️ julianmolinerisit@gmail.com\n💼 linkedin.com/in/julianmolineris\n💻 github.com/molinerisit\nOr use the contact form on the page.",
      cv: "Done! Opening the CV for download 👇",
      meeting: "To book a call, use the scheduling page and pick a date and time. You'll get the invite by email.\n👉 reuniones.html",
      whoami: "I'm Kairos, an AI assistant born to make SME customer service faster and more personal. Here I help you explore Julian's work 😉",
      fallbackHint: "I can tell you about projects, stack, contact, or help you book a call. What do you need?"
    }
  };
  const ans = (k) => (ANSWERS[LANG] || ANSWERS.es)[k];

  // Acciones locales asociadas a cada intención (navegación sin recargar API)
  function runLocalAction(id) {
    const goto = (hash, file) => {
      if (document.getElementById(hash)) document.getElementById(hash).scrollIntoView({ behavior: "smooth" });
      else location.href = (file || "index.html") + "#" + hash;
    };
    if (id === "projects") setTimeout(() => goto("proyectos"), 400);
    else if (id === "contact") setTimeout(() => goto("contacto"), 400);
    else if (id === "cv") setTimeout(() => { const a = document.createElement("a"); a.href = isEN() ? "CV_Julian_Molineris_EN.pdf" : "CV_Julian_Molineris.pdf"; a.download = ""; document.body.appendChild(a); a.click(); a.remove(); }, 300);
  }

  // Matcher de intención local (palabras clave) -> evita llamar a la API
  function localIntent(qRaw) {
    const q = (qRaw || "").toLowerCase();
    const has = (...w) => w.some((x) => q.includes(x));
    if (has("venta simple", "ventasimple", " pos", "punto de venta")) return "ventasimple";
    if (has("proyecto", "project", "portfolio", "portafolio", "trabajos", "work")) return "projects";
    if (has("stack", "tecnolog", "technolog", "lenguaje", "language", "skill", "herramienta")) return "stack";
    if (has("contacto", "contact", "email", "correo", "mail", "telefono", "teléfono", "whatsapp", "linkedin", "github")) return "contact";
    if (has(" cv", "cv ", "curriculum", "currículum", "resume", "resumé", "résumé")) return "cv";
    if (has("agenda", "reunion", "reunión", "meeting", "call", "llamada", "cita", "schedule", "book")) return "meeting";
    if (has("quien sos", "quién sos", "quien eres", "who are you", "kairos", "kairo", "asistente", "assistant", "sobre julian", "about julian")) return "whoami";
    return null;
  }

  // ===== Render del widget =====
  const rootHtml = `<style>
    @keyframes kairo-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    .kairo-float { animation: kairo-float 4s ease-in-out infinite; }
  </style>
  <div id="jm-chat-root" class="fixed bottom-4 right-4 z-50">
    <div id="kairo-bubble" class="hidden absolute bottom-16 right-0 w-60 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm rounded-2xl rounded-br-sm shadow-2xl border border-slate-200 dark:border-slate-700 p-3 pr-7">
      <button id="kairo-bubble-x" class="absolute top-1 right-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs" aria-label="Cerrar">✕</button>
      <span id="kairo-bubble-text"></span>
    </div>
    <button id="jm-chat-toggle" class="relative overflow-hidden shadow-xl rounded-full w-16 h-16 flex items-center justify-center bg-white ring-2 ring-indigo-500/60 hover:ring-indigo-500 hover:scale-105 transition focus:outline-none focus:ring-4 focus:ring-indigo-300" aria-label="Abrir chat con Kairos">
      <span class="kairo-float relative block w-full h-full">
        <img id="kairo-eyes-open" src="${KAIRO_IMG}" alt="Kairos" class="absolute inset-0 w-full h-full object-cover" />
        <img id="kairo-eyes-closed" src="${KAIRO_BLINK}" alt="" class="absolute inset-0 w-full h-full object-cover invisible" />
      </span>
    </button>
    <div id="jm-chat-panel" class="hidden fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 overflow-hidden sm:absolute sm:inset-auto sm:bottom-0 sm:right-0 sm:w-96 sm:max-w-[380px] sm:h-[74vh] sm:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-slate-700 shadow-2xl">
      <div class="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shrink-0">
        <div class="flex items-center gap-3">
          <img src="${KAIRO_IMG}" class="w-9 h-9 rounded-full bg-white/20 p-0.5" alt="Kairos"/>
          <div>
            <p class="text-sm font-bold flex items-center gap-1.5" data-i18n-chat="title">Kairos <span class="inline-block w-2 h-2 bg-emerald-400 rounded-full"></span></p>
            <p class="text-[11px] text-white/80" data-i18n-chat="subtitle">Asistente de Julian</p>
          </div>
        </div>
        <button id="jm-chat-close" class="text-white/80 hover:text-white text-lg p-1" aria-label="Cerrar">✕</button>
      </div>
      <div id="jm-chat-messages" class="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-slate-50 dark:bg-slate-900"></div>
      <div id="jm-chat-chips" class="px-3 pt-2 flex flex-wrap gap-1.5 bg-slate-50 dark:bg-slate-900 shrink-0"></div>
      <div class="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shrink-0">
        <form id="jm-chat-form" class="flex items-center gap-2">
          <input id="jm-chat-input" type="text" autocomplete="off" placeholder="Escribí tu pregunta…" class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
          <button class="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-300" data-i18n-chat="send">Enviar</button>
        </form>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", rootHtml);

  const $ = (s) => document.querySelector(s);
  const panel = $("#jm-chat-panel"), toggle = $("#jm-chat-toggle"), closeBtn = $("#jm-chat-close"),
    messages = $("#jm-chat-messages"), chipsEl = $("#jm-chat-chips"),
    form = $("#jm-chat-form"), input = $("#jm-chat-input"),
    dot = $("#kairo-dot"), bubble = $("#kairo-bubble"), bubbleText = $("#kairo-bubble-text"), bubbleX = $("#kairo-bubble-x"),
    eyesOpen = $("#kairo-eyes-open"), eyesClosed = $("#kairo-eyes-closed");

  // ── Parpadeo del avatar (copiado del asistente de VentaSimple) ──
  // Alterna ojos abiertos/cerrados cada 3–5s por 160ms. Se pausa con el chat abierto.
  let blinkT = null;
  function setEyes(open) {
    if (!eyesOpen || !eyesClosed) return;
    eyesOpen.classList.toggle("invisible", !open);
    eyesClosed.classList.toggle("invisible", open);
  }
  function scheduleBlink() {
    if (blinkT) clearTimeout(blinkT);
    blinkT = setTimeout(() => {
      if (!panel.classList.contains("hidden")) { scheduleBlink(); return; }
      setEyes(false);
      blinkT = setTimeout(() => { setEyes(true); scheduleBlink(); }, 160);
    }, 3000 + Math.random() * 2000);
  }

  function syncUITexts() {
    const titleEl = $("[data-i18n-chat='title']");
    if (titleEl && titleEl.firstChild) titleEl.firstChild.textContent = t("title") + " ";
    $("[data-i18n-chat='subtitle']") && ($("[data-i18n-chat='subtitle']").textContent = t("subtitle"));
    $("[data-i18n-chat='send']") && ($("[data-i18n-chat='send']").textContent = t("send"));
    input && input.setAttribute("placeholder", t("placeholder"));
    if (bubbleText) bubbleText.textContent = t("proactive");
    renderChips();
  }

  function scrollBottom() { setTimeout(() => { messages.scrollTop = messages.scrollHeight; }, 0); }

  function addMsg(text, who = "bot") {
    const wrap = document.createElement("div");
    wrap.className = who === "user" ? "flex justify-end" : "flex items-end gap-2 justify-start";
    if (who === "bot") {
      const av = document.createElement("img"); av.src = KAIRO_IMG; av.className = "w-7 h-7 rounded-full shrink-0"; wrap.appendChild(av);
    }
    const bubbleEl = document.createElement("div");
    bubbleEl.className = who === "user"
      ? "max-w-[80%] rounded-2xl rounded-br-sm px-3 py-2 text-sm bg-indigo-600 text-white whitespace-pre-line"
      : "max-w-[80%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 whitespace-pre-line";
    bubbleEl.textContent = text;
    wrap.appendChild(bubbleEl);
    messages.appendChild(wrap);
    scrollBottom();
  }

  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = "";
    (CHIPS[LANG] || CHIPS.es).forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "px-2.5 py-1 rounded-full border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition";
      b.textContent = c.label;
      b.addEventListener("click", () => handleIntent(c.id, true));
      chipsEl.appendChild(b);
    });
  }

  function showWelcome() {
    messages.innerHTML = "";
    addMsg(t("welcome"), "bot");
  }

  // Maneja una intención local (chip o texto matcheado) -> SIN API
  function handleIntent(id, echoUser) {
    if (echoUser) {
      const label = (CHIPS[LANG] || CHIPS.es).find((c) => c.id === id)?.label;
      if (label) addMsg(label.replace(/^[^\s]+\s/, ""), "user");
    }
    const a = ans(id) || ans("fallbackHint");
    setTimeout(() => { addMsg(a, "bot"); runLocalAction(id); }, 220);
  }

  // ===== Eventos =====
  let opened = false;
  // Bloquea el scroll del fondo solo en mobile (cuando el panel es fullscreen)
  const lockScroll = (on) => {
    if (window.matchMedia("(max-width: 639px)").matches) document.documentElement.style.overflow = on ? "hidden" : "";
    else document.documentElement.style.overflow = "";
  };
  function openPanel() {
    panel.classList.remove("hidden");
    hideBubble();
    if (dot) dot.classList.add("hidden");
    opened = true;
    lockScroll(true);
    setTimeout(() => input?.focus(), 100);
  }
  function closePanel() { panel.classList.add("hidden"); lockScroll(false); }
  function hideBubble() { bubble && bubble.classList.add("hidden"); }

  toggle.addEventListener("click", () => {
    if (panel.classList.contains("hidden")) openPanel();
    else closePanel();
  });
  closeBtn.addEventListener("click", closePanel);
  bubble.addEventListener("click", (e) => { if (e.target !== bubbleX) openPanel(); });
  bubbleX.addEventListener("click", (e) => { e.stopPropagation(); hideBubble(); sessionStorage.setItem("kairo_greeted", "1"); });

  // Proactivo: una sola vez por sesión, sin ninguna llamada a la API
  function maybeGreet() {
    if (sessionStorage.getItem("kairo_greeted") === "1") return;
    if (!panel.classList.contains("hidden")) return;
    bubbleText.textContent = t("proactive");
    bubble.classList.remove("hidden");
    sessionStorage.setItem("kairo_greeted", "1");
    setTimeout(() => { if (!opened) hideBubble(); }, 12000);
  }

  // Envío de mensaje
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = (input.value || "").trim();
    if (!q) return;
    addMsg(q, "user");
    input.value = "";

    // 1) Intento local (sin API)
    const intent = localIntent(q);
    if (intent) { handleIntent(intent, false); return; }

    // 2) Fallback a la API solo para texto libre no cubierto
    const thinking = document.createElement("div");
    thinking.className = "text-[11px] text-slate-400 px-1";
    thinking.textContent = t("writing");
    messages.appendChild(thinking); scrollBottom();

    const system = isEN()
      ? `You are Kairos, an AI assistant on Julian Molineris' portfolio. Kairos was created to make customer service for SMEs faster and more personal. Answer in English, concise and friendly. Help the visitor learn about Julian's projects (Venta Simple, Kairos, AgriSense), stack and contact. TZ=${TZ}.`
      : `Sos Kairos, un asistente con IA en el portafolio de Julian Molineris. Kairos nació para hacer la atención al cliente de las pymes más ágil y personal. Respondé en español, conciso y amable. Ayudá al visitante a conocer los proyectos de Julian (Venta Simple, Kairos, AgriSense), su stack y su contacto. TZ=${TZ}.`;

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "system", content: system }, { role: "user", content: q }], temperature: 0.6 })
      });
      const data = await res.json().catch(() => ({}));
      thinking.remove();
      if (!res.ok || data.error) { addMsg(t("srvErr"), "bot"); return; }
      addMsg(data.reply || ans("fallbackHint"), "bot");
    } catch (err) {
      thinking.remove();
      addMsg(t("netErr"), "bot");
    }
  });

  // Init
  showWelcome();
  syncUITexts();
  window.addEventListener("jm:lang", () => { syncUITexts(); showWelcome(); });
  setTimeout(maybeGreet, 5000);
  scheduleBlink();
})();
