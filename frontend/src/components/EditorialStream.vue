<template>
  <main
    class="editorial-stream-viewport"
    role="main"
    ref="viewportRef"
    @scroll="handleScroll"
  >
    <!-- Polite Live Region for Screen Readers (§ 05.3) -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {{ liveAnnouncement }}
    </div>

    <!-- Centered Editorial Reading Column (§ 03) -->
    <div class="reading-column" ref="readingColumnRef">
      <!-- Conversation History Exchange Items (§ 05.3) -->
      <article
        v-for="(exchange, index) in exchanges"
        :key="exchange.id"
        class="exchange-item"
        :class="{ 'is-prior': index < exchanges.length - 1 }"
        :ref="(el) => setExchangeRef(el, exchange.id)"
      >
        <!-- User Query Statement (§ 05.3 & § 06.4 Signature 2) -->
        <section
          class="user-statement"
          :ref="(el) => setUserStatementRef(el, exchange.id)"
        >
          <div class="statement-meta font-mono">
            <span class="meta-label">QUERY</span>
            <span class="meta-sep">·</span>
            <span class="meta-time">{{ exchange.user.timestamp }}</span>
            <span class="meta-sep">·</span>
            <span class="meta-mode">{{ exchange.user.mode }}</span>
          </div>

          <h1 class="statement-text">
            {{ exchange.user.text }}
          </h1>
        </section>

        <!-- Assistant Research Response (§ 05.3) -->
        <section class="assistant-response">
          <!-- Retrieval Trace (§ 05.4 & § 06.4 Signature 3) -->
          <RetrievalTrace
            v-if="exchange.assistant.trace"
            :trace-data="exchange.assistant.trace"
            :mode="exchange.assistant.mode"
            :initially-collapsed="true"
          />

          <!-- Response Structured Blocks -->
          <div class="response-blocks">
            <template
              v-for="(block, bIdx) in exchange.assistant.blocks"
              :key="bIdx"
            >
              <!-- Section Headings -->
              <h2
                v-if="block.type === 'heading'"
                class="response-heading"
                :data-section-index="block.sectionIndex"
                :ref="(el) => registerSectionHeading(el, block.sectionIndex)"
              >
                {{ block.text }}
              </h2>

              <!-- Paragraphs with Inline Segments & Citations -->
              <div
                v-else-if="block.type === 'paragraph'"
                class="response-paragraph-wrap"
              >
                <p
                  class="response-paragraph"
                  :class="{ 'is-dimmed': isDimmedParagraph(exchange.id, bIdx) }"
                >
                  <template v-for="(seg, sIdx) in block.segments" :key="sIdx">
                    <span v-if="seg.type === 'text'">{{ seg.value }}</span>

                    <!-- Citation Button Superscript (§ 05.3 & § 06.4 Signature 5) -->
                    <button
                      v-else-if="seg.type === 'cite'"
                      type="button"
                      class="cite-trigger font-mono"
                      :class="{
                        'is-open': isCitationOpen(exchange.id, seg.id),
                      }"
                      :aria-expanded="isCitationOpen(exchange.id, seg.id)"
                      :aria-controls="`cite-panel-${exchange.id}-${seg.id}`"
                      :aria-label="`Citation ${getCitationNumber(seg.id)}: ${getCitationSourceTitle(seg.id)}`"
                      @click="toggleCitation(exchange.id, seg.id, $event)"
                    >
                      [{{ getCitationNumber(seg.id) }}]
                    </button>
                  </template>
                </p>

                <!-- Expanded Provenance Unfolds (Citations) beneath paragraph (§ 06.4 Signature 5) -->
                <div
                  v-for="citeId in getParagraphCitations(block)"
                  :key="citeId"
                  v-show="isCitationOpen(exchange.id, citeId)"
                  :id="`cite-panel-${exchange.id}-${citeId}`"
                  class="provenance-unfold font-mono"
                  :ref="
                    (el) => setCitationPanelRef(el, `${exchange.id}_${citeId}`)
                  "
                >
                  <div class="provenance-header">
                    <span class="source-title">{{
                      getCitationSourceTitle(citeId)
                    }}</span>
                    <button
                      type="button"
                      class="provenance-close"
                      aria-label="Close citation excerpt"
                      @click="closeCitation(exchange.id, citeId)"
                    >
                      [CLOSE]
                    </button>
                  </div>

                  <p class="provenance-excerpt">
                    "{{ getCitationExcerpt(citeId) }}"
                  </p>

                  <div class="provenance-meta">
                    <span>DOC ID: {{ getCitationDocId(citeId) }}</span>
                    <span>·</span>
                    <span>PAGE: {{ getCitationPage(citeId) }}</span>
                    <span>·</span>
                    <span>CHUNK: {{ getCitationChunkId(citeId) }}</span>
                  </div>
                </div>
              </div>

              <!-- Code blocks -->
              <div
                v-else-if="block.type === 'code'"
                class="response-code-wrap font-mono"
              >
                <pre class="response-code"><code>{{ block.code }}</code></pre>
              </div>
            </template>
          </div>
        </section>
      </article>

      <!-- Active Streaming Message (§ 05.3 & § 06.4 Signature 4 Wet Ink) -->
      <article
        v-if="activeStreamingExchange"
        class="exchange-item is-live-streaming"
      >
        <!-- Live User Query -->
        <section class="user-statement" ref="liveUserStatementRef">
          <div class="statement-meta font-mono">
            <span class="meta-label">QUERY</span>
            <span class="meta-sep">·</span>
            <span class="meta-time">{{
              activeStreamingExchange.user.timestamp
            }}</span>
            <span class="meta-sep">·</span>
            <span class="meta-mode">{{
              activeStreamingExchange.user.mode
            }}</span>
          </div>

          <h1 class="statement-text">
            {{ activeStreamingExchange.user.text }}
          </h1>
        </section>

        <!-- Live Assistant Stream -->
        <section class="assistant-response">
          <!-- Live Retrieval Trace (auto-run before stream) -->
          <RetrievalTrace
            ref="liveTraceRef"
            :trace-data="activeStreamingExchange.assistant.trace"
            :mode="activeStreamingExchange.assistant.mode"
            :initially-collapsed="false"
            :auto-run-on-mount="true"
            @run-complete="handleTraceComplete"
          />

          <!-- Live Blocks Streamed so far -->
          <div class="response-blocks live-blocks" v-if="isTraceCompleted">
            <template v-for="(block, bIdx) in liveBlocks" :key="bIdx">
              <h2
                v-if="block.type === 'heading'"
                class="response-heading"
                :data-section-index="block.sectionIndex"
              >
                {{ block.text }}
              </h2>

              <div
                v-else-if="block.type === 'paragraph'"
                class="response-paragraph-wrap"
              >
                <p class="response-paragraph">
                  <template v-for="(seg, sIdx) in block.segments" :key="sIdx">
                    <span v-if="seg.type === 'text'">{{ seg.value }}</span>
                    <button
                      v-else-if="seg.type === 'cite'"
                      type="button"
                      class="cite-trigger font-mono"
                    >
                      [{{ getCitationNumber(seg.id) }}]
                    </button>
                  </template>

                  <!-- Wet Ink Cursor & Dying stage (§ 06.4 Signature 4) -->
                  <span
                    v-if="isStreaming && bIdx === liveBlocks.length - 1"
                    class="wet-ink-cursor font-mono"
                    aria-hidden="true"
                    >█</span
                  >
                </p>
              </div>

              <div
                v-else-if="block.type === 'code'"
                class="response-code-wrap font-mono"
              >
                <pre class="response-code"><code>{{ block.code }}</code></pre>
              </div>
            </template>

            <!-- Interrupted Tag if cancelled -->
            <div v-if="isInterrupted" class="interrupted-tag font-mono">
              <span>[INTERRUPTED BY USER]</span>
            </div>
          </div>
        </section>
      </article>

      <!-- Bottom Padding Anchor -->
      <div class="stream-bottom-anchor" ref="bottomAnchorRef"></div>
    </div>
  </main>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import RetrievalTrace from "./RetrievalTrace.vue";
