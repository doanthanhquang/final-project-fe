import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export interface PaginationData {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  has_more: boolean;
}

interface PaginationControlsProps {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function PaginationControls({
  pagination,
  onPageChange,
  loading = false,
}: PaginationControlsProps) {
  if (pagination.last_page <= 1) {
    return null;
  }

  const { current_page, last_page } = pagination;

  // Generate page numbers with ellipsis logic
  const generatePages = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];

    if (last_page <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= last_page; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current_page <= 4) {
        // Show pages 2-5, then ellipsis, then last page
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(last_page);
      } else if (current_page >= last_page - 3) {
        // Show first page, ellipsis, then last 5 pages
        pages.push("ellipsis");
        for (let i = last_page - 4; i <= last_page; i++) {
          pages.push(i);
        }
      } else {
        // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
        pages.push("ellipsis");
        for (let i = current_page - 1; i <= current_page + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(last_page);
      }
    }

    return pages;
  };

  const pages = generatePages();

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (current_page > 1 && !loading) {
                  onPageChange(current_page - 1);
                }
              }}
              className={cn(
                current_page === 1 || loading ? "pointer-events-none opacity-50" : "cursor-pointer"
              )}
            />
          </PaginationItem>
          {pages.map((page, index) => {
            if (page === "ellipsis") {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            return (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={current_page === page}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!loading) {
                      onPageChange(page);
                    }
                  }}
                  className={cn(loading ? "pointer-events-none opacity-50" : "cursor-pointer")}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (current_page < last_page && !loading) {
                  onPageChange(current_page + 1);
                }
              }}
              className={cn(
                current_page === last_page || loading
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
