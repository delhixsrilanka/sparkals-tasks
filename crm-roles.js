// ═══════════════════════════════════════════════════════════
// crm-roles.js — BGTL CRM Role & Permission System
// Import this in every CRM screen to get the current user's role
// and apply permission-based UI instantly.
// ═══════════════════════════════════════════════════════════

import { getFirestore, doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ── ADMIN EMAILS (always Admin regardless of Firestore) ───
const ADMIN_EMAILS = [
  'sandeepgemologist@gmail.com',
  'sparkals.design@gmail.com'
];

// ── PERMISSION MATRIX ────────────────────────────────────
// true = allowed | false = greyed out with 🔒
const PERMISSIONS = {
  admin: {
    addCustomer:    true,
    editCustomer:   true,
    createJob:      true,
    updateJobStatus:true,
    createInvoice:  true,
    cancelInvoice:  true,
    takePayment:    true,
    sendWhatsApp:   true,
    pettyCash:      true,
    dayClose:       true,
    viewMasters:    true,
    editMasters:    true,
    manageRoles:    true,
    viewCRM:        true,
  },
  receptionist: {
    addCustomer:    true,
    editCustomer:   true,
    createJob:      true,
    updateJobStatus:true,
    createInvoice:  true,
    cancelInvoice:  false,
    takePayment:    true,
    sendWhatsApp:   true,
    pettyCash:      true,
    dayClose:       false,
    viewMasters:    false,
    editMasters:    false,
    manageRoles:    false,
    viewCRM:        true,
  },
  gemologist: {
    addCustomer:    true,
    editCustomer:   true,
    createJob:      true,
    updateJobStatus:true,
    createInvoice:  false,
    cancelInvoice:  false,
    takePayment:    true,
    sendWhatsApp:   false,
    pettyCash:      false,
    dayClose:       false,
    viewMasters:    false,
    editMasters:    false,
    manageRoles:    false,
    viewCRM:        true,
  },
  manager: {
    addCustomer:    true,
    editCustomer:   true,
    createJob:      true,
    updateJobStatus:false,
    createInvoice:  false,
    cancelInvoice:  false,
    takePayment:    true,
    sendWhatsApp:   false,
    pettyCash:      false,
    dayClose:       true,
    viewMasters:    false,
    editMasters:    false,
    manageRoles:    false,
    viewCRM:        true,
  },
  // Default fallback — view only
  staff: {
    addCustomer:    false,
    editCustomer:   false,
    createJob:      false,
    updateJobStatus:false,
    createInvoice:  false,
    cancelInvoice:  false,
    takePayment:    false,
    sendWhatsApp:   false,
    pettyCash:      false,
    dayClose:       false,
    viewMasters:    false,
    editMasters:    false,
    manageRoles:    false,
    viewCRM:        true,
  }
};

// ── ROLE LABELS & COLOURS (for display) ──────────────────
export const ROLE_META = {
  admin:        { label: 'Admin',        colour: '#a78bfa', icon: '👑' },
  receptionist: { label: 'Receptionist', colour: '#60a5fa', icon: '🖥️' },
  gemologist:   { label: 'Gemologist',   colour: '#10b981', icon: '💎' },
  manager:      { label: 'Manager',      colour: '#fbbf24', icon: '📊' },
  staff:        { label: 'Staff',        colour: '#9ca3af', icon: '👤' },
};

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT — call this once on page load
// Returns: { role, can(permission) }
//
// Usage in any CRM page:
//   import { getCRMRole } from './crm-roles.js';
//   const crm = await getCRMRole(auth, db, user);
//   applyPermissions(crm);
// ═══════════════════════════════════════════════════════════
export async function getCRMRole(db, user) {
  if (!user) return buildRole('staff');

  // Admin always wins — no Firestore lookup needed
  if (ADMIN_EMAILS.includes(user.email)) return buildRole('admin');

  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const role = snap.data().crmRole || 'staff';
      return buildRole(role);
    }
  } catch(e) {
    console.warn('crm-roles: could not read role', e);
  }

  return buildRole('staff');
}

function buildRole(role) {
  const perms = PERMISSIONS[role] || PERMISSIONS.staff;
  return {
    role,
    meta: ROLE_META[role] || ROLE_META.staff,
    can: (permission) => perms[permission] === true,
  };
}

// ═══════════════════════════════════════════════════════════
// applyPermissions — call after getCRMRole
// Finds every element with data-permission="xyz"
// and greys it out + adds 🔒 if not allowed
//
// Usage in HTML:
//   <button data-permission="cancelInvoice">Cancel Invoice</button>
// ═══════════════════════════════════════════════════════════
export function applyPermissions(crm) {
  document.querySelectorAll('[data-permission]').forEach(el => {
    const perm = el.getAttribute('data-permission');
    if (!crm.can(perm)) {
      // Disable the element
      el.disabled = true;
      el.style.opacity    = '0.35';
      el.style.cursor     = 'not-allowed';
      el.style.filter     = 'grayscale(0.5)';

      // Add 🔒 to button text if it's a button
      if (el.tagName === 'BUTTON' || el.tagName === 'A') {
        if (!el.getAttribute('data-original-text')) {
          el.setAttribute('data-original-text', el.innerHTML);
        }
        // Prepend lock only if not already there
        if (!el.innerHTML.includes('🔒')) {
          el.innerHTML = '🔒 ' + el.innerHTML;
        }
      }

      // Block clicks
      el.addEventListener('click', blockClick, true);
    } else {
      // Restore if previously locked
      el.disabled = false;
      el.style.opacity = '';
      el.style.cursor  = '';
      el.style.filter  = '';
      const orig = el.getAttribute('data-original-text');
      if (orig) el.innerHTML = orig;
      el.removeEventListener('click', blockClick, true);
    }
  });
}

function blockClick(e) {
  e.preventDefault();
  e.stopImmediatePropagation();
}

// ═══════════════════════════════════════════════════════════
// showRoleBadge — shows current user's role badge
// Pass a container element ID
// ═══════════════════════════════════════════════════════════
export function showRoleBadge(crm, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const m = crm.meta;
  el.innerHTML = `
    <span style="
      font-size:11px;padding:3px 10px;border-radius:20px;font-weight:700;
      background:${m.colour}22;color:${m.colour};border:1px solid ${m.colour}44;
    ">${m.icon} ${m.label}</span>`;
}

// ═══════════════════════════════════════════════════════════
// saveUserRole — Admin only, saves role to Firestore
// ═══════════════════════════════════════════════════════════
export async function saveUserRole(db, uid, role, updatedBy) {
  await setDoc(doc(db, 'users', uid), {
    crmRole:   role,
    updatedAt: serverTimestamp(),
    updatedBy: updatedBy
  }, { merge: true });
}
