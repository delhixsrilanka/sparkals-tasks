// Sparkals Tasks — Firebase Connection File
// This file connects your live app to your Firebase database

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// Your Firebase project connection keys
const firebaseConfig = {
  apiKey: "AIzaSyDNwQYXcwZrAh4cTfRyhOVk_pRod9p4CRM",
  authDomain: "sparkals-tasks-app.firebaseapp.com",
  projectId: "sparkals-tasks-app",
  storageBucket: "sparkals-tasks-app.firebasestorage.app",
  messagingSenderId: "147179987231",
  appId: "1:147179987231:web:c6ffa484f33a2ca420d02a",
  measurementId: "G-9QF8EWRW3E"
};

// Start Firebase — like turning on the engine
const app = initializeApp(firebaseConfig);

// Connect to each Firebase service
export const db = getFirestore(app);        // Database
export const auth = getAuth(app);           // Login system
export const storage = getStorage(app);     // Photo storage
export const messaging = getMessaging(app); // Push notifications

// ━━━ COMPANY SETTINGS ━━━
export const COMPANY_SETTINGS = {
  name: "Sparkals Tasks",
  workStartTime: "09:00",     // 9:00am
  workEndTime: "18:00",       // 6:00pm
  lateThreshold: "09:15",     // Late if not clocked in by 9:15am
  workDays: [1,2,3,4,5,6],   // Monday=1 to Saturday=6 (Sunday off)
  overtimeAfterHours: 9,      // Overtime after 9 hours
  backupTime: "02:00",        // Daily backup at 2am
  maxStaff: 25,               // Your team size
  timezone: "Asia/Kolkata",   // Chennai timezone
  currency: "INR",            // Indian Rupees
  language: "en"              // Default language
};

// ━━━ USER ROLES ━━━
export const ROLES = {
  ADMIN: "admin",       // You — full access to everything
  MANAGER: "manager",   // Team leader — sees their team
  STAFF: "staff",       // Regular staff — sees own data only
  FIELD: "field"        // Field staff — GPS focused
};

// ━━━ HELPER FUNCTIONS ━━━

// Save any data to Firestore database
export async function saveToDB(collectionName, docId, data) {
  try {
    await setDoc(doc(db, collectionName, docId), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Save failed:", error);
    return { success: false, error };
  }
}

// Read one record from database
export async function readFromDB(collectionName, docId) {
  try {
    const docSnap = await getDoc(doc(db, collectionName, docId));
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: "Not found" };
  } catch (error) {
    console.error("Read failed:", error);
    return { success: false, error };
  }
}

// Read all records from a collection
export async function readAllFromDB(collectionName) {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const results = [];
    querySnapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: results };
  } catch (error) {
    console.error("Read all failed:", error);
    return { success: false, error };
  }
}

// Write to audit log — records every action with timestamp
export async function writeAuditLog(userId, action, details) {
  try {
    const logId = `${Date.now()}_${userId}`;
    await setDoc(doc(db, "auditLogs", logId), {
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}

// Check if user is logged in
export function checkAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

// Log staff member in
export async function loginStaff(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await writeAuditLog(userCredential.user.uid, "LOGIN", { email });
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false, error: error.message };
  }
}

// Log staff member out
export async function logoutStaff() {
  try {
    const userId = auth.currentUser?.uid;
    if (userId) await writeAuditLog(userId, "LOGOUT", {});
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Logout failed:", error);
    return { success: false, error };
  }
}

// Get current logged in user details from database
export async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  const result = await readFromDB("users", user.uid);
  return result.success ? result.data : null;
}

console.log("✅ Sparkals Tasks — Firebase connected successfully");
console.log("📊 Project: sparkals-tasks-app");
console.log("🏢 Company: Sparkals Tasks");
console.log("👥 Max staff: 25");
console.log("🕘 Work hours: 9am–6pm, Mon–Sat");
