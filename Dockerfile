# ---------- Stage 1: Build frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ ./
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

# ---------- Stage 2: Backend + serve ----------
FROM python:3.11-slim AS runtime
WORKDIR /app

# System deps (build tools for some scientific packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
      gcc g++ curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Backend
COPY backend/ /app/backend/

# Static frontend
COPY --from=frontend-build /app/frontend/build /app/static

# Patch server.py to also serve the built SPA (optional)
RUN python -c "import pathlib;p=pathlib.Path('/app/backend/serve_static.py');p.write_text('''from fastapi.staticfiles import StaticFiles\nfrom fastapi.responses import FileResponse\nimport os\nfrom server import app\n\nSTATIC = \"/app/static\"\nif os.path.isdir(STATIC):\n    app.mount(\"/static\", StaticFiles(directory=STATIC + \"/static\"), name=\"static\")\n    @app.get(\"/{full_path:path}\")\n    async def spa(full_path: str):\n        idx = os.path.join(STATIC, \"index.html\")\n        return FileResponse(idx)\n''')"

ENV PYTHONUNBUFFERED=1 \
    MONGO_URL=mongodb://localhost:27017 \
    DB_NAME=stockvision \
    CORS_ORIGINS=* \
    PORT=8001

EXPOSE 8001
WORKDIR /app/backend
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/api/ || exit 1
CMD ["sh","-c","uvicorn serve_static:app --host 0.0.0.0 --port ${PORT}"]
