import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback, useDebouncedSearch } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 300));
    expect(result.current).toBe('test');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated' });
    
    // Should still be initial immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now should be updated
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(100));
    
    rerender({ value: 'c' });
    act(() => vi.advanceTimersByTime(100));
    
    rerender({ value: 'd' });
    act(() => vi.advanceTimersByTime(100));

    // Should still be 'a' because timer keeps resetting
    expect(result.current).toBe('a');

    // Complete the debounce
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('d');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('arg1');
      result.current('arg2');
      result.current('arg3');
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg3');
  });

  it('should cancel previous calls on new invocation', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('first');
    });

    act(() => vi.advanceTimersByTime(200));

    act(() => {
      result.current('second');
    });

    act(() => vi.advanceTimersByTime(300));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second');
  });
});

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial values', () => {
    const { result } = renderHook(() => useDebouncedSearch('initial', 300));

    expect(result.current.inputValue).toBe('initial');
    expect(result.current.debouncedValue).toBe('initial');
    expect(result.current.isDebouncing).toBe(false);
  });

  it('should update inputValue immediately', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));

    act(() => {
      result.current.setInputValue('test');
    });

    expect(result.current.inputValue).toBe('test');
    expect(result.current.debouncedValue).toBe('');
    expect(result.current.isDebouncing).toBe(true);
  });

  it('should debounce the debouncedValue', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));

    act(() => {
      result.current.setInputValue('search term');
    });

    expect(result.current.debouncedValue).toBe('');

    act(() => vi.advanceTimersByTime(300));

    expect(result.current.debouncedValue).toBe('search term');
    expect(result.current.isDebouncing).toBe(false);
  });

  it('should clear values', () => {
    const { result } = renderHook(() => useDebouncedSearch('initial', 300));

    act(() => {
      result.current.clear();
    });

    expect(result.current.inputValue).toBe('');
    
    act(() => vi.advanceTimersByTime(300));
    
    expect(result.current.debouncedValue).toBe('');
  });
});
