# Lenses

**Pick who you want in your corner.**

Same AI. Different perspective. Lenses is a governed AI companion for smart glasses that lets you choose *how* your AI thinks — Stoic, Coach, Hype Man, Samurai, Monk, Socratic, and more — without owning or training a model. You bring your API key. We bring the worldview.

Built on [NeuroverseOS](https://neuroverseos.com) and powered by `.nv-world.md` worldfiles — a declarative format for encoding entire philosophical traditions, governance rules, and behavioral boundaries into something an AI can execute.

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

### Anatomy of a Worldfile

```markdown
---
world_id: stoicism
name: Stoicism
type: philosophy
origin: tradition
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

Every worldfile includes **Boundaries** — hard limits on what the lens will and won't do, including clinical referral triggers. Philosophy is powerful. It is not therapy. The worldfiles know the difference.

### Governance Worldfiles

The app itself is governed by `lenses-app.nv-world.md` — 500+ lines of declarative rules covering:

- **Invariants** — Immutable structural guarantees (API key never leaves device, ambient speech never persisted, user always controls activation)
- **State** — Session trust score, activation counts, failure rates
- **Rules** — Declarative conditions ("When `ai_calls_made > 10` in 60s, `session_trust *= 0.80`")
- **Gates** — Trust thresholds that determine app behavior (ACTIVE / DEGRADED / SUSPENDED / REVOKED)
- **Guards** — Intent-based blocking (structural, operational, advisory, reward)

Three layers of governance, top wins:

```
1. User Rules     — Your personal cross-app governance (you are king)
2. Platform World — MentraOS enforces hardware + session safety
3. App World      — Lenses-specific behavior rules
```

The governance engine evaluates *every action before it happens*. An AI call that violates a guard never leaves the device.

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

### The Flow

1. **You install Lenses** on MentraOS smart glasses
2. **You bring your own API key** (Claude or GPT) — your key, your cost, your data
3. **You pick a lens** — Stoic, Coach, Hype Man, any worldview
4. **You tap to activate** — Lenses listens, transcribes, compiles the philosophy into a system prompt, calls *your* AI
5. **You get perspective** — not generic advice, but a *worldview-shaped response* on your glasses display
6. **Everything stays local** — NeuroverseOS sees nothing. No conversations, no ambient data, no keys.

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

---

## Building World View Models

Worldfiles are a framework for encoding *any* perspective into executable AI governance. This goes beyond Lenses — it's a pattern for building world view POVs at scale.

### Why Worldfiles Work

**Structured, not freeform.** A worldfile isn't a prompt. It's a schema — thesis, principles with examples, named voices with historical grounding, five interaction modes with behavioral directives, tone metadata, and hard boundaries. The structure forces rigor.

**Composable.** Stack multiple worldfiles. The lens compiler merges their directives. This lets you build composite perspectives that don't exist in any single tradition.

**Governed.** Every worldfile includes boundaries — what the lens *won't* do. Clinical referrals. Scope limits. Complementary traditions for when another worldview is more appropriate. Perspective without guardrails is just noise.

**Portable.** A worldfile is markdown. It doesn't depend on a specific model, provider, or platform. The same `stoicism.nv-world.md` works with Claude, GPT, or any future model. The philosophy travels.

**Versionable.** Worldfiles have version numbers, world IDs, and structured metadata. You can track how a worldview evolves. You can diff philosophical changes. You can PR a new principle.

### Write Your Own

Create `src/worlds/your-philosophy.nv-world.md` with:

1. **Thesis** — The core belief in 2-3 sentences
2. **Principles** — Named concepts with `instruction`, `example_without`, `example_with`
3. **Voices** — Historical or archetypal figures who embody the philosophy
4. **Modes** — How the lens responds: direct, translate, reflect, challenge, teach
5. **Boundaries** — When to stop. When to refer. What this lens is *not*.
6. **Tone** — Formality, verbosity, emotion, confidence

The validation engine (`npm run validate`) checks structure, required sections, and depth.

---

## Architecture

```
src/
  server.ts                    # MentraOS app server — sessions, AI calls, governance
  demo.ts                      # Interactive terminal demo of the full system
  validate.ts                  # Pre-deployment validation of all worlds + governance
  proactive.ts                 # Proactive perspective engine (opt-in)
  worlds/
    philosophy-loader.ts       # Loads + validates + compiles .nv-world.md → system prompts
    lenses-governance.ts       # Governance guards, kernel, roles, trust scoring
    stoicism.nv-world.md       # Philosophy worldfiles (10 traditions)
    icf-coaching.nv-world.md
    accountability.nv-world.md
    mindfulness.nv-world.md
    positive-psychology.nv-world.md
    strategic-influence.nv-world.md
    bushido.nv-world.md
    socratic-method.nv-world.md
    cbt.nv-world.md
    existentialism.nv-world.md
    lenses-app.nv-world.md     # App governance worldfile (500+ lines)

mentra.app.json                # MentraOS app manifest
app_config.json                # Settings UI schema
```

---

## Governance Without Ownership

This is the thesis of NeuroverseOS worldfiles:

**You don't need to own the model to govern it.**

Lenses proves this with four mechanisms:

1. **Prompt compilation** — Philosophy worldfiles compile into system prompt overlays. The AI doesn't know Stoicism. The worldfile *teaches it*, every time, in the context window. No fine-tuning. No training data. Just structured perspective injection.

2. **Local guard evaluation** — All governance runs on the device before the API call. If a guard blocks an action, the data never leaves the phone. The AI provider sees nothing.

3. **BYO-Key** — The user owns the AI relationship. NeuroverseOS provides the perspective and the governance. The user provides the model and pays the cost (~$0.001 per activation at Haiku rates).

4. **Session trust scoring** — A real-time trust score decays on violations and improves on clean behavior. Gates (ACTIVE/DEGRADED/SUSPENDED/REVOKED) restrict functionality based on trust. No human review needed — the governance is algorithmic and immediate.

The result: a governed AI companion where **the user owns everything** — their data, their API key, their governance rules, their perspective — and NeuroverseOS owns nothing except the philosophy and the enforcement layer.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run the interactive demo (no glasses or API key needed)
npm run demo

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
- MentraOS SDK
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
| `phone_local_journal_only` | Only aggregate counts stored, on your phone, deletable |
| `proactive_opt_in` | Proactive mode requires explicit opt-in, off by default |

This is not aspirational governance. This is the governance engine we built, running on the app we built, enforced every time the AI speaks.

---

## License

See [LICENSE](LICENSE) for details.

## Author

[NeuroverseOS](https://neuroverseos.com) — apps@neuroverseos.com
