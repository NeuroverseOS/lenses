/**
 * Lenses — Pure Governance Logic
 *
 * Extracted from server.ts for testability. All functions here are pure —
 * no SDK dependencies, no I/O, no side effects. This is the math
 * that powers the governance engine, behavioral tracking, and dashboard.
 *
 * Tested by: src/__tests__/governance.test.ts
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export const VALID_MODES = ['direct', 'translate', 'reflect', 'challenge', 'teach'] as const;
export type ResponseMode = typeof VALID_MODES[number];

export type NextAction = 'acted' | 'delayed' | 'switched' | 'dropped';
export type GovernanceGate = 'ACTIVE' | 'DEGRADED' | 'SUSPENDED' | 'REVOKED';

export interface SignalRecord {
  signalType: string;
  app: 'lenses';
  dismissed: boolean;
  nextAction: NextAction;
  timeIntoSession: number;
  proactive: boolean;
  mode: ResponseMode | 'unknown';
}

export interface GovernanceState {
  sessionTrust: number;
  gate: GovernanceGate;
}

export interface SignalEffectiveness {
  surfaced: number;
  acted: number;
  dismissed: number;
}

export interface LensJournal {
  totalSignals: number;
  totalFollowThroughs: number;
  totalDismissals: number;
  currentStreakDays: number;
  lastSessionDate: string;
  signalEffectiveness: Record<string, SignalEffectiveness>;
  behaviorPatterns: {
    acted: number;
    delayed: number;
    switched: number;
    dropped: number;
  };
  modeEffectiveness: Record<string, number>;
  recentSignals: SignalRecord[];
  recentDays: Array<{
    date: string;
    lenses: number;
    dismissals: number;
    followUps: number;
    voiceUsed: string;
  }>;
}

export interface AmbientEntry {
  text: string;
  timestamp: number;
}

export interface AmbientBuffer {
  enabled: boolean;
  bystanderAcknowledged: boolean;
  entries: AmbientEntry[];
  maxBufferSeconds: number;
  maxTokensPerCall: number;
  sends: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODE_TAG_PATTERN = /^\[MODE:(\w+)\]\s*/;
const MAX_RECENT_SIGNALS = 50;
const RECENCY_BOOST_SECONDS = 15;

export const ESTIMATED_COST_PER_CALL = 0.001;

export const MODE_LABELS: Record<string, string> = {
  direct: 'clear advice',
  translate: 'reframes',
  reflect: 'questions',
  challenge: 'pushback',
  teach: 'lessons',
};

// ─── Mode Tag Extraction ─────────────────────────────────────────────────────

/**
 * Strip [MODE:xxx] tag from AI response and return the mode + clean text.
 * If no valid tag found, returns 'unknown' mode and original text.
 */
export function extractModeTag(text: string): { mode: ResponseMode | 'unknown'; cleanText: string } {
  const match = text.match(MODE_TAG_PATTERN);
  if (match) {
    const modeCandidate = match[1].toLowerCase();
    const mode = VALID_MODES.includes(modeCandidate as ResponseMode)
      ? (modeCandidate as ResponseMode)
      : 'unknown';
    return { mode, cleanText: text.replace(MODE_TAG_PATTERN, '').trim() };
  }
  return { mode: 'unknown', cleanText: text.trim() };
}

// ─── Governance Gate Classification ──────────────────────────────────────────

export function classifyGate(trust: number): GovernanceGate {
  if (trust >= 70) return 'ACTIVE';
  if (trust >= 30) return 'DEGRADED';
  if (trust > 10) return 'SUSPENDED';
  return 'REVOKED';
}

/**
 * Apply gate-based behavioral adjustments.
 * The user never sees gates. They feel the app adjust.
 */
export function gateAdjustments(gate: GovernanceGate): {
  wordMultiplier: number;
  proactiveMultiplier: number;
  classifyDelayMultiplier: number;
  blockAI: boolean;
} {
  switch (gate) {
    case 'ACTIVE':
      return { wordMultiplier: 1.0, proactiveMultiplier: 1.0, classifyDelayMultiplier: 1.0, blockAI: false };
    case 'DEGRADED':
      return { wordMultiplier: 0.6, proactiveMultiplier: 0.5, classifyDelayMultiplier: 2.0, blockAI: false };
    case 'SUSPENDED':
      return { wordMultiplier: 0.4, proactiveMultiplier: 0, classifyDelayMultiplier: Infinity, blockAI: false };
    case 'REVOKED':
      return { wordMultiplier: 0, proactiveMultiplier: 0, classifyDelayMultiplier: Infinity, blockAI: true };
  }
}

// ─── Signal Resolution ───────────────────────────────────────────────────────

/**
 * Resolve a pending signal — record what the user did after receiving it.
 * Returns the updated journal. Pure function — no side effects.
 */
