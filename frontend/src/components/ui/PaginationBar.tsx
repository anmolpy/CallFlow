import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationBarProps {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  itemLabel?: string;
  onPageChange: (nextPage: number) => void;
}

export function PaginationBar({
  page,
  size,
  totalElements,
  totalPages,
  first,
  last,
  itemLabel = 'records',
  onPageChange,
}: PaginationBarProps) {
  if (totalElements === 0) {
    return null;
  }

  const start = page * size + 1;
  const end = Math.min((page + 1) * size, totalElements);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
      <p>
        Showing <span className="font-medium text-slate-900">{start}</span>–
        <span className="font-medium text-slate-900">{end}</span> of{' '}
        <span className="font-medium text-slate-900">{totalElements.toLocaleString()}</span>{' '}
        {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          disabled={first || page <= 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>
        <span className="px-2 text-xs font-medium text-slate-500">
          Page {page + 1} of {Math.max(1, totalPages)}
        </span>
        <Button
          variant="secondary"
          disabled={last || page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
