# NewPRder

A read-only, public web app. No user accounts — anyone with the link can view it.
Data is served from Firestore with public-read security rules; you update the
data via the Firebase console or an admin script.

## Stack

- **Vite 8 + React 19 + TypeScript 6**
- **MUI v9** for UI (all styling goes in the `sx` prop)
- **React Router v7** (`basename: '/newprder'`)
- **Firebase v12** — Firestore only (no Auth)
- **Deploy:** GitHub Pages via GitHub Actions, served under `/newprder/`

## Local development

```bash
npm install
cp .env.example .env   # then fill in your Firebase web config
npm run dev
```

Other scripts: `npm run build`, `npm run lint`, `npm run preview`.

## Firestore data

The app reads the `items` collection, ordered by `createdAt` descending.
Each document currently uses the placeholder shape in `src/types/index.ts`:

```ts
interface Item {
  id: string;
  title: string;
  description?: string;
  createdAt?: number;
}
```

Replace this shape (and the `HomePage` rendering) once the real domain is
defined. Writes from the client are denied by `firestore.rules` — edit data in
the Firebase console or via a server/admin script.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. Add the `VITE_FIREBASE_*` values as repository
secrets (Settings → Secrets and variables → Actions), and set Pages source to
"GitHub Actions".

## Firebase setup

1. Create a Firebase project and a Web app; copy the config into `.env`.
2. Create a Firestore database.
3. Deploy the security rules: `firebase deploy --only firestore:rules`
   (update the project id in `.firebaserc` first).
