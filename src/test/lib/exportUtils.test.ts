import { describe, it, expect } from 'vitest';
import { toCSV, formatDateForExport, formatCurrencyForExport } from '@/lib/exportUtils';

describe('toCSV', () => {
  it('should return empty string for empty data', () => {
    const result = toCSV([], [{ key: 'name' as const, header: 'Name' }]);
    expect(result).toBe('');
  });

  it('should generate correct CSV with headers', () => {
    const data = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ];
    const columns = [
      { key: 'name' as const, header: 'Name' },
      { key: 'age' as const, header: 'Age' },
    ];

    const result = toCSV(data, columns);
    const lines = result.split('\n');

    expect(lines[0]).toBe('Name;Age');
    expect(lines[1]).toBe('John;30');
    expect(lines[2]).toBe('Jane;25');
  });

  it('should escape values with commas', () => {
    const data = [{ description: 'Hello, World' }];
    const columns = [{ key: 'description' as const, header: 'Description' }];

    const result = toCSV(data, columns);
    expect(result).toContain('"Hello, World"');
  });

  it('should escape values with quotes', () => {
    const data = [{ quote: 'He said "Hello"' }];
    const columns = [{ key: 'quote' as const, header: 'Quote' }];

    const result = toCSV(data, columns);
    expect(result).toContain('"He said ""Hello"""');
  });

  it('should escape values with newlines', () => {
    const data = [{ text: 'Line 1\nLine 2' }];
    const columns = [{ key: 'text' as const, header: 'Text' }];

    const result = toCSV(data, columns);
    expect(result).toContain('"Line 1\nLine 2"');
  });

  it('should handle null and undefined values', () => {
    const data = [{ a: null, b: undefined, c: 'value' }];
    const columns = [
      { key: 'a' as const, header: 'A' },
      { key: 'b' as const, header: 'B' },
      { key: 'c' as const, header: 'C' },
    ];

    const result = toCSV(data, columns);
    const lines = result.split('\n');
    expect(lines[1]).toBe(';;value');
  });

  it('should handle numeric values', () => {
    const data = [{ amount: 1234.56, count: 0 }];
    const columns = [
      { key: 'amount' as const, header: 'Amount' },
      { key: 'count' as const, header: 'Count' },
    ];

    const result = toCSV(data, columns);
    expect(result).toContain('1234.56;0');
  });
});

describe('formatDateForExport', () => {
  it('should format valid date strings', () => {
    const result = formatDateForExport('2024-03-15');
    // Should be in dd.mm.yyyy format for de-CH locale
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it('should return empty string for null', () => {
    const result = formatDateForExport(null);
    expect(result).toBe('');
  });

  it('should return empty string for undefined', () => {
    const result = formatDateForExport(undefined);
    expect(result).toBe('');
  });

  it('should return empty string for empty string', () => {
    const result = formatDateForExport('');
    expect(result).toBe('');
  });

  it('should handle ISO date strings', () => {
    const result = formatDateForExport('2024-03-15T10:30:00Z');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatCurrencyForExport', () => {
  it('should format positive numbers with 2 decimal places', () => {
    const result = formatCurrencyForExport(1234.56);
    expect(result).toBe('1234.56');
  });

  it('should format integers with 2 decimal places', () => {
    const result = formatCurrencyForExport(100);
    expect(result).toBe('100.00');
  });

  it('should format zero', () => {
    const result = formatCurrencyForExport(0);
    expect(result).toBe('0.00');
  });

  it('should return empty string for null', () => {
    const result = formatCurrencyForExport(null);
    expect(result).toBe('');
  });

  it('should return empty string for undefined', () => {
    const result = formatCurrencyForExport(undefined);
    expect(result).toBe('');
  });

  it('should handle negative numbers', () => {
    const result = formatCurrencyForExport(-50.5);
    expect(result).toBe('-50.50');
  });

  it('should round to 2 decimal places', () => {
    const result = formatCurrencyForExport(10.999);
    expect(result).toBe('11.00');
  });
});
