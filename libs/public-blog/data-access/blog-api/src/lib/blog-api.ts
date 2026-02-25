import axios from 'axios';
import { ApiClient } from '@dans-coding-world/shared-data-access-api';
import { getApiBaseURL } from './config.js';

const axiosInstance = axios.create({
  baseURL: getApiBaseURL(),
  withCredentials: true, // For JWT cookies
});

export const api = new ApiClient(axiosInstance);
