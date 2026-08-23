import { termsData } from './terms.js';

const IDIOMAS_DISPONIBLES = {
  "en": "English", "es": "Spanish", "pt": "Portuguese", "fr": "French",
  "de": "German", "it": "Italian", "nl": "Dutch", "ru": "Russian",
  "tr": "Turkish", "zh": "Chinese", "ja": "Japanese", "ko": "Korean",
  "hi": "Hindi", "ar": "Arabic", "vi": "Vietnamese", "id": "Indonesian"
};

const BCP47_LANGS = {
  "en": "en-US", "es": "es-ES", "pt": "pt-BR", "fr": "fr-FR",
  "de": "de-DE", "it": "it-IT", "nl": "nl-NL", "ru": "ru-RU",
  "tr": "tr-TR", "zh": "zh-CN", "ja": "ja-JP", "ko": "ko-KR",
  "hi": "hi-IN", "ar": "ar-SA", "vi": "vi-VN", "id": "id-ID"
};

const SOUND_BLOCKED_MESSAGES = {
  es: "El sonido está bloqueado en los ajustes de tu navegador. Toca el icono de candado/ajustes junto a la barra de direcciones y activa 'Sonido' para escuchar la lectura.",
  en: "Sound is blocked in your browser settings. Tap the lock/settings icon next to the address bar and allow 'Sound' to listen.",
  pt: "O som está bloqueado nas configurações do seu navegador. Toque no cadeado/configurações na barra de endereços e ative 'Som'.",
  fr: "Le son est bloqué dans les paramètres de votre navigateur. Appuyez sur le cadenas dans la barre d'adresse et activez 'Son'.",
  de: "Der Ton ist in Ihren Browsereinstellungen blockiert. Tippen Sie auf das Schloss-Symbol in der Adressleiste und aktivieren Sie 'Ton'.",
  it: "L'audio è bloccato nelle impostazioni del browser. Tocca il lucchetto nella barra degli indirizzi e attiva 'Audio'.",
  nl: "Geluid is geblokkeerd in uw browserinstellingen. Tik op het slotpictogram in de adresbalk en schakel 'Geluid' in.",
  ru: "Звук заблокирован в настройках браузера. Нажмите на значок замка в адресной строке и включите «Звук».",
  tr: "Tarayıcı ayarlarınızda ses engellendi. Adres çubuğundaki kilit simgesine dokunun ve 'Ses' seçeneğine izin verin.",
  zh: "浏览器设置已阻止声音。请点按地址栏旁边的挂锁/设置图标并允许“声音”。",
  ja: "ブラウザ設定で音声がブロックされています。アドレスバーの鍵アイコンをタップして「音声」を許可してください。",
  ko: "브라우저 설정에서 소리가 차단되었습니다. 주소창 옆의 자물쇠/설정 아이콘을 누르고 '소리'를 허용해주세요.",
  hi: "आपके ब्राउज़र सेटिंग्स में ध्वनि अवरोधित है। एड्रेस बार में लॉक आइकन पर टैप करें और 'ध्वनि' की अनुमति दें।",
  ar: "تم حظر الصوت في إعدادات متصفحك. انقر فوق رمز القفل في شريط العناvindos واسمح بـ 'الصوت'.",
  vi: "Âm thanh bị chặn trong cài đặt trình duyệt. Chạm vào biểu tượng ổ khóa trên thanh địa chỉ và cho phép 'Âm thanh'.",
  id: "Suara diblokir di pengaturan browser Anda. Ketuk ikon gembok di bilah alamat dan izinkan 'Suara'."
};

class MergeTerms extends HTMLElement {

