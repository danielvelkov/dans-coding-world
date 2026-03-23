import axios from 'axios';
import { ApiClient } from '@dans-coding-world/shared-data-access-api';
import { getApiBaseURL } from './config.js';

const axiosInstance = axios.create({
  baseURL: getApiBaseURL(),
  withCredentials: true, // For JWT cookies
  validateStatus: (status) => status < 500, // makes axios not throw when receiving status codes like 4xx
});

export const api = new ApiClient(axiosInstance);
