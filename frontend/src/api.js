/**
 * ============================================================================
 * KNOWLEDGE SYSTEMS — BACKEND CLIENT
 * ============================================================================
 *
 * The single place the UI talks to the FastAPI service in /backend.
 *
 *   GET  /health             -> { status, message? }
 *   POST /chat               -> { reply }           body: { message }
 *   POST /documents/upload   -> { filename, extracted_text }  multipart: file
 *
 * Relative by default: the Vite dev server proxies /api to the backend (see
 * vite.config.js), so the browser only ever talks to its own origin. Point
 * VITE_API_URL at a backend with CORS configured for this origin to skip the proxy.
 */

import axios from "axios";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  "",
);

const HEALTH_TIMEOUT_MS = 5000;
const CHAT_TIMEOUT_MS = 120000;
const UPLOAD_TIMEOUT_MS = 180000;

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: HEALTH_TIMEOUT_MS,
});

/**
 * Turn any thrown request error into a sentence a person can act on.
 * FastAPI errors put the reason in `detail` (a string for HTTPException,
 * an array of validation problems otherwise).
 */
export function describeError(error, fallback = "Unknown connection error") {
  if (axios.isCancel(error) || error?.code === "ERR_CANCELED") {
    return "Request cancelled.";
  }
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return (
      detail
        .map((item) => item?.msg)
        .filter(Boolean)
        .join("; ") || fallback
    );
  }
  if (detail) return JSON.stringify(detail);
  if (error?.code === "ECONNABORTED")
    return "The backend took too long to respond.";
  if (!error?.response && error?.message) return error.message;
  return fallback;
}

export async function checkHealth() {
  const response = await client.get("/health", { timeout: HEALTH_TIMEOUT_MS });
  return response.data;
}

/**
 * Ask the assistant a question. The backend answers in one piece, and the UI
 * reveals the reply as it would arrive as a stream.
 *
 * `signal` is an AbortSignal so the Stop button can actually hang up.
 */
export async function sendChatMessage(message, { signal } = {}) {
  const response = await client.post(
    "/chat",
    { message },
    { signal, timeout: CHAT_TIMEOUT_MS },
  );
  const reply = response.data?.reply;
  if (!reply || !String(reply).trim()) {
    throw new Error("The backend returned an empty response.");
  }
  return String(reply);
}

/**
 * Upload one document and get its extracted text back.
 *
 * The extracted text is everything the backend currently does with a document,
 * so the UI keeps it and sends it along with the next question.
 */
export async function uploadDocument(file, { signal, onProgress } = {}) {
  const form = new FormData();
  // The backend reads file.filename to pick the extractor; keep the real name.
  form.append("file", file, file.name);

  const response = await client.post("/documents/upload", form, {
    signal,
    timeout: UPLOAD_TIMEOUT_MS,
    // Let the browser set the multipart boundary; do not set a Content-Type.
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      // Browser progress events carry the total, so this is a true fraction.
      if (onProgress && event.total) onProgress(event.loaded / event.total);
    },
  });

  const text = response.data?.extracted_text;
  if (typeof text !== "string") {
    throw new Error("The backend returned no extracted text.");
  }
  return {
    filename: response.data?.filename || file.name,
    text,
    chars: text.length,
    pages: countPages(text),
  };
}

function countPages(text) {
  // pypdf joins pages with "\n"; an empty document still counts as one page.
  const formFeedPages = text.split("\f").length - 1;
  if (formFeedPages > 0) return formFeedPages;
  return text.trim() ? 1 : 0;
}
