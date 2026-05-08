// ════════════════════════════════════════════════════════════
// error-tracker.js — Sparkals Global Error Logger v1.0
// Add ONE line to every HTML page (after firebase-init):
//   <script src="error-tracker.js"></script>
// That's it. Everything below runs automatically.
// ════════════════════════════════════════════════════════════

(function () {

  // ── CONFIG ─────────────────────────────────────────────────
  const ADMIN_WHATSAPP = "919840623262"; // BGTL admin number (no + or spaces)
  const ALERT_COOLDOWN_MS = 60 * 1000;   // Don't spam — 1 alert per error per minute
  // ───────────────────────────────────────────────────────────

  const _sentAlerts = {};   // tracks recently sent alerts to prevent spam
  const _pageName = location.pathname.split("/").pop() || "index.html";

  // ── GET CURRENT USER INFO FROM LOCALSTORAGE / SESSIONSTORAGE ──
  function getCurrentUser() {
    try {
      // Sparkals stores user info in localStorage after login
      const raw = localStorage.getItem("sparkalsUser") || sessionStorage.getItem("sparkalsUser");
      if (raw) {
        const u = JSON.parse(raw);
        return {
          uid:   u.uid  || "unknown",
          name:  u.name || u.displayName || "unknown",
          role:  u.role || "unknown",
          email: u.email || "unknown"
        };
      }
    } catch (_) {}
    return { uid: "unknown", name: "unknown", role: "unknown", email: "unknown" };
  }

  // ── BUILD ERROR LOG OBJECT ──────────────────────────────────
  function buildLog(message, source, lineno, colno, errorObj) {
    const user = getCurrentUser();
    const stack = errorObj && errorObj.stack ? errorObj.stack.split("\n").slice(0, 5).join(" | ") : "";
    return {
      page:       _pageName,
      fullUrl:    location.href,
      message:    message || "Unknown error",
      source:     source  || "",
      line:       lineno  || 0,
      column:     colno   || 0,
      stack:      stack,
      userUid:    user.uid,
      userName:   user.name,
      userRole:   user.role,
      userEmail:  user.email,
      browser:    navigator.userAgent,
      timestamp:  new Date().toISOString(),
      status:     "new",        // new | seen | fixed
      resolvedAt: null,
      resolvedBy: null
    };
  }

  // ── SAVE TO FIRESTORE ───────────────────────────────────────
  async function saveToFirestore(log) {
    try {
      // Wait up to 3 seconds for Firebase to be available
      let attempts = 0;
      while (typeof firebase === "undefined" && attempts < 30) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
      if (typeof firebase === "undefined") return;

      const db = firebase.firestore();
      await db.collection("errorLogs").add(log);
    } catch (e) {
      // Silently fail — don't cause an infinite error loop
      console.warn("[ErrorTracker] Could not save to Firestore:", e.message);
    }
  }

  // ── SEND WHATSAPP ALERT ─────────────────────────────────────
  function sendWhatsAppAlert(log) {
    // Cooldown check — avoid duplicate alerts for same error
    const alertKey = log.page + "::" + log.message.slice(0, 60);
    const now = Date.now();
    if (_sentAlerts[alertKey] && (now - _sentAlerts[alertKey]) < ALERT_COOLDOWN_MS) return;
    _sentAlerts[alertKey] = now;

    const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const msg = [
      "⚠️ *App Error Alert*",
      "",
      "📄 Page: " + log.page,
      "❌ Error: " + log.message.slice(0, 120),
      "📍 Line: " + log.line,
      "👤 User: " + log.userName + " (" + log.userRole + ")",
      "🕐 Time: " + time,
      "",
      "Open admin panel to see full details and mark as fixed."
    ].join("\n");

    const url = "https://wa.me/" + ADMIN_WHATSAPP + "?text=" + encodeURIComponent(msg);

    // Open silently in a hidden iframe so it doesn't disrupt the user
    // Note: On mobile browsers, wa.me links open the WhatsApp app directly.
    // On desktop, it opens web.whatsapp.com.
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => { try { document.body.removeChild(iframe); } catch (_) {} }, 3000);
    } catch (_) {}
  }

  // ── MAIN ERROR HANDLER ──────────────────────────────────────
  function handleError(message, source, lineno, colno, error) {
    // Ignore browser extension errors and third-party noise
    if (source && (source.includes("extension") || source.includes("chrome-extension"))) return false;
    if (!message || message === "Script error.") return false;

    const log = buildLog(message, source, lineno, colno, error);
    saveToFirestore(log);
    sendWhatsAppAlert(log);

    return false; // Let browser's default error handling continue
  }

  // ── UNHANDLED PROMISE REJECTIONS (e.g. failed Firestore reads) ──
  function handleUnhandledRejection(event) {
    const message = event.reason
      ? (event.reason.message || String(event.reason))
      : "Unhandled Promise Rejection";

    // Skip Firebase network noise when app is offline
    if (message.includes("Failed to fetch") || message.includes("net::ERR")) return;

    const log = buildLog(
      message,
      "Promise rejection",
      0,
      0,
      event.reason instanceof Error ? event.reason : null
    );
    saveToFirestore(log);
    sendWhatsAppAlert(log);
  }

  // ── ATTACH LISTENERS ───────────────────────────────────────
  window.onerror = handleError;
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  // ── MANUAL LOGGING UTILITY ─────────────────────────────────
  // Use this anywhere in your code to log a custom warning:
  //   window.logAppError("Customer save failed", "crm-customers.html")
  window.logAppError = function (message, context) {
    const log = buildLog(message, context || _pageName, 0, 0, null);
    log.type = "manual";
    saveToFirestore(log);
    sendWhatsAppAlert(log);
  };

  console.log("[ErrorTracker] Active on:", _pageName);

})();
