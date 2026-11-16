<template>
  <div
    class="retrieval-trace font-mono"
    role="region"
    aria-label="Retrieval audit trace"
    ref="traceRootRef"
  >
    <!-- Collapsed summary button -->
    <button
      v-if="isCollapsed"
      type="button"
      class="trace-summary-btn"
      :aria-expanded="!isCollapsed"
      @click="toggleCollapse"
    >
      <span class="trace-pill">{{
        traceData.summary || "TRACE · 8 PASSAGES · 1.1s"
      }}</span>
      <span class="trace-expand-hint">[EXPAND]</span>
    </button>

    <!-- Expanded / Live Running Trace (§ 05.4 & § 06.4 Signature 3) -->
    <div v-else class="trace-expanded-container" ref="expandedBoxRef">
      <div class="trace-header">
        <span class="trace-tag">RETRIEVAL TRACE // PROVENANCE PIPELINE</span>
        <button
          v-if="!isRunning"
          type="button"
          class="trace-collapse-btn"
          aria-label="Collapse retrieval trace"
          @click="toggleCollapse"
        >
          [COLLAPSE]
        </button>
      </div>

      <div class="trace-lines" ref="linesContainerRef">
        <!-- DIRECT mode condensed line -->
        <div
          v-if="mode === 'DIRECT'"
          class="trace-line direct-line"
          ref="line1Ref"
        >
          <span class="stage-prefix">DIRECT RETRIEVAL ▸</span>
          <span class="stage-stat"
            >DENSE {{ traceData.denseCandidates }} CANDIDATES · BM25
            {{ traceData.bm25Candidates }} CANDIDATES ·
            {{ traceData.rerankPassages }} PASSAGES RERANKED ·
            {{ traceData.latency }}</span
          >
        </div>

        <!-- SYNTHESIS mode multi-stage pipeline -->
        <template v-else>
          <div
            class="trace-line"
            :class="{
              'is-active': activeStage === 0,
              'is-receded': activeStage > 0,
            }"
            ref="line1Ref"
          >
            <span class="stage-label">QUERY ▸</span>
            <span class="stage-value"
              >EMBEDDED ·
              <span class="numeral">{{
                traceData.dimension || "768d"
              }}</span></span
            >
          </div>

          <div
            class="trace-line"
            :class="{
              'is-active': activeStage === 1,
              'is-receded': activeStage > 1,
            }"
            ref="line2Ref"
          >
            <span class="stage-label">BM25 ▸</span>
            <span class="stage-value"
              ><span class="numeral" ref="bm25NumRef">{{ displayBm25 }}</span>
              CANDIDATES</span
            >
            <span class="stage-spacer"></span>
            <span class="stage-label">DENSE ▸</span>
            <span class="stage-value"
              ><span class="numeral" ref="denseNumRef">{{ displayDense }}</span>
              CANDIDATES</span
            >
          </div>

          <div
            class="trace-line"
            :class="{
              'is-active': activeStage === 2,
              'is-receded': activeStage > 2,
            }"
            ref="line3Ref"
          >
            <span class="stage-label">FUSION · RRF ▸</span>
            <span class="stage-value"
              ><span class="numeral">{{ displayFused }}</span> CANDIDATES
              (k=60)</span
            >
          </div>

          <div
            class="trace-line"
            :class="{
              'is-active': activeStage === 3,
              'is-receded': activeStage > 3,
            }"
            ref="line4Ref"
          >
            <span class="stage-label">ACL FILTER ▸</span>
            <span class="stage-value"
              ><span class="numeral">{{ displayAcl }}</span> WITHHELD BY
              SECURITY POLICY</span
            >
          </div>

          <div
            class="trace-line"
            :class="{ 'is-active': activeStage >= 4 }"
            ref="line5Ref"
          >
            <span class="stage-label">RERANK ▸</span>
            <span class="stage-value"
              ><span class="numeral">{{ displayPassages }}</span> PASSAGES ·
              <span class="numeral">{{ traceData.rerankDocs }}</span> DOCUMENTS
              (CONF >= 0.72)</span
            >
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { gsap, unveilLines, detent, ctxFor, DURATIONS } from "../motion.js";

const props = defineProps({
  traceData: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: "SYNTHESIS",
  },
  initiallyCollapsed: {
    type: Boolean,
    default: true,
  },
  autoRunOnMount: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["run-complete"]);

const isCollapsed = ref(props.initiallyCollapsed);
const isRunning = ref(false);
const activeStage = ref(props.initiallyCollapsed ? 4 : 0);

const displayBm25 = ref(props.traceData?.bm25Candidates || 214);
const displayDense = ref(props.traceData?.denseCandidates || 198);
const displayFused = ref(props.traceData?.fusedCandidates || 50);
const displayAcl = ref(props.traceData?.withheldAcl || 3);
const displayPassages = ref(props.traceData?.rerankPassages || 8);

const traceRootRef = ref(null);
const expandedBoxRef = ref(null);
const linesContainerRef = ref(null);
const line1Ref = ref(null);
const line2Ref = ref(null);
const line3Ref = ref(null);
const line4Ref = ref(null);
const line5Ref = ref(null);

let ctx = null;

function toggleCollapse() {
  if (isRunning.value) return;
  isCollapsed.value = !isCollapsed.value;
}

