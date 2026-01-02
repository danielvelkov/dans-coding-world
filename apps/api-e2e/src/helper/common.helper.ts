import { BaseResponse } from '@dans-coding-world/api-types';

export const getData = <T>(res: BaseResponse, key?: string): T => {
  if (key) return (res.data as any)[key] as T;
  else return res.data as T;
};

export const getMessage = (res: any) => {
  return getData(res, 'message') as string;
};

export const multipartHeaders = { 'Content-Type': 'multipart/form-data' };
export const urlEncodedHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded',
};
