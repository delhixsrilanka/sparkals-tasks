/**
 * SPARKALS TASKS — AUDIT LOG SYSTEM
 * ─────────────────────────────────────────────────────
 * Records every staff action to Firestore for 1 year.
 * Tracks: tasks, attendance, GPS, logins, and all actions.
 *
 * IMPORTANT: Loaded as plain <script src="audit.js"> — NOT type="module"
 * Uses dynamic import() inside functions — works in both plain and module scripts.
 *
 * Usage from any page:
 *   logAction("TASK_CREATED", { taskId: "TASK-0001", name: "Follow up client" });
 *   logAction("CLOCK_IN", { time: "09:05", isLate: false });
 */

// ── ALL ACTION TYPES WE TRACK ──
var AUDIT_ACTIONS = {
  // Login
  LOGIN:              "Staff logged in",
  LOGOUT:             "Staff logged out",
  LOGIN_FAILED:       "Failed login attempt",
  // Tasks
  TASK_CREATED:       "Task created",
  TASK_ASSIGNED:      "Task assigned to staff",
  TASK_STARTED:       "Task marked as started",
  TASK_COMPLETED:     "Task marked as completed",
  TASK_OVERDUE:       "Task became overdue",
  TASK_COMMENTED:     "Comment added to task",
  TASK_PHOTO_ADDED:   "Photo proof added to task",
  TASK_DELETED:       "Task deleted",
  TASK_EDITED:        "Task details edited",
  BULK_DELETE:        "Bulk tasks deleted",
  TASK_STAGE_CHANGED: "Task stage updated",
  // Attendance
  CLOCK_IN:           "Staff clocked in",
  CLOCK_OUT:          "Staff clocked out",
  CLOCK_IN_LATE:      "Staff clocked in late",
  CLOCK_IN_BLOCKED:   "Clock-in blocked — wrong location",
  MANUAL_CLOCK_IN:    "Admin manually clocked in staff",
  LEAVE_REQUESTED:    "Leave request submitted",
  LEAVE_APPROVED:     "Leave request approved",
  LEAVE_REJECTED:     "Leave request rejected",
  OVERTIME_RECORDED:  "Overtime hours recorded",
  // GPS
  LOCATION_CHECKED:   "GPS location recorded",
  GEOFENCE_EXITED:    "Staff exited assigned zone",
  GEOFENCE_ENTERED:   "Staff entered assigned zone",
  // Admin
  STAFF_ADDED:        "New staff member added",
  STAFF_REMOVED:      "Staff member removed",
  STAFF_APPROVED:     "Staff registration approved",
  STAFF_REJECTED:     "Staff registration rejected",
  ROLE_CHANGED:       "Staff role changed",
  SETTINGS_CHANGED:   "Company settings changed",
  // Chat
  MESSAGE_SENT:       "Message sent",
  FILE_SHARED:        "File shared in chat",
  BROADCAST_SENT:     "Broadcast message sent to all staff",
  // Reports
  REPORT_DOWNLOADED:  "Report downloaded",
  DATA_EXPORTED:      "Data exported to Excel"
};

// ── MAIN LOG FUNCTION ──
// Call this from any page to record an action
async function logAction(action, details) {
  try {
    // Dynamic import — works in both plain scripts and modules
    const { initializeApp, getApps } = await import(
      "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
    );
    const { getFirestore, collection, addDoc, serverTimestamp } = await import(
      "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
    );
    const { getAuth } = await import(
      "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"
    );

    // Use existing Firebase app — never double-initialise
    const cfg = (typeof firebaseConfig !== "undefined") ? firebaseConfig : window.firebaseConfig;
    const app = getApps().length ? getApps()[0] : initializeApp(cfg);
    const db   = getFirestore(app);
    const auth = getAuth(app);
    const user = auth.currentUser;

    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(today.getFullYear() + 1);

    await addDoc(collection(db, "auditLogs"), {
      action:             action,
      actionDescription:  AUDIT_ACTIONS[action] || action,
      details:            details || {},
      uid:                user ? user.uid   : "unknown",
      email:              user ? user.email : "unknown",
      timestamp:          serverTimestamp(),
      date:               today.toISOString().split("T")[0],
      month:              `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`,
      expiryDate:         expiryDate.toISOString().split("T")[0],
      page:               window.location.pathname,
      device:             navigator.userAgent.includes("Mobile") ? "mobile" : "desktop"
    });

  } catch(e) {
    // Audit logging must NEVER crash the app — always fail silently
    console.log("[Audit] Log skipped:", e.message);
  }
}

console.log("✅ Sparkals audit.js loaded — tracking all actions");
