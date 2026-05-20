"""FastAPI application entry point — replaces server/index.js."""

import os
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load .env BEFORE any other imports that read env vars
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from server.database import engine, Base
from server.routers import auth, projects, tasks, dashboard


# ── Lifespan — database setup ────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist (no-op if they do)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)
    print("✓ Database connection established")
    print("✓ Database models synchronized")
    yield
    # Shutdown
    await engine.dispose()


# ── App ──────────────────────────────────────────
app = FastAPI(
    title="Ethara Task Manager API",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────
is_production = os.getenv("NODE_ENV") == "production"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if is_production else [os.getenv("CLIENT_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler to match Express JSON error format ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": str(exc) or "Internal server error"},
    )


# ── API Routers ──────────────────────────────────
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)


# ── Health Check ─────────────────────────────────
@app.get("/api/health")
async def health():
    from datetime import datetime, timezone
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ── Serve React SPA in production ────────────────
CLIENT_DIST = Path(__file__).parent.parent / "client" / "dist"

if is_production and CLIENT_DIST.is_dir():
    # Mount static assets
    app.mount("/assets", StaticFiles(directory=str(CLIENT_DIST / "assets")), name="assets")

    # SPA catch-all: return index.html for any non-API route
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If a file exists in dist, serve it
        file_path = CLIENT_DIST / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        # Otherwise serve index.html (SPA routing)
        return FileResponse(str(CLIENT_DIST / "index.html"))


# ── Run with uvicorn when executed directly ──────
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 5000))
    uvicorn.run(
        "server.main:app",
        host="0.0.0.0",
        port=port,
        reload=not is_production,
    )
