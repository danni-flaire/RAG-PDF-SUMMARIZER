<template>
  <footer class="command-bar-wrapper" role="contentinfo" ref="wrapperRef">
    <div class="command-bar" ref="commandBarRef">
      <!-- Mode Selection Radiogroup (§ 05.5) -->
      <div
        class="mode-selector font-mono"
        role="radiogroup"
        aria-label="Generation Mode"
        ref="modeSelectorRef"
        @keydown="handleModeKeydown"
      >
        <!-- Sliding selection block (Flip/Detent) -->
        <div
          class="mode-sliding-block"
          ref="slidingBlockRef"
          aria-hidden="true"
        ></div>

        <button
          type="button"
          class="mode-option"
          :class="{ 'is-selected': mode === 'SYNTHESIS' }"
          role="radio"
          :aria-checked="mode === 'SYNTHESIS'"
          tabindex="0"
          ref="synthesisBtnRef"
          @click="selectMode('SYNTHESIS')"
        >
          SYNTHESIS
        </button>

        <button
          type="button"
          class="mode-option"
          :class="{ 'is-selected': mode === 'DIRECT' }"
          role="radio"
          :aria-checked="mode === 'DIRECT'"
          tabindex="-1"
          ref="directBtnRef"
          @click="selectMode('DIRECT')"
        >
          DIRECT
        </button>
      </div>

      <!-- Auto-expanding input area -->
      <form class="input-form" @submit.prevent="handleSubmit">
        <label for="command-input" class="sr-only"
          >Research query or instrument instruction</label
        >
        <textarea
          id="command-input"
          ref="textareaRef"
          v-model="inputText"
          class="command-textarea"
          rows="1"
          placeholder="Pose a measurement or research query..."
          :disabled="isStreaming"
          @keydown="handleTextareaKeydown"
          @input="handleInput"
        ></textarea>

        <!-- Submit Button -->
        <button
          type="submit"
          class="submit-btn"
          :disabled="isSubmitDisabled"
          aria-label="Submit measurement"
          ref="submitBtnRef"
        >
          <CornerDownLeft
            class="submit-icon"
            ref="submitIconRef"
            :size="16"
            :stroke-width="1.5"
            absolute-stroke-width
            aria-hidden="true"
          />
        </button>
      </form>

      <!-- Keyboard hint adapting to platform (§ 05.5) -->
      <div class="command-hint font-mono" aria-hidden="true">
        <span>{{
          isMac
            ? "↵ SEND · ⇧↵ NEWLINE · ⌘K FOCUS"
            : "↵ SEND · ⇧↵ NEWLINE · CTRL+K FOCUS"
        }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { CornerDownLeft } from "lucide-vue-next";
import { gsap, Flip, detent, ctxFor } from "../motion.js";

const props = defineProps({
  mode: {
    type: String,
    default: "SYNTHESIS",
  },
  isStreaming: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["submit", "update:mode"]);

const inputText = ref("");
const isMac = ref(true);

const wrapperRef = ref(null);
const commandBarRef = ref(null);
const modeSelectorRef = ref(null);
const slidingBlockRef = ref(null);
const synthesisBtnRef = ref(null);
const directBtnRef = ref(null);
const textareaRef = ref(null);
const submitBtnRef = ref(null);
const submitIconRef = ref(null);

let ctx = null;

const isSubmitDisabled = computed(() => {
  return props.isStreaming || inputText.value.trim().length === 0;
});

function handleInput() {
  adjustTextareaHeight();
}

/**
 * Height eases to measured scrollHeight with overwrite to prevent queued tweens
 */
function adjustTextareaHeight() {
  const el = textareaRef.value;
  if (!el) return;

  el.style.height = "auto";
  const newHeight = Math.min(el.scrollHeight, 180);
  el.style.height = `${newHeight}px`;
}

function selectMode(newMode) {
  if (props.mode === newMode) return;

  const targetBtn =
    newMode === "SYNTHESIS" ? synthesisBtnRef.value : directBtnRef.value;
  const currentBtn =
    props.mode === "SYNTHESIS" ? synthesisBtnRef.value : directBtnRef.value;

  if (slidingBlockRef.value && targetBtn && currentBtn) {
    const state = Flip.getState(slidingBlockRef.value);
    slidingBlockRef.value.style.width = `${targetBtn.offsetWidth}px`;
    slidingBlockRef.value.style.left = `${targetBtn.offsetLeft}px`;

    Flip.from(state, {
      duration: 0.22,
      ease: "detent",
    });
  }

  emit("update:mode", newMode);
}

function handleModeKeydown(e) {
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    selectMode("DIRECT");
    directBtnRef.value?.focus();
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    selectMode("SYNTHESIS");
    synthesisBtnRef.value?.focus();
  }
}

function handleTextareaKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
}

