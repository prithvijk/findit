/* =========================================================
   firebase.js  –  the ONLY file that talks to Firebase.
   script.js imports `Backend` from here and never touches
   Firestore or Auth directly.

   Collections
     reports/{id}   public item reports (no email, only a masked one)
     contacts/{id}  reporter email for a report      (admin read only)
     claims/{id}    claims on found items            (admin + the claimant's own device)
     admins/{uid}   a document here makes that Auth user an admin
   ========================================================= */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInAnonymously,
  signInWithEmailAndPassword, signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, getDoc, setDoc, onSnapshot, query, where, orderBy, limit,
  writeBatch, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

export const isConfigured = !Object.values(firebaseConfig).some(v => String(v).startsWith('PASTE_'));

let app, auth, db;
if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Local cache makes pages load instantly and keeps working briefly offline.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
}

const col = name => collection(db, name);
const snapList = (snap) => snap.docs.map(d => ({ ...d.data(), id: d.id }));

export const Backend = {
  isConfigured,

  /* ---------- auth ---------- */
  // Calls cb({ uid, isAdmin, email }) whenever the signed-in user changes.
  // Visitors are signed in anonymously so they can submit reports and claims.
  watchAuth(cb, onError) {
    return onAuthStateChanged(auth, async user => {
      if (!user) {
        try { await signInAnonymously(auth); }
        catch (e) { onError(e); cb(null); }
        return;
      }
      let isAdmin = false;
      if (!user.isAnonymous) {
        try { isAdmin = (await getDoc(doc(db, 'admins', user.uid))).exists(); } catch (e) { isAdmin = false; }
      }
      cb({ uid: user.uid, isAdmin, email: user.email || '', anonymous: user.isAnonymous });
    });
  },
  adminLogin: (email, password) => signInWithEmailAndPassword(auth, email, password),
  adminLogout: () => signOut(auth),

  /* ---------- realtime listeners (each returns an unsubscribe fn) ---------- */
  watchReports(cb, onError) {
    return onSnapshot(query(col('reports'), orderBy('createdAt', 'desc'), limit(300)),
      s => cb(snapList(s)), onError);
  },
  watchMyClaims(uid, cb, onError) {
    return onSnapshot(query(col('claims'), where('ownerUid', '==', uid)), s => cb(snapList(s)), onError);
  },
  watchAllClaims(cb, onError) {
    return onSnapshot(query(col('claims'), orderBy('createdAt', 'desc')), s => cb(snapList(s)), onError);
  },
  watchContacts(cb, onError) {
    return onSnapshot(col('contacts'), s => {
      const map = {}; s.docs.forEach(d => { map[d.id] = d.data().email; }); cb(map);
    }, onError);
  },

  /* ---------- writes by visitors ---------- */
  async createReport(report, email, uid) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'reports', report.id), { ...report, ownerUid: uid });
    batch.set(doc(db, 'contacts', report.id), { email, ownerUid: uid });
    await batch.commit();
  },
  async createClaim(claim, report, uid) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'claims', claim.id), { ...claim, ownerUid: uid });
    if (report.status === 'Open') batch.update(doc(db, 'reports', report.id), { status: 'Claim Pending' });
    await batch.commit();
  },

  /* ---------- writes by admin (rules enforce this server-side) ---------- */
  async markReturned(reportId) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'reports', reportId), { status: 'Returned', returnedAt: new Date().toISOString() });
    await batch.commit();
  },
  async decideClaim(claim, decision, allClaims) {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    batch.update(doc(db, 'claims', claim.id), { status: decision, decidedAt: now });
    if (decision === 'Approved') {
      batch.update(doc(db, 'reports', claim.reportId), { status: 'Claim Approved' });
      allClaims.filter(o => o.id !== claim.id && o.reportId === claim.reportId && o.status === 'Pending')
        .forEach(o => batch.update(doc(db, 'claims', o.id), { status: 'Rejected', decidedAt: now }));
    } else {
      const stillPending = allClaims.some(o => o.id !== claim.id && o.reportId === claim.reportId && o.status === 'Pending');
      if (!stillPending) batch.update(doc(db, 'reports', claim.reportId), { status: 'Open' });
    }
    await batch.commit();
  },
  async deleteReport(reportId, claims) {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'reports', reportId));
    batch.delete(doc(db, 'contacts', reportId));
    claims.filter(c => c.reportId === reportId).forEach(c => batch.delete(doc(db, 'claims', c.id)));
    await batch.commit();
  },
  async seed({ reports, contacts, claims }, uid) {
    const batch = writeBatch(db);
    reports.forEach(r => batch.set(doc(db, 'reports', r.id), { ...r, ownerUid: uid }));
    Object.entries(contacts).forEach(([id, email]) => batch.set(doc(db, 'contacts', id), { email, ownerUid: uid }));
    claims.forEach(c => batch.set(doc(db, 'claims', c.id), { ...c, ownerUid: uid }));
    await batch.commit();
  }
};
