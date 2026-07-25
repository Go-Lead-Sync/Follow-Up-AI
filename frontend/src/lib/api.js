const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("fai_token");
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("fai_token", token);
  else window.localStorage.removeItem("fai_token");
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const error = new Error(data?.error || `request_failed_${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const subAccountApi = (subAccountId) => ({
  get: (path) => api(`/api/sub-accounts/${subAccountId}${path}`),
  post: (path, body) => api(`/api/sub-accounts/${subAccountId}${path}`, { method: "POST", body }),
  put: (path, body) => api(`/api/sub-accounts/${subAccountId}${path}`, { method: "PUT", body }),
  del: (path) => api(`/api/sub-accounts/${subAccountId}${path}`, { method: "DELETE" }),
});
