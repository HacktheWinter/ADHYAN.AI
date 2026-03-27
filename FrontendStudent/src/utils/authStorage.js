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

const resolveStorage = () => {
  const hasLocal = localStorage.getItem(USER_KEY) && localStorage.getItem(TOKEN_KEY);
  const hasSession = sessionStorage.getItem(USER_KEY) && sessionStorage.getItem(TOKEN_KEY);
  if (hasLocal) return localStorage;
  if (hasSession) return sessionStorage;
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

  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
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
