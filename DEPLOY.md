# Deploy Supabase + Vercel

## 1. Supabase Setup (5 min)

1. Go to **supabase.com**
2. Click **"Sign Up"** (use GitHub or email)
3. Create new project → Choose **PostgreSQL**
4. Wait for DB ready (~2 min)
5. Go to **Settings → Database → Connection string**
6. Copy the `postgresql://...` link
7. Save it — you'll need it for Vercel

## 2. Vercel Setup (3 min)

1. Go to **vercel.com**
2. Click **"Sign Up"** with **GitHub**
3. Authorize Vercel to access your GitHub
4. Click **"New Project"**
5. Select repo **recruter-search**
6. Click **"Deploy"** (will fail — that's OK, we need env vars first)

## 3. Add Environment Variables (2 min)

In Vercel dashboard:
1. Go to **Settings → Environment Variables**
2. Add new variable:
   - Name: `DATABASE_URL`
   - Value: `postgresql://[user]:[password]@[host]:[port]/[database]`
   - (from Supabase Step 7)
3. Click **Save**
4. Add another variable:
   - Name: `SESSION_SECRET`
   - Value: `your-random-secret-key-here`
5. Click **Save**

## 4. Deploy (1 min)

1. Go to **Deployments** tab
2. Click **Redeploy** button on the failed build
3. Wait ~60 seconds
4. ✅ Done! App is live at `recruter-search.vercel.app`

## 5. Custom Domain (optional)

1. In Vercel: **Settings → Domains**
2. Add domain: `cautare.buildandfix.ai`
3. Update DNS at domain registrar (Vercel shows instructions)

## 6. Test

Visit: `https://recruter-search.vercel.app`
- Register account
- Login
- Search
- Open on phone → "Add to Home Screen" → PWA installed

---

**Questions?** Check logs:
- Vercel: **Deployments → Latest → Function Logs**
- Supabase: **SQL Editor** to check if tables created

Done! 🚀
