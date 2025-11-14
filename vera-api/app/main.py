"""
Main FastAPI application
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import traceback

from app.core.config import get_settings
from app.api.endpoints import auth, chat, admin

settings = get_settings()

# Debug: Print CORS origins on startup
print(f"🔧 CORS_ORIGINS configured: {settings.CORS_ORIGINS}")
print(f"🔧 CORS_ORIGINS type: {type(settings.CORS_ORIGINS)}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Multi-user FastAPI backend for Vera - P.A.D. Educational Chatbot"
)

# CORS middleware - must be before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

print(f"✅ CORS middleware added with origins: {settings.CORS_ORIGINS}")

# Global exception handler to ensure CORS headers on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return with CORS headers"""
    print(f"❌ Unhandled exception: {exc}")
    print(f"❌ Traceback: {traceback.format_exc()}")

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc),
            "type": type(exc).__name__
        },
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )

# Explicit OPTIONS handler for all routes (preflight requests)
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    """Handle preflight OPTIONS requests"""
    return {"status": "ok"}

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
app.include_router(chat.router, prefix=f"{settings.API_V1_PREFIX}/chat", tags=["chat"])
app.include_router(admin.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin"])

# Mount audio files directory
if os.path.exists("audio_files"):
    app.mount("/audio", StaticFiles(directory="audio_files"), name="audio")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Vera API",
        "version": settings.VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
