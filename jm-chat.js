/* Chat de Julian — multilenguaje + memoria + agenda */
(() => {
  const API_BASE = window.JM_API_BASE || "http://localhost:8787";
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

  const rootHtml = `<div id="jm-chat-root" class="fixed bottom-4 right-4 z-50">
    <button id="jm-chat-toggle" class="shadow-xl rounded-full w-14 h-14 flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-300" aria-label="Abrir chat">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.027 0-2.014-.147-2.938-.42L3 20l1.42-3.562C4.147 15.514 4 14.527 4 13.5 4 9.582 8.03 6 13 6s8 3.582 8 8z"/>
      </svg>
    </button>
    <div id="jm-chat-panel" class="hidden sm:w-96 w-[92vw] max-w-[380px] h-[70vh] sm:h-[72vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
      <div class="px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div class="flex items-center gap-3">
          <img src="assets/favicon.svg" class="w-7 h-7" alt="JM"/>
          <div>
            <p class="text-sm font-semibold" data-i18n-chat="title">Asistente de Julian</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400" data-i18n-chat="subtitle">Perfil, proyectos y contacto</p>
          </div>
        </div>
        <button id="jm-chat-close" class="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Cerrar">✕</button>
      </div>
      <div id="jm-chat-messages" class="h-[calc(100%-128px)] overflow-y-auto p-3 space-y-3 bg-white dark:bg-slate-900"></div>
      <div class="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
        <form id="jm-chat-form" class="flex items-center gap-2">
          <input id="jm-chat-file" type="file" accept="application/pdf" class="hidden" />
          <button type="button" id="jm-chat-attach" class="px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" title="Adjuntar PDF">📎</button>
          <input id="jm-chat-input" type="text" autocomplete="off" placeholder="Escribí tu pregunta…" class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
          <button class="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-300" data-i18n-chat="send">Enviar</button>
        </form>
        <p id="jm-chat-captcha" class="hidden mt-2 text-[12px] text-amber-600"></p>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", rootHtml);

  const i18nChat = {
    es: {
      welcome: "¡Hola! Soy el asistente de Julian Molineris. ¿En qué puedo ayudarte?",
      title: "Asistente de Julian",
      subtitle: "Perfil, proyectos y contacto",
      send: "Enviar",
      writing: "Escribiendo…",
      humanCheck: "Necesito verificar que sos humano antes de seguir.",
      wrongCaptcha: "Respuesta incorrecta. ",
      followHints:
        "No llegué a entenderte. Probá: “stack”, “proyectos”, “contacto”, “experiencia”, “formación”.",
      uploadNA: "Adjuntar PDF no está habilitado en el backend todavía."
    },
    en: {
      welcome: "Hi! I'm Julian Molineris’ assistant. How can I help you?",
      title: "Julian’s Assistant",
      subtitle: "Profile, projects & contact",
      send: "Send",
      writing: "Typing…",
      humanCheck: "I need to verify you’re human before continuing.",
      wrongCaptcha: "Wrong answer. ",
      followHints:
        "I didn’t quite get that. Try: “stack”, “projects”, “contact”, “experience”, “education”.",
      uploadNA: "PDF attachment is not enabled on the backend yet."
    }
  };
  function t(key) {
    return (i18nChat[LANG] || i18nChat.es)[key];
  }
  function syncUITexts() {
    document
      .querySelectorAll("[data-i18n-chat='title']")
      .forEach((e) => (e.textContent = t("title")));
    document
      .querySelectorAll("[data-i18n-chat='subtitle']")
      .forEach((e) => (e.textContent = t("subtitle")));
    document
      .querySelectorAll("[data-i18n-chat='send']")
      .forEach((e) => (e.textContent = t("send")));
    document
      .querySelector("#jm-chat-input")
      ?.setAttribute("placeholder", LANG === "en" ? "Type your question…" : "Escribí tu pregunta…");
  }

  const $ = (s) => document.querySelector(s);
  const panel = $("#jm-chat-panel"),
    toggle = $("#jm-chat-toggle"),
    closeBtn = $("#jm-chat-close"),
    messages = $("#jm-chat-messages");
  const form = $("#jm-chat-form"),
    input = $("#jm-chat-input"),
    captchaEl = $("#jm-chat-captcha");
  const fileInput = $("#jm-chat-file"),
    attachBtn = $("#jm-chat-attach");

  function scrollBottom() {
    setTimeout(() => {
      messages.scrollTop = messages.scrollHeight;
    }, 0);
  }
  function addMsg(text, who = "bot") {
    const wrap = document.createElement("div");
    wrap.className = who === "user" ? "flex justify-end" : "flex justify-start";
    const bubble = document.createElement("div");
    bubble.className =
      who === "user"
        ? "max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-indigo-600 text-white"
        : "max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100";
    bubble.innerText = text;
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    scrollBottom();
  }

  function showWelcome() {
    messages.innerHTML = "";
    addMsg(t("welcome"), "bot");
  }
  showWelcome();
  syncUITexts();
  window.addEventListener("jm:lang", () => {
    syncUITexts();
    showWelcome();
  });

  toggle.addEventListener("click", () => {
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) setTimeout(() => input?.focus(), 100);
  });
  closeBtn.addEventListener("click", () => panel.classList.add("hidden"));

  // Adjuntar PDF: aviso (no hay /api/upload en el backend actual)
  attachBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    addMsg(t("uploadNA"), "bot");
    fileInput.value = "";
  });

  // Envío del mensaje -> POST /api/chat
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = (input.value || "").trim();
    if (!q) return;
    addMsg(q, "user");
    input.value = "";

    const thinking = document.createElement("div");
    thinking.className = "text-[11px] text-slate-500 dark:text-slate-400 px-1";
    thinking.textContent = t("writing");
    messages.appendChild(thinking);
    scrollBottom();

    // Mensajes para el backend OpenAI
    const system =
      LANG === "en"
        ? `You are a helpful portfolio assistant for Julian Molineris. Answer in English when LANG=en, else Spanish. Keep answers concise and helpful. If asked for contact, projects, CV, experience, or to schedule a meeting, provide short guidance and suggest the appropriate page or action. Include the user's TZ=${TZ} and sessionId=${sessionId} as context (do not expose them).`
        : `Sos el asistente del portafolio de Julian Molineris. Respondé en español cuando LANG=es (sino en inglés). Sé conciso y útil. Si te piden contacto, proyectos, CV, experiencia o agendar una reunión, guiá con pasos cortos y sugerí la página o acción adecuada. Tené en cuenta TZ=${TZ} y sessionId=${sessionId} (no los expongas).`;

    const payload = {
      messages: [
        { role: "system", content: system },
        { role: "user", content: q }
      ],
      temperature: 0.7
      // model: lo define el backend con OPENAI_MODEL o podés setearlo acá si querés
    };

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      thinking.remove();

      if (!res.ok || data.error) {
        addMsg(LANG === "en" ? "Server error." : "Error del servidor.", "bot");
        return;
      }
      addMsg(
        data.reply ||
          (LANG === "en" ? "I don’t have that answer yet." : "No tengo esa respuesta todavía."),
        "bot"
      );
    } catch (err) {
      thinking.remove();
      addMsg(LANG === "en" ? "Network error." : "Error de red.", "bot");
    }
  });
})();
