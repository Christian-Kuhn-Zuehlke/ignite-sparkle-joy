import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

interface OrdersPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  canGoNext: boolean;
  canGoPrevious: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function OrdersPagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  pageSize,
  pageSizeOptions,
  canGoNext,
  canGoPrevious,
  onPageChange,
  onPageSizeChange,
}: OrdersPaginationProps) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  // Calculate page numbers to display (with ellipsis logic)
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push(-1); // Ellipsis
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push(-2); // Ellipsis
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [currentPage, totalPages]);

  // Navigation handlers
  const onNextPage = () => onPageChange(currentPage + 1);
  const onPreviousPage = () => onPageChange(currentPage - 1);
  const onFirstPage = () => onPageChange(1);
  const onLastPage = () => onPageChange(totalPages);

  if (totalItems === 0) return null;

  // Compact mobile pagination
  if (isMobile) {
    return (
      <div className="flex items-center justify-between gap-2 py-3 border-t border-border">
        {/* Page size selector - compact */}
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[60px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Compact pagination controls */}
        <div className="flex items-center gap-1">
          {/* Previous page */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onPreviousPage}
            disabled={!canGoPrevious}
            aria-label={t('common.previous')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Current page indicator */}
          <span className="text-sm font-medium text-foreground min-w-[60px] text-center">
            {currentPage} / {totalPages}
          </span>

          {/* Next page */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNextPage}
            disabled={!canGoNext}
            aria-label={t('common.next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Full desktop pagination
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-border">
      {/* Items info and page size selector */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {startIndex}–{endIndex} {t('orders.of')} {totalItems}
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">{t('orders.perPage')}:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hidden sm:flex"
          onClick={onFirstPage}
          disabled={!canGoPrevious}
          aria-label={t('pagination.first')}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onPreviousPage}
          disabled={!canGoPrevious}
          aria-label={t('common.previous')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page < 0) {
              // Ellipsis
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-muted-foreground"
                >
                  …
                </span>
              );
            }
            return (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  'h-8 w-8 text-sm',
                  currentPage === page && 'pointer-events-none'
                )}
                onClick={() => onPageChange(page)}
                aria-label={`${t('pagination.page')} ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Next page */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onNextPage}
          disabled={!canGoNext}
          aria-label={t('common.next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hidden sm:flex"
          onClick={onLastPage}
          disabled={!canGoNext}
          aria-label={t('pagination.last')}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
