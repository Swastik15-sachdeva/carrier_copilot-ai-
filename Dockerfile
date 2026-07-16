# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend source and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Build the frontend assets
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend and serve
FROM python:3.11-slim
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY backend /app/backend

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

WORKDIR /app/backend

# Port environment variable setup
ENV PORT=8000
EXPOSE $PORT

# Start command with gunicorn
CMD gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
