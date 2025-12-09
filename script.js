// script.js
// App Scrivi & Ascolta - disegno, OCR con Tesseract, TTS italiana

const canvas = document.getElementById("handwritingCanvas");
const statusEl = document.getElementById("status");
const recognisedTextArea = document.getElementById("recognizedText");
const clearCanvasBtn = document.getElementById("clearCanvasBtn");
const clearTextBtn = document.getElementById("clearTextBtn");
const recogniseBtn = document.getElementById("recogniseBtn");
const readAloudBtn = document.getElementById("readAloudBtn");
const fontSizeRange = document.getElementById("fontSizeRange");
const fontSizeValue = document.getElementById("fontSizeValue");

console.log("Canvas trovato?", canvas);

let ctx;
let drawing = false;
let lastX = 0;
let lastY = 0;

// ---------------------------
// Inizializzazione canvas
// ---------------------------

function initCanvas() {
  const rect = canvas.getBoundingClientRect();
  // usiamo stesse dimensioni visuali anche internamente (come nel test.html che funziona)
  canvas.width = rect.width;
  canvas.height = rect.height;

  ctx = canvas.getContext("2d");
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000000";

  clearCanvas();
}

function clearCanvas() {
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, rect.width, rect.height);
  setStatus("Pronto");
}

function setStatus(text) {
  statusEl.textContent = text;
}

function getCanvasCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

// ---------------------------
// Eventi mouse (PC)
// ---------------------------

canvas.addEventListener("mousedown", (e) => {
  e.preventDefault();
  drawing = true;
  const { x, y } = getCanvasCoords(e.clientX, e.clientY);
  lastX = x;
  lastY = y;
  setStatus("Sto disegnando…");
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  e.preventDefault();
  const { x, y } = getCanvasCoords(e.clientX, e.clientY);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastX = x;
  lastY = y;
});

window.addEventListener("mouseup", () => {
  if (drawing) {
    drawing = false;
    setStatus("Pronto");
  }
});

// ---------------------------
// Eventi touch (tablet future)
// ---------------------------

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      drawing = true;
      const t = e.touches[0];
      const { x, y } = getCanvasCoords(t.clientX, t.clientY);
      lastX = x;
      lastY = y;
      setStatus("Sto disegnando…");
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    if (!drawing || e.touches.length === 0) return;
    e.preventDefault();
    const t = e.touches[0];
    const { x, y } = getCanvasCoords(t.clientX, t.clientY);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  },
  { passive: false }
);

canvas.addEventListener(
  "touchend",
  (e) => {
    e.preventDefault();
    drawing = false;
    setStatus("Pronto");
  },
  { passive: false }
);

// ---------------------------
// Riconoscimento (OCR Tesseract)
// ---------------------------

async function recogniseHandwriting() {
  if (typeof Tesseract === "undefined") {
    alert("Libreria Tesseract.js non caricata (controlla la connessione Internet).");
    return;
  }

  setStatus("Riconoscimento in corso… (può richiedere alcuni secondi)");

  try {
    const dataUrl = canvas.toDataURL("image/png");

    const result = await Tesseract.recognize(dataUrl, "ita", {
      logger: (m) => console.log(m)
    });

    let text = result.data.text || "";

    text = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();

    text = autoCorrectText(text);

    recognisedTextArea.value = text;
    setStatus("Riconoscimento completato");
  } catch (err) {
    console.error(err);
    setStatus("Errore nel riconoscimento");
    alert("Si è verificato un errore nel riconoscimento della scrittura.");
  }
}

// Autocorrezione semplice
function autoCorrectText(text) {
  const corrections = {
    "0ui": "qui",
    "perche": "perché",
    "pero": "però",
    "ancnra": "ancora",
    "buongiorrno": "buongiorno"
    // aggiungi qui altre coppie "sbagliato": "giusto"
  };

  let corrected = text;

  for (const wrong in corrections) {
    const right = corrections[wrong];
    const regex = new RegExp("\\b" + wrong + "\\b", "gi");
    corrected = corrected.replace(regex, right);
  }

  if (corrected.length > 0) {
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  }

  return corrected;
}

// ---------------------------
// TTS: lettura ad alta voce
// ---------------------------

let italianFemaleVoice = null;

function loadVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;

  italianFemaleVoice =
    voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("it") &&
        /female|femminile|woman/i.test(v.name)
    ) ||
    voices.find((v) => v.lang.toLowerCase().startsWith("it")) ||
    null;
}

if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
} else {
  alert("Sintesi vocale non supportata in questo browser.");
}

function readTextAloud() {
  const text = recognisedTextArea.value.trim();
  if (!text) {
    alert("Non c'è testo da leggere.");
    return;
  }

  if (!("speechSynthesis" in window)) {
    alert("Sintesi vocale non supportata in questo browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  utterance.rate = 1;
  utterance.pitch = 1.0;

  if (italianFemaleVoice) {
    utterance.voice = italianFemaleVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// ---------------------------
// Controlli UI
// ---------------------------

clearCanvasBtn.addEventListener("click", clearCanvas);

clearTextBtn.addEventListener("click", () => {
  recognisedTextArea.value = "";
  setStatus("Testo cancellato");
});

recogniseBtn.addEventListener("click", recogniseHandwriting);

readAloudBtn.addEventListener("click", readTextAloud);

fontSizeRange.addEventListener("input", () => {
  const size = fontSizeRange.value;
  recognisedTextArea.style.fontSize = size + "px";
  fontSizeValue.textContent = size + " px";
});

// ---------------------------
// Avvio
// ---------------------------

window.addEventListener("load", () => {
  initCanvas();
});

window.addEventListener("resize", () => {
  initCanvas();
});
