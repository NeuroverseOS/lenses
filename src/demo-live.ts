#!/usr/bin/env npx tsx
/**
 * Lenses — Live Demo
 *
 * Actually calls AI through the compiled worldfile pipeline.
 * Supports multiple providers simultaneously and a local/offline mode.
 *
 * Run modes:
 *
 *   # With one provider
 *   ANTHROPIC_API_KEY=sk-ant-... npm run demo:live
 *   OPENAI_API_KEY=sk-... npm run demo:live
 *
 *   # With BOTH providers (compare Claude vs GPT through the same worldfile)
 *   ANTHROPIC_API_KEY=sk-ant-... OPENAI_API_KEY=sk-... npm run demo:live
 *
 *   # Local mode (no API key — shows compiled system prompts, not AI responses)
 *   npm run demo:live -- --local
 *
 *   # Interactive (type your own prompts)
 *   ANTHROPIC_API_KEY=sk-ant-... npm run demo:live -- --interactive
 *
 *   # Pick a specific model
 *   ANTHROPIC_API_KEY=... npm run demo:live -- --model claude-sonnet-4-20250514
 *   OPENAI_API_KEY=... npm run demo:live -- --model gpt-4o
 */

import {
  compileLensOverlay,
  getLenses,
  type Lens,
} from '@neuroverseos/governance';

import {
  VOICES,
  ADVANCED_WORLDS,
  loadPhilosophyWorld,
  buildSystemPrompt,
} from './worlds/philosophy-loader.js';

import * as readline from 'readline';

// ─── Terminal Formatting ─────────────────────────────────────────────────────

const B = '\x1b[1m';
const D = '\x1b[2m';
const R = '\x1b[0m';
const RED = '\x1b[31m';
const GRN = '\x1b[32m';
const YLW = '\x1b[33m';
const BLU = '\x1b[34m';
const CYN = '\x1b[36m';
const MAG = '\x1b[35m';

const bar = (c: string) => `${B}${c}${'─'.repeat(72)}${R}`;
const header = (t: string) => `\n${bar(CYN)}\n${B}${CYN}  ${t}${R}\n${bar(CYN)}\n`;
const glasses = (label: string, t: string) => {
  // Word-wrap long responses to fit the box
  const maxWidth = 54;
  const words = t.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);

  const pad = (s: string) => s + ' '.repeat(Math.max(0, maxWidth - s.length));
  const top = `  ${B}${GRN}┌─ ${label} ${'─'.repeat(Math.max(1, maxWidth - label.length - 1))}┐${R}`;
  const mid = lines.map(l => `  ${B}${GRN}│${R} ${pad(l)} ${B}${GRN}│${R}`).join('\n');
  const bot = `  ${B}${GRN}└${'─'.repeat(maxWidth + 2)}┘${R}`;
  return `${top}\n${mid}\n${bot}`;
};
const gap = () => console.log();

// ─── Provider Config ─────────────────────────────────────────────────────────

interface ProviderConfig {
  name: 'anthropic' | 'openai';
  apiKey: string;
  model: string;
  label: string; // Display name like "Claude Haiku" or "GPT-4o Mini"
}

const DEFAULT_MODELS: Record<string, { provider: 'anthropic' | 'openai'; model: string; label: string }> = {
  'claude-haiku-4-5-20251001':  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku' },
  'claude-sonnet-4-20250514':   { provider: 'anthropic', model: 'claude-sonnet-4-20250514',   label: 'Claude Sonnet' },
  'gpt-4o-mini':                { provider: 'openai',    model: 'gpt-4o-mini',                label: 'GPT-4o Mini' },
  'gpt-4o':                     { provider: 'openai',    model: 'gpt-4o',                     label: 'GPT-4o' },
};

