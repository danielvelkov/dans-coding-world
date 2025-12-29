import styled from 'styled-components';

const StyledNav = styled.nav<React.ComponentPropsWithoutRef<'nav'>>`
  display: flex;
  justify-content: center;

  .pagination {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 0.2em;
  }

  .pagination button {
    display: block;
    padding: 0.5em 1em;
    border: 1px solid #999;
  }

  .pagination button[aria-current='page'] {
    background-color: #333;
    color: #fff;
  }

  .visually-hidden {
    border: 0;
    clip: rect(0 0 0 0);
    height: auto;
    margin: 0;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
    white-space: nowrap;
  }
`;

export function Pagination({
  totalPages,
  currentPage,
  onPageSelect,
}: {
  totalPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
}) {
  if (totalPages < 1 || currentPage < 1 || currentPage > totalPages) {
    console.warn('Invalid pagination props', { totalPages, currentPage });
    return null;
  }
  return (
    <StyledNav aria-label="pagination">
      <ul className="pagination">
        <li key={'prev'}>
          <button
            aria-label="prev page"
            disabled={currentPage - 1 === 0}
            onClick={() => onPageSelect(currentPage - 1)}
          >
            <i className="fa fa-angle-double-left"></i>
          </button>
        </li>
        {Array.from({ length: totalPages }).map((_, i) => (
          <li key={'page-' + i + 1}>
            <button
              aria-current={i + 1 === currentPage ? 'page' : undefined}
              onClick={() => onPageSelect(i + 1)}
            >
              <span className="visually-hidden">page </span> {i + 1}
            </button>
          </li>
        ))}
        <li key={'next'}>
          <button
            aria-label="next page"
            disabled={currentPage === totalPages}
            onClick={() => onPageSelect(currentPage + 1)}
          >
            <i className="fa fa-angle-double-right"></i>
          </button>
        </li>
      </ul>
    </StyledNav>
  );
}

export default Pagination;
