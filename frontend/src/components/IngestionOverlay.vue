<template>
  <div
    class="ingestion-overlay"
    :class="{ 'is-active': isIngesting || isDragging || errorMessage }"
    role="dialog"
    aria-modal="true"
    aria-label="Document Ingestion Instrument"
    ref="overlayRef"
  >
    <div class="ingestion-modal font-mono" ref="modalRef">
      <!-- Error Display (§ 05.2) -->
      <template v-if="errorMessage">
        <div class="modal-icon error-icon" ref="iconRef">
          <FileX
            :size="48"
            :stroke-width="1.25"
            absolute-stroke-width
            aria-hidden="true"
          />
        </div>

        <div class="error-details">
          <span class="error-badge">INGESTION REJECTED</span>
          <p class="error-msg" ref="errorMsgRef">{{ errorMessage }}</p>
        </div>

        <button
          type="button"
          class="dismiss-btn font-mono"
          ref="dismissBtnRef"
          @click="$emit('dismiss-error')"
        >
          [DISMISS // ENTER OR ESC]
        </button>
      </template>

      <!-- Active Ingestion Pipeline (§ 05.2 & § 06.4 Signature 7) -->
      <template v-else-if="isIngesting">
        <div class="modal-icon active-icon" ref="iconRef">
          <FilePlus
            :size="48"
            :stroke-width="1.25"
            absolute-stroke-width
            aria-hidden="true"
          />
        </div>

        <div class="pipeline-details">
          <!-- Filename resolving with scramble -->
          <div class="filename-row">
            <span class="filename-text" ref="filenameRef">{{
              activeFilename
            }}</span>
          </div>

          <!-- Vertical mask stage indicator -->
          <div class="stage-mask-container">
            <span class="stage-text" ref="stageRef">{{ stageLabel }}</span>
          </div>

          <!-- Odometer Chunk Counter (§ 06.4 Signature 7) -->
          <div
            class="odometer-row"
            v-if="
              stage === 'CHUNKING' ||
              stage === 'INDEXING' ||
              stage === 'INDEXED'
            "
          >
            <span class="odometer-label">CHUNKS:</span>
            <span class="odometer-value">{{ progressChunks }}</span>
            <span class="odometer-target">/ {{ targetChunks }}</span>
          </div>

          <!-- Queue count badge if multiple files dropped -->
          <div v-if="queueCount > 0" class="queue-indicator">
            <span
              >QUEUED: {{ queueCount }} ADDITIONAL FILE{{
                queueCount > 1 ? "S" : ""
              }}</span
            >
          </div>
        </div>
      </template>

      <!-- Dragging Surface Cue -->
      <template v-else-if="isDragging">
        <div class="modal-icon drag-icon">
          <FilePlus
            :size="48"
            :stroke-width="1.25"
            absolute-stroke-width
            aria-hidden="true"
          />
        </div>
        <div class="drag-cue">
          <span class="drag-primary">RELEASE TO INGEST PRIMARY SOURCE</span>
          <span class="drag-sub">ACCEPTS .PDF · .TXT · .MD (MAX 25MB)</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { FilePlus, FileX } from "lucide-vue-next";
import { gsap, resolveText, detent, ctxFor, DURATIONS } from "../motion.js";

const props = defineProps({
  isDragging: {
    type: Boolean,
    default: false,
  },
  isIngesting: {
    type: Boolean,
    default: false,
  },
  stage: {
    type: String,
    default: "IDLE",
  },
  activeItem: {
    type: Object,
    default: null,
  },
  progressChunks: {
    type: Number,
    default: 0,
  },
  targetChunks: {
    type: Number,
    default: 0,
  },
  queueCount: {
    type: Number,
    default: 0,
  },
  errorMessage: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["dismiss-error"]);

const overlayRef = ref(null);
const modalRef = ref(null);
const iconRef = ref(null);
const filenameRef = ref(null);
const stageRef = ref(null);
const dismissBtnRef = ref(null);

let ctx = null;

const activeFilename = computed(() => {
  return props.activeItem?.name || "PRIMARY_DOCUMENT.PDF";
});

const stageLabel = computed(() => {
  switch (props.stage) {
    case "RECEIVED":
      return "DOCUMENT RECEIVED";
    case "PARSING":
      return "PARSING STRUCTURAL AST...";
    case "CHUNKING":
      return "SEMANTIC BOUNDARY CHUNKING...";
    case "INDEXING":
      return "COMPUTING VECTOR & BM25 INDICES...";
    case "INDEXED":
      return `INDEXED · ${props.targetChunks} CHUNKS`;
    default:
      return "INITIALIZING...";
  }
});

// Watch stage transitions and animate vertical stage mask (§ 06.4 Signature 7)
watch(
  () => props.stage,
  (newStage) => {
    if (stageRef.value && newStage !== "IDLE") {
      gsap.fromTo(
        stageRef.value,
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.18, ease: "detent" },
      );
    }
  },
);

// Watch filename and RESOLVE (§ 06.4 Signature 7)
watch(
  () => props.activeItem?.name,
  (newName) => {
    if (newName && filenameRef.value) {
      resolveText(filenameRef.value, newName, { duration: 0.38 });
    }
  },
);

defineExpose({
  filenameRef,
  modalRef,
  overlayRef,
});

onMounted(() => {
  ctx = ctxFor(overlayRef.value, () => {});
});

onBeforeUnmount(() => {
  if (ctx) ctx.revert();
});
</script>

<style scoped>
.ingestion-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.72);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transition:
    opacity 180ms var(--ease-precision),
    visibility 180ms;
}

.ingestion-overlay.is-active {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}

.ingestion-modal {
  width: 90%;
  max-width: 480px;
  background-color: var(--surface-2);
  padding: var(--space-8) var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
}

.modal-icon {
  color: var(--ink-1);
}

.modal-icon.error-icon {
  color: var(--ink-2);
}

/* Pipeline text */
.pipeline-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.filename-row {
  font-size: var(--type-14);
  font-weight: 600;
  color: var(--ink-1);
  letter-spacing: 0.04em;
  word-break: break-all;
}

.stage-mask-container {
  height: 1.6em;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage-text {
  font-size: var(--type-12);
  color: var(--ink-2);
  font-weight: 500;
  letter-spacing: 0.05em;
  display: inline-block;
}

.odometer-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--type-12);
  color: var(--ink-2);
  margin-top: var(--space-2);
}

.odometer-label {
  color: var(--ink-3);
}

.odometer-value {
  color: var(--ink-1);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.odometer-target {
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.queue-indicator {
  margin-top: var(--space-2);
  font-size: 10px;
  color: var(--ink-3);
  letter-spacing: 0.06em;
}

/* Error details */
.error-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.error-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.error-msg {
  font-size: var(--type-12);
  color: var(--ink-1);
  line-height: 1.5;
  margin: 0;
}

.dismiss-btn {
  margin-top: var(--space-4);
  padding: var(--space-2) var(--space-4);
  background-color: var(--surface-3);
  color: var(--ink-1);
  font-size: var(--type-11);
  font-weight: 500;
  letter-spacing: 0.05em;
  transition: background-color 120ms var(--ease-precision);
}

.dismiss-btn:hover {
  background-color: var(--surface-highlight);
}

/* Drag cue */
.drag-cue {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.drag-primary {
  font-size: var(--type-14);
  font-weight: 600;
  color: var(--ink-1);
  letter-spacing: 0.04em;
}

.drag-sub {
  font-size: 10px;
  color: var(--ink-3);
  letter-spacing: 0.05em;
}
</style>
