/**
 * SPARKALS TASKS — FIREBASE CONFIG
 * ─────────────────────────────────
 * This file ONLY defines the firebaseConfig object.
 * It must be loaded as a plain <script> tag — NOT as type="module".
 * Every page loads this first, then uses its own Firebase imports.
 *
 * Load order in every HTML page:
 * 1. <script src="firebase-config.js"></script>   ← this file
 * 2. <script type="module"> ... your page code ... </script>
 */

// Global Firebase config — available to all pages
var firebaseConfig = {
  apiKey:            "AIzaSyDNwQYXcwZrAh4cTfRyhOVk_pRod9p4CRM",
  authDomain:        "sparkals-tasks-app.firebaseapp.com",
  projectId:         "sparkals-tasks-app",
  storageBucket:     "sparkals-tasks-app.firebasestorage.app",
  messagingSenderId: "147179987231",
  appId:             "1:147179987231:web:c6ffa484f33a2ca420d02a"
};

// Company settings — available to all pages
var COMPANY_SETTINGS = {
  name:             "Sparkals Tasks",
  workStart:        "09:00",
  workEnd:          "18:00",
  lateThreshold:    "09:15",
  workDays:         [1,2,3,4,5,6],  // Mon–Sat, Sunday off
  overtimeAfter:    9,
  timezone:         "Asia/Kolkata",
  currency:         "INR",
  officeGPS:        { lat: 13.0405, lng: 80.2337 },
  geofenceRadius:   100             // metres
};

console.log("✅ Sparkals firebase-config.js loaded — Project: sparkals-tasks-app");
