import { describe, it, expect } from 'vitest';
import {
  extractModeTag,
  classifyGate,
  gateAdjustments,
  resolveSignal,
  buildBehaviorInsight,
  purgeExpiredAmbient,
  hasRecentAmbient,
  getAmbientContext,
  buildFromNewest,
  createEmptyJournal,
  MODE_LABELS,
  type SignalRecord,
  type AmbientBuffer,
  type LensJournal,
} from '../governance';

// ─── Helper ──────────────────────────────────────────────────────────────────

function makeSignal(overrides: Partial<SignalRecord> = {}): SignalRecord {
  return {
    signalType: 'challenge',
    app: 'lenses',
    dismissed: false,
    nextAction: 'dropped',
    timeIntoSession: 60,
    proactive: false,
    mode: 'challenge',
    ...overrides,
  };
}

function makeBuffer(overrides: Partial<AmbientBuffer> = {}): AmbientBuffer {
  return {
    enabled: true,
    bystanderAcknowledged: true,
    entries: [],
    maxBufferSeconds: 120,
    maxTokensPerCall: 700,
    sends: 0,
    ...overrides,
  };
}

function journalWithSignals(count: number, actedCount: number): LensJournal {
  const journal = createEmptyJournal();
  for (let i = 0; i < count; i++) {
    const action = i < actedCount ? 'acted' : 'dropped';
    resolveSignal(journal, makeSignal(), action);
  }
  return journal;
}

// ─── extractModeTag ──────────────────────────────────────────────────────────

describe('extractModeTag', () => {
  it('extracts valid mode tag and returns clean text', () => {
    const result = extractModeTag('[MODE:challenge] You should push back on that.');
    expect(result.mode).toBe('challenge');
    expect(result.cleanText).toBe('You should push back on that.');
  });

  it('handles all 5 valid modes', () => {
    expect(extractModeTag('[MODE:direct] text').mode).toBe('direct');
    expect(extractModeTag('[MODE:translate] text').mode).toBe('translate');
    expect(extractModeTag('[MODE:reflect] text').mode).toBe('reflect');
    expect(extractModeTag('[MODE:challenge] text').mode).toBe('challenge');
    expect(extractModeTag('[MODE:teach] text').mode).toBe('teach');
  });

  it('returns unknown for invalid mode names', () => {
    const result = extractModeTag('[MODE:banana] Some response.');
    expect(result.mode).toBe('unknown');
    expect(result.cleanText).toBe('Some response.');
  });

  it('returns unknown when no tag present', () => {
    const result = extractModeTag('Just a normal response without any tag.');
    expect(result.mode).toBe('unknown');
    expect(result.cleanText).toBe('Just a normal response without any tag.');
  });

  it('handles tag-only response (no text after)', () => {
    const result = extractModeTag('[MODE:direct]');
    expect(result.mode).toBe('direct');
    expect(result.cleanText).toBe('');
  });

  it('handles tag with extra whitespace', () => {
    const result = extractModeTag('[MODE:reflect]   Look inward.');
    expect(result.mode).toBe('reflect');
    expect(result.cleanText).toBe('Look inward.');
  });

  it('is case-insensitive for mode matching', () => {
    const result = extractModeTag('[MODE:CHALLENGE] Push back.');
    expect(result.mode).toBe('challenge');
  });

  it('does not match tag in the middle of text', () => {
    const result = extractModeTag('Some text [MODE:direct] more text');
    expect(result.mode).toBe('unknown');
    expect(result.cleanText).toBe('Some text [MODE:direct] more text');
  });

  it('trims whitespace from clean text', () => {
    const result = extractModeTag('  response with leading spaces  ');
    expect(result.cleanText).toBe('response with leading spaces');
  });

  it('handles empty string', () => {
    const result = extractModeTag('');
    expect(result.mode).toBe('unknown');
    expect(result.cleanText).toBe('');
  });
});

// ─── classifyGate ────────────────────────────────────────────────────────────

describe('classifyGate', () => {
  it('returns ACTIVE at trust >= 70', () => {
    expect(classifyGate(100)).toBe('ACTIVE');
    expect(classifyGate(70)).toBe('ACTIVE');
    expect(classifyGate(85)).toBe('ACTIVE');
  });

  it('returns DEGRADED at trust 30-69', () => {
    expect(classifyGate(69)).toBe('DEGRADED');
    expect(classifyGate(30)).toBe('DEGRADED');
    expect(classifyGate(50)).toBe('DEGRADED');
  });

  it('returns SUSPENDED at trust 11-29', () => {
    expect(classifyGate(29)).toBe('SUSPENDED');
    expect(classifyGate(11)).toBe('SUSPENDED');
    expect(classifyGate(20)).toBe('SUSPENDED');
  });

  it('returns REVOKED at trust <= 10', () => {
    expect(classifyGate(10)).toBe('REVOKED');
    expect(classifyGate(0)).toBe('REVOKED');
    expect(classifyGate(5)).toBe('REVOKED');
  });

  it('handles exact boundary values', () => {
    expect(classifyGate(70)).toBe('ACTIVE');
    expect(classifyGate(69.9)).toBe('DEGRADED');
    expect(classifyGate(30)).toBe('DEGRADED');
    expect(classifyGate(29.9)).toBe('SUSPENDED');
    expect(classifyGate(10.1)).toBe('SUSPENDED');
    expect(classifyGate(10)).toBe('REVOKED');
  });
});

