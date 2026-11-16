/**
 * ============================================================================
 * KNOWLEDGE SYSTEMS — STREAM ENGINE (useStreamEngine)
 * ============================================================================
 *
 * The backend answers POST /chat in one piece; this reveals that reply at a
 * reading cadence so it arrives the way a person reads it: 25–60 characters a
 * second, with longer dwells after sentence and paragraph breaks.
 *
 * The caller owns the request. A completion or failure decides when a reveal
 * starts — via startStream(blocks, { done, failed }), because the reply may land
 * before the reveal is asked for. cancelStream() stops revealing, never the
 * underlying network request.
 *
 * On any edit (revealed text, interrupted, announcement) it calls the `onChange`
 * callback registered by the caller, so state is pulled, not deep-watched.
 *
 * No DOM access inside this composable.
 */

import { ref, readonly, onBeforeUnmount } from "vue";
import { reveal, blockCharCount } from "../replyRenderer.js";

const CHARS_PER_TICK = 3;
const TICK_MS = 38;

export function useStreamEngine({ onChange } = {}) {
  const isStreaming = ref(false);
  const isInterrupted = ref(false);
  const streamProgress = ref(0); // 0 to 1
  const liveAnnouncement = ref("");

  let timerId = null;
  let stop = null;
  let onCancelCallback = null;

  function notify() {
    if (onChange) onChange();
  }

  /**
   * Reveal `blocks` (already parsed). Returns false if a reveal is already
   * running — the caller decides what that means for the pending reply.
   */
  function startStream(blocks, callbacks = {}) {
    if (isStreaming.value) return false;

    clearTimers();
    stop = null;
    onCancelCallback = callbacks.onCancel;
    isInterrupted.value = false;

    const total = blockCharCount(blocks);

    if (!total) {
      isStreaming.value = false;
      streamProgress.value = 1;
      if (callbacks.onComplete) callbacks.onComplete();
      return true;
    }

    let shown = 0;
    isStreaming.value = true;
    streamProgress.value = 0;
    liveAnnouncement.value = "Response streaming.";

    function step() {
      if (!isStreaming.value) return;

      const before = shown;
      shown = Math.min(total, shown + CHARS_PER_TICK);
      streamProgress.value = shown / total;
      stop = reveal(blocks, shown);
      notify();

      if (shown >= total) {
        isStreaming.value = false;
        streamProgress.value = 1;
        liveAnnouncement.value = "Response complete.";
        notify();
        if (callbacks.onComplete) callbacks.onComplete();
        return;
      }

      // Dwell on the character we just landed on: a sentence end, a comma,
      // or a paragraph break (the latter two are "\n" in this block model).
      const tail = lastSlice(blocks, before, shown);
      let pause = TICK_MS;
      if (/[.!?]/.test(tail)) pause = 110 + Math.random() * 45;
      else if (/[,;:\n]/.test(tail)) pause = 55 + Math.random() * 30;

      timerId = setTimeout(step, pause);
    }

    timerId = setTimeout(step, 40);
    return true;
  }

  /**
   * The current prefix of the reply, for the UI to render.
   * Null when nothing has been revealed yet.
   */
  function getBlocks() {
    return stop;
  }

  /** Stop revealing and keep the partial text, marked as interrupted. */
  function cancelStream() {
    if (!isStreaming.value) return false;

    clearTimers();
    isStreaming.value = false;
    isInterrupted.value = true;
    liveAnnouncement.value = "Response interrupted by user.";

    if (onCancelCallback) onCancelCallback();
    notify();
    return true;
  }

  function clearTimers() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  onBeforeUnmount(clearTimers);

  return {
    isStreaming: readonly(isStreaming),
    isInterrupted: readonly(isInterrupted),
    streamProgress: readonly(streamProgress),
    liveAnnouncement: readonly(liveAnnouncement),
    startStream,
    cancelStream,
    getBlocks,
    clearTimers,
  };
}

/**
 * Text between two character offsets, so the pause logic can look at the
 * character just revealed without re-walking all the blocks.
 */
function lastSlice(blocks, from, to) {
  let offset = 0;
  let tail = "";
  for (const block of blocks) {
    const text =
      block.type === "paragraph"
        ? block.segments.map((seg) => seg.value).join("")
        : block.text;
    const end = offset + text.length;
    if (end > from) {
      tail = text.slice(
        Math.max(0, from - offset),
        Math.min(text.length, to - offset),
      );
      if (offset + text.length >= to) break;
    }
    offset = end;
  }
  return tail;
}