import {
  gsap,
  ScrollTrigger,
  ScrollToPlugin,
  detent,
  unveilLines,
  yieldTo,
  ctxFor,
  DURATIONS,
} from "../motion.js";

const props = defineProps({
  exchanges: {
    type: Array,
    required: true,
  },
  activeStreamingExchange: {
    type: Object,
    default: null,
  },
  liveBlocks: {
    type: Array,
    default: () => [],
  },
  isStreaming: {
    type: Boolean,
    default: false,
  },
  isInterrupted: {
    type: Boolean,
    default: false,
  },
  liveAnnouncement: {
    type: String,
    default: "",
  },
  citations: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  "stream-start",
  "stream-end",
  "stream-cancel",
  "section-change",
  "trace-ready",
]);

const viewportRef = ref(null);
const readingColumnRef = ref(null);
const bottomAnchorRef = ref(null);
const liveTraceRef = ref(null);
const liveUserStatementRef = ref(null);

const isTraceCompleted = ref(!props.activeStreamingExchange);
const isUserScrolledUp = ref(false);

// Active citation accordion state
const openCitations = reactive(new Set());

// Section headings for scroll-spy
const headingElements = new Map();
const exchangeRefs = new Map();
const userStatementRefs = new Map();
const citationPanelRefs = new Map();

