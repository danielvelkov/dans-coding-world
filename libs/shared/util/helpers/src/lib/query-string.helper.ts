import qs from 'qs';

export const parseQueryString = <T extends object>(queryString: string) => {
  return qs.parse(queryString) as T;
};

export const stringifyToQueryString = (obj: any) => {
  return qs.stringify(obj);
};
