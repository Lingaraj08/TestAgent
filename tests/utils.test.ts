import { describe, it, expect } from 'vitest';
import { truncate, formatRelativeTime, groupByDate } from '@/lib/utils';

describe('Shared Utilities', () => {
  it('should truncate strings exceeding length', () => {
    expect(truncate('Hello World', 5)).toBe('Hell…');
    expect(truncate('Short', 10)).toBe('Short');
  });

  it('should format relative times cleanly', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('just now');

    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    expect(formatRelativeTime(tenMinAgo)).toBe('10m ago');

    const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });

  it('should group conversations by date correctly', () => {
    const now = new Date();
    const items = [
      { id: '1', created_at: now.toISOString() },
      { id: '2', created_at: new Date(now.getTime() - 86400000).toISOString() }, // yesterday
    ];

    const grouped = groupByDate(items);
    expect(grouped.length).toBeGreaterThanOrEqual(1);
    expect(grouped[0].label).toBe('Today');
  });
});
