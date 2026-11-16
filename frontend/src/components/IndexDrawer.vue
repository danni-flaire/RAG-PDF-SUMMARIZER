<template>
  <aside
    id="index-drawer"
    class="index-drawer-container"
    :class="{ 'is-open': isOpen }"
    :aria-hidden="!isOpen"
    :inert="!isOpen"
    role="dialog"
    aria-label="Indexed Primary Sources"
    ref="drawerContainerRef"
  >
    <!-- Background overlay for dismissal -->
    <div
      class="drawer-backdrop"
      ref="backdropRef"
      @click="$emit('close')"
      aria-hidden="true"
    ></div>

    <!-- Drawer Panel Surface (§ 06.4 Signature 6) -->
    <div class="drawer-panel" ref="panelRef">
      <!-- Header -->
      <div class="drawer-header font-mono">
        <div class="drawer-title-group">
          <span class="drawer-title">PRIMARY SOURCES</span>
          <span class="doc-count font-mono"
            >{{ documents.length }} INDEXED</span
          >
        </div>
        <button
          type="button"
          class="drawer-close-btn"
          aria-label="Close document index"
          ref="closeBtnRef"
          @click="$emit('close')"
        >
          <X
            :size="16"
            :stroke-width="1.5"
            absolute-stroke-width
            aria-hidden="true"
          />
        </button>
      </div>

      <!-- Document List with Shared Selection Block -->
      <div
        class="drawer-list"
        role="listbox"
        aria-label="Available research documents"
        ref="listRef"
      >
        <!-- Shared selection block moving between rows with Flip (§ 06.4 Signature 6) -->
        <div
          v-if="selectedRowRect"
          class="selection-block"
          :style="{
            top: `${selectedRowRect.top}px`,
            height: `${selectedRowRect.height}px`,
          }"
          aria-hidden="true"
        ></div>

        <div
          v-for="doc in documents"
          :key="doc.id"
          class="drawer-row font-mono"
          :class="{ 'is-active': doc.id === activeDocumentId }"
          role="option"
          :aria-selected="doc.id === activeDocumentId"
          tabindex="0"
          :ref="(el) => setRowRef(el, doc.id)"
          @click="handleSelect(doc)"
          @keydown.enter.prevent="handleSelect(doc)"
          @keydown.space.prevent="handleSelect(doc)"
        >
          <div class="row-main">
            <div class="row-headline">
              <FileText
                :size="14"
                :stroke-width="1.5"
                absolute-stroke-width
                class="doc-icon"
                aria-hidden="true"
              />
              <span class="doc-filename">{{ doc.filename }}</span>
            </div>
            <div class="row-meta">
              <span class="meta-item doc-id">{{ doc.id }}</span>
              <span class="meta-sep">·</span>
              <span class="meta-item">{{ doc.chunks }} CHUNKS</span>
              <span class="meta-sep">·</span>
              <span class="meta-item">{{ doc.pages }} PAGES</span>
            </div>
          </div>

          <div class="row-status">
            <span class="status-badge">{{ doc.status }}</span>
          </div>
        </div>
      </div>

      <!-- Footer / Ingestion hint -->
      <div class="drawer-footer font-mono">
        <span class="footer-hint"
          >DRAG & DROP TO INGEST (.PDF · .TXT · .MD)</span
        >
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { X, FileText } from "lucide-vue-next";
import {
  gsap,
  Flip,
  detent,
  unveilLines,
  resolveText,
  ctxFor,
  DURATIONS,
} from "../motion.js";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  documents: {
    type: Array,
    required: true,
  },
  activeDocumentId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["select", "close"]);

const drawerContainerRef = ref(null);
const backdropRef = ref(null);
const panelRef = ref(null);
const listRef = ref(null);
const closeBtnRef = ref(null);
const selectedRowRect = ref(null);

const rowRefs = new Map();

let ctx = null;
let openTimeline = null;

function setRowRef(el, id) {
  if (el) {
    rowRefs.set(id, el);
  } else {
    rowRefs.delete(id);
  }
}

function updateSelectionBlock() {
  const activeEl = rowRefs.get(props.activeDocumentId);
  const containerEl = listRef.value;
  if (activeEl && containerEl) {
    const top = activeEl.offsetTop;
    const height = activeEl.offsetHeight;
    selectedRowRect.value = { top, height };
  }
}

function handleSelect(doc) {
  emit("select", doc);
  nextTick(() => {
    updateSelectionBlock();
  });
}

/**
 * Animate drawer opening / closing (§ 06.4 Signature 6)
 */
