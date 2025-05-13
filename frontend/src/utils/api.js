// API utility with base URL /api and detailed console logging

const BASE_URL = "/api";

export async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  console.log(`[API] Request:`, url, options);
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
    const data = await res.json().catch(() => null);
    console.log(`[API] Response:`, url, res.status, data);
    if (!res.ok) throw { status: res.status, data };
    return data;
  } catch (err) {
    console.error(`[API] Error:`, url, err);
    throw err;
  }
}
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Attach JWT to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const expiry = localStorage.getItem('jwt_expiry');
  if (token && expiry && Date.now() < Number(expiry)) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Utility: check token expiry and logout
export function isTokenExpired() {
  const expiry = localStorage.getItem('jwt_expiry');
  return !expiry || Date.now() > Number(expiry);
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('jwt_expiry');
  localStorage.removeItem('otpVerified');
}

export default api;