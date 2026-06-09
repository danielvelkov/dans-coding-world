import { floorToNearestMultiple } from './calculation.helper.js';

interface PaginationOptions {
  pageOffset?: number;
  pageSize?: number;
}

export function createPaginationHandlers<TParams extends PaginationOptions>(
  params: TParams,
  setParams: (next: TParams) => void,
  defaults: { defaultPageSize: number },
) {
  const handlePageSelect = (page: number) => {
    const pageOffset = calculatePageOffset(
      page,
      params.pageSize ?? defaults.defaultPageSize,
    );
    setParams({
      ...params,
      pageOffset: pageOffset === 0 ? undefined : pageOffset,
    });
  };

  const handleItemsPerPageSelect = (itemsPerPage: number | undefined) => {
    const normalizedValue = itemsPerPage ? Number(itemsPerPage) : undefined;
    if (!normalizedValue || normalizedValue === defaults.defaultPageSize) {
      setParams({ ...params, pageSize: undefined });
      return;
    }

    const pageOffset = floorToNearestMultiple(
      params.pageOffset,
      normalizedValue,
    );
    setParams({
      ...params,
      pageOffset: pageOffset === 0 ? undefined : pageOffset,
      pageSize: normalizedValue,
    });
  };

  return { handlePageSelect, handleItemsPerPageSelect };
}

const calculatePageOffset = (page: number, pageLimit: number) =>
  (page - 1) * pageLimit;
