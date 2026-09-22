let deferredPrompt = null;
let isAppInstallable = false;
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach(listener => listener(isAppInstallable));
};

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  isAppInstallable = true;
  notifyListeners();
});

export const subscribeToPWAInstall = (listener) => {
  listeners.add(listener);
  listener(isAppInstallable);
  return () => listeners.delete(listener);
};

export const triggerInstall = async () => {
  if (!deferredPrompt) return false;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    deferredPrompt = null;
    isAppInstallable = false;
    notifyListeners();
    return true;
  }
  return false;
};
