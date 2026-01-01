import axios from 'axios';
import { ApiClient } from './api-client.js';
import { BASE_URL } from './config.js';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // For JWT cookies
});

export const api = new ApiClient(axiosInstance);
