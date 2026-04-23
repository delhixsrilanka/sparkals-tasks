// Sparkals Tasks — Audit Log System
// Records every staff action for 1 year
// Tracks: tasks, attendance, GPS, logins, and all actions

import { db, writeAuditLog } from './firebase-config.js';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ━━━ ALL ACTION TYPES WE TRACK ━━━
export const AUDIT_ACTIONS = {

  // Login actions
  LOGIN:              "Staff logged in",
  LOGOUT:             "Staff logged out",
  LOGIN_FAILED:       "Failed login attempt",

  // Task actions
  TASK_CREATED:       "Task created",
  TASK_ASSIGNED:      "Task assigned to staff",
  TASK_STARTED:       "Task marked as started",
  TASK_COMPLETED:     "Task marked as completed",
  TASK_OVERDUE:       "Task became overdue",
  TASK_COMMENTED:     "Comment added to task",
  TASK_PHOTO_ADDED:   "Photo proof added to task",
  TASK_DELETED:       "Task deleted",
  TASK_EDITED:        "Task details edited",

  // Attendance actions
  CLOCK_IN:           "Staff clocked in",
  CLOCK_OUT:          "Staff clocked out",
  CLOCK_IN_LATE:      "Staff clocked in late",
  CLOCK_IN_BLOCKED:   "Clock-in blocked — wrong location",
  LEAVE_REQUESTED:    "Leave request submitted",
  LEAVE_APPROVED:     "Leave request approved",
  LEAVE_REJECTED:     "Leave request rejected",
  OVERTIME_RECORDED:  "Overtime hours recorded",

  // GPS actions
  LOCATION_CHECKED:   "GPS location recorded",
  GEOFENCE_EXITED:    "Staff exited assigned zone",
  GEOFENCE_ENTERED:   "Staff entered assigned zone",

  // Admin actions
  STAFF_ADDED:        "New staff member added",
  STAFF_REMOVED:      "Staff member removed",
  ROLE_CHANGED:       "Staff role changed",
  SETTINGS_CHANGED:   "Company settings changed",

  // Chat actions
  MESSAGE_SENT:       "Message sent",
  FILE_SHARED:        "File shared in chat",
  BROADCAST_SENT:     "Broadcast message sent to all staff",

  // Report actions
  REPORT_DOWNLOADED:  "Report downloaded",
  DATA_EXPORTED:      "Data exported to Excel"
};

// ━━━ SAVE AN AUDIT LOG ENTRY ━━━
export async function logAction(userId, userName, action, details = {}) {
  try {
    const logId = `${Date.now()}_${userId}`;
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(today.getFullYear() + 1); // Keep for 1 year

    await setDoc(doc(db, "auditLogs", logId), {
      userId,
      userName,
      action,
      actionDescription: AUDIT_ACTIONS[action] || action,
      details,
      timestamp: serverTimestamp(),
      date: today.toISOString().split('T')[0],
      month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
      expiryDate: expiryDate.toISOString().split('T')[0],
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    });

    console.log(`✅ Audit log saved: ${userName} — ${AUDIT_ACTIONS[action] || action}`);
    return { success: true };
  } catch (error) {
    console.error("Audit log save failed:", error);
    return { success: false, error };
  }
}

// ━━━ GET AUDIT LOGS FOR ONE STAFF MEMBER ━━━
export async function getStaffAuditLogs(userId, limitDays = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - limitDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const q = query(
      collection(db, "auditLogs"),
      where("userId", "==", userId),
      where("date", ">=", cutoffStr),
      orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);
    const logs = [];
    snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
    return { success: true, data: logs };
  } catch (error) {
    console.error("Get staff logs failed:", error);
    return { success: false, error };
  }
}

// ━━━ GET ALL AUDIT LOGS FOR ADMIN ━━━
export async function getAllAuditLogs(limitDays = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - limitDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const q = query(
      collection(db, "auditLogs"),
      where("date", ">=", cutoffStr),
      orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);
    const logs = [];
    snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
    return { success: true, data: logs };
  } catch (error) {
    console.error("Get all logs failed:", error);
    return { success: false, error };
  }
}

// ━━━ GET LOGS BY ACTION TYPE ━━━
export async function getLogsByAction(action, limitDays = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - limitDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const q = query(
      collection(db, "auditLogs"),
      where("action", "==", action),
      where("date", ">=", cutoffStr),
      orderBy("date", "desc")
    );

    const snapshot = await getDocs(q);
    const logs = [];
    snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
    return { success: true, data: logs };
  } catch (error) {
    console.error("Get logs by action failed:", error);
    return { success: false, error };
  }
}

// ━━━ DELETE LOGS OLDER THAN 1 YEAR ━━━
// This runs automatically to clean up old records
export async function deleteExpiredLogs() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const q = query(
      collection(db, "auditLogs"),
      where("expiryDate", "<", today)
    );

    const snapshot = await getDocs(q);
    let deletedCount = 0;

    for (const document of snapshot.docs) {
      await deleteDoc(doc(db, "auditLogs", document.id));
      deletedCount++;
    }

    console.log(`🗑️ Deleted ${deletedCount} expired audit logs`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error("Delete expired logs failed:", error);
    return { success: false, error };
  }
}

// ━━━ FORMAT LOG FOR DISPLAY ━━━
export function formatLogForDisplay(log) {
  const time = log.timestamp?.toDate
    ? log.timestamp.toDate().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : '--:--';

  const date = log.date || 'Unknown date';

  return {
    time,
    date,
    userName: log.userName || 'Unknown staff',
    action: log.actionDescription || log.action,
    details: log.details || {}
  };
}

console.log("✅ Sparkals Tasks — Audit log system ready");
console.log("📋 Tracking: All actions");
console.log("🗓️ Retention: 1 year");
