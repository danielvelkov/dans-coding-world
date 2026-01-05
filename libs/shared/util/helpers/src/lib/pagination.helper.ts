export const calculatePageOffset = (page: number, pageLimit: number) =>
  (page - 1) * pageLimit;
