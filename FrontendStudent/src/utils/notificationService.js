/**
 * notificationService.js
 * PWA Notification Shade & System Tray service for ADHYAN.AI Student Portal
 */

export const isNotificationSupported = () => {
  return typeof window !== "undefined" && "Notification" in window;
};

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission; // 'default' | 'granted' | 'denied'
};

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    console.warn("Notifications are not supported in this browser environment.");
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem("adhyan_notification_permission", permission);
    return permission;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return Notification.permission || "default";
  }
};

/**
 * Robustly retrieves or initializes the ServiceWorkerRegistration
 */
const getActiveRegistration = async () => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    // 1. Try existing registration
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing && existing.active) {
      return existing;
    }

    // 2. Race navigator.serviceWorker.ready with a 2-second timeout to prevent hanging
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error("SW ready timeout")), 2000)),
    ]).catch(() => null);

    if (readyReg) {
      return readyReg;
    }

    // 3. Fallback: register sw.js directly
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("Could not get active service worker registration:", err);
    return null;
  }
};

/**
 * Display a notification directly on the native OS Notification Shade / System Tray
 */
export const showShadeNotification = async ({
  title = "ADHYAN.AI Notification",
  body = "You have an update in ADHYAN.AI",
  icon = "/logo02.png",
  data = { url: "/" },
  tag = "adhyan-shade-alert",
  vibrate = [200, 100, 200],
} = {}) => {
  if (!isNotificationSupported()) {
    console.warn("Notification not supported on this platform.");
    return false;
  }

  if (Notification.permission !== "granted") {
    console.warn("Notification permission is not granted (current status: " + Notification.permission + ").");
    return false;
  }

  const options = {
    body,
    icon,
    tag,
    data,
    renotify: true,
  };

  // Only attach vibrate if supported by the browser to prevent mobile exceptions
  if (typeof navigator !== "undefined" && "vibrate" in navigator && Array.isArray(vibrate)) {
    options.vibrate = vibrate;
  }

  try {
    const registration = await getActiveRegistration();

    if (registration && typeof registration.showNotification === "function") {
      await registration.showNotification(title, options);
      return true;
    }
  } catch (swError) {
    console.warn("ServiceWorker showNotification failed, attempting fallback:", swError);
  }

  // Fallback to standard window Notification if SW is not ready or fails
  try {
    new Notification(title, {
      body: options.body,
      icon: options.icon,
      tag: options.tag,
    });
    return true;
  } catch (fallbackError) {
    console.error("All notification methods failed:", fallbackError);
    return false;
  }
};

/**
 * Sends an instant test notification to the system notification shade.
 */
export const sendTestNotification = async () => {
  let perm = getNotificationPermission();

  if (perm !== "granted") {
    perm = await requestNotificationPermission();
  }

  if (perm !== "granted") {
    return {
      success: false,
      message: perm === "denied"
        ? "Notification permission was blocked in browser settings. Please allow notifications in site settings."
        : "Notification permission was not granted.",
    };
  }

  // Small delay for OS permission sync on Android/iOS
  await new Promise((resolve) => setTimeout(resolve, 300));

  const shown = await showShadeNotification({
    title: "🔔 ADHYAN.AI Alert",
    body: "Notifications are working! You'll receive class, quiz, and test updates right here in your pull-down drawer.",
    tag: `test-alert-${Date.now()}`,
    data: { url: "/" },
  });

  return {
    success: shown,
    message: shown
      ? "Notification sent! Check your notification shade / pull-down drawer."
      : "Could not display notification. Please ensure notifications are enabled in phone settings.",
  };
};

/**
 * Syncs unread / urgent items to the Notification Shade without repeating already-shown items.
 */
export const syncNotificationsToShade = async (notifications = []) => {
  if (getNotificationPermission() !== "granted") return;

  const SHOWN_STORAGE_KEY = "adhyan_shown_shade_notifications";
  let shownIds = [];
  try {
    shownIds = JSON.parse(localStorage.getItem(SHOWN_STORAGE_KEY) || "[]");
  } catch {
    shownIds = [];
  }

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  for (const notif of notifications) {
    if (shownIds.includes(notif.id)) continue;

    const isUrgent = notif.type === "urgent";
    const isRecent = notif.time && Math.abs(now - new Date(notif.time).getTime()) < oneDay;

    if (isUrgent || isRecent) {
      await showShadeNotification({
        title: notif.title || "ADHYAN.AI Alert",
        body: `${notif.message}${notif.className ? ` (${notif.className})` : ""}`,
        tag: `notif-${notif.id}`,
        data: { url: "/" },
      });

      shownIds.push(notif.id);
    }
  }

  if (shownIds.length > 100) {
    shownIds = shownIds.slice(shownIds.length - 100);
  }
  localStorage.setItem(SHOWN_STORAGE_KEY, JSON.stringify(shownIds));
};
