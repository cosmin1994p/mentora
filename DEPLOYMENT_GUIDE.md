# 🚀 Deployment Guide - Free Hosting

## Quick Deployment: Vercel + Render + MongoDB Atlas

Your application is **production-ready**. Deploy in 3 steps to use on phone + laptop.

---

## Step 1: Deploy Frontend to Vercel (Free)

### Setup Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub/GitLab
3. Verify email

### Deploy Frontend
```bash
# From project root
npm run build  # Already passes ✅
```

1. On Vercel dashboard → New Project
2. Select your GitHub repo
3. Configure:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
4. Add environment variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.onrender.com` (add after backend deployed)
5. Click "Deploy"

**Result**: Frontend live at `your-project.vercel.app`

---

## Step 2: Deploy Backend to Render (Free)

### Prepare Backend

1. Push `backend/` folder to GitHub:
```bash
git add backend/
git commit -m "Backend for deployment"
git push origin main
```

### Deploy on Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect GitHub account
4. New Service → Web Service
5. Select your repository
6. Configure:
   - **Name**: `masterclass-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Port**: `5002`

### Add Environment Variables
1. In Render dashboard → Environment
2. Add:
```
MONGODB_URI=mongodb+srv://USER:PASS@your-cluster.mongodb.net/mentora
PORT=5002
NODE_ENV=production
```

3. Click "Create Web Service"

**Result**: Backend live at `your-backend-url.onrender.com`

---

## Step 3: Update Frontend with Backend URL

1. Go to Vercel → Settings → Environment Variables
2. Update `VITE_API_URL`:
   - **Value**: `https://your-backend-url.onrender.com`
3. Redeploy: Vercel → Deployments → Trigger Deploy
4. Wait for build to complete

**Result**: Frontend now connected to backend

---

## Test Deployment

### Test on Desktop
1. Open `https://your-project.vercel.app`
2. Sign up with email
3. Set mood
4. Enroll in course
5. Refresh page → Course still there ✅

### Test on Phone
1. Open same URL on mobile browser
2. Sign up (or use same account)
3. Enroll in different course
4. Go back to desktop
5. Refresh → See phone's enrollment ✅

### Test Multi-Device Sync
1. **Device A**: Enroll in "Web Development"
2. **Device B**: Open app → Refresh
3. Device B shows "Web Development" ✅

---

## Free Tier Limits

| Service | Free Tier | Limit |
|---------|-----------|-------|
| **Vercel** | 100GB bandwidth/month | Deploy unlimited times |
| **Render** | 750 hours/month | Auto-sleep if no traffic |
| **MongoDB** | Shared cluster | 512MB storage included |

### Notes:
- Render backend sleeps after 15min inactivity (wakes up on first request)
- MongoDB free tier includes enough storage for learning platform
- Upgrade when you hit limits (no setup changes needed)

---

## Production Checklist

Before going live:

- [ ] Test signup/login on desktop
- [ ] Test signup/login on mobile
- [ ] Enroll in course on desktop
- [ ] Refresh mobile → See enrollment
- [ ] Enroll on mobile
- [ ] Refresh desktop → See enrollment
- [ ] Upload course as admin
- [ ] Video loads properly
- [ ] Quiz completion saves
- [ ] Mood update works
- [ ] Delete course (admin only)
- [ ] Verify MongoDB has data

---

## Monitoring & Troubleshooting

### Check Backend Status
```bash
# Visit: https://your-backend-url.onrender.com/api/courses
# Should return JSON array of courses
```

### Check Frontend Errors
1. Open browser console (F12)
2. Check for fetch errors
3. Verify `VITE_API_URL` environment variable set

### Check MongoDB Status
1. Go to MongoDB Atlas dashboard
2. Check "Deployments" → Network Access
3. Add your app URL IP to whitelist (if needed)

### Common Issues

**"Cannot reach backend"**
- Wait 30 seconds (Render wakes up)
- Check VITE_API_URL is correct
- Verify backend environment variables

**"MongoDB connection failed"**
- Check MONGODB_URI is correct
- Verify IP in MongoDB Atlas network access
- Check credentials in URI

**"File upload fails"**
- Check GridFS buckets created
- Verify backend has file permissions
- Check MongoDB storage quota

---

## Upgrade Path (When Needed)

### Vercel Pro
- More bandwidth
- More build minutes
- Same deployment process

### Render Paid
- Keeps backend always online
- Better performance
- Dedicated resources

### MongoDB Premium
- More storage
- Higher throughput
- Better security

**No code changes needed for upgrades!**

---

## Custom Domain (Optional)

### Add Custom Domain to Vercel
1. Vercel Settings → Domains
2. Add your domain (e.g., masterclass.com)
3. Update DNS records as shown
4. 24-48 hour propagation

### Add Custom Domain to Render
1. Render Settings → Custom Domain
2. Add domain
3. Add CNAME record to DNS

---

## SSL/HTTPS (Automatic)

✅ Vercel: Automatic SSL
✅ Render: Automatic SSL
✅ MongoDB Atlas: Automatic SSL

No setup needed - all connections encrypted!

---

## Summary

**Deployed:**
- Frontend: `https://your-project.vercel.app`
- Backend: `https://your-backend-url.onrender.com`
- Database: MongoDB Atlas `masterclass`

**Access from:**
- Phone: Any browser
- Laptop: Any browser
- Tablet: Any browser

**Data syncs:**
- Instant between devices
- Persistent in MongoDB
- Backed up automatically

**Cost:**
- Free forever (unless you exceed limits)
- Upgrade individually when needed
- No credit card required initially

---

## Next Steps

1. ✅ Deploy frontend to Vercel
2. ✅ Deploy backend to Render
3. ✅ Update VITE_API_URL
4. ✅ Test multi-device sync
5. ✅ Add custom domain (optional)
6. ✅ Share with users

**You're ready to go live! 🚀**
