# Multi-Stage Lean Docker Build for VVP Microgrid Engine
# Stage 1: Build & Serialization Stage
FROM python:3.11-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Lean Production Runtime Stage
FROM python:3.11-slim AS runner

WORKDIR /app

# Install minimal runtime dependencies (onnxruntime, pyomo, highspy, fastapi, uvicorn)
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn==0.30.6 \
    onnxruntime==1.19.2 \
    pyomo==6.8.0 \
    highspy==1.7.2 \
    pandas==2.2.2 \
    numpy==1.26.4 \
    jinja2==3.1.4 \
    requests==2.32.3 \
    pvlib==0.11.1

# Copy application code and lightweight ONNX models (lean deployment without heavy training packages)
COPY physics.py features.py forecasting.py quantile_utils.py optimizer.py explainer.py serve.py model_metadata.json ./
COPY models/ ./models/

EXPOSE 8000
CMD ["uvicorn", "serve:app", "--host", "0.0.0.0", "--port", "8000"]
