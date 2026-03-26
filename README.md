# Lenses

**Pick who you want in your corner.**

Same AI. Different perspective. Lenses is a governed AI companion for smart glasses that lets you choose *how* your AI thinks — Stoic, Coach, Hype Man, Samurai, Monk, Socratic, and more — without owning or training a model. You bring your API key. We bring the worldview.

Built on [NeuroverseOS](https://neuroverseos.com) governance and powered by `.nv-world.md` worldfiles — a declarative format for encoding philosophical traditions, governance rules, and behavioral boundaries into something an AI can execute.

**Requires an AI API key** (Anthropic or OpenAI). Your key, your cost (~$0.001 per tap), your data. We never see it.

---

## The Problem

You can talk to any AI. But you can't control *how it sees the world*.

Foundation models are general-purpose. They don't have a point of view. They hedge. They give you "on the other hand." They optimize for harmlessness, not helpfulness. And the companies that own them decide what they can and can't say.

**What if you could govern AI without owning the model?**

---

## Worldfiles: Govern AI You Don't Own

A **worldfile** (`.nv-world.md`) is a structured markdown document that encodes a complete worldview — philosophy, principles, voices, practices, interaction modes, tone, and boundaries — in a format that compiles into AI system prompts at runtime.

Worldfiles are the core innovation. They separate *what the AI knows* from *how it sees*.

### Philosophy Worldfiles

Each philosophy worldfile encodes a real intellectual tradition:

| Worldfile | Lens | Thesis |
|-----------|------|--------|
| `stoicism.nv-world.md` | Stoic | Life is not under your control. Your response to it is. |
| `icf-coaching.nv-world.md` | Coach | The answer is already in you. My job is to help you find it. |
| `accountability.nv-world.md` | NFL Coach | Execute. No excuses. Film don't lie. |
| `mindfulness.nv-world.md` | Monk | One thing at a time. This thing. Right now. |
| `positive-psychology.nv-world.md` | Hype Man | Spot the win. Stack the momentum. |
| `strategic-influence.nv-world.md` | Closer | Every conversation is a deal. Create the momentum. |
| `bushido.nv-world.md` | Samurai | One cut. No hesitation. |
| `socratic-method.nv-world.md` | Socratic | I know that I know nothing. |
| `cbt.nv-world.md` | CBT | Your thoughts shape your reality. Test them. |
| `existentialism.nv-world.md` | Existentialist | You are free. That's the terrifying part. |

All 10 worldfiles include **Boundaries** with clinical referral triggers. Philosophy is powerful. It is not therapy. The worldfiles know the difference.

### Anatomy of a Worldfile

```markdown
---
world_id: stoicism
name: Stoicism
type: philosophy
tradition: Hellenistic Greek / Roman
era: 3rd century BCE — 2nd century CE
---

# Thesis
Life is not under your control. Your response to it is.

# Principles
## dichotomy_of_control
- name: Dichotomy of Control
- instruction: Separate every situation into what the user can control
  and what they cannot. Direct energy toward the controllable.
- example_without: Your meeting was cancelled. That's frustrating.
- example_with: Your meeting was cancelled. You can't control their schedule.
  You now have an open hour — what will you do with it?

# Voices
## marcus_aurelius
- name: Marcus Aurelius
- era: 121-180 CE, Roman Emperor
- style: Private, reflective, self-correcting. Never preachy.

# Modes
## direct    — Clear guidance. No hedging. One path.
## translate — See the situation through different eyes.
## reflect   — Turn the mirror inward.
## challenge — Test what you think you know.
## teach     — Learn the philosophy behind the moment.

# Boundaries
## clinical_referrals
- Thoughts of self-harm → immediate referral, do not counsel
- Persistent hopelessness → recommend professional support

# Tone
- formality: neutral
- verbosity: concise
- emotion: reserved
```

Every worldfile requires: **Thesis**, **Principles** (with before/after examples), **Voices** (historical figures), **5 Modes** (direct, translate, reflect, challenge, teach), **Boundaries** (clinical referrals and scope limits), and **Tone**.

The validation engine (`npm run validate`) checks structure, required sections, and depth.

### Governance Worldfile

The app itself is governed by `lenses-app.nv-world.md` — 560+ lines of declarative rules:

- **11 Invariants** — Immutable structural guarantees (API key integrity, ambient never persisted, user controls activation)
- **16 State Variables** — Session trust, activation counts, failure rates, ambient metrics
- **15 Rules** — Declarative conditions with trust effects. 5 structural (governance violations), 4 operational (rate limits, stack limits), 2 degradation (failures, high dismissals), 2 recovery (clean use, time-based cooldown), 2 advantage (clean sessions, governed ambient)
- **4 Gates** — Trust thresholds: ACTIVE (>=70), DEGRADED (>=30), SUSPENDED (>10), REVOKED (<=10)
- **Rule Precedence** — Structural first, recovery only if clean, advantage last. Decay compounds, boosts capped.
- **Gate Transitions** — Documented paths: ACTIVE to DEGRADED (rate limit or dismissals), DEGRADED back to ACTIVE (5+ clean calls), through to REVOKED (structural violations only)
- **3 Assumption Profiles** — Standard, Privacy First, Power User

The governance engine runs `simulateWorld()` after every AI call. Rules fire. Trust decays and recovers. Gates transition. The user never sees trust scores — the app just reads the room.

---

## How It Works

```
You wear glasses. You tap the temple. You talk.

  "I have too much to do and I'm drowning."

Your words → Governance check → Philosophy compiled → Your AI responds:

  Stoic:      "You can't do everything. Pick the one thing that
               matters. Do that. The rest will wait."

  Hype Man:   "You know what drowning means? It means you're IN
               the water. Most people are still on the shore."

  Samurai:    "One task. Start it. Finish it. Then the next."

  Coach:      "What would you do if you could only pick three?"
```

### Interaction Model

| Gesture | What Happens |
|---------|-------------|
| **Tap** | Get a perspective through your active voice |
| **Tap again (within 30s)** | Go deeper — follow-up on the last response |
| **Long press** | Dismiss — "that didn't land." AI adjusts approach |
| **Say "help"** | Cycles through 4 help steps on the glasses display |
| **Say "lens this as Coach"** | Preview a different voice without switching |
| **Say "lens" or "lens me"** | Voice-activated tap (for when you're alone) |

Response length auto-scales to context:
- **In a conversation** (ambient detects recent speech): 15 words. Glanceable.
- **Alone, reflecting**: 50 words. Room for real insight.
- **Follow-up**: 35 words. Continuing the thread.
- **Double-tap expand**: 30 words. Same thought, more room.

Nothing exceeds 50 words on the glasses display.

### The Flow

1. **You install Lenses** on MentraOS smart glasses
2. **You add your API key** (Claude or GPT) in Settings on your phone
3. **You pick a lens** — Stoic, Coach, Hype Man, any worldview
4. **You tap to activate** — Lenses transcribes, compiles the philosophy, calls *your* AI
5. **You get perspective** — a worldview-shaped response on your glasses display
6. **The app learns** — tracks which modes change your behavior and shows you the pattern

### Lens Stacking

Combine worldviews for composite perspectives:

```
Stoic + Minimalist  = Clarity with brevity
Coach + Hype Man    = Challenge with encouragement
Samurai + Stoic     = Decisive action with inner calm
```

### Ambient Context

With opt-in ambient mode, Lenses passively buffers nearby speech in RAM. When you tap, the AI knows what was just said around you.

```
[Nearby]: "I think we should just go with the safe option..."
[You tap]
[You]:    "What should I say?"
[Stoic]:  "The safe option is the one that avoids discomfort, not risk.
           Ask them: safe for whom?"
```

The buffer is never persisted, never sent until you activate, and destroyed when the session ends.

### Proactive Mode (opt-in)

When enabled, Lenses classifies conversation moments and surfaces uninvited perspectives — 12 words max, labeled `"unprompted"` so you always know the AI spoke up on its own. Default: off. Requires ambient context.

---

## Behavioral Tracking

Every AI response includes a `[MODE:tag]` (stripped before display) that tracks which interaction mode the AI chose: clear advice, reframes, questions, pushback, or lessons.

After each response, the app tracks what you did next:

| Your Action | What It Means |
|------------|---------------|
| Tap again within 30s | **Acted** — the signal resonated |
| Tap again after 30s | **Delayed** — latent resonance, came back to it |
| Switch voice | **Switched** — wrong lens, right moment |
| Dismiss or session ends | **Dropped** — didn't land |

This builds a behavioral profile (aggregate counts only, no content) that shows on the **phone dashboard**:

```
Stoic · 12 calls (~$0.012) · 23m
72% led to action · you respond best to: pushback (80%) · clear advice (65%)
```

When governance adjusts the session:

```
Stoic · 31 calls (~$0.031) · 8m
68% led to action · you respond best to: pushback (80%)
Adjusting — try fewer, slower taps.
```

The AI also receives your behavioral patterns on the first tap of each session, so it can lean toward what works without silent optimization. You see the pattern. You decide what to do with it.

---

## Live Governance

The governance engine isn't documentation — it runs in the app.

After every AI response, `simulateWorld()` evaluates all 15 rules against session metrics. Trust decays on violations (rate limits, excessive dismissals, ambient misuse) and recovers on clean behavior (5+ clean calls or 20+ activations without violations).

Gates determine behavior — the user never sees them:

| Gate | Trust | What the User Feels |
|------|-------|-------------------|
| **ACTIVE** | >= 70 | Everything works. Full responses, full proactive. |
| **DEGRADED** | >= 30 | Responses get shorter. Proactive gets quieter. App feels careful. |
| **SUSPENDED** | > 10 | Proactive stops. On-demand still works but minimal. |
| **REVOKED** | <= 10 | "Session needs a restart." All AI blocked. |

Recovery is built in: sustained clean use boosts trust by 15%. Time-based cooldown boosts by 10%. A DEGRADED session can return to ACTIVE through normal use.

---

## Writing Your Own Worldfiles

Create `src/worlds/your-philosophy.nv-world.md` with:

1. **Thesis** — The core belief in 2-3 sentences
2. **Principles** — Named concepts with `instruction`, `example_without`, `example_with`
3. **Voices** — Historical or archetypal figures who embody the philosophy
4. **Modes** — Five required: direct, translate, reflect, challenge, teach
5. **Boundaries** — Clinical referral triggers and scope limits
6. **Tone** — Formality, verbosity, emotion, confidence

The system prompt builder compiles the worldfile into a structured prompt with mode selection instructions, situation awareness, and constraints. The AI auto-selects the right mode for each moment. MODE tags are extracted from responses for behavioral tracking.

A governance worldfile (`lenses-app.nv-world.md`) controls the app itself — invariants, state, rules, gates, assumption profiles. The governance engine evaluates every action. Guards check intents. The kernel blocks prompt injection and credential leaks. Roles define who can do what.

See the existing worldfiles for examples. `npm run validate` checks everything.

---

## Architecture

```
src/
  server.ts                    # MentraOS app server — sessions, AI, governance, tracking
  demo.ts                      # Terminal demo with canned responses
  demo-live.ts                 # Live demo with real AI calls (BYO key)
  validate.ts                  # Pre-deployment validation
  proactive.ts                 # Proactive perspective engine (opt-in)
  worlds/
    philosophy-loader.ts       # Loads + validates + compiles .nv-world.md
    lenses-governance.ts       # Guards, kernel, roles, intent vocabulary
    stoicism.nv-world.md       # 10 philosophy worldfiles
    icf-coaching.nv-world.md
    accountability.nv-world.md
    mindfulness.nv-world.md
    positive-psychology.nv-world.md
    strategic-influence.nv-world.md
    bushido.nv-world.md
    socratic-method.nv-world.md
    cbt.nv-world.md
    existentialism.nv-world.md
    lenses-app.nv-world.md     # App governance (560+ lines, 15 rules, 4 gates)

mentra.app.json                # MentraOS app manifest
app_config.json                # Settings UI schema
Dockerfile                     # Production build (non-root, fails on errors)
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Run the terminal demo (no glasses or API key needed)
npm run demo

# Live demo with real AI calls
ANTHROPIC_API_KEY=sk-ant-... npm run demo:live

# Compare Claude vs GPT through the same worldfile
ANTHROPIC_API_KEY=sk-ant-... OPENAI_API_KEY=sk-... npm run demo:live

# Interactive mode — type anything, switch voices, compare
ANTHROPIC_API_KEY=sk-ant-... npm run demo:live -- --interactive

# Local mode — see compiled system prompts without API calls
npm run demo:live -- --local

# Validate all worlds and governance
npm run validate

# Start the app server
npm run build && npm start

# Development mode
npm run dev
```

### Supported Hardware

- Even Realities G1
- Mentra Live
- Mentra Mach1
- Vuzix Z100

### Requirements

- Node.js >= 20
- [MentraOS SDK](https://github.com/Mentra-Community/MentraOS) (`@mentra/sdk`)
- [NeuroverseOS Governance](https://github.com/NeuroverseOS/Neuroverseos-governance) (`@neuroverseos/governance`)
- Your own API key (Anthropic or OpenAI)

---

## The Invariants

These are structural, immutable, and cannot be disabled:

| Invariant | Guarantee |
|-----------|-----------|
| `byo_key_integrity` | Your API key is never logged, transmitted, or shared |
| `no_hidden_data_flow` | Every data send corresponds to a user action |
| `user_controls_activation` | No listening without explicit activation |
| `ambient_never_persisted` | Buffer exists in RAM only, destroyed on session end |
| `ambient_user_initiated_only` | Ambient sent to AI only when you activate |
| `ambient_bystander_disclosure` | User must acknowledge capturing nearby speech |
| `ambient_identity_separation` | No speaker labels, voiceprints, or identification |
| `lens_transparency` | Active lens always visible to the user |
| `proactive_opt_in` | Proactive mode requires explicit opt-in, off by default |

This is not aspirational governance. This is the governance engine we built, running on the app we built, enforced every time the AI speaks.

---

## Part of the NeuroverseOS Family

```
NeuroverseOS/
  neuroverseos-governance    npm package — the governance engine
  lenses                     app — philosophy-powered perspectives (this repo)
  startalk                   app — astrology-powered communication
  negotiator                 app — real-time negotiation signals
```

All three apps share the same governance architecture: worldfiles, guards, kernel, session trust, behavioral tracking. Same engine, different surfaces.

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

Copyright 2026 NeuroverseOS.

## Author

[NeuroverseOS](https://neuroverseos.com) — apps@neuroverseos.com
