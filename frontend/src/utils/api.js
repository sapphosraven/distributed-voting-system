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