let ctx = null;
let scrollTriggers = [];

function setExchangeRef(el, id) {
  if (el) exchangeRefs.set(id, el);
  else exchangeRefs.delete(id);
}

function setUserStatementRef(el, id) {
  if (el) userStatementRefs.set(id, el);
  else userStatementRefs.delete(id);
}

function setCitationPanelRef(el, key) {
  if (el) citationPanelRefs.set(key, el);
  else citationPanelRefs.delete(key);
}

function registerSectionHeading(el, index) {
  if (el) {
    headingElements.set(index, el);
  }
}

// Citations queries
function getCitationNumber(citeId) {
  return props.citations[citeId]?.num || 1;
}

function getCitationSourceTitle(citeId) {
  return props.citations[citeId]?.docTitle || "Primary Source";
}

function getCitationExcerpt(citeId) {
  return props.citations[citeId]?.excerpt || "";
}

function getCitationDocId(citeId) {
  return props.citations[citeId]?.docId || "";
}

function getCitationPage(citeId) {
  return props.citations[citeId]?.page || 1;
}

function getCitationChunkId(citeId) {
  return props.citations[citeId]?.chunkId || "";
}

function isCitationOpen(exchangeId, citeId) {
  return openCitations.has(`${exchangeId}_${citeId}`);
}

function getParagraphCitations(block) {
  if (!block || !block.segments) return [];
  return block.segments.filter((s) => s.type === "cite").map((s) => s.id);
}

/**
 * Provenance Unfold: Citation toggle with timeline (§ 06.4 Signature 5)
 */
function toggleCitation(exchangeId, citeId, event) {
  const key = `${exchangeId}_${citeId}`;
  if (openCitations.has(key)) {
    closeCitation(exchangeId, citeId);
  } else {
    openCitations.add(key);
    nextTick(() => {
      const panelEl = citationPanelRefs.get(key);
      if (panelEl) {
        gsap.fromTo(
          panelEl,
          { height: 0, opacity: 0 },
          {
            height: "auto",
            opacity: 1,
            duration: DURATIONS.base,
            ease: "precision",
            clearProps: "height",
          },
        );
      }
    });
  }
}

function closeCitation(exchangeId, citeId) {
  const key = `${exchangeId}_${citeId}`;
  const panelEl = citationPanelRefs.get(key);

  if (panelEl) {
    gsap.to(panelEl, {
      height: 0,
      opacity: 0,
      duration: DURATIONS.exitBase,
      ease: "retreat",
      onComplete: () => {
        openCitations.delete(key);
      },
    });
  } else {
    openCitations.delete(key);
  }
}

function isDimmedParagraph(exchangeId, bIdx) {
  // Focus band will handle paragraph dimming
  return false;
}

function handleTraceComplete() {
  isTraceCompleted.value = true;
  if (liveTraceRef.value) {
    liveTraceRef.value.collapseTrace();
  }
  emit("trace-ready");
}

/**
 * Auto-follow scrolling: stops the instant user scrolls up and resumes
 * only when they return to the bottom (§ 05.3)
 */
function handleScroll() {
  const el = viewportRef.value;
  if (!el) return;

  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  isUserScrolledUp.value = distanceFromBottom > 60;
}

function scrollToBottom(animated = true) {
  const el = viewportRef.value;
  if (!el || isUserScrolledUp.value) return;

  if (animated) {
    gsap.to(el, {
      scrollTo: { y: el.scrollHeight, autoKill: true },
      duration: 0.25,
      ease: "precision",
    });
  } else {
    el.scrollTop = el.scrollHeight;
  }
}

// Watch streaming updates and auto-scroll if engaged
watch(
  () => props.liveBlocks,
  () => {
    if (props.isStreaming && !isUserScrolledUp.value) {
      nextTick(() => {
        scrollToBottom(true);
      });
    }
  },
  { deep: true },
);

// Setup ScrollTrigger for Section Counter scroll-spy (§ 06.5)
function setupSectionScrollSpy() {
  if (!viewportRef.value) return;

  // Clear existing triggers
  scrollTriggers.forEach((st) => st.kill());
  scrollTriggers = [];

  headingElements.forEach((el, index) => {
    const st = ScrollTrigger.create({
      trigger: el,
      scroller: viewportRef.value,
      start: "top 30%",
      end: "bottom 30%",
      onEnter: () => emit("section-change", index),
      onEnterBack: () => emit("section-change", index),
    });
    scrollTriggers.push(st);
  });
}