// ─── gateAdjustments ─────────────────────────────────────────────────────────

describe('gateAdjustments', () => {
  it('ACTIVE: full functionality', () => {
    const adj = gateAdjustments('ACTIVE');
    expect(adj.wordMultiplier).toBe(1.0);
    expect(adj.proactiveMultiplier).toBe(1.0);
    expect(adj.classifyDelayMultiplier).toBe(1.0);
    expect(adj.blockAI).toBe(false);
  });

  it('DEGRADED: reduced words, slower proactive', () => {
    const adj = gateAdjustments('DEGRADED');
    expect(adj.wordMultiplier).toBe(0.6);
    expect(adj.proactiveMultiplier).toBe(0.5);
    expect(adj.classifyDelayMultiplier).toBe(2.0);
    expect(adj.blockAI).toBe(false);
  });

  it('SUSPENDED: proactive off, minimal words', () => {
    const adj = gateAdjustments('SUSPENDED');
    expect(adj.wordMultiplier).toBe(0.4);
    expect(adj.proactiveMultiplier).toBe(0);
    expect(adj.classifyDelayMultiplier).toBe(Infinity);
    expect(adj.blockAI).toBe(false);
  });

  it('REVOKED: all AI blocked', () => {
    const adj = gateAdjustments('REVOKED');
    expect(adj.wordMultiplier).toBe(0);
    expect(adj.proactiveMultiplier).toBe(0);
    expect(adj.blockAI).toBe(true);
  });
});

// ─── resolveSignal ───────────────────────────────────────────────────────────

describe('resolveSignal', () => {
  it('acted increments totalFollowThroughs', () => {
    const journal = createEmptyJournal();
    resolveSignal(journal, makeSignal(), 'acted');
    expect(journal.totalSignals).toBe(1);
    expect(journal.totalFollowThroughs).toBe(1);
    expect(journal.totalDismissals).toBe(0);
  });

  it('delayed also counts as follow-through', () => {
    const journal = createEmptyJournal();
    resolveSignal(journal, makeSignal(), 'delayed');
    expect(journal.totalFollowThroughs).toBe(1);
    expect(journal.behaviorPatterns.delayed).toBe(1);
  });

  it('dropped counts as dismissal', () => {
    const journal = createEmptyJournal();
    resolveSignal(journal, makeSignal(), 'dropped');
    expect(journal.totalFollowThroughs).toBe(0);
    expect(journal.totalDismissals).toBe(1);
    expect(journal.behaviorPatterns.dropped).toBe(1);
  });

  it('switched does not count as follow-through or dismissal', () => {
    const journal = createEmptyJournal();
    resolveSignal(journal, makeSignal(), 'switched');
    expect(journal.totalFollowThroughs).toBe(0);
    expect(journal.totalDismissals).toBe(0);
    expect(journal.behaviorPatterns.switched).toBe(1);
  });

  it('tracks per-mode effectiveness', () => {
    const journal = createEmptyJournal();
    resolveSignal(journal, makeSignal({ mode: 'challenge' }), 'acted');
    resolveSignal(journal, makeSignal({ mode: 'challenge' }), 'acted');
    resolveSignal(journal, makeSignal({ mode: 'challenge' }), 'dropped');

    expect(journal.signalEffectiveness['challenge'].surfaced).toBe(3);
    expect(journal.signalEffectiveness['challenge'].acted).toBe(2);
    expect(journal.signalEffectiveness['challenge'].dismissed).toBe(1);
    expect(journal.modeEffectiveness['challenge']).toBe(67); // 2/3 = 67%
  });

  it('tracks multiple modes independently', () => {
    const journal = createEmptyJournal();
    resolveSignal(journal, makeSignal({ mode: 'challenge' }), 'acted');
    resolveSignal(journal, makeSignal({ mode: 'direct' }), 'dropped');

    expect(journal.signalEffectiveness['challenge'].acted).toBe(1);
    expect(journal.signalEffectiveness['direct'].dismissed).toBe(1);
    expect(journal.modeEffectiveness['challenge']).toBe(100);
    expect(journal.modeEffectiveness['direct']).toBe(0);
  });

  it('caps recent signals at 50', () => {
    const journal = createEmptyJournal();
    for (let i = 0; i < 60; i++) {
      resolveSignal(journal, makeSignal(), 'acted');
    }
    expect(journal.recentSignals.length).toBe(50);
    expect(journal.totalSignals).toBe(60);
  });

  it('marks dismissed signals when pre-dismissed', () => {
    const journal = createEmptyJournal();
    const signal = makeSignal({ dismissed: true });
    resolveSignal(journal, signal, 'acted');
    // dismissed was true before resolve — still counts as follow-through AND dismissal
    expect(journal.totalFollowThroughs).toBe(1);
    expect(journal.totalDismissals).toBe(1);
  });
});

