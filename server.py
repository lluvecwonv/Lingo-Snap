import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from database import init_db, migrate_db
from routers import auth_router, content_router, expression_router

app = FastAPI(title="Lingo Snap")

# Routers
app.include_router(auth_router.router)
app.include_router(content_router.router)
app.include_router(expression_router.router)

# Serve frontend
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")


@app.on_event("startup")
def startup():
    init_db()
    migrate_db()


# Page routes
@app.get("/")
async def root():
    return RedirectResponse("/login")


@app.get("/login")
async def login_page():
    return FileResponse(os.path.join(frontend_dir, "login.html"))


@app.get("/language")
async def language_page():
    return FileResponse(os.path.join(frontend_dir, "language.html"))


@app.get("/contents")
async def contents_page():
    return FileResponse(os.path.join(frontend_dir, "contents.html"))


@app.get("/seasons")
async def seasons_page():
    return FileResponse(os.path.join(frontend_dir, "seasons.html"))


@app.get("/episodes")
async def episodes_page():
    return FileResponse(os.path.join(frontend_dir, "episodes.html"))


@app.get("/expressions")
async def expressions_page():
    return FileResponse(os.path.join(frontend_dir, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