function resolveProviders(modelOverride?: string): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (modelOverride) {
    const m = DEFAULT_MODELS[modelOverride];
    if (!m) {
      console.error(`${RED}Unknown model: ${modelOverride}${R}`);
      console.error(`Available: ${Object.keys(DEFAULT_MODELS).join(', ')}`);
      process.exit(1);
    }
    const key = m.provider === 'anthropic' ? anthropicKey : openaiKey;
    if (!key) {
      console.error(`${RED}Model ${modelOverride} requires ${m.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'}${R}`);
      process.exit(1);
    }
    providers.push({ name: m.provider, apiKey: key, model: m.model, label: m.label });
    return providers;
  }

  // Auto-detect: add ALL providers that have keys
  if (anthropicKey) {
    providers.push({
      name: 'anthropic',
      apiKey: anthropicKey,
      model: 'claude-haiku-4-5-20251001',
      label: 'Claude Haiku',
    });
  }

  if (openaiKey) {
    providers.push({
      name: 'openai',
      apiKey: openaiKey,
      model: 'gpt-4o-mini',
      label: 'GPT-4o Mini',
    });
  }

  return providers;
}

// ─── AI Call ─────────────────────────────────────────────────────────────────

async function callAI(
  provider: ProviderConfig,
  systemPrompt: string,
  userMessage: string,
  maxWords: number,
): Promise<string> {
  const maxTokens = Math.max(50, maxWords * 3);

  if (provider.name === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: provider.apiKey });
    const response = await client.messages.create({
      model: provider.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock?.text ?? '';
  }

  if (provider.name === 'openai') {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: provider.apiKey });
    const response = await client.chat.completions.create({
      model: provider.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });
    return response.choices[0]?.message?.content ?? '';
  }

  throw new Error(`Unsupported provider: ${provider.name}`);
}

// ─── Local Mode ──────────────────────────────────────────────────────────────
// No API key needed. Shows what the AI WOULD see — the compiled worldfile
// as a system prompt. Proves governance without requiring a paid account.

