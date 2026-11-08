import { describe, expect, it } from 'vitest';
import { splitCitations } from './assistant';

describe('splitCitations', () => {
  const keys = new Set(['F1', 'D1']);

  it('separates text and markers', () => {
    expect(splitCitations('Open weekdays [F1].', keys)).toEqual([
      { kind: 'text', text: 'Open weekdays ' },
      { kind: 'cite', key: 'F1' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('expands grouped markers and drops unknown keys', () => {
    expect(splitCitations('See [F1, F9, D1]', keys)).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'cite', key: 'F1' },
      { kind: 'cite', key: 'D1' },
    ]);
  });

  it('leaves ordinary brackets alone', () => {
    expect(splitCitations('Bring [your ID]', keys)).toEqual([{ kind: 'text', text: 'Bring [your ID]' }]);
  });
});
