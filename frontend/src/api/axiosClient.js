// axiosClient.js
import axios from 'axios';

// ใช้กับ endpoint ทั่วไปที่ไม่ต้อง API key (GET utils, tele_med, ฯลฯ)
export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ใช้เฉพาะ endpoint ที่ต้อง auth.api_key (เช่น /forms, /post_data_tele_med)
export const axiosAuthClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
  },
});

export const MophPyoCenterClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL_MOPH_PYO,
  headers: { 'Content-Type': 'application/json' },
});

export default axiosClient;