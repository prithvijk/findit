# findit
# CampusFind AI – Firebase edition

## Files
| File | Purpose |
|---|---|
| `index.html` | Pages and markup (loads `script.js` as an ES module) |
| `style.css` | Styles |
| `script.js` | UI logic: renders live data, forms, matching, admin, map |
| `firebase.js` | The only file that talks to Firebase (Auth + Firestore) |
| `firebase-config.js` | **You paste your Firebase web config here** |
| `firestore.rules` | Security rules (publish these!) |
| `firebase.json` | Firebase CLI config (rules + hosting) |

## Setup (about 10 minutes)
1. **Create project**: console.firebase.google.com → Add project.
2. **Web app**: Project settings → General → Your apps → `</>` → register → copy the config object into `firebase-config.js`.
3. **Firestore**: Build → Firestore Database → Create database (production mode, nearest region, e.g. `asia-south1`).
4. **Authentication**: Build → Authentication → Get started → Sign-in method → enable **Anonymous** and **Email/Password**.
5. **Rules**: Firestore → Rules tab → paste the contents of `firestore.rules` → Publish.
6. **Create your admin**:
   - Authentication → Users → Add user (your email + password). Copy its **User UID**.
   - Firestore → Start collection `admins` → Document ID = that UID → add any field (e.g. `role: "admin"`) → Save.
7. **Run it** (modules do not work by double-clicking `index.html`):
   - VS Code "Live Server" extension, or `npx serve .`, or `python -m http.server 8000` then open `http://localhost:8000`.
   - In Authentication → Settings → Authorized domains, `localhost` is already allowed.
8. Open **Admin Dashboard**, sign in, click **Load sample data** (optional).

## Deploy (optional, free)
```
npm i -g firebase-tools
firebase login
firebase init      # choose existing project; keep firestore.rules and public dir "."
firebase deploy
```

## How data is protected
- Anyone can read `reports` (emails are masked there).
- Real emails live in `contacts`, claims in `claims`: admin only (a visitor sees only claims made from their own browser).
- Only admins can approve/reject, mark returned, delete.
- Field sizes and types are validated in the rules; photos are compressed to ~600px and must be < 500 KB.

## Known limits
- "Check my claim status" shows claims made from the same browser (visitors are anonymous). Cross-device lookup by email needs a Cloud Function.
- Any visitor can flip an open found item to "Claim Pending" (needed so claims show instantly). The admin can reject to reset it.
- For spam protection later, enable Firebase App Check.
****
