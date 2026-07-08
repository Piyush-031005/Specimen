# SPECIMEN — Design Language

> The creative constitution. These rules are never negotiated.
> Every visual, animation, audio, and interaction decision is evaluated against this document.

---

## The One Question

Before implementing anything:

> **"Does this make SPECIMEN feel more like an encounter?"**

If yes → build it.
If no → remove it.

---

## Motion

| Rule | Meaning |
|---|---|
| **Never robotic** | No mechanical repetition. Vary timing, vary scale. |
| **Never linear** | No `linear` easing. Ever. |
| **Never bouncy** | No `elastic`, no `spring`, no overshoot. |
| **Never cartoony** | No ease-in-out cubic. No snappy cuts. |
| **Always organic** | Use `organicSine`, `hesitationCurve`, `smootherstep`, `expDecay`. |
| **Always intentional** | Every motion has a reason. Nothing decorative. |

### Approved easing functions (from MathUtils.js)

- `smootherstep` — Perlin's improved interpolation. Feels like silk.
- `easeIn` — Cubic. Feels like hesitation starting.
- `easeOut` — Cubic. Feels like breath released.
- `organicSine` — Asymmetric sine with subtle harmonic. Feels alive.
- `hesitationCurve` — Starts, pauses mid-motion, continues. Feels uncertain.
- `expDecay` — Natural falloff. Feels physical.

### Forbidden easing

- CSS `ease`, `ease-in-out`, `linear`
- `Math.sin` used directly without modification
- Any bounce or elastic function

---

## Entity

| Rule | Meaning |
|---|---|
| **Identity from behavior** | The entity is defined by HOW it responds, not what it looks like. |
| **One geometry** | Not infinite shapes. ONE iconic symbol, drawable from memory. |
| **Breathing, not floating** | Idle motion is breath. Slow. Asymmetric. Alive. |
| **Intentional imperfection** | The entity sometimes hesitates. Sometimes misses its own rhythm. This is not a bug. |
| **Never fully revealed** | Stage 5 is called "The Closest Glimpse" for a reason. |

---

## Communication

| Rule | Meaning |
|---|---|
| **Communication before UI** | If the interaction can be understood through behavior, remove the UI element. |
| **No instructions** | The visitor discovers through doing. Never tell them what to do. |
| **No percentages** | No "Synchronization: 42%". No diagnostics. |
| **One hint only** | After 12 seconds of idle: `...` — then never again. |
| **Silence teaches** | Absence of response is more powerful than error feedback. |

---

## Mystery

| Rule | Meaning |
|---|---|
| **Never explain** | What is the entity? Never answer. |
| **Never fully reveal** | Every stage shows more — but never everything. |
| **No lore** | No backstory. No title screen text. No "about". |
| **Ambiguity is a feature** | The visitor should leave uncertain about what they encountered. |

---

## Audio

| Rule | Meaning |
|---|---|
| **Silence first** | No sound plays until `TIMING.AUDIO_SILENCE_BEFORE_FIRST_PULSE_MS` has passed. |
| **Sound second** | Audio follows behavior. Never leads it. |
| **No music** | No melody. No rhythm track. No soundtrack. |
| **Procedural only** | All sound is generated via Web Audio API. No audio files. |
| **Approved sounds** | Pulse, Hum, Resonance, Breath, Silence |
| **Observing = silence** | When the entity is in the Observing state, audio fades to zero. |

---

## Color Palette

All colors are locked. No new colors introduced after Milestone 0.

| Name | Hex | Usage |
|---|---|---|
| Background | `#050505` | Canvas fill. Always. |
| Warm White | `#F5F0E8` | Entity, text, primary particles |
| Electric Blue | `#4B9FFF` | Stage 1 pulse ripples |
| Soft Violet | `#8B6FCF` | Stage 2 geometry background |
| Warm Gold | `#D4A843` | Stage 3 light particles |

---

## Typography

| Use | Font | Weight |
|---|---|---|
| Hint text | IBM Plex Mono | 300 |
| Any future labels | Inter | 300–400 |

Typography is minimal. The canvas speaks louder than any text.

---

## What SPECIMEN Is Not

This document defines the negative space as strictly as the positive.

- ❌ Not a portfolio
- ❌ Not a game
- ❌ Not a chatbot
- ❌ Not a storytelling site
- ❌ Not a landing page
- ❌ Not an art installation (it responds — it is relational)
- ✅ An encounter between two entities learning to communicate
