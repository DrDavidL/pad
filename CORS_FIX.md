# CORS Configuration Fix

## Issue
CORS errors when frontend tries to connect to backend:
```
Access to XMLHttpRequest at 'https://your-backend.railway.app/api/...' from origin 'https://your-frontend.vercel.app' has been blocked by CORS policy
```

## Solution Applied

### 1. Enhanced CORS Middleware (main.py)
- Added explicit HTTP methods including OPTIONS
- Added specific headers instead of wildcard
- Added preflight caching (max_age: 3600)
- Added explicit OPTIONS handler for all routes

### 2. Required Railway Environment Variable

**CRITICAL**: You MUST set the `CORS_ORIGINS` environment variable in Railway to include your Vercel frontend URL.

#### Steps to Fix in Railway Dashboard:

1. Go to Railway Dashboard → Your Project → vera-api service
2. Click on **Variables** tab
3. Find or add `CORS_ORIGINS` variable
4. Set the value to include BOTH localhost (for development) AND your Vercel URL:

```
http://localhost:3000,https://your-app.vercel.app
```

**Example with actual URLs:**
```
http://localhost:3000,https://vera-pad-frontend.vercel.app
```

**Important Notes:**
- Comma-separated, no spaces
- Include the full `https://` protocol
- Include your Vercel domain (check Vercel dashboard for exact URL)
- Railway will auto-redeploy when you save this change

### 3. Verify CORS is Working

After setting the environment variable, check Railway logs on startup for:
```
🔧 CORS_ORIGINS configured: ['http://localhost:3000', 'https://your-app.vercel.app']
✅ CORS middleware added with origins: ['http://localhost:3000', 'https://your-app.vercel.app']
```

### 4. Test CORS

From browser console on your Vercel frontend:
```javascript
fetch('https://your-railway-url.up.railway.app/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Should return: `{status: "healthy"}` without CORS errors.

## Technical Details

The CORS middleware is configured to:
- Allow credentials (cookies, auth headers)
- Handle preflight OPTIONS requests
- Cache preflight responses for 1 hour
- Explicitly allow required headers

The OPTIONS handler at the root level ensures ALL routes support preflight requests, which is required for cross-origin requests with custom headers (like Authorization).

## Common Mistakes to Avoid

❌ **Wrong:** Missing protocol
```
your-app.vercel.app
```

✅ **Correct:** Include full URL
```
https://your-app.vercel.app
```

❌ **Wrong:** Spaces in the list
```
http://localhost:3000, https://your-app.vercel.app
```

✅ **Correct:** No spaces
```
http://localhost:3000,https://your-app.vercel.app
```

❌ **Wrong:** Using wildcard in production
```
CORS_ORIGINS=*
```

✅ **Correct:** Explicit origins for security
```
CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

## If CORS Still Fails

1. Check Railway deployment logs for CORS configuration on startup
2. Verify the `CORS_ORIGINS` variable is actually set (Variables tab)
3. Check browser network tab → Headers for the failed request
4. Ensure you're using `https://` (not `http://`) for production URLs
5. Try a hard refresh (Cmd+Shift+R / Ctrl+Shift+R) to clear browser cache
