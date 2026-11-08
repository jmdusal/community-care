import { describe, expect, it } from 'vitest';
import { groupByDay, newIdempotencyKey } from './booking';

describe('newIdempotencyKey', () => {
  it('makes 32-character hex keys that differ each time', () => {
    const a = newIdempotencyKey();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(newIdempotencyKey()).not.toBe(a);
  });
});

describe('groupByDay', () => {
  it('groups by Philippine calendar day, not UTC', () => {
    // 23:30 UTC on Nov 9 is already Nov 10 in Manila (UTC+8).
    const groups = groupByDay([{ starts_at: '2026-11-09T23:30:00Z' }, { starts_at: '2026-11-10T01:00:00Z' }, { starts_at: '2026-11-10T17:00:00Z' }]);
    expect(groups.map((group) => [group.day, group.items.length])).toEqual([['2026-11-10', 2], ['2026-11-11', 1]]);
  });
});
