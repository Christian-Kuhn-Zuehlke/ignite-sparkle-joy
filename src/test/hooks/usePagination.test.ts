import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '@/hooks/usePagination';

describe('usePagination', () => {
  const createItems = (count: number) => 
    Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  it('should initialize with default values', () => {
    const items = createItems(100);
    const { result } = renderHook(() => usePagination(items));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(25);
    expect(result.current.totalItems).toBe(100);
    expect(result.current.totalPages).toBe(4);
  });

  it('should respect initial options', () => {
    const items = createItems(100);
    const { result } = renderHook(() => 
      usePagination(items, { initialPage: 2, initialPageSize: 10 })
    );

    expect(result.current.currentPage).toBe(2);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(10);
  });

  it('should return correct paginated items', () => {
    const items = createItems(100);
    const { result } = renderHook(() => 
      usePagination(items, { initialPageSize: 10 })
    );

    expect(result.current.paginatedItems).toHaveLength(10);
    expect(result.current.paginatedItems[0]).toEqual({ id: 1, name: 'Item 1' });
    expect(result.current.paginatedItems[9]).toEqual({ id: 10, name: 'Item 10' });
  });

  it('should navigate to next page', () => {
    const items = createItems(50);
    const { result } = renderHook(() => 
      usePagination(items, { initialPageSize: 10 })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems[0]).toEqual({ id: 11, name: 'Item 11' });
  });

  it('should navigate to previous page', () => {
    const items = createItems(50);
    const { result } = renderHook(() => 
      usePagination(items, { initialPage: 3, initialPageSize: 10 })
    );

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(2);
  });

  it('should not go below page 1', () => {
    const items = createItems(50);
    const { result } = renderHook(() => 
      usePagination(items, { initialPage: 1, initialPageSize: 10 })
    );

    expect(result.current.canGoPrevious).toBe(false);

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('should not go above total pages', () => {
    const items = createItems(50);
    const { result } = renderHook(() => 
      usePagination(items, { initialPage: 5, initialPageSize: 10 })
    );

    expect(result.current.canGoNext).toBe(false);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(5);
  });

  it('should go to first page', () => {
    const items = createItems(50);
    const { result } = renderHook(() => 
      usePagination(items, { initialPage: 3, initialPageSize: 10 })
    );

    act(() => {
      result.current.goToFirstPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('should go to last page', () => {
    const items = createItems(50);
    const { result } = renderHook(() => 
      usePagination(items, { initialPage: 1, initialPageSize: 10 })
    );

    act(() => {
      result.current.goToLastPage();
    });

    expect(result.current.currentPage).toBe(5);
  });

  it('should reset to page 1 when changing page size', () => {
    const items = createItems(100);
    const { result } = renderHook(() => 
      usePagination(items, { initialPage: 3, initialPageSize: 10 })
    );

    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(25);
    expect(result.current.totalPages).toBe(4);
  });

  it('should handle empty items', () => {
    const { result } = renderHook(() => usePagination([]));

    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedItems).toEqual([]);
  });

  it('should calculate correct start and end indices', () => {
    const items = createItems(100);
    const { result } = renderHook(() => 
      usePagination(items, { initialPage: 2, initialPageSize: 25 })
    );

    expect(result.current.startIndex).toBe(26); // 1-indexed for display
    expect(result.current.endIndex).toBe(50);
  });

  it('should generate correct page numbers', () => {
    const items = createItems(100);
    const { result } = renderHook(() => 
      usePagination(items, { initialPageSize: 10 })
    );

    // With 10 pages, should show: 1, 2, 3, -2, 10 (ellipsis near end)
    expect(result.current.pageNumbers.includes(1)).toBe(true);
    expect(result.current.pageNumbers.includes(10)).toBe(true);
  });

  it('should adjust current page when items shrink', () => {
    const { result, rerender } = renderHook(
      ({ items }) => usePagination(items, { initialPage: 5, initialPageSize: 10 }),
      { initialProps: { items: createItems(100) } }
    );

    expect(result.current.currentPage).toBe(5);

    // Shrink items so page 5 doesn't exist
    rerender({ items: createItems(20) });

    // Should adjust to last available page
    expect(result.current.currentPage).toBe(2);
  });
});