/**
 * Execute Retrieval Trace animation (§ 06.4 Signature 3)
 */
function runTracePipeline(onComplete) {
  isCollapsed.value = false;
  isRunning.value = true;
  activeStage.value = 0;

  displayBm25.value = 0;
  displayDense.value = 0;
  displayFused.value = 0;
  displayAcl.value = 0;
  displayPassages.value = 0;

  if (props.mode === "DIRECT") {
    // Condensed DIRECT run (approx 400ms)
    setTimeout(() => {
      isRunning.value = false;
      if (onComplete) onComplete();
      emit("run-complete");
    }, 450);
    return;
  }

  // Multi-stage SYNTHESIS run (approx 900ms)
  const tl = gsap.timeline({
    onComplete: () => {
      isRunning.value = false;
      if (onComplete) onComplete();
      emit("run-complete");
    },
  });

  // Stage 0: Query embedding
  tl.to(
    {},
    {
      duration: 0.16,
      onStart: () => {
        activeStage.value = 0;
      },
    },
  );

  // Stage 1: BM25 + Dense retrieval
  tl.to(
    {},
    {
      duration: 0.24,
      onStart: () => {
        activeStage.value = 1;
        gsap.to(displayBm25, {
          value: props.traceData.bm25Candidates,
          roundProps: "value",
          duration: 0.22,
          ease: "precision",
        });
        gsap.to(displayDense, {
          value: props.traceData.denseCandidates,
          roundProps: "value",
          duration: 0.22,
          ease: "precision",
        });
      },
    },
  );

  // Stage 2: RRF Fusion
  tl.to(
    {},
    {
      duration: 0.2,
      onStart: () => {
        activeStage.value = 2;
        gsap.to(displayFused, {
          value: props.traceData.fusedCandidates,
          roundProps: "value",
          duration: 0.18,
          ease: "precision",
        });
      },
    },
  );

  // Stage 3: ACL Filter
  tl.to(
    {},
    {
      duration: 0.18,
      onStart: () => {
        activeStage.value = 3;
        gsap.to(displayAcl, {
          value: props.traceData.withheldAcl,
          roundProps: "value",
          duration: 0.16,
          ease: "precision",
        });
      },
    },
  );

  // Stage 4: Cross-Encoder Rerank
  tl.to(
    {},
    {
      duration: 0.24,
      onStart: () => {
        activeStage.value = 4;
        gsap.to(displayPassages, {
          value: props.traceData.rerankPassages,
          roundProps: "value",
          duration: 0.2,
          ease: "precision",
        });
      },
    },
  );
}

function collapseTrace() {
  if (isCollapsed.value) return;
  if (!expandedBoxRef.value) {
    isCollapsed.value = true;
    return;
  }

  // Signature 3: collapse height + opacity with retreat
  gsap.to(expandedBoxRef.value, {
    height: 0,
    opacity: 0,
    duration: DURATIONS.exitBase,
    ease: "retreat",
    onComplete: () => {
      isCollapsed.value = true;
      gsap.set(expandedBoxRef.value, { clearProps: "all" });
    },
  });
}

defineExpose({
  runTracePipeline,
  collapseTrace,
  isCollapsed,
});

onMounted(() => {
  ctx = ctxFor(traceRootRef.value, () => {
    if (props.autoRunOnMount) {
      runTracePipeline();
    }
  });
});

onBeforeUnmount(() => {
  if (ctx) ctx.revert();
});
</script>

<style scoped>
.retrieval-trace {
  margin-bottom: var(--space-4);
  font-size: var(--type-11);
  line-height: 1.5;
  user-select: none;
}

/* Collapsed state */
.trace-summary-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px var(--space-2);
  background-color: var(--surface-2);
  color: var(--ink-2);
  font-size: var(--type-11);
  transition:
    background-color 120ms var(--ease-precision),
    color 120ms var(--ease-precision);
}

.trace-summary-btn:hover {
  background-color: var(--surface-3);
  color: var(--ink-1);
}

.trace-pill {
  font-weight: 500;
  letter-spacing: 0.04em;
}

.trace-expand-hint {
  color: var(--ink-3);
  font-size: 10px;
}

/* Expanded state */
.trace-expanded-container {
  background-color: var(--surface-2);
  padding: var(--space-3) var(--space-4);
  overflow: hidden;
}

.trace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.trace-tag {
  font-weight: 600;
  color: var(--ink-3);
  letter-spacing: 0.06em;
  font-size: 10px;
}

.trace-collapse-btn {
  font-size: 10px;
  color: var(--ink-3);
  background: transparent;
  padding: 2px 4px;
}

.trace-collapse-btn:hover {
  color: var(--ink-1);
  background-color: var(--surface-3);
}

.trace-lines {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.trace-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--ink-2);
  transition: color 180ms var(--ease-precision);
}

.trace-line.is-active {
  color: var(--ink-1);
}

.trace-line.is-receded {
  color: var(--ink-3);
}

.stage-label {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.stage-value {
  font-weight: 400;
}

.stage-spacer {
  margin: 0 var(--space-2);
}

.numeral {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.direct-line {
  color: var(--ink-1);
}

.stage-prefix {
  font-weight: 600;
  color: var(--ink-2);
}

.stage-stat {
  color: var(--ink-1);
}
</style>
