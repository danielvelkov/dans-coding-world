import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { BaseResponse } from '@dans-coding-world/api-types';

export class ApiClient {
  instance: AxiosInstance;

  constructor(instance: AxiosInstance) {
    this.instance = instance;
  }

  request<T>(
    path: string,
    options: AxiosRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    const { method, params, data, headers, ...config } = options;

    return this.instance.request<T>({
      url: path,
      method,
      params,
      data,
      headers,
      validateStatus: (status) => status < 500, // makes axios not throw when receiving status codes like 4xx
      ...config,
    });
  }

  async get<T = BaseResponse>(path: string, options?: AxiosRequestConfig) {
    return (await this.request<T>(path, { ...options, method: 'GET' })).data;
  }

  async post<T = BaseResponse>(
    path: string,
    data?: object,
    options?: AxiosRequestConfig
  ) {
    return (await this.request<T>(path, { ...options, method: 'POST', data }))
      .data;
  }

  async put<T = BaseResponse>(
    path: string,
    data?: object,
    options?: AxiosRequestConfig
  ) {
    return (await this.request<T>(path, { ...options, method: 'PUT', data }))
      .data;
  }

  async patch<T = BaseResponse>(
    path: string,
    data?: object,
    options?: AxiosRequestConfig
  ) {
    return (await this.request<T>(path, { ...options, method: 'PATCH', data }))
      .data;
  }

  async delete<T = BaseResponse>(path: string, options?: AxiosRequestConfig) {
    return (await this.request<T>(path, { ...options, method: 'DELETE' })).data;
  }
}
