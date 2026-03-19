import { useState } from 'react';

export interface PaginationState {
  page: number;
  perPage: number;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  reset: () => void;
}

export function usePagination(initialPerPage = 20): PaginationState {
  const [page, setPageState] = useState(1);
  const [perPage, setPerPageState] = useState(initialPerPage);

  const setPage = (p: number) => setPageState(p);
  const setPerPage = (pp: number) => {
    setPerPageState(pp);
    setPageState(1);
  };
  const reset = () => {
    setPageState(1);
  };

  return { page, perPage, setPage, setPerPage, reset };
}
