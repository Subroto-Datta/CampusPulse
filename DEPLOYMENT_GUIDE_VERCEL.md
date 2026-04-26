# 🚀 CampusPulse Vercel Deployment Guide

This guide provides a step-by-step, word-for-word process to deploy **CampusPulse** to Vercel with your **Supabase** backend.

---

## 1. Prerequisites
- A **GitHub** account with your code pushed to a repository.
- A **Supabase** project created (which we've already linked).
- The SQL schema and RLS disabling script run in your Supabase SQL Editor.

---

## 2. Prepare the Code
I have already added a `vercel.json` at the root of your project. This is the **most critical file**. It tells Vercel:
- **Frontend**: Build using Vite and serve from `/dist`.
- **Backend**: Treat `backend/src/app.js` as a serverless function and route all `/api/*` traffic to it.

---

## 3. GitHub Push
Ensure all changes I made are committed and pushed:
```bash
git add .
git commit -m "Vercel and Supabase compatibility fix"
git push origin main
```

---

## 4. Vercel Project Setup
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** > **Project**.
3. **Import** your `CampusPulse` repository.
4. **Project Configuration**:
   - **Framework Preset**: Other (it will auto-detect from `vercel.json`).
   - **Root Directory**: `./` (leave as default root).

---

## 5. Environment Variables (CRITICAL)
Before clicking "Deploy", expand the **Environment Variables** section and add these exactly as they appear in your `.env` file:

| Variable Name | Value |
| :--- | :--- |
| `DB_TYPE` | `supabase` |
| `SUPABASE_URL` | `https://vhpaljoijtntclxetvov.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `JWT_SECRET` | `your_secret_here_or_leave_default` |
| `CORS_ORIGIN` | `*` (or your final Vercel URL) |
| `NODE_ENV` | `production` |

---

## 6. Optimization for Vercel
Vercel's serverless functions work slightly differently than a persistent server.
1. **Database Client**: Your `backend/src/config/supabase.js` is already configured to be serverless-safe.
2. **Path Rewrites**: The `/api` prefix is handled automatically by the `vercel.json` I created.

---

## 7. Deployment
1. Click **Deploy**.
2. Wait 2-3 minutes for the build to finish.
3. Once you see the "Congratulations" screen, click the **Visit** button.

---

## 8. Troubleshooting
- **404 on API**: Ensure your `vercel.json` is in the **root** folder, not inside `backend`.
- **500 on Login/Save**: Double-check that you ran the `DISABLE ROW LEVEL SECURITY` SQL commands for **all tables** in the Supabase Dashboard.
- **Frontend white screen**: Check the Vercel Build logs to ensure `npm run build` finished successfully in the `frontend` folder.

---

### 🎉 Your app is now live!
You can now access your CampusPulse instance from anywhere in the world.
