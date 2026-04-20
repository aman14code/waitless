#  WaitLess Deployment Guide

## Prerequisites
- GitHub account (free)
- Supabase account (free)  
- Render account (free)
- Vercel account (free)

---

##  DEPLOYMENT STEPS

###  Step 1: Database Setup (Supabase) - 5 minutes

1. **Sign up**: https://supabase.com  "Start your project"  Sign in with GitHub

2. **Create Project**:
   - Click "New Project" 
   - Organization: Your personal org
   - Name: `waitless` 
   - Database Password: Create strong password (SAVE THIS!)
   - Region: Choose closest to you
   - Click "Create new project"  Wait 2 minutes for setup

3. **Get Database URL**:
   - Project created  Click "Settings" ( gear icon)
   - Left sidebar  "Database" 
   - Scroll to "Connection String" section
   - Copy the **URI** format (postgresql://...)
   - **CRITICAL**: Replace `[YOUR-PASSWORD]` with your actual password
   - Should look like: `postgresql://postgres:yourpassword123@db.abcdef.supabase.co:5432/postgres` 
   - **Save this URL**  You need it for Step 2

---

###  Step 2: Backend Deployment (Render) - 10 minutes

1. **Sign up**: https://render.com  "Get Started for Free"  Sign in with GitHub

2. **Deploy Backend**:
   - Click "New +"  "Web Service"
   - "Build and deploy from a Git repository"  Next
   - Connect your GitHub  Select `waitless` repo  Connect

3. **Configuration**:
   - **Name**: `waitless-backend` (or any name you like)
   - **Region**: Oregon (US West) or closest to you
   - **Branch**: `main` 
   - **Root Directory**: `backend`  IMPORTANT!
   - **Runtime**: Node
   - **Build Command**: 
     ```
     npm install && npx prisma generate && npx prisma migrate deploy
     ```
   - **Start Command**: 
     ```
     npm start
     ```
   - **Instance Type**: Free

4. **Environment Variables** (Click "Advanced Settings"):
   
   Add these 4 variables:
   
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Paste your Supabase URL from Step 1 |
   | `JWT_SECRET` | `waitless_jwt_secret_2024` |
   | `PORT` | `5000` |
   | `CLIENT_URL` | `https://temp.com` (update later) |

5. **Deploy**:
   - Click "Create Web Service"
   - Wait 5-8 minutes for build + deploy
   - When successful, copy the live URL (like: `https://waitless-backend-xyz.onrender.com`)
   - **Save this backend URL**  Need for Step 3

6. **Seed Database**:
   - After deploy succeeds  Click "Shell" tab in top navigation
   - Terminal opens  Run:
     ```bash
     node prisma/seed.js
     ```
   - Should output: " Seed data created successfully!"
   - If error  Try: `cd /opt/render/project/src && node ../prisma/seed.js` 

---

###  Step 3: Frontend Deployment (Vercel) - 5 minutes

1. **Sign up**: https://vercel.com  "Start Deploying"  Continue with GitHub

2. **Import Project**:
   - Dashboard  "Add New..."  "Project" 
   - Find `waitless` repository  "Import"

3. **Configure**:
   - **Framework Preset**: Next.js  (auto-detected)
   - **Root Directory**: Click "Edit"  Select `frontend` folder  IMPORTANT!
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

4. **Environment Variables**:
   - Section: "Environment Variables"
   - Add variable:
     
     | Key | Value |
     |-----|-------|
     | `NEXT_PUBLIC_API_URL` | Your Render backend URL (from Step 2) |
     
     Example: `https://waitless-backend-xyz.onrender.com` 

5. **Deploy**:
   - Click "Deploy" 
   - Wait 2-4 minutes
   - Success! Copy your live frontend URL (like: `https://waitless-abc123.vercel.app`)

---

###  Step 4: Connect Frontend  Backend - 2 minutes

1. **Update Render Config**:
   - Go back to Render dashboard
   - Click your `waitless-backend` service
   - "Environment" tab
   - Edit `CLIENT_URL` variable
   - **New value**: Your Vercel URL (from Step 3)
   - Example: `https://waitless-abc123.vercel.app` 
   - Click "Save Changes"

2. **Auto-redeploy**:
   - Render automatically redeploys
   - Wait 2-3 minutes
   -  Done!

---

##  TEST YOUR LIVE APP

### Your Live URLs:
- **Frontend**: `https://waitless-abc123.vercel.app` (your Vercel URL)
- **Backend API**: `https://waitless-backend-xyz.onrender.com` (your Render URL)

### Test Flow:
1. **Open your Vercel URL**
2. **Register new patient**  Should redirect to patient dashboard
3. **Open incognito**  Login as doctor:
   - Phone: `8888888888` 
   - Password: `doctor123` 
4. **Open another browser**  Login as admin:
   - Phone: `9999999999` 
   - Password: `admin123` 

### Test Real-time Magic:
1. **Patient browser**: Book token for "Dr. Rajesh Kumar"
2. **Doctor browser**: Token appears instantly 
3. **Doctor**: Click "Call Next Patient"  
4. **Patient browser**: " IT'S YOUR TURN!" appears live 
5. **Admin browser**: All stats update in real-time 

---

##  TROUBLESHOOTING

### Backend Deploy Failed
**Error**: "Build failed" on Render
- **Check**: Root Directory = `backend` 
- **Check**: Build command includes `npx prisma generate` 
- **Fix**: Go to "Settings"  "Build & Deploy"  Verify commands

### Frontend Can't Load
**Error**: White screen or API errors in console (F12)
- **Check**: Root Directory = `frontend`  
- **Check**: `NEXT_PUBLIC_API_URL` has no trailing slash
- **Fix**: Redeploy with correct environment variable

### Database Connection Failed
**Error**: "connect ENOTFOUND" in Render logs
- **Check**: DATABASE_URL password is correct (no brackets!)
- **Fix**: Copy fresh URL from Supabase  Update in Render

### Real-time Not Working
**Error**: Queue updates don't appear live
- **Check**: CLIENT_URL in Render = Vercel URL exactly
- **Fix**: Update CLIENT_URL  Redeploy backend

---

##  SUCCESS CHECKLIST

- [ ] Supabase project created & DATABASE_URL copied
- [ ] Render backend deployed & seeded successfully  
- [ ] Vercel frontend deployed with correct API URL
- [ ] CLIENT_URL updated in Render environment
- [ ] All 3 dashboards load (patient/doctor/admin)
- [ ] Real-time updates work across browsers
- [ ] Test credentials work correctly

---

##  FREE TIER LIMITS

**Important to know:**

| Service | Limit | Impact |
|---------|--------|--------|
| **Render** | Sleeps after 15min idle | 30s cold start delay |
| **Vercel** | No limits for personal | None |
| **Supabase** | 500MB database | Fine for MVP |

**Keep Render awake** (optional):
- Use UptimeRobot.com (free)
- Ping your backend URL every 5 minutes

---

##  BEFORE SHARING PUBLICLY

- [ ] Change JWT_SECRET to random 32-char string
- [ ] Update default admin password 
- [ ] Add rate limiting (production security)

---

##  PORTFOLIO BOOST

**Add to your resume:**
- "Built real-time web application with 3 user roles"
- "Implemented WebSocket for live queue updates"  
- "Deployed full-stack app with modern DevOps practices"

**LinkedIn post idea:**
"Just launched WaitLess - a real-time hospital queue management system! 
Features: 
 Live queue tracking like Dominos
 Doctor & admin dashboards
 Real-time updates with Socket.io
 Deployed on Supabase + Render + Vercel

Patients can now book virtual tokens and track their position in real-time, reducing 4+ hour wait times to just 5 minutes of actual waiting.

Built with Next.js, Node.js, PostgreSQL, and Socket.io. Full-stack deployment with modern DevOps practices.

#WebDevelopment #RealTime #HealthTech #FullStackDev"
