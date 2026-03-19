import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../ui/button';

interface PaginationProps {
  page: number;
  totalPages: number | null;
  onPageChange: (page: number) => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function Pagination({ page, totalPages, onPageChange, hasNext, hasPrev }: PaginationProps) {
  return (
    <div className="flex items-center gap-2 justify-center py-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={!hasPrev}
        title="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
        title="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground px-2">
        Page {page}{totalPages ? ` of ${totalPages}` : ''}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        title="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {totalPages && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
