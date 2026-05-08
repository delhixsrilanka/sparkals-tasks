// ════════════════════════════════════════════════════════════
// error-tracker.js — Sparkals Global Error Logger v2.0
// Works with your existing Firebase module setup.
// Add ONE line to every HTML page AFTER firebase-config.js:
//   <script src="error-tracker.js"></script>
// ════════════════════════════════════════════════════════════

(function () {

  // ── CONFIG ─────────────────────────────────────────────────
  const ADMIN_WHATSAPP = "919840623262";
  const ALERT_COOLDOWN_MS = 60 * 1000;
  // ───────────────────────────────────────────────────────────

  const _sentAlerts = {};
  const _pageName = location.pathname.split("/").pop() || "index.html";

  // ── GET CURRENT USER ───────────────────────────────────────
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem("sparkalsUser") || sessionStorage.getItem("sparkalsUser");
      if (raw) {
        const u = JSON.parse(raw);
        return { uid: u.uid||"unknown", name: u.name||u.displayName||"unknown", role: u.role||"unknown", email: u.email||"unknown" };
      }
    } catch (_) {}
    try {
      if (window._sparkalsCurrentUser) return window._sparkalsCurrentUser;
    } catch (_) {}
    return { uid:"unknown", name:"unknown", role:"unknown", email:"unknown" };
  }

  // ── BUILD LOG ──────────────────────────────────────────────
  function buildLog(message, source, lineno, colno, errorObj) {
    const user = getCurrentUser();
    const stack = errorObj && errorObj.stack ? errorObj.stack.split("\n").slice(0,5).join(" | ") : "";
    return {
      page:      _pageName,
      fullUrl:   location.href,
      message:   message || "Unknown error",
      source:    source  || "",
      line:      lineno  || 0,
      column:    colno   || 0,
      stack:     stack,
      userUid:   user.uid,
      userName:  user.name,
      userRole:  user.role,
      userEmail: user.email,
      browser:   navigator.userAgent,
      timestamp: new Date().toISOString(),
      status:    "new",
      resolvedAt: null,
      resolvedBy: null
    };
  }

  // ── SAVE TO FIRESTORE via REST API ─────────────────────────
  async function saveToFirestore(log) {
    try {
      const PROJECT = "sparkals-tasks-app";
      const url = "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents/errorLogs";

      function toFirestoreValue(val) {
        if (val === null || val === undefined) return { nullValue: null };
        if (typeof val === "boolean") return { booleanValue: val };
        if (typeof val === "number")  return { integerValue: String(val) };
        if (typeof val === "string")  return { stringValue: val };
        return { stringValue: String(val) };
      }

      const fields = {};
      Object.keys(log).forEach(function(k) { fields[k] = toFirestoreValue(log[k]); });

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: fields })
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.warn("[ErrorTracker] Firestore error:", err);
      } else {
        console.log("[ErrorTracker] Saved to Firestore");
      }
    } catch (e) {
      console.warn("[ErrorTracker] Could not save:", e.message);
    }
  }

  // ── SEND WHATSAPP ALERT ────────────────────────────────────
  function sendWhatsAppAlert(log) {
    const alertKey = log.page + "::" + log.message.slice(0, 60);
    const now = Date.now();
    if (_sentAlerts[alertKey] && (now - _sentAlerts[alertKey]) < ALERT_COOLDOWN_MS) return;
    _sentAlerts[alertKey] = now;

    const time = new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
    const msg = [
      "⚠️ *App Error Alert*",
      "",
      "📄 Page: " + log.page,
      "❌ Error: " + log.message.slice(0, 120),
      "📍 Line: " + log.line,
      "👤 User: " + log.userName + " (" + log.userRole + ")",
      "🕐 Time: " + time,
      "",
      "Open admin-errors.html to see full details."
    ].join("\n");

    const url = "https://wa.me/" + ADMIN_WHATSAPP + "?text=" + encodeURIComponent(msg);
    window.open(url, "_blank");
  }

  // ── MAIN ERROR HANDLER ─────────────────────────────────────
  function handleError(message, source, lineno, colno, error) {
    if (source && source.includes("extension")) return false;
    if (!message || message === "Script error.") return false;
    if (message.includes("Failed to fetch") || message.includes("net::ERR")) return false;

    const log = buildLog(message, source, lineno, colno, error);
    saveToFirestore(log);
    sendWhatsAppAlert(log);
    return false;
  }

  // ── UNHANDLED PROMISE REJECTIONS ───────────────────────────
  function handleUnhandledRejection(event) {
    const message = event.reason
      ? (event.reason.message || String(event.reason))
      : "Unhandled Promise Rejection";
    if (message.includes("Failed to fetch") || message.includes("net::ERR")) return;
    if (message.includes("no-app") || message.includes("initializeApp")) return;

    const log = buildLog(message, "Promise rejection", 0, 0, event.reason instanceof Error ? event.reason : null);
    saveToFirestore(log);
    sendWhatsAppAlert(log);
  }

  // ── ATTACH LISTENERS ───────────────────────────────────────
  window.onerror = handleError;
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  // ── MANUAL LOG UTILITY ─────────────────────────────────────
  window.logAppError = function(message, context) {
    const log = buildLog(message, context || _pageName, 0, 0, null);
    log.type = "manual";
    saveToFirestore(log);
    sendWhatsAppAlert(log);
  };

  console.log("[ErrorTracker] Active on:", _pageName);

})();
