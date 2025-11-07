# Debugging ElevenLabs Connection Issues

## Current Status

✅ **Fixed:**
- Toggle button positioning (now centered below header)
- ElevenLabs conversation/message ID tracking
- Comprehensive error logging
- Message syncing to backend API

## Debugging the "Failed to start conversation" Error

When you see this error, follow these steps:

### Step 1: Check Environment Variable

1. Open the browser console (F12 → Console tab)
2. Look for this log message: `"Agent ID configured: Yes"` or `"No"`
3. If it says "No", check `.env.local`:

```bash
cd vera-frontend
cat .env.local
```

Should contain:
```
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=YnxvbM6HYMhMeZam0Cxw
```

4. If missing or incorrect, fix it and **restart the dev server**:
```bash
npm run dev
```

### Step 2: Check Console Logs

With the browser console open:

1. Try to start a conversation (click phone button or send a text message)
2. Look for these log messages in order:

```
Starting ElevenLabs conversation, textOnly: true
Agent ID configured: Yes
Starting session with config: { agentId: "YnxvbM...", connectionType: "websocket", textOnly: true }
```

3. **If you see an error**, check what it says:

#### Common Errors:

**"ElevenLabs Agent ID not configured"**
- Fix: Add the agent ID to `.env.local` and restart dev server

**"Failed to fetch" or Network error**
- Check your internet connection
- ElevenLabs API might be down (check status.elevenlabs.io)
- Try again in a few seconds

**CORS error**
- This shouldn't happen with ElevenLabs SDK, but if it does:
- Make sure you're using HTTPS in production
- Check ElevenLabs dashboard for allowed origins

**"Invalid agent ID"**
- The agent ID might be wrong
- Go to https://elevenlabs.io/app/conversational-ai
- Find your VERA agent
- Copy the correct ID
- Update `.env.local`

### Step 3: Verify Agent Configuration

1. Go to https://elevenlabs.io/app/conversational-ai
2. Find your VERA agent
3. Check:
   - Agent is **Published** (not in draft mode)
   - Agent has a valid LLM selected
   - Agent has a voice configured
   - Your account has API credits remaining

### Step 4: Check Network Tab

1. Open DevTools → Network tab
2. Try starting a conversation
3. Look for requests to `api.elevenlabs.io`
4. Check the status code:
   - **200**: Success
   - **401**: Authentication failed (check agent ID)
   - **403**: Agent not accessible
   - **429**: Rate limited (wait a bit)
   - **500**: ElevenLabs server error

### Step 5: Test with Minimal Example

Try this in the browser console while on the chat page:

```javascript
// Check if the variable is loaded
console.log('Agent ID:', process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);

// If undefined, the environment variable isn't loading
// Restart dev server and try again
```

## Backend API Status

The frontend tries to sync messages to:
```
POST /api/v1/chat/message
```

### Check if Backend is Ready

Open browser console and look for:
```
Syncing message to backend: { research_id: "...", role: "...", content: "..." }
Backend sync failed: 404 Not Found
```

**If you see 404**:
- The endpoint doesn't exist yet
- Add the endpoint using the code in `vera-api/ELEVENLABS_ENDPOINT.md`
- Messages won't sync, but the chat will still work

**If you see 200**:
- Backend is working correctly
- Messages are being saved

## Testing Checklist

- [ ] Environment variable is set in `.env.local`
- [ ] Dev server restarted after adding env var
- [ ] Browser console shows "Agent ID configured: Yes"
- [ ] ElevenLabs agent is published in dashboard
- [ ] Internet connection is stable
- [ ] No CORS errors in console
- [ ] Backend endpoint returns 200 or 404 (both are ok for now)

## Working Configuration

When everything is working, you should see these logs:

```
1. Starting ElevenLabs conversation, textOnly: true
2. Agent ID configured: Yes
3. Starting session with config: { ... }
4. Status changed to: connecting
5. Status changed to: connected
6. ElevenLabs connected
7. (After sending message) ElevenLabs message received: { ... }
8. Syncing message to backend: { ... }
```

## Still Not Working?

1. **Try OpenAI mode** to verify your backend is working:
   - Click the toggle button to switch to "🤖 OpenAI"
   - If OpenAI works, the issue is ElevenLabs-specific

2. **Check ElevenLabs SDK version**:
   ```bash
   npm list @elevenlabs/react
   ```
   Should show: `@elevenlabs/react@0.9.1`

3. **Try reinstalling dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

4. **Check for TypeScript errors**:
   ```bash
   npm run build
   ```
   Fix any errors shown

## Getting Help

If still stuck, collect this info:

1. Browser console logs (copy/paste entire log)
2. Network tab screenshot showing failed requests
3. Your `.env.local` contents (mask the actual agent ID)
4. ElevenLabs agent dashboard screenshot
5. Output of `npm list @elevenlabs/react`

Then check:
- ElevenLabs documentation: https://elevenlabs.io/docs/conversational-ai/client-sdks/react
- GitHub issues: https://github.com/elevenlabs/elevenlabs-examples/issues
