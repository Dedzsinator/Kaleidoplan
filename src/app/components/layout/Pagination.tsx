import React from 'react';
import '../../styles/Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) => {
  // Generate page numbers for display (show 5 pages max with current in middle when possible)
  const getPageNumbers = () => {
    const pages = [];

    // Logic to determine which page numbers to show
    if (totalPages <= 7) {
      // If there are 7 or fewer pages, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);

      // If current page is among the first 3 pages
      if (currentPage <= 4) {
        pages.push(2, 3, 4, 5, '...');
      }
      // If current page is among the last 3 pages
      else if (currentPage >= totalPages - 3) {
        pages.push('...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
      }
      // If current page is in the middle
      else {
        pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...');
      }

      // Always include last page
      pages.push(totalPages);
    }

    return pages;
  };

  // Don't render if there's only 1 page
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-container">
      {/* Pagination info (optional) */}
      {itemsPerPage && totalItems && (
        <div className="pagination-info">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} -{' '}
          {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} events
        </div>
      )}

      <div className="pagination-controls">
        {/* Previous button */}
        <button
          className="pagination-button prev"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <i className="fa fa-chevron-left"></i>
        </button>

        {/* Page numbers */}
        <div className="pagination-pages">
          {getPageNumbers().map((page, index) =>
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={`page-${page}`}
                className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                onClick={() => (typeof page === 'number' ? onPageChange(page) : null)}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ),
          )}
        </div>

        {/* Next button */}
        <button
          className="pagination-button next"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <i className="fa fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
