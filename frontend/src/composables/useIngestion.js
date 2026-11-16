/**
 * ============================================================================
 * KNOWLEDGE SYSTEMS — INGESTION PIPELINE (useIngestion)
 * ============================================================================
 *
 * Runs files through the backend's extraction endpoint, one at a time:
 *
 *   QUEUED -> UPLOADING (real % from the request) -> EXTRACTING -> READY
 *
 * The backend currently accepts PDFs only (pypdf); the client refuses other
 * types before spending a request on them. Each completed document carries its
 * extracted text, which is what later gets folded into the next question.
 *
 * A failure holds everything until the error is dismissed, then the queue
 * carries on. No DOM access inside this composable.
 */

import { ref, readonly, onBeforeUnmount } from "vue";
import { uploadDocument, describeError } from "../api.js";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTENSIONS = ["pdf"];

export function useIngestion() {
  const isIngesting = ref(false);
  const queue = ref([]);
  const activeItem = ref(null);
  const stage = ref("IDLE"); // 'UPLOADING' | 'EXTRACTING' | 'READY' | 'ERROR'
  const progress = ref(0); // 0 to 1
  const errorMessage = ref(null);

  let activeRequest = null;
  let onDocReadyCallback = null;

  function setOnReady(cb) {
    onDocReadyCallback = cb;
  }

  /**
   * Queue a list of File objects from the picker or a drop. Files are validated
   * before queueing, so a bad drop never reaches the network.
   */
  function ingestFiles(files) {
    if (!files || files.length === 0) return;

    const rejected = [];
    Array.from(files).forEach((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      const problem = validate(file, ext);
      if (problem) {
        rejected.push(problem);
        return;
      }
      queue.value.push({
        file,
        name: file.name,
        ext,
        size: file.size,
        id: `DOC_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      });
    });

    if (rejected.length) {
      errorMessage.value = rejected.join("\n");
      stage.value = "ERROR";
      return;
    }

    if (!isIngesting.value && !errorMessage.value) processNext();
  }

  function validate(file, ext) {
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `UNSUPPORTED TYPE: ${file.name} · BACKEND ACCEPTS ${ALLOWED_EXTENSIONS.map((e) => e.toUpperCase()).join(", ")}`;
    }
    if (file.size === 0) {
      return `EMPTY FILE: ${file.name} · 0 BYTES RECEIVED`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `PAYLOAD EXCEEDED: ${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)}MB > 25MB LIMIT`;
    }
    return null;
  }

  async function processNext() {
    if (queue.value.length === 0) {
      isIngesting.value = false;
      activeItem.value = null;
      stage.value = "IDLE";
      progress.value = 0;
      return;
    }

    const item = queue.value.shift();
    activeItem.value = item;
    isIngesting.value = true;
    errorMessage.value = null;
    stage.value = "UPLOADING";
    progress.value = 0;

    activeRequest = new AbortController();

    try {
      const result = await uploadDocument(item.file, {
        signal: activeRequest.signal,
        onProgress: (fraction) => {
          progress.value = fraction;
          // The bytes are delivered; extraction now happens on the server.
          if (fraction >= 1 && stage.value === "UPLOADING") {
            stage.value = "EXTRACTING";
          }
        },
      });

      stage.value = "READY";
      progress.value = 1;

      if (onDocReadyCallback) {
        onDocReadyCallback({
          id: item.id,
          filename: result.filename,
          text: result.text,
          type: "PDF",
          chars: result.chars,
          pages: result.pages,
          size: item.size,
          date: new Date().toISOString(),
          status: "READY",
        });
      }

      // Let the READY state be seen before the card makes way for the next file.
      setTimeout(processNext, 650);
    } catch (error) {
      if (error?.code === "ERR_CANCELED") return;
      stage.value = "ERROR";
      errorMessage.value = describeError(error, `UPLOAD FAILED: ${item.name}`);
    } finally {
      activeRequest = null;
    }
  }

  function dismissError() {
    errorMessage.value = null;
    stage.value = "IDLE";
    if (!queue.value.length) isIngesting.value = false;
    processNext();
  }

  /** Abandon an in-flight upload and empty the queue. */
  function cancel() {
    activeRequest?.abort();
    activeRequest = null;
    queue.value = [];
    activeItem.value = null;
    isIngesting.value = false;
    stage.value = "IDLE";
    progress.value = 0;
  }

  onBeforeUnmount(cancel);

  return {
    isIngesting: readonly(isIngesting),
    queue: readonly(queue),
    activeItem: readonly(activeItem),
    stage: readonly(stage),
    progress: readonly(progress),
    errorMessage: readonly(errorMessage),
    ingestFiles,
    dismissError,
    cancel,
    setOnReady,
  };
}
