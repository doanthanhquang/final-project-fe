## Frontend – React (Vite) SPA

This directory contains the **React + TypeScript + Vite** frontend for the hybrid email productivity app.

- Auth (email/password + Google Sign‑In)
- Inbox (list + Kanban views)
- Hybrid search (Smart / Fuzzy / Semantic) with type‑ahead suggestions
- Email detail view (including “Open in Gmail”)

---

## 1. Prerequisites

- **Node.js** 18+
- **npm** or **yarn**

---

## 2. Setup & Run (Development)

```bash
cd final-project-fe

# Install dependencies
npm install

# Create env file (if you don't have one)
cp .env.example .env

# Start dev server
npm run dev
```

Default dev URL: `http://localhost:5173`

---

## 3. Environment Variables

Create `final-project-fe/.env` (or `.env.local`) with:

```dotenv
# Backend API base URL (Laravel)
VITE_API_URL=http://localhost:8000

# Google OAuth client id (frontend)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

> The backend also needs Google OAuth variables in `final-project-be/.env` (see `final-project-be/README.md`).

---

## 4. Authentication & Token Storage (Frontend)

### 4.1 Access token (in-memory only)

- The access token is stored **in memory** only in `authStorage` (`src/services/auth-storage.ts`).
- After a full page reload (F5), the access token is cleared from memory.

### 4.2 Refresh token (httpOnly cookie)

- The refresh token is stored **server-side only** and sent as an **httpOnly cookie** by the backend.
- Frontend sends cookies via Axios `withCredentials: true` (already configured in `src/services/api.ts`).

### 4.3 Automatic access token refresh

- Protected API requests use `Authorization: Bearer <accessToken>` if present.
- If backend refreshes/restores a token, it returns:
  - `X-New-Access-Token`
  - `X-Access-Token-Expires-At`
- The Axios response interceptor updates the in‑memory token automatically.

---

## 5. Local Dev Flow (Typical)

1. Start backend API (`final-project-be`) at `http://localhost:8000`
2. Start frontend (`final-project-fe`) at `http://localhost:5173`
3. Login:
   - Email/password, or
   - Google Sign‑In (auth-code flow)
4. If you need Gmail access:
   - Connect Gmail via `/api/auth/google/authorize` flow (backend), then use the app.

---

## 6. Build & Preview

```bash
# Build production bundle
npm run build

# Preview locally
npm run preview
```

---

## 7. Deployment Notes (Frontend)

- Build artifacts are in `dist/`
- Set `VITE_API_URL` to the production backend URL (HTTPS).
- Google OAuth configuration must include your production frontend origin.

---

## 8. Troubleshooting

- **Login works, but after refresh (F5) user becomes logged out**
  - Ensure backend is setting `refresh_token` cookie correctly (domain/same-site/secure).
  - Ensure frontend requests include cookies (`withCredentials: true` is enabled).

- **Google Sign‑In fails**
  - Confirm `VITE_GOOGLE_CLIENT_ID` matches the Google Cloud OAuth client ID.
  - Ensure Google Cloud “Authorized JavaScript origins” includes your frontend URL.
