# Production Dockerfile for FastAPI Microgrid Backend & ML Inference Engine
FROM python:3.11-slim

WORKDIR /app

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn==0.30.6 \
    pydantic==2.9.2 \
    pandas==2.2.2 \
    numpy==1.26.4 \
    scikit-learn==1.5.1 \
    joblib==1.4.2 \
    pvlib==0.11.1 \
    requests==2.32.3 \
    jinja2==3.1.4

# Copy backend application, trainee ML engine, and trained models
COPY backend/ ./backend/
COPY trainee/ ./trainee/
COPY models/ ./models/

WORKDIR /app/backend

ENV PORT=8000
EXPOSE 8000

CMD ["python", "main.py"]