function animateOpen() {
  if (!panelRef.value) return;

  if (openTimeline) openTimeline.kill();

  const rows = Array.from(rowRefs.values());

  openTimeline = gsap.timeline({
    onComplete: () => {
      closeBtnRef.value?.focus();
      updateSelectionBlock();
    },
  });

  // Backdrop fade
  if (backdropRef.value) {
    openTimeline.fromTo(
      backdropRef.value,
      { opacity: 0 },
      { opacity: 1, duration: DURATIONS.base, ease: "precision" },
      0,
    );
  }

  // Panel slide from right
  openTimeline.fromTo(
    panelRef.value,
    { x: "100%", opacity: 0 },
    { x: "0%", opacity: 1, duration: DURATIONS.base, ease: "precision" },
    0,
  );

  // Rows unveil with stagger
  if (rows.length > 0) {
    openTimeline.fromTo(
      rows,
      { opacity: 0, x: 12 },
      {
        opacity: 1,
        x: 0,
        stagger: 0.03,
        duration: DURATIONS.fast,
        ease: "precision",
      },
      0.08,
    );
  }
}

function animateClose(onComplete) {
  if (!panelRef.value) {
    if (onComplete) onComplete();
    return;
  }

  if (openTimeline) openTimeline.kill();

  const closeTl = gsap.timeline({
    onComplete: () => {
      if (onComplete) onComplete();
    },
  });

  if (backdropRef.value) {
    closeTl.to(
      backdropRef.value,
      { opacity: 0, duration: DURATIONS.exitFast, ease: "retreat" },
      0,
    );
  }

  closeTl.to(
    panelRef.value,
    { x: "100%", opacity: 0, duration: DURATIONS.exitBase, ease: "retreat" },
    0,
  );
}

watch(
  () => props.isOpen,
  (newOpen) => {
    if (newOpen) {
      nextTick(() => {
        animateOpen();
      });
    } else {
      animateClose();
    }
  },
);

watch(
  () => props.activeDocumentId,
  () => {
    nextTick(() => {
      updateSelectionBlock();
    });
  },
);

defineExpose({
  panelRef,
  closeBtnRef,
});

onMounted(() => {
  ctx = ctxFor(drawerContainerRef.value, () => {
    if (props.isOpen) {
      updateSelectionBlock();
    }
  });
});

onBeforeUnmount(() => {
  if (ctx) ctx.revert();
  if (openTimeline) openTimeline.kill();
});
</script>

<style scoped>
.index-drawer-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 200;
  pointer-events: none;
  visibility: hidden;
}

.index-drawer-container.is-open {
  pointer-events: auto;
  visibility: visible;
}

.drawer-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
}

.drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--drawer-width);
  height: 100%;
  background-color: var(--surface-2);
  display: flex;
  flex-direction: column;
  z-index: 2;
  will-change: transform, opacity;
}

/* Header */
.drawer-header {
  height: var(--topbar-height);
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--surface-2);
}

.drawer-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.drawer-title {
  font-size: var(--type-12);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ink-1);
}

.doc-count {
  font-size: 10px;
  color: var(--ink-3);
}

.drawer-close-btn {
  width: 32px;
  height: 32px;
  color: var(--ink-2);
}

.drawer-close-btn:hover {
  background-color: var(--surface-3);
  color: var(--ink-1);
}

/* List with shared selection block */
.drawer-list {
  flex: 1;
  overflow-y: auto;
  position: relative;
  padding: var(--space-2) 0;
}

.selection-block {
  position: absolute;
  left: 0;
  width: 100%;
  background-color: var(--surface-3);
  z-index: 1;
  pointer-events: none;
  transition:
    top 180ms var(--ease-detent),
    height 180ms var(--ease-detent);
}

.drawer-row {
  position: relative;
  z-index: 2;
  padding: var(--space-3) var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background-color 120ms var(--ease-precision);
  user-select: none;
}

.drawer-row:hover {
  background-color: var(--surface-elevated);
}

.drawer-row.is-active {
  color: var(--ink-1);
}

.row-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.row-headline {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.doc-icon {
  color: var(--ink-2);
  flex-shrink: 0;
}

.doc-filename {
  font-size: var(--type-12);
  font-weight: 500;
  color: var(--ink-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 10px;
  color: var(--ink-3);
}

.doc-id {
  color: var(--ink-2);
}

.meta-sep {
  color: var(--ink-4);
}

.row-status {
  margin-left: var(--space-2);
  flex-shrink: 0;
}

.status-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-2);
}

/* Footer */
.drawer-footer {
  padding: var(--space-3) var(--space-4);
  background-color: var(--surface-2);
  font-size: 10px;
  color: var(--ink-3);
  letter-spacing: 0.05em;
  text-align: center;
}

/* Mobile Layout (<640px) */
@media (max-width: 640px) {
  .drawer-panel {
    width: 100vw;
  }
}
</style>
