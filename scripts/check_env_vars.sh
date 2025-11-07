#!/bin/bash

# Script to help verify environment variables are set correctly
# This generates the exact commands you need to set in Vercel and Railway

echo "================================================"
echo "   VERA Environment Variable Generator"
echo "================================================"
echo ""

# Get URLs
echo "Please provide your deployment URLs:"
echo ""
read -p "Railway Backend URL (without https://): " RAILWAY_URL
read -p "Vercel Frontend URL (without https://): " VERCEL_URL

echo ""
echo "================================================"
echo "   Railway Environment Variables"
echo "================================================"
echo ""
echo "Copy these into Railway dashboard (Variables tab):"
echo ""

cat << EOF
DATABASE_URL=postgresql://neondb_owner:YOUR_DB_PASSWORD_HERE@ep-wandering-sea-a5xid0o5.us-east-2.aws.neon.tech/neondb?sslmode=require

SECRET_KEY=YOUR_SECRET_KEY_MIN_32_CHARS_HERE

OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE

ELEVENLABS_API_KEY=sk_YOUR_ELEVENLABS_API_KEY_HERE

ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD

CORS_ORIGINS=https://${VERCEL_URL},http://localhost:3000

GROQ_API_KEY=gsk_...

OPENROUTER_API_KEY=

RAILWAY_ENVIRONMENT=production
EOF

echo ""
echo "================================================"
echo "   Vercel Environment Variables"
echo "================================================"
echo ""
echo "Copy these into Vercel dashboard (Settings → Environment Variables):"
echo ""
echo "Variable 1:"
echo "  Name:  NEXT_PUBLIC_API_URL"
echo "  Value: https://${RAILWAY_URL}/api/v1"
echo ""
echo "Variable 2:"
echo "  Name:  NEXT_PUBLIC_WS_URL"
echo "  Value: wss://${RAILWAY_URL}/api/v1/chat/ws/chat"
echo ""

echo "================================================"
echo "   Quick Copy Commands"
echo "================================================"
echo ""
echo "# Railway CORS_ORIGINS:"
echo "CORS_ORIGINS=https://${VERCEL_URL},http://localhost:3000"
echo ""
echo "# Vercel API URL:"
echo "NEXT_PUBLIC_API_URL=https://${RAILWAY_URL}/api/v1"
echo ""
echo "# Vercel WebSocket URL:"
echo "NEXT_PUBLIC_WS_URL=wss://${RAILWAY_URL}/api/v1/chat/ws/chat"
echo ""

echo "================================================"
echo "   Important Notes"
echo "================================================"
echo ""
echo "1. Railway variables:"
echo "   - No trailing slashes in CORS_ORIGINS"
echo "   - Must include https:// protocol in CORS_ORIGINS"
echo "   - ELEVENLABS_API_KEY is critical for audio"
echo ""
echo "2. Vercel variables:"
echo "   - Use https:// for NEXT_PUBLIC_API_URL"
echo "   - Use wss:// (not ws://) for NEXT_PUBLIC_WS_URL"
echo "   - Apply to Production environment only"
echo ""
echo "3. After setting variables:"
echo "   - Railway auto-redeploys"
echo "   - Vercel requires manual redeploy"
echo "   - Wait 2-3 minutes for deployment"
echo ""

echo "================================================"
echo "   Testing After Configuration"
echo "================================================"
echo ""
echo "1. Test backend health:"
echo "   curl https://${RAILWAY_URL}/health"
echo ""
echo "2. Test frontend:"
echo "   open https://${VERCEL_URL}"
echo ""
echo "3. Open browser console and send a message"
echo "   Look for: 'Audio enabled successfully'"
echo ""