defineExpose({
  viewportRef,
  readingColumnRef,
  userStatementRefs,
  scrollToBottom,
});

onMounted(() => {
  ctx = ctxFor(viewportRef.value, () => {
    nextTick(() => {
      setupSectionScrollSpy();
    });
  });
});

onBeforeUnmount(() => {
  if (ctx) ctx.revert();
  scrollTriggers.forEach((st) => st.kill());
});
</script>

<style scoped>
.editorial-stream-viewport {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-6) var(--space-4) var(--space-12) var(--space-4);
  display: flex;
  justify-content: center;
  position: relative;
  background-color: var(--surface-1);
}

.reading-column {
  width: 100%;
  max-width: var(--stream-max-width);
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  position: relative;
}

.exchange-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  position: relative;
  transition: color 240ms var(--ease-precision);
}

/* User Statement (§ 05.3) */
.user-statement {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.statement-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--type-11);
  color: var(--ink-3);
  letter-spacing: 0.05em;
}

.meta-label {
  font-weight: 600;
  color: var(--ink-2);
}

.meta-sep {
  color: var(--ink-4);
}

.statement-text {
  font-size: var(--type-22);
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.025em;
  color: var(--ink-1);
}

/* Assistant Response (§ 05.3) */
.assistant-response {
  display: flex;
  flex-direction: column;
}

.response-blocks {
  display: flex;
  flex-direction: column;
}

.response-heading {
  font-size: var(--type-17);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ink-1);
  margin-top: var(--space-6);
  margin-bottom: var(--space-3);
}

.response-paragraph-wrap {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-4);
}

.response-paragraph {
  font-size: var(--type-14);
  line-height: 1.68;
  color: var(--ink-1);
  margin-bottom: 0;
  transition: color 240ms var(--ease-precision);
}

.response-paragraph.is-dimmed {
  color: var(--ink-2);
}

/* Citations as real button superscripts (§ 05.3) */
.cite-trigger {
  display: inline-block;
  vertical-align: super;
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-2);
  padding: 0 3px;
  margin: 0 1px;
  line-height: 1;
  background-color: var(--surface-2);
  transition:
    background-color 120ms var(--ease-precision),
    color 120ms var(--ease-precision);
}

.cite-trigger:hover,
.cite-trigger.is-open {
  background-color: var(--ink-1);
  color: var(--ink-inverse);
}

/* Provenance Unfold Excerpt (§ 06.4 Signature 5) */
.provenance-unfold {
  margin-top: var(--space-2);
  margin-bottom: var(--space-2);
  background-color: var(--surface-2);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  overflow: hidden;
}

.provenance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--type-11);
  font-weight: 600;
  color: var(--ink-1);
}

.source-title {
  letter-spacing: 0.04em;
}

.provenance-close {
  font-size: 10px;
  color: var(--ink-3);
}

.provenance-close:hover {
  color: var(--ink-1);
}

.provenance-excerpt {
  font-size: var(--type-12);
  line-height: 1.6;
  color: var(--ink-2);
  margin: 0;
  font-style: normal;
}

.provenance-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 10px;
  color: var(--ink-3);
}

/* Code blocks */
.response-code-wrap {
  margin: var(--space-3) 0 var(--space-4) 0;
  background-color: var(--surface-2);
  padding: var(--space-3) var(--space-4);
  overflow-x: auto;
}

.response-code {
  font-size: var(--type-12);
  line-height: 1.5;
  color: var(--ink-1);
}

/* Wet Ink Cursor (§ 06.4 Signature 4) */
.wet-ink-cursor {
  display: inline-block;
  margin-left: 2px;
  animation: cursorBlink 800ms steps(2, start) infinite;
  color: var(--ink-1);
}

@keyframes cursorBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.interrupted-tag {
  margin-top: var(--space-4);
  font-size: var(--type-11);
  color: var(--ink-3);
}

.stream-bottom-anchor {
  height: var(--space-8);
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

/* Prior exchanges yield to ink-3 (§ 06.4 Signature 1 & 2) */
.exchange-item.is-prior {
  color: var(--ink-2);
}

.exchange-item.is-prior .statement-text {
  color: var(--ink-2);
}

.exchange-item.is-prior .response-paragraph {
  color: var(--ink-2);
}

@media (max-width: 640px) {
  .editorial-stream-viewport {
    padding: var(--space-4) var(--space-2) var(--space-8) var(--space-2);
  }

  .statement-text {
    font-size: var(--type-17);
  }
}
</style>
