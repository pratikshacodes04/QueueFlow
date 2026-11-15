/**
 * Reusable API Service Layer
 * Interfaces with the QueueFlow FastAPI Backend
 */

import { API_ENDPOINTS } from "@/utils/constants";

/**
 * Retrieve the active auth token from client storage
 */
export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("access_token")
  );
}

/**
 * Store the active auth token
 */
export function setAuthToken(token) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("access_token", token);
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("access_token");
  }
}

/**
 * Session-expiry hook. AuthContext registers a callback here so that any
 * protected request answered with 401 signs the manager out centrally.
 */
let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

/**
 * Perform fetch request with timeout, auth headers, and error handling.
 * Pass `skipAuthRedirect: true` for endpoints where a 401 is an expected
 * answer (e.g. wrong password on login) rather than an expired session.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_ENDPOINTS.baseUrl}${endpoint}`;
  const timeoutMs = options.timeout || 8000;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = options.token || getAuthToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });

    clearTimeout(id);

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMsg = `Request failed with status ${response.status}`;
      if (data && data.detail) {
        if (typeof data.detail === "string") {
          errorMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMsg = data.detail
            .map((d) => (d && d.msg ? String(d.msg).replace(/^Value error,\s*/i, "") : null))
            .filter(Boolean)
            .join("; ") || errorMsg;
        } else {
          errorMsg = JSON.stringify(data.detail);
        }
      }
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      if (response.status === 401 && !options.skipAuthRedirect && unauthorizedHandler) {
        unauthorizedHandler(err);
      }
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      const err = new Error(`Request timed out after ${timeoutMs}ms`);
      err.status = 408;
      throw err;
    }
    throw error;
  }
}

/**
 * Health & system queries
 */
export async function getBackendHealth() {
  return await apiRequest(API_ENDPOINTS.health);
}

export async function getBackendRoot() {
  return await apiRequest(API_ENDPOINTS.root);
}

/**
 * Authentication
 */
export async function registerManager({ name, email, phone, password, confirm_password }) {
  return await apiRequest("/auth/register", {
    method: "POST",
    skipAuthRedirect: true,
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      phone: phone && phone.trim() ? phone.trim() : null,
      password,
      confirm_password,
    }),
  });
}

export async function loginManager({ email, password }) {
  return await apiRequest("/auth/login", {
    method: "POST",
    skipAuthRedirect: true,
    body: JSON.stringify({ email: email.trim(), password }),
  });
}

export async function getCurrentUser() {
  return await apiRequest("/auth/me", { skipAuthRedirect: true });
}

/**
 * Analytics
 */
export async function getAnalyticsOverview(timeframe = "7d") {
  const endpoint = `/analytics/overview?timeframe=${encodeURIComponent(timeframe)}`;
  return await apiRequest(endpoint);
}

/**
 * Queue Management APIs
 */
export async function getQueues({ skip = 0, limit = 50, search, status_filter } = {}) {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (limit) params.append("limit", String(limit));
  if (search) params.append("search", search);
  if (status_filter && status_filter !== "all") params.append("status_filter", status_filter.toUpperCase());
  const queryString = params.toString();
  return await apiRequest(`/queues${queryString ? `?${queryString}` : ""}`);
}

export async function getQueue(queueId) {
  return await apiRequest(`/queues/${encodeURIComponent(queueId)}`);
}

export async function createQueue(payload) {
  return await apiRequest("/queues", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateQueue(queueId, payload) {
  return await apiRequest(`/queues/${encodeURIComponent(queueId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function setQueueStatus(queueId, status) {
  return await apiRequest(`/queues/${encodeURIComponent(queueId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: status.toUpperCase() }),
  });
}

export async function deleteQueue(queueId) {
  return await apiRequest(`/queues/${encodeURIComponent(queueId)}`, {
    method: "DELETE",
  });
}

/**
 * Token Management APIs
 */
export async function createToken(queueId, { customer_name, customer_phone }) {
  return await apiRequest(`/queues/${encodeURIComponent(queueId)}/tokens`, {
    method: "POST",
    body: JSON.stringify({
      customer_name: customer_name.trim(),
      customer_phone: customer_phone ? customer_phone.trim() : null,
    }),
  });
}

export async function listTokens(queueId, { skip = 0, limit = 50, search, status_filter } = {}) {
  const params = new URLSearchParams();
  if (skip) params.append("skip", String(skip));
  if (limit) params.append("limit", String(limit));
  if (search) params.append("search", search);
  if (status_filter && status_filter !== "all") params.append("status_filter", status_filter.toUpperCase());
  const queryString = params.toString();
  return await apiRequest(`/queues/${encodeURIComponent(queueId)}/tokens${queryString ? `?${queryString}` : ""}`);
}

export async function getToken(tokenId) {
  return await apiRequest(`/tokens/${encodeURIComponent(tokenId)}`);
}

export async function moveToken(tokenId, direction) {
  return await apiRequest(`/tokens/${encodeURIComponent(tokenId)}/move`, {
    method: "POST",
    body: JSON.stringify({ direction: direction.toUpperCase() }),
  });
}

export async function cancelToken(tokenId) {
  return await apiRequest(`/tokens/${encodeURIComponent(tokenId)}/cancel`, {
    method: "PATCH",
  });
}

export async function callNextToken(queueId) {
  return await apiRequest(`/queues/${encodeURIComponent(queueId)}/tokens/call-next`, {
    method: "POST",
  });
}

export async function completeToken(tokenId) {
  return await apiRequest(`/tokens/${encodeURIComponent(tokenId)}/complete`, {
    method: "PATCH",
  });
}

export async function getQueueTokenStats(queueId) {
  return await apiRequest(`/queues/${encodeURIComponent(queueId)}/tokens/stats`);
}
