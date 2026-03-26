#!/usr/bin/env npx tsx
/**
 * Lenses — Live Demo
 *
 * Unlike the standard demo (which uses canned responses), this one
 * actually calls your AI through the compiled worldfile pipeline.
 * You can see the REAL difference worldfiles make to AI behavior.
 *
 * Run:
 *   ANTHROPIC_API_KEY=sk-ant-... npm run demo:live
 *   OPENAI_API_KEY=sk-... npm run demo:live -- --provider openai
 *
 * Or interactively (type your own prompts):
 *   ANTHROPIC_API_KEY=sk-ant-... npm run demo:live -- --interactive
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
} from './worlds/philosophy-loader';

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
const glasses = (voice: string, t: string) => `  ${B}${GRN}┌─ ${voice} ──────────────────────────────────────────────┐${R}\n  ${B}${GRN}│${R} ${t}\n  ${B}${GRN}└────────────────────────────────────────────────────────┘${R}`;
const gap = () => console.log();

// ─── AI Call ─────────────────────────────────────────────────────────────────

type Provider = 'anthropic' | 'openai';

async function callAI(
  provider: Provider,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxWords: number,
): Promise<string> {
  const maxTokens = Math.max(50, maxWords * 3);

  if (provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock?.text ?? '';
  }

  if (provider === 'openai') {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });
    return response.choices[0]?.message?.content ?? '';
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const interactive = args.includes('--interactive');
  const providerArg = args.find((_, i) => args[i - 1] === '--provider') as Provider | undefined;
  const provider: Provider = providerArg ?? (process.env.OPENAI_API_KEY ? 'openai' : 'anthropic');

  const apiKey = provider === 'anthropic'
    ? process.env.ANTHROPIC_API_KEY
    : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error(`${RED}Missing API key.${R}`);
    console.error(`Set ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'} environment variable.`);
    console.error(`\nExample: ${D}ANTHROPIC_API_KEY=sk-ant-... npm run demo:live${R}`);
    process.exit(1);
  }

  const model = provider === 'anthropic' ? 'claude-haiku-4-5-20251001' : 'gpt-4o-mini';

  console.log(header('Lenses — Live Demo'));
  console.log(`  ${D}Provider: ${provider} (${model})${R}`);
  console.log(`  ${D}This demo makes REAL AI calls through compiled worldfiles.${R}`);
  console.log(`  ${D}Cost: ~$0.001 per response at Haiku rates.${R}`);

  // ── Scripted Mode: same input through every voice ─────────────────────

  if (!interactive) {
    const testInputs = [
      'I have too much to do today and I feel overwhelmed.',
      'My friend cancelled on me again.',
      'I just got rejected from something I really wanted.',
    ];

    // Pick a subset of voices for the comparison
    const demoVoices = VOICES.slice(0, 4); // Stoic, Coach, NFL Coach, Monk

    for (const input of testInputs) {
      console.log(header(`"${input}"`));

      for (const voice of demoVoices) {
        const world = loadPhilosophyWorld(voice.worldFile);
        const systemPrompt = buildSystemPrompt(world, voice, 40);

        try {
          const response = await callAI(provider, apiKey, model, systemPrompt, input, 40);
          console.log(glasses(voice.name, response.trim()));
          gap();
        } catch (err) {
          console.error(`  ${RED}[${voice.name}] Error: ${err instanceof Error ? err.message : err}${R}`);
        }
      }
    }

    // ── Show the actual system prompt for one voice ─────────────────────

    console.log(header('What the AI Actually Sees'));
    const stoicWorld = loadPhilosophyWorld(VOICES[0].worldFile);
    const prompt = buildSystemPrompt(stoicWorld, VOICES[0], 40);
    const lines = prompt.split('\n').slice(0, 15);
    for (const line of lines) {
      console.log(`  ${D}${line}${R}`);
    }
    console.log(`  ${D}... (${prompt.split('\n').length} total lines)${R}`);
    gap();
    console.log(`  ${B}Same AI model. Same user input. Different worldfile = different perspective.${R}`);
    console.log(`  ${D}That's what governance without ownership looks like.${R}`);
    gap();
    console.log(`  ${D}Try interactive mode: ANTHROPIC_API_KEY=... npm run demo:live -- --interactive${R}`);
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

  let activeVoice = VOICES[0]; // Default: Stoic
  let activeWorld = loadPhilosophyWorld(activeVoice.worldFile);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`\n  ${D}Active voice: ${activeVoice.name}. Type anything to get a perspective.${R}`);
  console.log(`  ${D}Commands: /switch <voice> | /compare <input> | /quit${R}\n`);

  const prompt = () => rl.question(`${BLU}you>${R} `, async (input) => {
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
      prompt();
      return;
    }

    // Compare across all main voices
    if (trimmed.startsWith('/compare ')) {
      const userInput = trimmed.slice(9);
      console.log();
      for (const v of VOICES) {
        const w = loadPhilosophyWorld(v.worldFile);
        const sp = buildSystemPrompt(w, v, 30);
        try {
          const resp = await callAI(provider, apiKey, model, sp, userInput, 30);
          console.log(glasses(v.name, resp.trim()));
          gap();
        } catch (err) {
          console.error(`  ${RED}[${v.name}] Error: ${err instanceof Error ? err.message : err}${R}`);
        }
      }
      prompt();
      return;
    }

    // Normal lens
    const systemPrompt = buildSystemPrompt(activeWorld, activeVoice, 60);
    try {
      const response = await callAI(provider, apiKey, model, systemPrompt, trimmed, 60);
      console.log();
      console.log(glasses(activeVoice.name, response.trim()));
      console.log();
    } catch (err) {
      console.error(`  ${RED}Error: ${err instanceof Error ? err.message : err}${R}`);
    }
    prompt();
  });

  prompt();
}

main().catch(console.error);
