// ═══════════════════════════════════════════════════════════
// gem-rewards.js — GemLab Pro Staff Rewards System
// Import this wherever tasks are completed (tasks.html etc.)
//
// GEM RULES:
//   Normal task on time   → 1 gem
//   Priority task on time → 2 gems
//   Urgent task on time   → 3 gems
//   Completed early       → +1 bonus gem
//   Completed late        → 0 gems
//   Gems reset monthly    → stored as YYYY-MM buckets
// ═══════════════════════════════════════════════════════════

import {
  getFirestore, doc, getDoc, setDoc,
  updateDoc, increment, arrayUnion, serverTimestamp, collection, addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ── GEM VALUES ───────────────────────────────────────────
export const GEM_VALUES = {
  normal:   1,
  priority: 2,
  urgent:   3,
};

export const GEM_ICONS = {
  1: '💎',   // diamond — normal
  2: '♦️',   // red diamond — priority
  3: '🔮',   // crystal ball — urgent
};

export const BADGE_ICONS = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

// Current month key — YYYY-MM
export function monthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════
// AWARD GEMS — call this when a task is marked complete
//
// Usage:
//   import { awardGems } from './gem-rewards.js';
//   await awardGems(db, { task, completedByUid, completedByName });
//
// task = { priority: 'normal'|'priority'|'urgent', deadline: 'YYYY-MM-DD', ... }
// ═══════════════════════════════════════════════════════════
export async function awardGems(db, { task, completedByUid, completedByName }) {
  if (!completedByUid || !task) return { gems: 0, reason: 'Missing data' };

  const priority = task.priority || 'normal';
  const deadline = task.deadline || task.dueDate || null;
  const today    = new Date().toISOString().split('T')[0];
  const month    = monthKey();

  // ── Check if late ───────────────────────────────────────
  let isLate  = false;
  let isEarly = false;
  if (deadline) {
    if (today > deadline) isLate = true;
    if (today < deadline) isEarly = true;
  }

  // ── Calculate gems ──────────────────────────────────────
  let gems = 0;
  let reason = '';

  if (isLate) {
    gems   = 0;
    reason = `Completed late — 0 gems`;
  } else {
    gems   = GEM_VALUES[priority] || 1;
    reason = `${priority} task on time — ${gems} gem${gems > 1 ? 's' : ''}`;
    if (isEarly) {
      gems   += 1;
      reason += ' + 1 early bonus';
    }
  }

  if (gems === 0) return { gems: 0, reason };

  // ── Save to Firestore ───────────────────────────────────
  try {
    const staffRef = doc(db, 'gemRewards', completedByUid);
    const snap     = await getDoc(staffRef);

    if (snap.exists()) {
      // Update existing record
      await updateDoc(staffRef, {
        [`months.${month}`]:  increment(gems),
        lifetimeGems:         increment(gems),
        lastEarnedAt:         serverTimestamp(),
        staffName:            completedByName || snap.data().staffName,
      });
    } else {
      // Create new record
      await setDoc(staffRef, {
        uid:         completedByUid,
        staffName:   completedByName || '—',
        lifetimeGems: gems,
        months:      { [month]: gems },
        lastEarnedAt: serverTimestamp(),
        createdAt:   serverTimestamp(),
      });
    }

    // Log the gem earn event
    await addDoc(collection(db, 'gemHistory'), {
      uid:       completedByUid,
      staffName: completedByName || '—',
      gems,
      reason,
      priority,
      taskId:    task.id || null,
      taskTitle: task.title || task.name || '—',
      month,
      isEarly,
      isLate,
      earnedAt:  serverTimestamp(),
      dateStr:   today,
    });

  } catch(e) {
    console.error('gem-rewards: save failed', e);
  }

  return { gems, reason };
}

// ═══════════════════════════════════════════════════════════
// GET STAFF GEMS — fetch a single staff member's gem data
// ═══════════════════════════════════════════════════════════
export async function getStaffGems(db, uid) {
  try {
    const snap = await getDoc(doc(db, 'gemRewards', uid));
    if (!snap.exists()) return { gems: 0, lifetimeGems: 0, months: {} };
    const data = snap.data();
    const month = monthKey();
    return {
      gems:         data.months?.[month] || 0,
      lifetimeGems: data.lifetimeGems    || 0,
      months:       data.months          || {},
    };
  } catch(e) {
    console.error('gem-rewards: getStaffGems failed', e);
    return { gems: 0, lifetimeGems: 0, months: {} };
  }
}

// ═══════════════════════════════════════════════════════════
// GET LEADERBOARD — fetch all staff sorted by this month's gems
// ═══════════════════════════════════════════════════════════
export async function getLeaderboard(db) {
  try {
    const { getDocs, collection: col, query, orderBy } =
      await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const snap = await getDocs(col(db, 'gemRewards'));
    const month = monthKey();
    const entries = snap.docs.map(d => {
      const data = d.data();
      return {
        uid:          d.id,
        staffName:    data.staffName || '—',
        gems:         data.months?.[month] || 0,
        lifetimeGems: data.lifetimeGems   || 0,
      };
    });
    // Sort by this month's gems descending
    entries.sort((a, b) => b.gems - a.gems);
    return entries;
  } catch(e) {
    console.error('gem-rewards: leaderboard failed', e);
    return [];
  }
}

