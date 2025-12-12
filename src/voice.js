import Voice from "@react-native-voice/voice";
import { NativeModules, NativeEventEmitter, Platform } from "react-native";
import { solicitarPermissaoMicrofone } from "./permissions";
import { ALIAS_VOZ } from "./constants";

let ouvindo = false;
let melhorTexto = "";
let assinaturas = [];

// ------------------ UTILIDADES ------------------

function garantirModuloNativo() {
  if (!NativeModules?.Voice) {
    throw new Error(
      "@react-native-voice/voice não disponível. Execute o app no Dev Client ou em um APK real."
    );
  }
}

function adicionarAssinaturas(handlers) {
  const emitter = new NativeEventEmitter(NativeModules.Voice);
  const subs = [];
  if (handlers.parcial)
    subs.push(emitter.addListener("onSpeechPartialResults", handlers.parcial));
  if (handlers.resultado)
    subs.push(emitter.addListener("onSpeechResults", handlers.resultado));
  if (handlers.erro)
    subs.push(emitter.addListener("onSpeechError", handlers.erro));
  if (handlers.fim)
    subs.push(emitter.addListener("onSpeechEnd", handlers.fim));
  assinaturas = subs;
}

function limparAssinaturas() {
  assinaturas.forEach((s) => {
    try {
      s?.remove?.();
    } catch (e) {}
  });
  assinaturas = [];
}

async function pararEDestruir() {
  try {
    await Voice.stop();
  } catch {}
  try {
    await Voice.destroy();
  } catch {}
  try {
    Voice.removeAllListeners?.();
  } catch {}
}

function normalizar(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ------------------ INTERPRETAÇÃO ------------------

export function interpretarIntencao(texto) {
  const t = normalizar(texto);
  const tem = (arr) => arr.some((a) => t.includes(normalizar(a)));
  if (tem(ALIAS_VOZ.superior)) return "superior";
  if (tem(ALIAS_VOZ.inferior)) return "inferior";
  if (tem(ALIAS_VOZ.calcado)) return "calcado";
  return null;
}

// ------------------ API PRESS-AND-HOLD ------------------

export async function iniciarSegurarFala(onAtualizar, { idioma = "pt-BR" } = {}) {
  if (ouvindo) return;
  await solicitarPermissaoMicrofone();
  garantirModuloNativo();

  melhorTexto = "";
  await pararEDestruir();

  adicionarAssinaturas({
    parcial: (e) => {
      const v = e?.value?.[0] || "";
      if (v) {
        melhorTexto = v;
        onAtualizar?.(v);
      }
    },
    resultado: (e) => {
      const v = e?.value?.[0] || "";
      if (v) {
        melhorTexto = v;
        onAtualizar?.(v);
      }
    },
    erro: (e) => {
      console.warn("Erro no reconhecimento de voz:", e);
    },
    fim: () => {
      // Opcional: pode ser usado se quiser detectar fim automático
    },
  });

  ouvindo = true;

  const options = {
    EXTRA_PARTIAL_RESULTS: true,
    EXTRA_PREFER_OFFLINE: true,
  };

  // No Android, usamos o motor "google"
  if (Platform.OS === "android") {
    options.RECOGNIZER_ENGINE = "google";
  }

  await Voice.start(idioma, options);
}

export async function pararSegurarFala() {
  if (!ouvindo) return "";
  ouvindo = false;

  try {
    await Voice.stop();
  } catch (e) {
    console.warn("Erro ao parar Voice:", e);
  }

  const texto = melhorTexto || "";
  await pararEDestruir();
  limparAssinaturas();
  return texto.trim();
}

export function estaOuvindo() {
  return ouvindo;
}