export function resolveSignal(
  journal: LensJournal,
  signal: SignalRecord,
  action: NextAction,
): LensJournal {
  signal.nextAction = action;
  signal.dismissed = action === 'dropped' || signal.dismissed;

  journal.totalSignals++;

  if (action === 'acted' || action === 'delayed') {
    journal.totalFollowThroughs++;
  }
  if (signal.dismissed) {
    journal.totalDismissals++;
  }

  // Update signal effectiveness for this mode
  if (!journal.signalEffectiveness[signal.mode]) {
    journal.signalEffectiveness[signal.mode] = { surfaced: 0, acted: 0, dismissed: 0 };
  }
  const eff = journal.signalEffectiveness[signal.mode];
  eff.surfaced++;
  if (action === 'acted' || action === 'delayed') eff.acted++;
  if (signal.dismissed) eff.dismissed++;

  // Update behavioral patterns
  journal.behaviorPatterns[action]++;

  // Update mode effectiveness (follow-through rate)
  if (eff.surfaced > 0) {
    journal.modeEffectiveness[signal.mode] = Math.round((eff.acted / eff.surfaced) * 100);
  }

  // Add to recent signals (rolling window)
  journal.recentSignals.push(signal);
  if (journal.recentSignals.length > MAX_RECENT_SIGNALS) {
    journal.recentSignals = journal.recentSignals.slice(-MAX_RECENT_SIGNALS);
  }

  return journal;
}

// ─── Dashboard Insights ──────────────────────────────────────────────────────

/**
 * Build a user-visible behavior insight from the journal.
 * Uses human-readable mode labels. Shows after 5+ signals.
 */
export function buildBehaviorInsight(journal: LensJournal): string {
  if (journal.totalSignals < 5) return '';

  const followRate = Math.round((journal.totalFollowThroughs / journal.totalSignals) * 100);

  const modeEntries = Object.entries(journal.signalEffectiveness)
    .filter(([_, data]) => data.surfaced >= 3)
    .map(([mode, data]) => ({
      mode,
      label: MODE_LABELS[mode] ?? mode,
      rate: Math.round((data.acted / data.surfaced) * 100),
    }))
    .sort((a, b) => b.rate - a.rate);

  if (modeEntries.length === 0) {
    return `${followRate}% of insights led to action`;
  }

  const topModes = modeEntries.slice(0, 2)
    .map(m => `${m.label} (${m.rate}%)`)
    .join(' · ');

  return `${followRate}% led to action · you respond best to: ${topModes}`;
}

// ─── Ambient Buffer ──────────────────────────────────────────────────────────

export function purgeExpiredAmbient(buffer: AmbientBuffer): void {
  const cutoff = Date.now() - (buffer.maxBufferSeconds * 1000);
  buffer.entries = buffer.entries.filter(e => e.timestamp >= cutoff);
}

export function hasRecentAmbient(buffer: AmbientBuffer): boolean {
  if (!buffer.enabled || buffer.entries.length === 0) return false;
  const recentCutoff = Date.now() - (RECENCY_BOOST_SECONDS * 1000);
  return buffer.entries.some(e => e.timestamp >= recentCutoff);
}

export function buildFromNewest(entries: AmbientEntry[], maxWords: number): string {
  const parts: string[] = [];
  let wordCount = 0;

  for (let i = entries.length - 1; i >= 0; i--) {
    const words = entries[i].text.split(/\s+/);
    if (wordCount + words.length > maxWords) break;
    parts.unshift(entries[i].text);
    wordCount += words.length;
  }

  return parts.join(' ');
}

export function getAmbientContext(buffer: AmbientBuffer): string {
  purgeExpiredAmbient(buffer);

  if (buffer.entries.length === 0) return '';

  const now = Date.now();
  const recentCutoff = now - (RECENCY_BOOST_SECONDS * 1000);

  const recent = buffer.entries.filter(e => e.timestamp >= recentCutoff);
  const older = buffer.entries.filter(e => e.timestamp < recentCutoff);

  const maxWords = Math.floor(buffer.maxTokensPerCall * 0.75);
  const recentBudget = Math.floor(maxWords * 0.75);
  const olderBudget = maxWords - recentBudget;

  const recentText = buildFromNewest(recent, recentBudget);
  const olderText = buildFromNewest(older, olderBudget);

  const parts = [olderText, recentText].filter(Boolean);
  return parts.join(' ');
}

// ─── Empty Journal ───────────────────────────────────────────────────────────

export function createEmptyJournal(): LensJournal {
  return {
    totalSignals: 0,
    totalFollowThroughs: 0,
    totalDismissals: 0,
    currentStreakDays: 0,
    lastSessionDate: '',
    signalEffectiveness: {},
    behaviorPatterns: { acted: 0, delayed: 0, switched: 0, dropped: 0 },
    modeEffectiveness: {},
    recentSignals: [],
    recentDays: [],
  };
}
