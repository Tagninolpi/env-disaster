from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI()

BASE_DIR = Path(__file__).parent

# Serve static files (JS, CSS, fragments)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# Single entry point
@app.get("/")
def index():
    return FileResponse(BASE_DIR / "index.html")