function handleSubmit() {
  if (isSubmitDisabled.value) return;

  const text = inputText.value.trim();
  if (!text) return;

  // Capture source bounding rectangle for query lift animation (§ 06.4 Signature 2)
  let sourceRect = null;
  if (textareaRef.value) {
    sourceRect = textareaRef.value.getBoundingClientRect();
  }

  emit("submit", {
    text,
    mode: props.mode,
    sourceRect,
  });

  inputText.value = "";
  nextTick(() => {
    adjustTextareaHeight();
  });
}

function focusInput() {
  if (textareaRef.value) {
    textareaRef.value.focus();
  }
}

defineExpose({
  focusInput,
  commandBarRef,
  textareaRef,
});

onMounted(() => {
  if (typeof navigator !== "undefined") {
    isMac.value = /Mac|iPod|iPhone|iPad/.test(
      navigator.platform || navigator.userAgent,
    );
  }

  ctx = ctxFor(commandBarRef.value, () => {
    // Initial position of mode sliding block
    nextTick(() => {
      const activeBtn =
        props.mode === "SYNTHESIS" ? synthesisBtnRef.value : directBtnRef.value;
      if (slidingBlockRef.value && activeBtn) {
        slidingBlockRef.value.style.width = `${activeBtn.offsetWidth}px`;
        slidingBlockRef.value.style.left = `${activeBtn.offsetLeft}px`;
      }
    });

    // Subtle nudge of submit icon on hover
    if (submitBtnRef.value && submitIconRef.value) {
      const iconEl = submitIconRef.value.$el || submitIconRef.value;
      const nudgeX = gsap.quickTo(iconEl, "x", {
        duration: 0.16,
        ease: "detent",
      });

      submitBtnRef.value.addEventListener("mouseenter", () => {
        nudgeX(2);
      });
      submitBtnRef.value.addEventListener("mouseleave", () => {
        nudgeX(0);
      });
    }
  });
});

onBeforeUnmount(() => {
  if (ctx) ctx.revert();
});
</script>

<style scoped>
.command-bar-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0 var(--space-4) var(--space-4) var(--space-4);
  background-color: var(--surface-1);
  position: relative;
  z-index: 40;
  flex-shrink: 0;
}

.command-bar {
  width: 100%;
  max-width: var(--stream-max-width);
  background-color: var(--surface-2);
  display: flex;
  flex-direction: column;
  padding: var(--space-2) var(--space-3);
  position: relative;
}

/* Mode Selector Radiogroup */
.mode-selector {
  display: inline-flex;
  position: relative;
  background-color: var(--surface-3);
  padding: 2px;
  align-self: flex-start;
  margin-bottom: var(--space-2);
}

.mode-sliding-block {
  position: absolute;
  top: 2px;
  bottom: 2px;
  background-color: var(--surface-1);
  z-index: 1;
  pointer-events: none;
}

.mode-option {
  position: relative;
  z-index: 2;
  padding: 3px 10px;
  font-size: var(--type-11);
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--ink-3);
  transition: color 120ms var(--ease-precision);
  background: transparent;
}

.mode-option.is-selected {
  color: var(--ink-1);
  font-weight: 600;
}

/* Input Form */
.input-form {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  width: 100%;
}

.command-textarea {
  flex: 1;
  background-color: transparent;
  color: var(--ink-1);
  font-family: var(--font-primary);
  font-size: var(--type-14);
  line-height: 1.5;
  resize: none;
  min-height: 24px;
  max-height: 180px;
  padding: 4px 0;
}

.command-textarea::placeholder {
  color: var(--ink-3);
}

.submit-btn {
  width: 32px;
  height: 32px;
  background-color: var(--surface-3);
  color: var(--ink-1);
  flex-shrink: 0;
  transition:
    background-color 120ms var(--ease-precision),
    transform 80ms var(--ease-detent);
}

.submit-btn:hover:not(:disabled) {
  background-color: var(--surface-highlight);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.submit-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.submit-icon {
  display: block;
}

/* Keyboard hint */
.command-hint {
  margin-top: var(--space-2);
  font-size: 10px;
  color: var(--ink-3);
  letter-spacing: 0.05em;
  display: flex;
  justify-content: space-between;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

/* Mobile Layout (<640px) */
@media (max-width: 640px) {
  .command-bar-wrapper {
    padding: 0 var(--space-2)
      calc(var(--space-2) + env(safe-area-inset-bottom, 0px)) var(--space-2);
  }

  .command-hint {
    display: none;
  }

  .submit-btn {
    width: 44px;
    height: 44px;
  }
}
</style>
