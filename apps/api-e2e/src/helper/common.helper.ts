import { AxiosResponse } from 'axios';

export const getData = <T>(res: AxiosResponse, key?: string): T => {
  if (key) return (res.data.data as any)[key] as T;
  else return res.data.data as T;
};

export const getMessage = (res: any) => {
  return getData(res, 'message') as string;
};
