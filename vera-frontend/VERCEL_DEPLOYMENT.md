# Vercel Deployment Guide for VERA Frontend

## Environment Variables Setup

### Step 1: Add Environment Variables in Vercel

1. Go to your Vercel project: https://vercel.com/[your-username]/[your-project]
2. Click **Settings** tab
3. Click **Environment Variables** in the left sidebar
4. Add the following variables:

#### Variable 1: Backend API URL
- **Name**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://your-railway-backend.up.railway.app/api/v1`
  (Replace with your actual Railway backend URL)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

#### Variable 2: WebSocket URL
- **Name**: `NEXT_PUBLIC_WS_URL`
- **Value**: `wss://your-railway-backend.up.railway.app/api/v1/chat/ws/chat`
  (Replace with your actual Railway backend URL, note: `wss://` not `ws://`)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

#### Variable 3: ElevenLabs Agent ID
- **Name**: `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`
- **Value**: `your_agent_id_here` (Get from https://elevenlabs.io/app/conversational-ai)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

### Step 2: Redeploy

**IMPORTANT**: Vercel requires a redeploy to pick up new environment variables.

Option A - Via Dashboard:
1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy**
4. Confirm redeploy

Option B - Via Git Push:
```bash
cd vera-frontend
git commit --allow-empty -m "Trigger redeploy with env vars"
git push
```

### Step 3: Verify Environment Variables

After redeployment, check the build logs:

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Building** to see logs
4. Look for: `Creating an optimized production build...`
5. Environment variables should be embedded in the build

### Step 4: Test in Production

1. Open your Vercel deployment URL
2. Open browser DevTools (F12) → Console
3. Type: `console.log(process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID)`
4. Should show: `undefined` (correct - they're embedded at build time)
5. Instead, look for this log when you try to connect:
   ```
   Agent ID configured: Yes
   Starting session with config: { agentId: "YnxvbM...", ... }
   ```

## Troubleshooting

### Issue: "Agent ID configured: No"

**Cause**: Environment variable not set or not redeployed

**Solution**:
1. Check Vercel dashboard → Settings → Environment Variables
2. Verify `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` is set
3. **Redeploy** the application (critical!)
4. Wait for build to complete
5. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

### Issue: "Failed to start conversation"

**Possible Causes**:

1. **Environment variable missing**
   - Check: Browser console should show "Agent ID configured: Yes"
   - Fix: Add env var and redeploy

2. **Agent not published on ElevenLabs**
   - Check: https://elevenlabs.io/app/conversational-ai
   - Fix: Publish the agent

3. **CORS issue**
   - Check: Network tab shows CORS error
   - Fix: Ensure using HTTPS (Vercel auto-provides this)

4. **Backend URL incorrect**
   - Check: Browser console → Network tab → look for API calls
   - Fix: Update `NEXT_PUBLIC_API_URL` to correct Railway URL

### Issue: WebSocket not connecting (OpenAI mode)

**Cause**: Using `ws://` instead of `wss://` in production

**Solution**:
1. Vercel → Settings → Environment Variables
2. Update `NEXT_PUBLIC_WS_URL` to use `wss://` (note the 's')
3. Redeploy

### Issue: Console shows "undefined" for env variables

**This is normal!** In production builds, Next.js embeds the environment variables at build time and removes the `process.env` references. You won't see them in the console, but they're baked into your code.

**To verify they're working:**
- Look for "Agent ID configured: Yes" in console logs
- Check Network tab for API calls going to correct URLs

## Local Development Setup

### On Your Other Machine

1. **Clone the repo** (if needed):
   ```bash
   git clone <your-repo-url>
   cd pad/vera-frontend
   ```

2. **Copy environment template**:
   ```bash
   cp .env.local.example .env.local
   ```

3. **Edit `.env.local`**:
   ```bash
   nano .env.local  # or use any editor
   ```

4. **Fill in the values**:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/v1/chat/ws/chat
   NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here
   ```

5. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```

6. **Verify in console**:
   - Open http://localhost:3000
   - Check console for "Agent ID configured: Yes"

## Backend URL Configuration

### Finding Your Railway Backend URL

1. Go to Railway dashboard
2. Click on your `vera-api` project
3. Go to Settings → Domains
4. Copy the domain (e.g., `vera-api-production-xxxx.up.railway.app`)
5. Use this format in Vercel:
   - API: `https://vera-api-production-xxxx.up.railway.app/api/v1`
   - WS: `wss://vera-api-production-xxxx.up.railway.app/api/v1/chat/ws/chat`

## Security Notes

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **Use `.env.local.example`** for documentation
3. **Rotate secrets if exposed** - If agent ID is leaked, create a new agent
4. **Vercel env vars are secure** - Only visible to project members

## Deployment Checklist

Before deploying:
- [ ] Backend is deployed and running on Railway
- [ ] Environment variables added in Vercel dashboard
- [ ] All three env vars have correct values
- [ ] Backend URLs use `https://` and `wss://`
- [ ] Agent is published on ElevenLabs
- [ ] Triggered redeploy after adding env vars

After deploying:
- [ ] Build completed successfully
- [ ] No errors in build logs
- [ ] Can open production URL
- [ ] Console shows "Agent ID configured: Yes"
- [ ] Can send messages in both modes
- [ ] No CORS errors in console
- [ ] Backend receives and saves messages

## Getting Help

If you're still stuck after trying the above:

1. **Check Vercel build logs** - Look for errors during build
2. **Check browser console** - Look for specific error messages
3. **Check Network tab** - See if API calls are reaching backend
4. **Verify backend is running** - Visit `https://your-backend.railway.app/docs`
5. **Check `DEBUGGING_ELEVENLABS.md`** - Frontend-specific debugging

## Quick Commands

```bash
# Deploy from CLI
vercel --prod

# View logs
vercel logs

# List environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```