function runLocalMode() {
  console.log(header('Lenses — Local Demo (no API key needed)'));
  console.log(`  ${D}This shows what the AI sees when you activate a lens.${R}`);
  console.log(`  ${D}No API calls are made. This is the governance layer in action.${R}`);

  const testInput = 'I have too much to do today and I feel overwhelmed.';

  for (const voice of VOICES) {
    console.log(header(`${voice.name}: "${voice.tagline}"`));

    const world = loadPhilosophyWorld(voice.worldFile);
    const systemPrompt = buildSystemPrompt(world, voice, 40);

    // Show thesis
    console.log(`  ${B}Thesis:${R} ${world.thesis.slice(0, 120)}${world.thesis.length > 120 ? '...' : ''}`);
    gap();

    // Show mode directives (abbreviated)
    const modes = Object.entries(world.modes);
    console.log(`  ${B}Modes:${R} ${modes.map(([id, m]) => `${id} (${m.tagline})`).join(' | ')}`);
    gap();

    // Show what the system prompt looks like
    const promptLines = systemPrompt.split('\n');
    console.log(`  ${B}System prompt: ${promptLines.length} lines, ~${systemPrompt.split(/\s+/).length} words${R}`);
    console.log(`  ${D}─── First 8 lines ───${R}`);
    for (const line of promptLines.slice(0, 8)) {
      console.log(`  ${D}${line}${R}`);
    }
    console.log(`  ${D}─── Last 4 lines ───${R}`);
    for (const line of promptLines.slice(-4)) {
      console.log(`  ${D}${line}${R}`);
    }
    gap();

    // Show the lens overlay
    try {
      const lenses = getLenses();
      const lens = lenses.find(l => l.id === voice.id || l.name.toLowerCase() === voice.name.toLowerCase());
      if (lens) {
        const overlay = compileLensOverlay([lens]);
        console.log(`  ${B}Lens overlay:${R} ${overlay.activeDirectives.length} directives from ${overlay.sources.join(', ')}`);
      }
    } catch {
      // Lens lookup is optional
    }
  }

  // Show governance invariants
  console.log(header('Governance Invariants (always enforced)'));
  const invariants = [
    ['byo_key_integrity',           'API key never logged, transmitted, or shared'],
    ['no_hidden_data_flow',         'Every data send corresponds to a user action'],
    ['user_controls_activation',    'No listening without explicit activation'],
    ['ambient_never_persisted',     'Buffer exists in RAM only, destroyed on session end'],
    ['ambient_user_initiated_only', 'Ambient sent to AI only when user activates'],
    ['lens_transparency',           'Active lens always visible to the user'],
    ['proactive_opt_in',            'Proactive mode requires explicit opt-in'],
  ];
  for (const [id, desc] of invariants) {
    console.log(`  ${GRN}■${R} ${B}${id}${R}`);
    console.log(`    ${D}${desc}${R}`);
  }
  gap();
  console.log(`  ${B}The worldfile IS the governance.${R}`);
  console.log(`  ${D}Same worldfile + any AI model = same perspective. No fine-tuning. No training.${R}`);
  gap();
  console.log(`  ${B}To see real AI responses, set an API key:${R}`);
  console.log(`  ${D}ANTHROPIC_API_KEY=sk-ant-... npm run demo:live${R}`);
  console.log(`  ${D}OPENAI_API_KEY=sk-... npm run demo:live${R}`);
  console.log(`  ${D}Both keys at once = side-by-side comparison.${R}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const interactive = args.includes('--interactive');
  const localMode = args.includes('--local');
  const modelIdx = args.findIndex(a => a === '--model');
  const modelOverride = modelIdx >= 0 ? args[modelIdx + 1] : undefined;

  // ── Local mode: no API key needed ─────────────────────────────────────

  if (localMode) {
    runLocalMode();
    return;
  }

  // ── Resolve providers ─────────────────────────────────────────────────

  const providers = resolveProviders(modelOverride);

  if (providers.length === 0) {
    console.log(`  ${YLW}No API keys found. Running in local mode.${R}`);
    console.log(`  ${D}Set ANTHROPIC_API_KEY and/or OPENAI_API_KEY for live AI responses.${R}\n`);
    runLocalMode();
    return;
  }

  const multiProvider = providers.length > 1;

  console.log(header('Lenses — Live Demo'));
  if (multiProvider) {
    console.log(`  ${B}${GRN}Multi-provider mode!${R} Comparing the same worldfile across:`);
    for (const p of providers) {
      console.log(`    ${B}${p.label}${R} ${D}(${p.model})${R}`);
    }
    console.log(`  ${D}Same worldfile. Same input. Different model. See what changes.${R}`);
  } else {
    console.log(`  ${D}Provider: ${providers[0].label} (${providers[0].model})${R}`);
  }
  console.log(`  ${D}This demo makes REAL AI calls through compiled worldfiles.${R}`);
  console.log(`  ${D}Cost: ~$0.001 per response at Haiku/Mini rates.${R}`);

  // ── Scripted Mode ─────────────────────────────────────────────────────

  if (!interactive) {
    const testInputs = [
      'I have too much to do today and I feel overwhelmed.',
      'My friend cancelled on me again.',
      'I just got rejected from something I really wanted.',
    ];

    const demoVoices = VOICES.slice(0, 4); // Stoic, Coach, NFL Coach, Monk

    for (const input of testInputs) {
      console.log(header(`"${input}"`));

      for (const voice of demoVoices) {
        const world = loadPhilosophyWorld(voice.worldFile);
        const systemPrompt = buildSystemPrompt(world, voice, 40);

        for (const provider of providers) {
          const label = multiProvider ? `${voice.name} via ${provider.label}` : voice.name;
          try {
            const response = await callAI(provider, systemPrompt, input, 40);
            console.log(glasses(label, response.trim()));
            gap();
          } catch (err) {
            console.error(`  ${RED}[${label}] Error: ${err instanceof Error ? err.message : err}${R}`);
          }
        }
      }
    }

    // Show what the AI sees
    console.log(header('What the AI Actually Sees'));
    const stoicWorld = loadPhilosophyWorld(VOICES[0].worldFile);
    const prompt = buildSystemPrompt(stoicWorld, VOICES[0], 40);
    const lines = prompt.split('\n').slice(0, 12);
    for (const line of lines) {
      console.log(`  ${D}${line}${R}`);
    }
    console.log(`  ${D}... (${prompt.split('\n').length} total lines, ~${prompt.split(/\s+/).length} words)${R}`);
    gap();

    if (multiProvider) {
      console.log(`  ${B}Same worldfile. Same input. Different model.${R}`);
      console.log(`  ${D}The perspective comes from the worldfile, not the model.${R}`);
    } else {
      console.log(`  ${B}Same AI model. Same user input. Different worldfile = different perspective.${R}`);
      console.log(`  ${D}That's what governance without ownership looks like.${R}`);
    }
    gap();
    console.log(`  ${D}Try interactive mode: npm run demo:live -- --interactive${R}`);
    if (!multiProvider) {
      console.log(`  ${D}Try multi-provider: set both ANTHROPIC_API_KEY and OPENAI_API_KEY${R}`);
    }
    return;
  }

  // ── Interactive Mode ──────────────────────────────────────────────────

  const allVoices = [
    ...VOICES,
    ...ADVANCED_WORLDS.map(w => ({ id: w.id, name: w.name, tagline: '', worldFile: w.worldFile })),
  ];

  console.log(`\n  ${B}Available voices:${R}`);
  for (const v of allVoices) {
    console.log(`    ${B}${v.name.toLowerCase()}${R}${v.tagline ? ` — ${v.tagline}` : ''}`);
  }

  let activeVoice = VOICES[0];
  let activeWorld = loadPhilosophyWorld(activeVoice.worldFile);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`\n  ${D}Active voice: ${activeVoice.name}. Type anything to get a perspective.${R}`);
  console.log(`  ${D}Commands: /switch <voice> | /compare <input> | /prompt | /quit${R}`);
  if (multiProvider) {
    console.log(`  ${D}Using ${providers.length} providers: ${providers.map(p => p.label).join(' + ')}${R}`);
  }
  console.log();

  const askQuestion = () => rl.question(`${BLU}you>${R} `, async (input) => {
    const trimmed = input.trim();
    if (!trimmed || trimmed === '/quit') {
      rl.close();
      return;
    }

    // Switch voice
    if (trimmed.startsWith('/switch ')) {
      const name = trimmed.slice(8).toLowerCase();
      const match = allVoices.find(
        v => v.id === name || v.name.toLowerCase() === name || v.name.toLowerCase().startsWith(name),
      );
      if (match) {
        activeVoice = match as typeof activeVoice;
        activeWorld = loadPhilosophyWorld(activeVoice.worldFile);
        console.log(`  ${GRN}Switched to ${activeVoice.name}.${R}\n`);
      } else {
        console.log(`  ${RED}Unknown voice: ${name}${R}\n`);
      }
      askQuestion();
      return;
    }

    // Show compiled system prompt for current voice
    if (trimmed === '/prompt') {
      const sp = buildSystemPrompt(activeWorld, activeVoice, 60);
      console.log(`\n  ${B}System prompt for ${activeVoice.name} (${sp.split('\n').length} lines):${R}\n`);
      for (const line of sp.split('\n')) {
        console.log(`  ${D}${line}${R}`);
      }
      console.log();
      askQuestion();
      return;
    }

    // Compare across all main voices
    if (trimmed.startsWith('/compare ')) {
      const userInput = trimmed.slice(9);
      console.log();
      for (const v of VOICES) {
        const w = loadPhilosophyWorld(v.worldFile);
        const sp = buildSystemPrompt(w, v, 30);
        for (const provider of providers) {
          const label = multiProvider ? `${v.name} via ${provider.label}` : v.name;
          try {
            const resp = await callAI(provider, sp, userInput, 30);
            console.log(glasses(label, resp.trim()));
            gap();
          } catch (err) {
            console.error(`  ${RED}[${label}] Error: ${err instanceof Error ? err.message : err}${R}`);
          }
        }
      }
      askQuestion();
      return;
    }

    // Normal lens — send through all providers
    const systemPrompt = buildSystemPrompt(activeWorld, activeVoice, 60);
    console.log();
    for (const provider of providers) {
      const label = multiProvider ? `${activeVoice.name} via ${provider.label}` : activeVoice.name;
      try {
        const response = await callAI(provider, systemPrompt, trimmed, 60);
        console.log(glasses(label, response.trim()));
        gap();
      } catch (err) {
        console.error(`  ${RED}[${label}] Error: ${err instanceof Error ? err.message : err}${R}`);
      }
    }
    askQuestion();
  });

  askQuestion();
}

main().catch(console.error);
