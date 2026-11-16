<template>
  <header class="topbar" role="banner">
    <!-- Left: Hand-authored monogram mark + Brand name -->
    <div class="topbar-left">
      <svg
        class="workspace-mark"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="square"
        stroke-linejoin="miter"
        aria-hidden="true"
        ref="markSvgRef"
      >
        <!-- Custom 3-stroke precision monogram representing dual knowledge axes -->
        <path class="mark-stroke-1" d="M 4 4 L 4 20" />
        <path class="mark-stroke-2" d="M 4 12 L 18 4" />
        <path class="mark-stroke-3" d="M 4 12 L 18 20" />
      </svg>
      <span class="brand-title font-mono" ref="brandTitleRef"
        >KNOWLEDGE SYSTEMS</span
      >
    </div>

    <!-- Center: Active Document Index + Section Counter -->
    <div class="topbar-center" ref="centerRef">
      <span
        class="index-crumb font-mono"
        ref="indexLabelRef"
        :title="activeDocTitle"
      >
        INDEX // {{ activeDocFilename }}
      </span>

      <span class="section-divider font-mono" aria-hidden="true">·</span>

      <div
        class="section-counter font-mono"
        aria-label="Reading section progress"
      >
        <span class="section-symbol">§</span>
        <div class="odometer-slot">
          <span class="odometer-digit" ref="currentSecRef">{{
            formattedCurrentSection
          }}</span>
        </div>
        <span class="section-sep">/</span>
        <span class="total-sec" ref="totalSecRef">{{
          formattedTotalSections
        }}</span>
      </div>
    </div>

    <!-- Right: Drawer trigger + Theme polarity toggle -->
    <div class="topbar-right">
      <button
        type="button"
        class="topbar-btn font-mono"
        :aria-expanded="isDrawerOpen"
        aria-controls="index-drawer"
        :aria-label="
          isDrawerOpen ? 'Close document index' : 'Open document index'
        "
        ref="drawerTriggerRef"
        @click="$emit('toggle-drawer')"
      >
        <span class="btn-label">INDEX</span>
        <component
          :is="isDrawerOpen ? PanelRightClose : PanelRightOpen"
          :size="16"
          :stroke-width="1.5"
          absolute-stroke-width
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        class="topbar-btn icon-only"
        :aria-pressed="isDarkTheme"
        aria-label="Toggle theme polarity"
        ref="themeTriggerRef"
        @click="handleThemeToggle"
      >
        <SunMoon
          class="theme-icon"
          ref="themeIconRef"
          :size="16"
          :stroke-width="1.5"
          absolute-stroke-width
          aria-hidden="true"
        />
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { PanelRightOpen, PanelRightClose, SunMoon } from "lucide-vue-next";
import { gsap, DrawSVGPlugin, resolveText, detent, ctxFor } from "../motion.js";

const props = defineProps({
  activeDocument: {
    type: Object,
    required: true,
  },
  currentSection: {
    type: Number,
    default: 1,
  },
  totalSections: {
    type: Number,
    default: 10,
  },
  isDrawerOpen: {
    type: Boolean,
    default: false,
  },
  isDarkTheme: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["toggle-drawer", "toggle-theme"]);

const markSvgRef = ref(null);
const brandTitleRef = ref(null);
const indexLabelRef = ref(null);
const centerRef = ref(null);
const currentSecRef = ref(null);
const totalSecRef = ref(null);
const drawerTriggerRef = ref(null);
const themeTriggerRef = ref(null);
const themeIconRef = ref(null);

let ctx = null;

const activeDocFilename = computed(() => {
  return props.activeDocument?.filename || "03_ARCHITECTURE_SPEC.PDF";
});

const activeDocTitle = computed(() => {
  return props.activeDocument?.title || "Architecture Specification";
});

const formattedCurrentSection = computed(() => {
  const n = props.currentSection || 1;
  return n < 10 ? `0${n}` : `${n}`;
});

const formattedTotalSections = computed(() => {
  const n = props.totalSections || 10;
  return n < 10 ? `0${n}` : `${n}`;
});

// Watch section changes and roll odometer
watch(
  () => props.currentSection,
  (newVal, oldVal) => {
    if (newVal !== oldVal && currentSecRef.value) {
      detent(currentSecRef.value, {
        y: -6,
        opacity: 0.2,
        duration: 0.12,
        onComplete: () => {
          gsap.fromTo(
            currentSecRef.value,
            { y: 6, opacity: 0.2 },
            { y: 0, opacity: 1, duration: 0.16, ease: "detent" },
          );
        },
      });
    }
  },
);

// Watch active document and RESOLVE index label (§ 06.4 Signature 6)
watch(
  () => props.activeDocument?.filename,
  (newFilename, oldFilename) => {
    if (newFilename && newFilename !== oldFilename && indexLabelRef.value) {
      resolveText(indexLabelRef.value, `INDEX // ${newFilename}`, {
        duration: 0.45,
      });
    }
  },
);

function handleThemeToggle(event) {
  if (themeIconRef.value) {
    const el = themeIconRef.value.$el || themeIconRef.value;
    detent(el, {
      rotation: "+=180",
      duration: 0.32,
    });
  }
  emit("toggle-theme", event);
}

// Expose elements for Cold Open master timeline and Ingestion handoff
defineExpose({
  markSvgRef,
  brandTitleRef,
  indexLabelRef,
  drawerTriggerRef,
  themeTriggerRef,
});

onMounted(() => {
  ctx = ctxFor(null, () => {
    // Initial prep
  });
});

onBeforeUnmount(() => {
  if (ctx) ctx.revert();
});
</script>

<style scoped>
.topbar {
  height: var(--topbar-height);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  background-color: var(--surface-2);
  user-select: none;
  z-index: 100;
  position: relative;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.workspace-mark {
  color: var(--ink-1);
  display: block;
}

.brand-title {
  font-size: var(--type-12);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ink-1);
}

.topbar-center {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--type-12);
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 50vw;
}

.index-crumb {
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-divider {
  color: var(--ink-3);
}

.section-counter {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--ink-1);
  font-weight: 500;
}

.section-symbol {
  color: var(--ink-3);
}

.odometer-slot {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  height: 1.4em;
}

.odometer-digit {
  display: inline-block;
  will-change: transform, opacity;
}

.section-sep {
  color: var(--ink-3);
}

.total-sec {
  color: var(--ink-2);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.topbar-btn {
  height: 32px;
  padding: 0 var(--space-2);
  gap: var(--space-1);
  font-size: var(--type-11);
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--ink-2);
  background-color: transparent;
  transition:
    background-color 120ms var(--ease-precision),
    color 120ms var(--ease-precision);
}

.topbar-btn:hover {
  background-color: var(--surface-3);
  color: var(--ink-1);
}

.topbar-btn:active {
  transform: scale(0.96);
  transition: transform 80ms var(--ease-detent);
}

.topbar-btn.icon-only {
  width: 32px;
  padding: 0;
}

.theme-icon {
  display: block;
}

/* Mobile Layout (<640px) Responsive Redesign (§ 08) */
@media (max-width: 640px) {
  .topbar {
    padding: 0 var(--space-2);
  }

  .brand-title {
    display: none;
  }

  .topbar-center {
    max-width: 60vw;
  }

  .index-crumb {
    display: none;
  }

  .section-divider {
    display: none;
  }

  .btn-label {
    display: none;
  }

  .topbar-btn {
    width: 44px;
    height: 44px;
  }
}
</style>
