const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const safeParse = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const clearStorage = (storage) => {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
};

const decodeTokenPayload = (token) => {
  if (!token) return null;

  const [, payload] = token.split('.');
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeTokenPayload(token);

  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;

  return payload.exp * 1000 <= Date.now();
};

const hasValidSession = (storage) => {
  const token = storage.getItem(TOKEN_KEY);
  const user = storage.getItem(USER_KEY);

  if (!token && !user) return false;

  if (!token || !user || isTokenExpired(token)) {
    clearStorage(storage);
    return false;
  }

  return true;
};

const resolveStorage = () => {
  if (hasValidSession(localStorage)) return localStorage;
  if (hasValidSession(sessionStorage)) return sessionStorage;
  return null;
};

export const getStoredUser = () => {
  const storage = resolveStorage();
  if (!storage) return null;
  return safeParse(storage.getItem(USER_KEY));
};

export const getStoredToken = () => {
  const storage = resolveStorage();
  if (!storage) return null;
  return storage.getItem(TOKEN_KEY);
};

export const persistAuth = (token, user, rememberMe) => {
  const target = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;

  if (token) {
    target.setItem(TOKEN_KEY, token);
  }
  if (user) {
    target.setItem(USER_KEY, JSON.stringify(user));
  }

  clearStorage(other);
};

export const clearAuth = () => {
  clearStorage(localStorage);
  clearStorage(sessionStorage);
};

export const updateStoredUser = (userPatch) => {
  const storage = resolveStorage();
  if (!storage) return null;

  const currentUser = safeParse(storage.getItem(USER_KEY));
  if (!currentUser) return null;

  const updatedUser = { ...currentUser, ...userPatch };
  storage.setItem(USER_KEY, JSON.stringify(updatedUser));
  return updatedUser;
};
