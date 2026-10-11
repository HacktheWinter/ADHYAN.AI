/**
 * notificationService.js
 * PWA Notification Shade & System Tray service for ADHYAN.AI Student Portal
 */

export const isNotificationSupported = () => {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
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
 * Display a notification directly on the native OS Notification Shade / System Tray
 * using the Service Worker registration.
 */
export const showShadeNotification = async ({
  title = "ADHYAN.AI Notification",
  body = "You have an update in ADHYAN.AI",
  icon = "/logo02.png",
  badge = "/logo02.png",
  data = { url: "/" },
  tag = "adhyan-shade-alert",
  actions = [{ action: "open", title: "Open Portal" }],
  vibrate = [200, 100, 200],
  requireInteraction = false,
} = {}) => {
  if (!isNotificationSupported()) {
    console.warn("Notification Shade not supported on this platform.");
    return false;
  }

  if (Notification.permission !== "granted") {
    console.warn("Notification permission is not granted (current status: " + Notification.permission + ").");
    return false;
  }

  try {
    // Wait for the service worker registration
    const registration = await navigator.serviceWorker.ready;

    if (!registration || !registration.showNotification) {
      console.warn("Service Worker registration showNotification not available.");
      return false;
    }

    const options = {
      body,
      icon,
      badge,
      data,
      tag,
      vibrate,
      renotify: true,
      requireInteraction,
      actions,
    };

    await registration.showNotification(title, options);
    return true;
  } catch (error) {
    console.error("Failed to show notification in shade:", error);
    return false;
  }
};

/**
 * Sends an instant test notification to the system notification shade.
 */
export const sendTestNotification = async () => {
  const perm = await requestNotificationPermission();
  if (perm !== "granted") {
    return {
      success: false,
      message: perm === "denied" 
        ? "Notification permission was blocked in your browser settings. Please enable it in browser site settings."
        : "Notification permission was not granted.",
    };
  }

  const shown = await showShadeNotification({
    title: "🔔 ADHYAN.AI - Notification Shade Active",
    body: "System notifications are enabled! You'll receive live class, quiz, and test updates right here in your pull-down drawer.",
    tag: `test-alert-${Date.now()}`,
    data: { url: "/" },
  });

  return {
    success: shown,
    message: shown
      ? "Notification sent! Check your notification shade / pull-down drawer."
      : "Could not trigger notification. Ensure your service worker is registered and active.",
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
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * 60 * 60 * 1000;

  for (const notif of notifications) {
    if (shownIds.includes(notif.id)) continue;

    // Show in shade if it's urgent (starting in < 1 hr), a recent announcement, or published today
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

  // Keep last 100 shown IDs to avoid unlimited growth
  if (shownIds.length > 100) {
    shownIds = shownIds.slice(shownIds.length - 100);
  }
  localStorage.setItem(SHOWN_STORAGE_KEY, JSON.stringify(shownIds));
};
