# VERA Deployment Checklist

Quick checklist to deploy VERA with CI/CD in 15 minutes.

## ☐ Pre-Deployment (5 min)

- [ ] Push all changes to GitHub
  ```bash
  git add .
  git commit -m "Prepare for deployment"
  git push origin main
  ```

- [ ] Gather credentials:
  - [ ] Neon PostgreSQL connection string
  - [ ] OpenAI API key
  - [ ] ElevenLabs API key
  - [ ] Groq API key (optional)

## ☐ Deploy Backend - Railway (5 min)

1. [ ] Sign up at [railway.app](https://railway.app) with GitHub
2. [ ] Create new project → Deploy from GitHub repo
3. [ ] Select your `pad` repository
4. [ ] **CRITICAL**: Configure service settings:
   - [ ] **Root Directory**: Set to `vera-api` (prevents Railway from detecting Streamlit app)
   - [ ] Builder: Should auto-detect "railpack"
   - [ ] Health Check Path: `/health`
5. [ ] Add environment variables (see `.env.production.template`)
6. [ ] Click Deploy
7. [ ] Wait for deployment to complete (2-3 min)
8. [ ] Copy your Railway URL: `https://________.up.railway.app`
9. [ ] Test health endpoint:
   ```bash
   curl https://your-app.up.railway.app/health
   ```

## ☐ Deploy Frontend - Vercel (5 min)

1. [ ] Sign up at [vercel.com](https://vercel.com) with GitHub
2. [ ] Import project → Select your `pad` repository
3. [ ] Configure build:
   - [ ] Root Directory: `vera-frontend`
   - [ ] Framework: Next.js (auto-detected)
4. [ ] Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api/v1
   NEXT_PUBLIC_WS_URL=wss://your-railway-url.up.railway.app/api/v1/chat/ws/chat
   ```
5. [ ] Click Deploy
6. [ ] Wait for deployment to complete (2-3 min)
7. [ ] Copy your Vercel URL: `https://________.vercel.app`

## ☐ Final Configuration (2 min)

1. [ ] Update CORS in Railway:
   - [ ] Go to Railway → Variables
   - [ ] Update `CORS_ORIGINS` to include your Vercel URL:
     ```
     https://your-app.vercel.app,http://localhost:3000
     ```
   - [ ] Railway will auto-redeploy

2. [ ] Test the full app:
   - [ ] Open `https://your-app.vercel.app`
   - [ ] Enter Research ID: `RID001`
   - [ ] Acknowledge disclaimer
   - [ ] Send a text message
   - [ ] Try voice input (click green phone icon)
   - [ ] Verify 5-minute timer works

## ☐ Enable CI/CD (Auto-enabled!)

Both platforms automatically enable CI/CD:

- [ ] Railway watches: `vera-api/**` → Auto-deploys on changes
- [ ] Vercel watches: `vera-frontend/**` → Auto-deploys on changes

Test CI/CD:
```bash
# Make a small change
echo "# Test" >> vera-frontend/README.md

# Commit and push
git add .
git commit -m "Test CI/CD"
git push origin main

# Watch deployments in Railway and Vercel dashboards (2-3 min)
```

## ☐ Post-Deployment

- [ ] Bookmark your URLs:
  - Frontend: `https://________.vercel.app`
  - Backend: `https://________.up.railway.app`
  - Backend Docs: `https://________.up.railway.app/docs`

- [ ] Share with team/testers

- [ ] Monitor logs:
  - Railway: Dashboard → Deployments → View Logs
  - Vercel: Dashboard → Deployments → Runtime Logs

## Troubleshooting

### Backend won't deploy
- [ ] Check Railway build logs
- [ ] Verify `requirements.txt` exists in `vera-api/`
- [ ] Ensure `DATABASE_URL` is correct

### Frontend won't deploy
- [ ] Check Vercel build logs
- [ ] Verify Root Directory is `vera-frontend`
- [ ] Ensure all environment variables are set

### WebSocket connection fails
- [ ] Use `wss://` (not `ws://`) for production
- [ ] Check CORS settings in Railway
- [ ] Verify backend is running (test `/health` endpoint)

### CORS errors
- [ ] Update `CORS_ORIGINS` in Railway to include Vercel URL
- [ ] Format: `https://app1.vercel.app,https://app2.vercel.app`

## Cost Summary

- **Railway**: $5/month (or free tier: 500 hours/month)
- **Vercel**: Free (Hobby plan)
- **Neon**: Free (0.5GB storage)
- **Total**: $0-5/month

## Support

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

---

**You're done! 🎉 Your VERA app is live with CI/CD!**
