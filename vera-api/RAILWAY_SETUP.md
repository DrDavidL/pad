# Railway Deployment Setup for VERA API

## Critical Configuration

**IMPORTANT**: Railway MUST have the Root Directory set correctly!

### In Railway Dashboard

1. Go to your service → **Settings** tab
2. Find **Service Settings** section
3. Set **Root Directory**: `vera-api`

This is **critical** because:
- Your repository has both a Streamlit app (root) and FastAPI app (vera-api/)
- Without setting Root Directory, Railway will try to use the root `requirements.txt` (Streamlit dependencies)
- With Root Directory set to `vera-api`, all commands run from within that directory

## Configuration Files

### `railway.toml`
- Specifies railpack builder
- Sets start command (runs from vera-api/ directory)
- Configures health check at `/health`
- Defines watch paths to trigger rebuilds

### `railpack.toml`
- Specifies Python 3.12 (required for dependency compatibility)
- Defines install command: `pip install -r requirements.txt`
- Sets start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- All paths are relative to vera-api/ (because Root Directory is set)

### `Procfile`
- Backup process definition
- Simple: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### `runtime.txt`
- Specifies Python version: `python-3.12.0`

## Environment Variables Required

Set these in Railway dashboard → Variables tab:

```env
# Database
DATABASE_URL=postgresql://[your-neon-connection-string]

# Security
SECRET_KEY=[your-secret-key-min-32-chars]

# API Keys
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
ELEVENLABS_API_KEY=sk_...

# Admin
ADMIN_PASSWORD=[your-admin-password]

# CORS (comma-separated list - add your Vercel URL after frontend deployment)
CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

**IMPORTANT**: `CORS_ORIGINS` must be a **comma-separated string** (no spaces around commas is fine, the parser handles it).

## Deployment Process

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```

2. **Railway Auto-Deploys**
   - Detects changes in `vera-api/**`
   - Installs dependencies from `vera-api/requirements.txt`
   - Runs health check at `/health`
   - Service is live when health check passes

## Troubleshooting

### Build fails with "embedchain not found"
**Problem**: Railway is reading root `requirements.txt` instead of `vera-api/requirements.txt`

**Fix**:
1. Go to Railway Dashboard → Settings
2. Set **Root Directory** to `vera-api`
3. Redeploy

### Health check fails
**Problem**: App isn't starting properly

**Fix**:
1. Check Railway logs for errors
2. Verify all environment variables are set
3. Ensure `DATABASE_URL` is correct
4. Check that `SECRET_KEY` is set
5. Verify Python version is 3.12

### "Module not found" errors
**Problem**: Dependencies not installed correctly

**Fix**:
1. Verify Root Directory is set to `vera-api`
2. Check that `requirements.txt` exists in `vera-api/`
3. Redeploy with a fresh build

## Testing Deployment

Once deployed, test these endpoints:

```bash
# Health check
curl https://your-app.up.railway.app/health
# Should return: {"status":"healthy"}

# API docs
open https://your-app.up.railway.app/docs

# Root endpoint
curl https://your-app.up.railway.app/
# Should return: {"message":"Vera API","version":"1.0.0","docs":"/docs"}
```

## CI/CD

Railway automatically:
- ✅ Watches `vera-api/**` for changes
- ✅ Rebuilds on git push
- ✅ Runs health checks
- ✅ Rolls back on failure

No additional configuration needed!
