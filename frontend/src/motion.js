/**
 * ============================================================================
 * KNOWLEDGE SYSTEMS — MOTION SYSTEM & GRAMMAR ENGINE
 * ============================================================================
 *
 * Single source of truth for motion. All plugins are registered once here.
 * Four verbs govern all animations:
 *   1. DETENT  — Snaps into a definite state (fast approach, crisp settle).
 *   2. RESOLVE — Characters scramble through restricted glyphs, locking left-to-right.
 *   3. UNVEIL  — Content revealed from overflow:hidden masks.
 *   4. YIELD   — Tonal drop (ink-1 -> ink-3), never movement.
 *
 * Exits run at roughly 60% of the duration of their entrances.
 * Supports URL parameter `?timescale=0.25` for choreography inspection.
 */

import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

// Register all required plugins once
gsap.registerPlugin(
  Flip,
  ScrollToPlugin,
  ScrollTrigger,
  SplitText,
  ScrambleTextPlugin,
  CustomEase,
  DrawSVGPlugin,
);

// Check URL timescale inspection query parameter (e.g. ?timescale=0.25)
if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  const ts = params.get("timescale");
  if (ts) {
    const parsed = parseFloat(ts);
    if (!isNaN(parsed) && parsed > 0) {
      gsap.globalTimeline.timeScale(parsed);
      console.info(
        `[Knowledge Systems Motion] Global timescale set to ${parsed}`,
      );
    }
  }
}

// ----------------------------------------------------------------------------
// NAMED CUSTOM EASES (§ 06.2)
// ----------------------------------------------------------------------------
CustomEase.create("precision", "0.22, 1, 0.36, 1");
CustomEase.create("detent", "0.3, 0, 0, 1");
CustomEase.create("retreat", "0.4, 0, 1, 1");

// Global GSAP defaults and ticker stabilization
gsap.defaults({
  ease: "precision",
  duration: 0.32,
  overwrite: "auto",
});
gsap.ticker.lagSmoothing(500, 33);

// ----------------------------------------------------------------------------
// DURATIONS & GLYPH SETS
// ----------------------------------------------------------------------------
export const DURATIONS = {
  instant: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.48,
  scene: 0.7,
  // Exit durations calibrated at ~60% of entrance
  exitFast: 0.12,
  exitBase: 0.19,
  exitSlow: 0.28,
};

export const SCRAMBLE_GLYPHS = "0123456789ABCDEF·:/_";

/**
 * Checks if user prefers reduced motion
 */
export function reduced() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Creates a scoped GSAP Context for clean component lifecycle management.
 * Call ctx.revert() in onBeforeUnmount.
 */
export function ctxFor(scopeRef, fn) {
  return gsap.context(fn, scopeRef);
}

// ----------------------------------------------------------------------------
// GRAMMAR VERB HELPERS (§ 06.1 & 06.2)
// ----------------------------------------------------------------------------

/**
 * VERB: DETENT
 * Something snaps into a definite state with fast approach and crisp settle.
 */
export function detent(target, vars = {}) {
  if (reduced()) {
    return gsap.set(target, vars);
  }
  return gsap.to(target, {
    ease: "detent",
    duration: vars.duration || DURATIONS.fast,
    overwrite: "auto",
    ...vars,
  });
}

/**
 * VERB: RESOLVE
 * Uncertain information becomes true. Characters scramble through restricted glyphs
 * then lock left-to-right.
 */
export function resolveText(target, text, vars = {}) {
  if (reduced()) {
    if (typeof target === "string") {
      const el = document.querySelector(target);
      if (el) el.textContent = text;
    } else if (target && "textContent" in target) {
      target.textContent = text;
    }
    if (vars.onComplete) vars.onComplete();
    return;
  }

  return gsap.to(target, {
    duration: vars.duration || DURATIONS.base,
    ease: "precision",
    scrambleText: {
      text,
      chars: SCRAMBLE_GLYPHS,
      speed: vars.speed || 0.6,
      revealDelay: vars.revealDelay || 0.08,
      delimiter: "",
    },
    ...vars,
  });
}

/**
 * VERB: UNVEIL
 * Content is revealed from an overflow:hidden mask.
 * Can reveal split lines or block elements.
 */
export function unveilLines(target, vars = {}) {
  if (reduced()) {
    return gsap.set(target, { opacity: 1, y: 0 });
  }

  return gsap.fromTo(
    target,
    {
      y: vars.y || "110%",
      opacity: vars.fade ? 0 : 1,
    },
    {
      y: "0%",
      opacity: 1,
      duration: vars.duration || DURATIONS.base,
      ease: "precision",
      stagger: vars.stagger !== undefined ? vars.stagger : 0.024,
      overwrite: "auto",
      ...vars,
    },
  );
}

/**
 * VERB: YIELD
 * Something steps back so something else can lead. A tonal drop, NEVER movement.
 * e.g. ink-1 -> ink-3 or active -> dimmed.
 */
export function yieldTo(target, inkToken = "var(--ink-3)", vars = {}) {
  if (reduced()) {
    return gsap.set(target, { color: inkToken });
  }

  return gsap.to(target, {
    color: inkToken,
    duration: vars.duration || DURATIONS.fast,
    ease: "precision",
    overwrite: "auto",
    ...vars,
  });
}

export {
  gsap,
  Flip,
  ScrollToPlugin,
  ScrollTrigger,
  SplitText,
  ScrambleTextPlugin,
  CustomEase,
  DrawSVGPlugin,
};