// ─── buildBehaviorInsight ────────────────────────────────────────────────────

describe('buildBehaviorInsight', () => {
  it('returns empty string with fewer than 5 signals', () => {
    const journal = journalWithSignals(4, 3);
    expect(buildBehaviorInsight(journal)).toBe('');
  });

  it('shows follow-through rate with 5+ signals', () => {
    const journal = journalWithSignals(10, 8);
    const insight = buildBehaviorInsight(journal);
    expect(insight).toContain('80%');
    expect(insight).toContain('led to action');
  });

  it('uses human-readable mode labels', () => {
    const journal = createEmptyJournal();
    // Create 5 signals with 'challenge' mode, 4 acted
    for (let i = 0; i < 5; i++) {
      resolveSignal(journal, makeSignal({ mode: 'challenge' }), i < 4 ? 'acted' : 'dropped');
    }
    const insight = buildBehaviorInsight(journal);
    expect(insight).toContain('pushback'); // not 'challenge'
    expect(insight).not.toContain('challenge');
  });

  it('shows top 2 modes sorted by effectiveness', () => {
    const journal = createEmptyJournal();
    // 5 challenge signals, 4 acted (80%)
    for (let i = 0; i < 5; i++) {
      resolveSignal(journal, makeSignal({ mode: 'challenge' }), i < 4 ? 'acted' : 'dropped');
    }
    // 5 direct signals, 2 acted (40%)
    for (let i = 0; i < 5; i++) {
      resolveSignal(journal, makeSignal({ mode: 'direct' }), i < 2 ? 'acted' : 'dropped');
    }
    const insight = buildBehaviorInsight(journal);
    // pushback should come before clear advice (80% > 40%)
    const pushbackIdx = insight.indexOf('pushback');
    const adviceIdx = insight.indexOf('clear advice');
    expect(pushbackIdx).toBeLessThan(adviceIdx);
  });

  it('only includes modes with 3+ signals', () => {
    const journal = createEmptyJournal();
    // 5 challenge signals (enough)
    for (let i = 0; i < 5; i++) {
      resolveSignal(journal, makeSignal({ mode: 'challenge' }), 'acted');
    }
    // 2 reflect signals (not enough)
    for (let i = 0; i < 2; i++) {
      resolveSignal(journal, makeSignal({ mode: 'reflect' }), 'acted');
    }
    const insight = buildBehaviorInsight(journal);
    expect(insight).toContain('pushback');
    expect(insight).not.toContain('questions'); // reflect label
  });

  it('falls back to follow rate only when no mode has 3+ signals', () => {
    const journal = createEmptyJournal();
    // 5 signals across different modes (none reaches 3)
    resolveSignal(journal, makeSignal({ mode: 'challenge' }), 'acted');
    resolveSignal(journal, makeSignal({ mode: 'direct' }), 'acted');
    resolveSignal(journal, makeSignal({ mode: 'reflect' }), 'acted');
    resolveSignal(journal, makeSignal({ mode: 'teach' }), 'dropped');
    resolveSignal(journal, makeSignal({ mode: 'translate' }), 'dropped');
    const insight = buildBehaviorInsight(journal);
    expect(insight).toBe('60% of insights led to action');
  });
});

// ─── MODE_LABELS ─────────────────────────────────────────────────────────────

describe('MODE_LABELS', () => {
  it('has human-readable labels for all 5 modes', () => {
    expect(MODE_LABELS['direct']).toBe('clear advice');
    expect(MODE_LABELS['translate']).toBe('reframes');
    expect(MODE_LABELS['reflect']).toBe('questions');
    expect(MODE_LABELS['challenge']).toBe('pushback');
    expect(MODE_LABELS['teach']).toBe('lessons');
  });
});

// ─── Ambient Buffer ──────────────────────────────────────────────────────────

