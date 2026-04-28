/**
 * SPARKALS TASKS — OFFLINE SYNC ENGINE
 * File: offline-sync.js
 * Add to GitHub repository, then add this line to dashboard.html,
 * attendance.html and tasks.html just before </body>:
 * <script src="offline-sync.js"></script>
 *
 * HOW IT WORKS:
 * - Uses IndexedDB (phone's built-in local storage database)
 * - When offline: saves clock-in, task updates, comments to phone
 * - When online: silently sends all queued data to Firebase
 * - Staff never see any error — app just works
 */

const SparkalSync = (function () {

  const DB_NAME = "sparkals_offline_db";
  const DB_VERSION = 1;
  const STORES = {
    QUEUE: "sync_queue",       // pending actions to sync
    TASKS: "cached_tasks",     // tasks cached for offline view
    ATTENDANCE: "cached_att",  // attendance cached for offline view
  };

  let db = null;
  let isOnline = navigator.onLine;

  // ── OPEN INDEXEDDB ──
  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORES.QUEUE)) {
          const q = d.createObjectStore(STORES.QUEUE, { keyPath: "id", autoIncrement: true });
          q.createIndex("type", "type", { unique: false });
          q.createIndex("synced", "synced", { unique: false });
        }
        if (!d.objectStoreNames.contains(STORES.TASKS)) {
          d.createObjectStore(STORES.TASKS, { keyPath: "id" });
        }
        if (!d.objectStoreNames.contains(STORES.ATTENDANCE)) {
          d.createObjectStore(STORES.ATTENDANCE, { keyPath: "id" });
        }
      };
      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror = e => { console.error("[Sync] DB open error:", e); reject(e); };
    });
  }

  // ── ADD TO SYNC QUEUE ──
  async function addToQueue(type, data) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.QUEUE, "readwrite");
      const store = tx.objectStore(STORES.QUEUE);
      const item = {
        type,
        data,
        synced: false,
        createdAt: new Date().toISOString(),
        attempts: 0
      };
      const req = store.add(item);
      req.onsuccess = () => {
        console.log("[Sync] Queued offline action:", type);
        resolve(req.result);
      };
      req.onerror = reject;
    });
  }

  // ── GET ALL PENDING QUEUE ITEMS ──
  async function getPendingQueue() {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.QUEUE, "readonly");
      const store = tx.objectStore(STORES.QUEUE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.filter(i => !i.synced));
      req.onerror = reject;
    });
  }

  // ── MARK ITEM AS SYNCED ──
  async function markSynced(id) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.QUEUE, "readwrite");
      const store = tx.objectStore(STORES.QUEUE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) { resolve(); return; }
        item.synced = true;
        item.syncedAt = new Date().toISOString();
        const putReq = store.put(item);
        putReq.onsuccess = resolve;
        putReq.onerror = reject;
      };
      getReq.onerror = reject;
    });
  }

  // ── CACHE TASKS FOR OFFLINE VIEWING ──
  async function cacheTasks(tasks) {
    const database = await openDB();
    const tx = database.transaction(STORES.TASKS, "readwrite");
    const store = tx.objectStore(STORES.TASKS);
    store.clear();
    tasks.forEach(task => {
      try { store.put({ ...task, cachedAt: new Date().toISOString() }); } catch(e) {}
    });
    console.log("[Sync] Cached", tasks.length, "tasks for offline");
  }

  // ── GET CACHED TASKS ──
  async function getCachedTasks() {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORES.TASKS, "readonly");
      const store = tx.objectStore(STORES.TASKS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    });
  }

  // ── CACHE ATTENDANCE ──
  async function cacheAttendance(records) {
    const database = await openDB();
    const tx = database.transaction(STORES.ATTENDANCE, "readwrite");
    const store = tx.objectStore(STORES.ATTENDANCE);
    store.clear();
    records.forEach(r => {
      try { store.put({ ...r, cachedAt: new Date().toISOString() }); } catch(e) {}
    });
    console.log("[Sync] Cached", records.length, "attendance records");
  }

  // ── PROCESS SYNC QUEUE ──
  // Runs when internet comes back — sends all queued data to Firebase
  async function processSyncQueue() {
    if (!isOnline) return;
    const pending = await getPendingQueue();
    if (!pending.length) return;
    console.log("[Sync] Processing", pending.length, "queued item(s)...");

    for (const item of pending) {
      try {
        await syncItem(item);
        await markSynced(item.id);
        console.log("[Sync] ✅ Synced:", item.type, "id:", item.id);
      } catch (err) {
        console.warn("[Sync] ❌ Failed to sync:", item.type, err.message);
        // Will retry next time online
      }
    }
  }

  // ── SYNC A SINGLE ITEM TO FIREBASE ──
  async function syncItem(item) {
    // Dynamically import Firebase only when needed
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
    const { getFirestore, collection, doc, addDoc, updateDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

    // Get existing app or init
    const app = getApps().length
      ? getApps()[0]
      : initializeApp(window.firebaseConfig || {});
    const db = getFirestore(app);

    switch (item.type) {

      case "CLOCK_IN": {
        const { uid, name, date, clockIn, clockInLat, clockInLng, department } = item.data;
        const docId = `${uid}_${date}`;
        await addDoc(collection(db, "attendance"), {
          userId: uid, uid, name, date, department,
          clockIn: new Date(clockIn),
          clockInLat: clockInLat || null,
          clockInLng: clockInLng || null,
          clockOut: null,
          source: "offline_sync",
          createdAt: serverTimestamp()
        }).catch(() => {
          // If doc exists (e.g. already synced), just update
          return updateDoc(doc(db, "attendance", docId), {
            clockIn: new Date(clockIn),
            clockInLat: clockInLat || null,
            clockInLng: clockInLng || null,
          });
        });
        break;
      }

      case "CLOCK_OUT": {
        const { attendanceId, clockOut, clockOutLat, clockOutLng } = item.data;
        if (!attendanceId) break;
        await updateDoc(doc(db, "attendance", attendanceId), {
          clockOut: new Date(clockOut),
          clockOutLat: clockOutLat || null,
          clockOutLng: clockOutLng || null,
        });
        break;
      }

      case "TASK_STAGE_UPDATE": {
        const { taskId, stage } = item.data;
        await updateDoc(doc(db, "tasks", taskId), {
          stage,
          updatedAt: serverTimestamp()
        });
        break;
      }

      case "TASK_COMMENT": {
        const { taskId, comments } = item.data;
        await updateDoc(doc(db, "tasks", taskId), {
          comments,
          updatedAt: serverTimestamp()
        });
        break;
      }

      case "CHECKLIST_UPDATE": {
        const { taskId, checklist } = item.data;
        await updateDoc(doc(db, "tasks", taskId), {
          checklist,
          updatedAt: serverTimestamp()
        });
        break;
      }

      default:
        console.warn("[Sync] Unknown item type:", item.type);
    }
  }

  // ── ONLINE / OFFLINE DETECTION ──
  window.addEventListener("online", () => {
    isOnline = true;
    console.log("[Sync] Back online — starting sync...");
    processSyncQueue();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
    console.log("[Sync] Gone offline — actions will be queued");
  });

  // ── OFFLINE STATUS INDICATOR ──
  // Small subtle dot in the corner — only visible when offline
  function createOfflineIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "spkOfflineIndicator";
    indicator.style.cssText = `
      position: fixed;
      bottom: 75px;
      right: 12px;
      background: #ef4444;
      color: #fff;
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 20px;
      z-index: 9998;
      display: none;
      align-items: center;
      gap: 5px;
      box-shadow: 0 2px 8px rgba(239,68,68,0.4);
      pointer-events: none;
    `;
    indicator.innerHTML = `<span style="width:6px;height:6px;background:#fff;border-radius:50%;display:inline-block"></span> Offline`;
    document.body.appendChild(indicator);

    function updateIndicator() {
      indicator.style.display = navigator.onLine ? "none" : "flex";
    }
    updateIndicator();
    window.addEventListener("online", updateIndicator);
    window.addEventListener("offline", updateIndicator);
  }

  // ── INIT ──
  async function init() {
    await openDB();
    createOfflineIndicator();
    // Try to sync any leftover queue from previous offline session
    if (isOnline) {
      setTimeout(processSyncQueue, 2000);
    }
    console.log("[Sync] Offline sync engine ready (v3)");
  }

  // Start on page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ── PUBLIC API ──
  // Call these from dashboard.html and attendance.html
  return {
    // Queue a clock-in when offline
    queueClockIn: (data) => addToQueue("CLOCK_IN", data),
    // Queue a clock-out when offline
    queueClockOut: (data) => addToQueue("CLOCK_OUT", data),
    // Queue a task stage update when offline
    queueTaskStage: (taskId, stage) => addToQueue("TASK_STAGE_UPDATE", { taskId, stage }),
    // Queue a task comment when offline
    queueTaskComment: (taskId, comments) => addToQueue("TASK_COMMENT", { taskId, comments }),
    // Queue a checklist update when offline
    queueChecklist: (taskId, checklist) => addToQueue("CHECKLIST_UPDATE", { taskId, checklist }),
    // Save tasks to phone for offline viewing
    cacheTasks,
    // Get tasks from phone when offline
    getCachedTasks,
    // Save attendance to phone for offline viewing
    cacheAttendance,
    // Check if online
    isOnline: () => isOnline,
    // Force a sync attempt
    sync: processSyncQueue,
  };

})();

// Make globally available
window.SparkalSync = SparkalSync;
console.log("[Sync] SparkalSync loaded — offline mode active");
