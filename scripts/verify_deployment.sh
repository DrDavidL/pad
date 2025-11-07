#!/bin/bash

# VERA Deployment Verification Script
# This script helps verify your production deployment is configured correctly

set -e  # Exit on error

echo "================================================"
echo "   VERA Production Deployment Verification"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Get URLs from user
echo "Please provide your deployment URLs:"
echo ""
read -p "Railway Backend URL (e.g., vera-api-production.up.railway.app): " RAILWAY_URL
read -p "Vercel Frontend URL (e.g., vera-pad.vercel.app): " VERCEL_URL

echo ""
echo "================================================"
echo "   Testing Backend (Railway)"
echo "================================================"
echo ""

# Test 1: Backend Health Check
print_info "Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://${RAILWAY_URL}/health" 2>&1 || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    print_success "Backend is healthy (HTTP 200)"
    HEALTH_JSON=$(curl -s "https://${RAILWAY_URL}/health")
    echo "   Response: $HEALTH_JSON"
else
    print_error "Backend health check failed (HTTP ${HEALTH_RESPONSE})"
    echo "   Expected: HTTP 200"
    echo "   Check: Is Railway deployment running?"
fi

echo ""

# Test 2: Backend API Documentation
print_info "Checking API documentation endpoint..."
DOCS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://${RAILWAY_URL}/docs" 2>&1 || echo "000")

if [ "$DOCS_RESPONSE" = "200" ]; then
    print_success "API docs accessible at https://${RAILWAY_URL}/docs"
else
    print_warning "API docs not accessible (HTTP ${DOCS_RESPONSE})"
fi

echo ""

# Test 3: CORS Configuration
print_info "Testing CORS configuration..."
CORS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Origin: https://${VERCEL_URL}" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS "https://${RAILWAY_URL}/api/v1/auth/validate-research-id" 2>&1 || echo "000")

if [ "$CORS_RESPONSE" = "200" ] || [ "$CORS_RESPONSE" = "204" ]; then
    print_success "CORS is configured correctly"
else
    print_error "CORS may not be configured correctly (HTTP ${CORS_RESPONSE})"
    echo "   Check: Does CORS_ORIGINS in Railway include https://${VERCEL_URL}?"
fi

echo ""
echo "================================================"
echo "   Testing Frontend (Vercel)"
echo "================================================"
echo ""

# Test 4: Frontend Accessibility
print_info "Testing frontend accessibility..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://${VERCEL_URL}" 2>&1 || echo "000")

if [ "$FRONTEND_RESPONSE" = "200" ]; then
    print_success "Frontend is accessible (HTTP 200)"
else
    print_error "Frontend is not accessible (HTTP ${FRONTEND_RESPONSE})"
    echo "   Check: Is Vercel deployment successful?"
fi

echo ""

# Test 5: Check WebSocket Upgrade Support
print_info "Testing WebSocket support..."
WS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "https://${RAILWAY_URL}/api/v1/chat/ws/chat" 2>&1 || echo "000")

if [ "$WS_RESPONSE" = "101" ] || [ "$WS_RESPONSE" = "426" ]; then
    print_success "WebSocket endpoint is reachable"
    echo "   Note: Full WebSocket test requires browser"
else
    print_warning "WebSocket endpoint response: HTTP ${WS_RESPONSE}"
    echo "   Note: Some proxies don't support curl WebSocket upgrade"
fi

echo ""
echo "================================================"
echo "   Environment Variable Checklist"
echo "================================================"
echo ""

print_info "Please verify these environment variables are set:"
echo ""

echo "Railway Backend Variables:"
echo "  [ ] DATABASE_URL"
echo "  [ ] SECRET_KEY"
echo "  [ ] OPENAI_API_KEY"
echo "  [ ] ELEVENLABS_API_KEY  ⚠️  CRITICAL FOR AUDIO"
echo "  [ ] CORS_ORIGINS = https://${VERCEL_URL}"
echo "  [ ] ADMIN_PASSWORD"
echo "  [ ] RAILWAY_ENVIRONMENT = production"
echo ""

echo "Vercel Frontend Variables:"
echo "  [ ] NEXT_PUBLIC_API_URL = https://${RAILWAY_URL}/api/v1"
echo "  [ ] NEXT_PUBLIC_WS_URL = wss://${RAILWAY_URL}/api/v1/chat/ws/chat"
echo ""

echo "================================================"
echo "   Next Steps"
echo "================================================"
echo ""

if [ "$HEALTH_RESPONSE" = "200" ] && [ "$FRONTEND_RESPONSE" = "200" ]; then
    print_success "Basic connectivity tests passed!"
    echo ""
    echo "Next steps:"
    echo "1. Open https://${VERCEL_URL} in your browser"
    echo "2. Open DevTools Console (F12)"
    echo "3. Send a test message to VERA"
    echo "4. Check console for these messages:"
    echo "   - 'WebSocket connected successfully'"
    echo "   - 'Audio enabled successfully'"
    echo "   - 'Received audio message: Audio data present'"
    echo ""
    echo "5. Verify audio plays automatically"
    echo ""
    echo "If audio doesn't work:"
    echo "- Check Railway logs for 'TTS generated successfully'"
    echo "- Verify ELEVENLABS_API_KEY is set in Railway"
    echo "- Check browser console for errors"
else
    print_error "Some connectivity tests failed"
    echo ""
    echo "Action items:"
    if [ "$HEALTH_RESPONSE" != "200" ]; then
        echo "- Check Railway deployment status"
        echo "- Check Railway logs for errors"
        echo "- Verify Railway URL is correct"
    fi
    if [ "$FRONTEND_RESPONSE" != "200" ]; then
        echo "- Check Vercel deployment status"
        echo "- Check Vercel build logs"
        echo "- Verify Vercel URL is correct"
    fi
fi

echo ""
echo "================================================"
echo "   Useful Commands"
echo "================================================"
echo ""
echo "Check backend health:"
echo "  curl https://${RAILWAY_URL}/health"
echo ""
echo "View API docs:"
echo "  open https://${RAILWAY_URL}/docs"
echo ""
echo "View frontend:"
echo "  open https://${VERCEL_URL}"
echo ""
echo "View Railway logs:"
echo "  railway logs --tail"
echo ""
echo "View Vercel logs:"
echo "  vercel logs https://${VERCEL_URL} --follow"
echo ""

echo "================================================"
echo "   Test completed at $(date)"
echo "================================================"