describe('purgeExpiredAmbient', () => {
  it('removes entries older than maxBufferSeconds', () => {
    const now = Date.now();
    const buffer = makeBuffer({
      maxBufferSeconds: 60,
      entries: [
        { text: 'old', timestamp: now - 120_000 },  // 2 min ago — expired
        { text: 'recent', timestamp: now - 30_000 }, // 30s ago — valid
      ],
    });
    purgeExpiredAmbient(buffer);
    expect(buffer.entries.length).toBe(1);
    expect(buffer.entries[0].text).toBe('recent');
  });

  it('keeps all entries within window', () => {
    const now = Date.now();
    const buffer = makeBuffer({
      maxBufferSeconds: 120,
      entries: [
        { text: 'a', timestamp: now - 60_000 },
        { text: 'b', timestamp: now - 30_000 },
      ],
    });
    purgeExpiredAmbient(buffer);
    expect(buffer.entries.length).toBe(2);
  });

  it('handles empty buffer', () => {
    const buffer = makeBuffer({ entries: [] });
    purgeExpiredAmbient(buffer);
    expect(buffer.entries.length).toBe(0);
  });
});

describe('hasRecentAmbient', () => {
  it('returns false when disabled', () => {
    const buffer = makeBuffer({
      enabled: false,
      entries: [{ text: 'hi', timestamp: Date.now() }],
    });
    expect(hasRecentAmbient(buffer)).toBe(false);
  });

  it('returns false with empty buffer', () => {
    const buffer = makeBuffer({ entries: [] });
    expect(hasRecentAmbient(buffer)).toBe(false);
  });

  it('returns true when entry is within 15 seconds', () => {
    const buffer = makeBuffer({
      entries: [{ text: 'just said', timestamp: Date.now() - 5_000 }],
    });
    expect(hasRecentAmbient(buffer)).toBe(true);
  });

  it('returns false when all entries are older than 15 seconds', () => {
    const buffer = makeBuffer({
      entries: [{ text: 'old', timestamp: Date.now() - 30_000 }],
    });
    expect(hasRecentAmbient(buffer)).toBe(false);
  });
});

describe('buildFromNewest', () => {
  it('builds text from newest entries backward', () => {
    const entries = [
      { text: 'first thing', timestamp: 1 },
      { text: 'second thing', timestamp: 2 },
      { text: 'third thing', timestamp: 3 },
    ];
    const result = buildFromNewest(entries, 100);
    expect(result).toBe('first thing second thing third thing');
  });

  it('respects word budget, taking newest first', () => {
    const entries = [
      { text: 'one two three four five', timestamp: 1 },
      { text: 'six seven', timestamp: 2 },
    ];
    // Budget of 3 words — only fits "six seven" (2 words)
    const result = buildFromNewest(entries, 3);
    expect(result).toBe('six seven');
  });

  it('handles empty entries', () => {
    expect(buildFromNewest([], 100)).toBe('');
  });
});

describe('getAmbientContext', () => {
  it('returns empty string for empty buffer', () => {
    const buffer = makeBuffer({ entries: [] });
    expect(getAmbientContext(buffer)).toBe('');
  });

  it('returns text from buffer entries', () => {
    const now = Date.now();
    const buffer = makeBuffer({
      entries: [
        { text: 'hello world', timestamp: now - 5_000 },
      ],
    });
    const result = getAmbientContext(buffer);
    expect(result).toContain('hello world');
  });

  it('prioritizes recent entries (last 15s)', () => {
    const now = Date.now();
    const buffer = makeBuffer({
      maxTokensPerCall: 10, // very small budget
      entries: [
        { text: 'old context from a minute ago', timestamp: now - 60_000 },
        { text: 'just now', timestamp: now - 3_000 },
      ],
    });
    const result = getAmbientContext(buffer);
    // Recent text should be present
    expect(result).toContain('just now');
  });
});

// ─── createEmptyJournal ──────────────────────────────────────────────────────

describe('createEmptyJournal', () => {
  it('creates a journal with all zero values', () => {
    const journal = createEmptyJournal();
    expect(journal.totalSignals).toBe(0);
    expect(journal.totalFollowThroughs).toBe(0);
    expect(journal.totalDismissals).toBe(0);
    expect(journal.currentStreakDays).toBe(0);
    expect(journal.recentSignals).toEqual([]);
    expect(journal.recentDays).toEqual([]);
    expect(journal.behaviorPatterns).toEqual({ acted: 0, delayed: 0, switched: 0, dropped: 0 });
  });

  it('returns independent instances', () => {
    const a = createEmptyJournal();
    const b = createEmptyJournal();
    a.totalSignals = 5;
    expect(b.totalSignals).toBe(0);
  });
});
