export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function authFetch(getToken, path, options = {}) {
  const token = await getToken();

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message || response.statusText || 'Request failed';
    throw new Error(message);
  }

  return response.json();
}
