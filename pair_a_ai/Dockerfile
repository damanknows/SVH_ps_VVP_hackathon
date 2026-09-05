# Multi-Stage Lean Docker Build for Pair A AI Engine
FROM python:3.11-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runner

WORKDIR /app

# Minimal runtime dependencies
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn==0.30.6 \
    onnxruntime==1.19.2 \
    pyomo==6.8.0 \
    highspy==1.7.2 \
    pandas==2.2.2 \
    numpy==1.26.4 \
    jinja2==3.1.4 \
    pydantic==2.9.2 \
    pvlib==0.11.1

COPY models/ ./models/
COPY app/ ./app/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
