const TOKEN_KEY = "token";
const USER_KEY = "user";

const clearStorage = (storage) => {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
};

const decodeTokenPayload = (token) => {
  if (!token) return null;

  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeTokenPayload(token);

  if (!payload) return true;
  if (typeof payload.exp !== "number") return false;

  return payload.exp * 1000 <= Date.now();
};

const resolveStorage = () => {
  const storages = [localStorage, sessionStorage];

  for (const storage of storages) {
    const token = storage.getItem(TOKEN_KEY);
    const user = storage.getItem(USER_KEY);

    if (!token && !user) continue;

    if (!token || !user || isTokenExpired(token)) {
      clearStorage(storage);
      continue;
    }

    return storage;
  }

  return null;
};

export const getStoredUser = () => {
  const storage = resolveStorage();
  const raw = storage?.getItem(USER_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getStoredToken = () =>
  resolveStorage()?.getItem(TOKEN_KEY) || null;

export const persistAuth = (token, user, rememberMe = true) => {
  const target = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;

  target.setItem(TOKEN_KEY, token);
  target.setItem(USER_KEY, JSON.stringify(user));
  clearStorage(other);
};

export const clearAuth = () => {
  clearStorage(localStorage);
  clearStorage(sessionStorage);
};