  actualizarFavicon() {
    try {
      // Remover favicons previos para forzar cambio inmediato
      document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());
      
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const strokeColor = isDark ? '%23ffffff' : '%23000000';
      const fillColor = isDark ? '%23ffffff' : '%23000000';
      
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      // Icono de documento monocromático puro, nítido y de alto contraste
      link.href = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${strokeColor}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/%3E%3Cpolyline points='14 2 14 8 20 8'/%3E%3Cline x1='16' y1='13' x2='8' y2='13'/%3E%3Cline x1='16' y1='17' x2='8' y2='17'/%3E%3Cline x1='10' y1='9' x2='8' y2='9'/%3E%3C/svg%3E`;
      document.head.appendChild(link);
    } catch(e) {}
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
    this.cargarVoces = this.cargarVoces.bind(this);
    
    this.isReading = false;
    this.isPaused = false;
    this.currentReadingIndex = 0;
    this.readingElements = [];
    this.isManualCancel = false;
    this.currentUtterance = null;
    this.vocesDisponibles = [];

    this.menuIdiomasAbierto = false;
    this.submenuAgregarAbierto = false;
    
    this.pilaCapas = [];
    this.popsPorIgnorar = 0;

    this.idiomaActivo = window.location.pathname.split('/')[1] || "en";
    this.idiomasGuardados = ["en"];
    this.soundAlertTimer = null;
  }

  connectedCallback() {
    this.actualizarFavicon();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.documentElement.classList.add('dark-mode');

    const savedLangs = localStorage.getItem('colorscope_langs');
    if (savedLangs) {
      try {
        this.idiomasGuardados = JSON.parse(savedLangs);
      } catch(e) {}
    }

    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      this.cargarVoces();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.cargarVoces();
      }
    }

    this.render();
    document.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('popstate', this.handlePopState);
  }

  disconnectedCallback() {
    this.stopKeepAlive();
    document.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('popstate', this.handlePopState);
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch(e) {}
    }
    window._colorscopeUtterance = null;
    if (this._closeListener) {
      window.removeEventListener('click', this._closeListener);
    }
  }

  cargarVoces() {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) return;
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        this.vocesDisponibles = v;
      }
    } catch(e) {}
  }

  handlePopState() {
    if (this.popsPorIgnorar > 0) {
      this.popsPorIgnorar--;
      return;
    }

    if (this.pilaCapas.length > 0) {
      const capa = this.pilaCapas.pop();
      if (capa && typeof capa.cerrar === 'function') {
        try {
          capa.cerrar();
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  abrirCapa(id, cerrar) {
    const index = this.pilaCapas.findIndex(c => c.id === id);
    if (index !== -1) {
      this.pilaCapas[index].cerrar = cerrar;
      return;
    }
    this.pilaCapas.push({ id, cerrar });
    window.history.pushState({ capaTermsId: id, timestamp: Date.now() }, "");
  }

  cerrarCapa(id) {
    const index = this.pilaCapas.findIndex(c => c.id === id);
    if (index !== -1) {
      const quitadas = this.pilaCapas.splice(index);
      const cant = quitadas.length;
      this.popsPorIgnorar += cant;
      window.history.go(-cant);
    }
  }

  handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if ((e.key === 't' || e.key === 'T') && !e.repeat) { e.preventDefault(); this.toggleTheme(); }
    if ((e.key === 'v' || e.key === 'V') && !e.repeat) { e.preventDefault(); this.toggleAudio(); }
    if ((e.key === 'l' || e.key === 'L') && !e.repeat) { e.preventDefault(); this.toggleMenuIdiomas(); }
    if (e.key === 'Escape' && !e.repeat) {
      e.preventDefault();
      if (this.menuIdiomasAbierto) this.cerrarMenus();
      else this.goBack();
    }

    if (this.isReading && !this.menuIdiomasAbierto) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.prevReading(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); this.nextReading(); }
      if (e.key === ' ') { e.preventDefault(); this.pauseResumeReading(); }
    }
  }

  toggleTheme() {
    const isNowDark = document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('theme', isNowDark ? 'dark' : 'light');
    this.render();
  }

  goBack() {
    if (this.pilaCapas.length > 0) {
      const cant = this.pilaCapas.length;
      this.pilaCapas = [];
      this.popsPorIgnorar += cant;
      window.history.go(-cant);
    }
    window.location.href = `/${this.idiomaActivo}/`;
  }

  clearReadingHighlights() {
    const elements = this.shadowRoot.querySelectorAll('.reading');
    elements.forEach(e => e.classList.remove('reading'));
  }

  updatePlayerUI() {
    const player = this.shadowRoot.getElementById('tts-player-box');
    const toggleBtn = this.shadowRoot.getElementById('audio-toggle');
    const playPauseBtn = this.shadowRoot.getElementById('tts-playpause');
    
    if (player) {
      player.style.display = this.isReading ? 'flex' : 'none';
    }
    if (toggleBtn) {
      if (this.isReading) {
        toggleBtn.classList.add('active-reading');
      } else {
        toggleBtn.classList.remove('active-reading');
      }
    }
    if (playPauseBtn) {
      playPauseBtn.innerHTML = this.isPaused
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>`;
    }
  }

  toggleAudio() {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) return;

    if (this.isReading) {
      this.stopReading(false);
    } else {
      try {
        window.speechSynthesis.resume();
      } catch (e) {}

      this.isManualCancel = false;
      this.isReading = true;
      this.isPaused = false;
      this.currentReadingIndex = 0;
      this.abrirCapa('tts-player', () => {
        this.stopReading(true);
      });
      
      this.updatePlayerUI();
      
      this.readingElements = Array.from(this.shadowRoot.querySelectorAll('.container h1, .container h2, .container p'));
      if (this.readingElements.length > 0) {
        this.startReading(0);
      } else {
        this.stopReading(false);
      }
    }
  }

  showSoundBlockedAlert() {
    const toast = this.shadowRoot.getElementById('sound-toast');
    if (!toast) return;
    if (this.soundAlertTimer) {
      clearTimeout(this.soundAlertTimer);
      this.soundAlertTimer = null;
    }
    toast.style.display = 'none';
    // Force DOM reflow to restart CSS entry animation
    void toast.offsetWidth;
    toast.style.display = 'flex';
    this.soundAlertTimer = setTimeout(() => {
      this.hideSoundBlockedAlert();
    }, 8000);
  }

  hideSoundBlockedAlert() {
    if (this.soundAlertTimer) {
      clearTimeout(this.soundAlertTimer);
      this.soundAlertTimer = null;
    }
    const toast = this.shadowRoot.getElementById('sound-toast');
    if (toast) {
      toast.style.display = 'none';
    }
  }

  startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (typeof window !== "undefined" && 'speechSynthesis' in window && this.isReading && !this.isPaused && window.speechSynthesis.speaking) {
        try {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } catch(e) {}
      }
    }, 8000);
  }

  stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  startReading(index) {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) return;

    if (index < 0 || index >= this.readingElements.length) {
      this.stopReading(false);
      return;
    }

    if (this.soundTimeoutCheck) {
      clearTimeout(this.soundTimeoutCheck);
      this.soundTimeoutCheck = null;
    }

    this.isManualCancel = false;
    this.isPaused = false;
    this.currentReadingIndex = index;
    this.updatePlayerUI();

    const el = this.readingElements[index];
    if (!el) {
      this.stopReading(false);
      return;
    }

    const text = (el.textContent || "").trim();
    if (!text) {
      if (this.isReading && index + 1 < this.readingElements.length) {
        this.startReading(index + 1);
      } else {
        this.stopReading(false);
      }
      return;
    }

    // Prepare speech parameters
    const bcpLang = BCP47_LANGS[this.idiomaActivo] || "en-US";
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = bcpLang;
    msg.rate = 1.0;
    msg.pitch = 1.0;
    msg.volume = 1.0;

    // Pick best available voice if available
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length > 0) {
      const langPrefix = this.idiomaActivo.toLowerCase();
      const voz = voices.find(v => v.lang && v.lang.replace('_', '-').toLowerCase() === bcpLang.toLowerCase()) ||
                  voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langPrefix));
      if (voz) {
        msg.voice = voz;
        msg.lang = voz.lang;
      }
    }
    
    this.currentUtterance = msg;
    window._colorscopeUtterance = msg; // Retain reference against mobile GC

    let speechStarted = false;
    const startTime = Date.now();

    msg.onstart = () => {
      speechStarted = true;
      if (this.soundTimeoutCheck) {
        clearTimeout(this.soundTimeoutCheck);
        this.soundTimeoutCheck = null;
      }
      this.hideSoundBlockedAlert();
      this.clearReadingHighlights();
      el.classList.add('reading');
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        el.scrollIntoView();
      }
      this.startKeepAlive();
    };
    
    msg.onend = () => {
      this.stopKeepAlive();
      if (this.soundTimeoutCheck) {
        clearTimeout(this.soundTimeoutCheck);
        this.soundTimeoutCheck = null;
      }
      if (this.currentUtterance === msg) {
        this.currentUtterance = null;
        window._colorscopeUtterance = null;
      }
      const elapsed = Date.now() - startTime;
      if (this.isReading && this.currentReadingIndex === index && !this.isManualCancel) {
        if (speechStarted || elapsed > 350) {
          this.startReading(index + 1);
        } else {
          // If aborted without starting, the browser blocked sound
          this.stopReading(false);
          this.showSoundBlockedAlert();
        }
      }
    };

    msg.onerror = (e) => {
      this.stopKeepAlive();
      if (this.soundTimeoutCheck) {
        clearTimeout(this.soundTimeoutCheck);
        this.soundTimeoutCheck = null;
      }
      if (this.currentUtterance === msg) {
        this.currentUtterance = null;
        window._colorscopeUtterance = null;
      }
      if (!this.isManualCancel && e.error !== 'interrupted') {
        console.warn("TTS error on element:", e.error);
        this.stopReading(false);
        this.showSoundBlockedAlert();
      }
    };

    // Fallback: If browser completely ignores speak() without emitting onstart or onerror (sound blocked globally)
    this.soundTimeoutCheck = setTimeout(() => {
      if (!speechStarted && this.isReading && this.currentReadingIndex === index) {
        this.stopReading(false);
        this.showSoundBlockedAlert();
      }
    }, 600);

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(msg);
    } catch(e) {
      console.warn("speechSynthesis speak error:", e);
      this.stopReading(false);
      this.showSoundBlockedAlert();
    }
  }

  stopReading(desdeHistorial = false) {
    if (this.soundTimeoutCheck) {
      clearTimeout(this.soundTimeoutCheck);
      this.soundTimeoutCheck = null;
    }
    this.stopKeepAlive();
    this.isManualCancel = true;
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch(e) {}
    }
    this.isReading = false;
    this.isPaused = false;
    this.currentUtterance = null;
    window._colorscopeUtterance = null;
    this.clearReadingHighlights();

    if (!desdeHistorial) {
      this.cerrarCapa('tts-player');
    }
    this.updatePlayerUI();
  }

  pauseResumeReading() {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) return;

    if (this.isPaused) {
      try {
        window.speechSynthesis.resume();
      } catch (e) {}
      this.isPaused = false;
      this.startKeepAlive();
      this.updatePlayerUI();
    } else {
      this.stopKeepAlive();
      try {
        window.speechSynthesis.pause();
      } catch (e) {}
      this.isPaused = true;
      this.updatePlayerUI();
    }
  }

  nextReading() {
    if (this.currentReadingIndex < this.readingElements.length - 1) {
      this.isManualCancel = true;
      try { window.speechSynthesis.cancel(); } catch(e) {}
      this.isManualCancel = false;
      this.startReading(this.currentReadingIndex + 1);
    }
  }

  prevReading() {
    this.isManualCancel = true;
    try { window.speechSynthesis.cancel(); } catch(e) {}
    this.isManualCancel = false;
    if (this.currentReadingIndex > 0) {
      this.startReading(this.currentReadingIndex - 1);
    } else {
      this.startReading(0);
    }
  }

  toggleMenuIdiomas() {
    if (this.menuIdiomasAbierto) {
      this.cerrarMenus();
    } else {
      this.menuIdiomasAbierto = true;
      this.submenuAgregarAbierto = false;
      this.abrirCapa('menu-idiomas', () => {
        this.menuIdiomasAbierto = false;
        this.submenuAgregarAbierto = false;
        this.render();
      });
      this.render();
    }
  }

  cerrarMenus() {
    if (!this.menuIdiomasAbierto && !this.submenuAgregarAbierto) return;
    this.menuIdiomasAbierto = false;
    this.submenuAgregarAbierto = false;
    this.cerrarCapa('menu-idiomas');
    this.render();
  }

  cambiarIdioma(code) {
    this.idiomaActivo = code;
    this.cerrarMenus();
    const currentPath = window.location.pathname.split('/').slice(2).join('/');
    window.location.replace(`/${code}/${currentPath}`);
  }

  agregarIdioma(code) {
    if (!this.idiomasGuardados.includes(code)) {
      this.idiomasGuardados.push(code);
      localStorage.setItem('colorscope_langs', JSON.stringify(this.idiomasGuardados));
    }
    this.cambiarIdioma(code);
  }

  borrarIdioma(e, code) {
    e.stopPropagation(); 
    if (code === "en") return; 
    this.idiomasGuardados = this.idiomasGuardados.filter(l => l !== code);
    localStorage.setItem('colorscope_langs', JSON.stringify(this.idiomasGuardados));
    if (this.idiomaActivo === code) this.cambiarIdioma("en");
    else this.render(); 
  }

  abrirSubmenuAgregar(e) {
    if (e) e.stopPropagation();
    this.submenuAgregarAbierto = true;
    this.abrirCapa('submenu-agregar', () => {
      this.submenuAgregarAbierto = false;
      this.render();
    });
    this.render();
  }

  render() {
    const isDark = document.documentElement.classList.contains('dark-mode');
    const bgColor = isDark ? '#202020' : '#faf8f6';
    const textColor = isDark ? '#FAF9F6' : '#000000';
    const menuBg = isDark ? '#222222' : '#e9e8e6';
    const btnBg = isDark ? '#222222' : '#FFFFFF';
    const borderColor = isDark ? '#2A2A2A' : '#D9D9D9';
    const hoverColor = isDark ? 'rgba(128, 128, 128, 0.15)' : 'rgba(128, 128, 128, 0.1)';
    const highlightColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const highlightBorder = isDark ? '#FFFFFF' : '#000000';
    const primaryColor = '#2A5CFF';
    const dangerColor = '#FF3B30';

    const uiTexts = termsData[this.idiomaActivo]?.ui || termsData["en"].ui;

    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :host { display: block; background-color: ${bgColor} !important; min-height: 100vh; width: 100%; color: ${textColor}; font-family: 'Inter', system-ui, sans-serif; transition: background-color 0.3s ease, color 0.3s ease; position: relative; text-align: center; }
        /* ESTILOS DE SCROLLBAR GRIS ADAPTADA AL FONDO (TRACK TRANSPARENTE) */
        :host {
          scrollbar-width: thin;
          scrollbar-color: ${isDark ? '#4a4a4a transparent' : '#b0b0b0 transparent'};
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${isDark ? '#4a4a4a' : '#c0c0c0'};
          border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? '#666666' : '#999999'};
        }

        /* SELECCIÓN UX DEL TEXTO (SOLO CUANDO EL USUARIO SELECCIONA) */
        ::selection {
          background-color: ${isDark ? '#333333' : '#d2e3fc'} !important;
          color: ${textColor} !important;
        }
        ::-moz-selection {
          background-color: ${isDark ? '#333333' : '#d2e3fc'} !important;
          color: ${textColor} !important;
        }

        .container { max-width: 800px; margin: 0 auto !important; padding: 100px 40px 60px 40px; text-align: left; -webkit-user-select: text; -moz-user-select: text; user-select: text; }
        .header-bar { position: absolute; top: 20px; left: 20px; right: 20px; display: flex; justify-content: space-between; align-items: center; z-index: 100; -webkit-user-select: none; user-select: none; }
        .top-controls-right { display: flex; align-items: center; flex-direction: column; gap: 8px; }
        .top-btn-row { display: flex; align-items: center; gap: 12px; position: relative; }
        .top-btn { background: ${btnBg}; border: 1px solid ${borderColor}; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: ${textColor}; transition: all 0.2s ease; height: 40px; min-height: 40px; outline: none; font-family: 'Inter', system-ui, sans-serif; font-weight: 600; font-size: 14px; touch-action: manipulation; -webkit-user-select: none; user-select: none; }
        .top-btn.icon-only { width: 40px; min-width: 40px; padding: 0; }
        .top-btn:hover { background-color: ${hoverColor}; }
        .top-btn.active-reading { background-color: ${hoverColor}; }
        .lang-container { position: relative; }
        .btn-lang { gap: 6px; padding: 0 12px; }
        .dropdown { position: absolute; top: 48px; right: 0; background-color: ${menuBg}; border: 1px solid ${borderColor}; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); width: 200px; display: flex; flex-direction: column; overflow: hidden; animation: slideDown 0.2s ease-out; z-index: 200; -webkit-user-select: none; user-select: none; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .menu-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; min-height: 44px; background: transparent; border: none; color: ${textColor}; font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; text-align: left; transition: background 0.15s; touch-action: manipulation; -webkit-user-select: none; user-select: none; }
        .menu-item:hover { background-color: ${hoverColor}; }
        .menu-item.active { font-weight: 800; background-color: ${highlightColor}; color: ${textColor}; }
        .delete-lang { background: transparent; border: none; color: ${dangerColor}; cursor: pointer; opacity: 0.5; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 4px; transition: opacity 0.2s; min-width: 32px; min-height: 32px; }
        .delete-lang:hover { opacity: 1; background-color: rgba(255, 59, 48, 0.1); }
        .add-btn { color: ${textColor}; border-top: 1px solid ${borderColor}; display: flex; align-items: center; gap: 8px; }
        .reading { background-color: ${highlightColor}; border-bottom: 2px solid ${highlightBorder}; border-radius: 4px; transition: background-color 0.2s ease; }
        .submenu-scrollable { max-height: 200px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: ${isDark ? '#4a4a4a transparent' : '#b0b0b0 transparent'}; }
        .submenu-scrollable::-webkit-scrollbar { width: 6px; }
        .submenu-scrollable::-webkit-scrollbar-track { background: transparent; }
        .submenu-scrollable::-webkit-scrollbar-thumb { background-color: ${isDark ? '#4a4a4a' : '#c0c0c0'}; border-radius: 10px; }
        .submenu-scrollable::-webkit-scrollbar-thumb:hover { background-color: ${isDark ? '#666666' : '#999999'}; }
        h1 { color: ${textColor}; font-weight: 800; font-size: 2rem; margin-bottom: 30px; margin-top: 0; text-align: center; cursor: text; -webkit-user-select: text; user-select: text; }
        h2 { margin-top: 35px; font-size: 1.1rem; font-weight: 700; color: ${textColor}; margin-bottom: 10px; cursor: text; -webkit-user-select: text; user-select: text; }
        p { line-height: 1.6; opacity: 0.8; font-size: 15px; margin-bottom: 15px; margin-top: 0; cursor: text; -webkit-user-select: text; user-select: text; }
        .meta { font-size: 0.9rem; opacity: 0.6; margin-bottom: 40px; text-align: center; cursor: text; -webkit-user-select: text; user-select: text; }
        
        /* ESTILOS DEL REPRODUCTOR TTS */
        .tts-player { background: ${menuBg}; border: 1px solid ${borderColor}; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 4px; padding: 6px; animation: slideDown 0.2s ease-out; position: absolute; right: 0; top: 48px; z-index: 200; }
        .tts-btn { background: transparent; border: none; color: ${textColor}; cursor: pointer; padding: 8px; min-width: 36px; min-height: 36px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; touch-action: manipulation; }
        .tts-btn:hover { background: ${hoverColor}; }
        .tts-btn.danger:hover { color: ${dangerColor}; background: rgba(255, 59, 48, 0.1); }

        /* TOAST DE AVISO DE SONIDO BLOQUEADO */
        .sound-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; width: calc(100% - 32px); max-width: 500px; background: ${menuBg}; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); padding: 12px 16px; display: none; align-items: center; justify-content: space-between; gap: 12px; font-size: 13.5px; line-height: 1.4; animation: slideToast 0.3s cubic-bezier(0.16, 1, 0.3, 1); box-sizing: border-box; }
        @keyframes slideToast { from { opacity: 0; transform: translate(-50%, 15px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .sound-toast-content { display: flex; align-items: center; gap: 12px; text-align: left; }
        .sound-toast-close { background: transparent; border: none; color: ${textColor}; opacity: 0.6; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.2s, background 0.2s; touch-action: manipulation; }
        .sound-toast-close:hover { opacity: 1; background: ${hoverColor}; }

        @media (max-width: 600px) { 
          .container { padding: 120px 20px 40px 20px; } 
          h1 { font-size: 1.6rem; } 
          p { font-size: 16px; } 
          .header-bar { top: 12px; left: 12px; right: 12px; }
          .top-btn-row { gap: 8px; }
          .sound-toast { bottom: 16px; width: calc(100% - 24px); padding: 10px 14px; font-size: 13px; }
        }
      </style>
      
      <div class="header-bar">
        <button class="top-btn icon-only" id="back-btn" title="${uiTexts.back}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div class="top-controls-right">
          <div class="top-btn-row">
            <div class="lang-container" id="lang-wrapper">
              <button class="top-btn btn-lang" id="lang-toggle" title="${uiTexts.lang}">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
                ${this.idiomaActivo.toUpperCase()}
              </button>

              ${this.menuIdiomasAbierto ? `
                <div class="dropdown">
                  ${!this.submenuAgregarAbierto ? `
                    ${this.idiomasGuardados.map(code => `
                      <button class="menu-item ${this.idiomaActivo === code ? 'active' : ''}" data-code="${code}">
                        ${code === 'en' ? 'English' : IDIOMAS_DISPONIBLES[code]}
                        ${code !== 'en' ? `<span class="delete-lang" data-code="${code}" title="Eliminar(X)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg></span>` : ''}
                      </button>
                    `).join('')}
                    <button class="menu-item add-btn" id="open-add-menu">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      Add Language
                    </button>
                  ` : `
                    <div class="submenu-scrollable">
                      ${Object.entries(IDIOMAS_DISPONIBLES)
                        .filter(([code]) => !this.idiomasGuardados.includes(code))
                        .map(([code, name]) => `<button class="menu-item add-lang-action" data-code="${code}">${name}</button>`).join('')}
                    </div>
                  `}
                </div>
              ` : ''}
            </div>

            <div style="position: relative;">
              <button class="top-btn icon-only ${this.isReading ? 'active-reading' : ''}" id="audio-toggle" title="${uiTexts.read}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>
              </button>
              
              <div class="tts-player" id="tts-player-box" style="display: ${this.isReading ? 'flex' : 'none'};">
                <button class="tts-btn danger" id="tts-stop" title="${uiTexts.tts_stop}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <div style="width: 2px; height: 16px; background: ${borderColor}; margin: 0 4px; border-radius: 1px;"></div>
                <button class="tts-btn" id="tts-prev" title="${uiTexts.tts_prev}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/></svg>
                </button>
                <button class="tts-btn" id="tts-playpause" title="${uiTexts.tts_pause}">
                  ${this.isPaused 
                    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>` 
                    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>`}
                </button>
                <button class="tts-btn" id="tts-next" title="${uiTexts.tts_next}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
                </button>
              </div>
            </div>

            <button class="top-btn icon-only" id="theme-toggle" title="${uiTexts.theme}">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715"/><path d="M16 12a4 4 0 0 0-4-4"/><path d="m19 5-1.256 1.256"/><path d="M20 12h2"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="container">
        <div style="display: flex; justify-content: center; margin-bottom: 20px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 14px; background: ${isDark ? '#1e293b' : '#f8fafc'}; color: ${isDark ? '#f8fafc' : '#0f172a'}; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
        </div>
        <h1>${termsData[this.idiomaActivo]?.content.title || termsData["en"].content.title}</h1>
        <p class="meta">${termsData[this.idiomaActivo]?.lastUpdatedText || termsData["en"].lastUpdatedText}: ${termsData[this.idiomaActivo]?.lastUpdated || termsData["en"].lastUpdated}</p>
        ${(termsData[this.idiomaActivo]?.content.sections || termsData["en"].content.sections).map(sec => `
          <h2>${sec.title}</h2>
          <p>${sec.body}</p>
        `).join('')}
      </div>

      <div class="sound-toast" id="sound-toast">
        <div class="sound-toast-content">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span id="sound-toast-text">${SOUND_BLOCKED_MESSAGES[this.idiomaActivo] || SOUND_BLOCKED_MESSAGES["en"]}</span>
        </div>
        <button class="sound-toast-close" id="sound-toast-close" title="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    this.shadowRoot.getElementById('sound-toast-close').onclick = () => this.hideSoundBlockedAlert();
    this.shadowRoot.getElementById('theme-toggle').onclick = () => this.toggleTheme();
    this.shadowRoot.getElementById('back-btn').onclick = () => this.goBack();
    this.shadowRoot.getElementById('audio-toggle').onclick = () => this.toggleAudio();
    this.shadowRoot.getElementById('lang-toggle').onclick = (e) => { e.stopPropagation(); this.toggleMenuIdiomas(); };

    const stopBtn = this.shadowRoot.getElementById('tts-stop');
    if (stopBtn) stopBtn.onclick = () => this.stopReading();
    const prevBtn = this.shadowRoot.getElementById('tts-prev');
    if (prevBtn) prevBtn.onclick = () => this.prevReading();
    const nextBtn = this.shadowRoot.getElementById('tts-next');
    if (nextBtn) nextBtn.onclick = () => this.nextReading();
    const ppBtn = this.shadowRoot.getElementById('tts-playpause');
    if (ppBtn) ppBtn.onclick = () => this.pauseResumeReading();

    if (this.menuIdiomasAbierto) {
      if (!this.submenuAgregarAbierto) {
        this.shadowRoot.querySelectorAll('.menu-item[data-code]').forEach(btn => {
          btn.onclick = () => this.cambiarIdioma(btn.getAttribute('data-code'));
        });
        this.shadowRoot.querySelectorAll('.delete-lang').forEach(btn => {
          btn.onclick = (e) => this.borrarIdioma(e, btn.getAttribute('data-code'));
        });
        const addBtn = this.shadowRoot.getElementById('open-add-menu');
        if (addBtn) addBtn.onclick = (e) => this.abrirSubmenuAgregar(e);
      } else {
        this.shadowRoot.querySelectorAll('.add-lang-action').forEach(btn => {
          btn.onclick = (e) => { e.stopPropagation(); this.agregarIdioma(btn.getAttribute('data-code')); };
        });
      }
    }

    const closeListener = (e) => {
      const wrapper = this.shadowRoot.getElementById('lang-wrapper');
      if (this.menuIdiomasAbierto && wrapper && !e.composedPath().includes(wrapper)) {
        this.cerrarMenus();
      }
    };
    if (this._closeListener) {
      window.removeEventListener('click', this._closeListener);
    }
    this._closeListener = closeListener;
    window.addEventListener('click', this._closeListener);
  }
}

customElements.define('merge-terms', MergeTerms);
