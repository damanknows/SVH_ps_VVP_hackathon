# 🚀 VVP-Maker Production Deployment Guide

This guide provides step-by-step instructions to deploy the entire VVP-Maker platform (Next.js Frontend, FastAPI Backend, and Trained Machine Learning Models) to the web.

---

## 🏗️ Architecture Overview

The deployed system consists of two primary services communicating over HTTP/REST:

1. **Frontend**: Next.js 16 + React 19 + Tailwind CSS SCADA Dashboard (Port 3000)
2. **Backend**: FastAPI Microgrid Orchestrator & ML Surrogate Inference Engine (Port 8000)
3. **ML Models**: Scikit-Learn / ONNX surrogate models loaded directly into the backend for sub-2ms probabilistic quantile forecasting ({P10, P50, P90}).

---

## Option 1: One-Click Docker Compose (VPS / AWS / GCP / DigitalOcean)

The fastest and most reliable way to run both services together on any cloud server or virtual machine:

### Prerequisites
- Docker Engine $\ge 24.0$
- Docker Compose $\ge 2.20$

### Deployment Commands
```bash
# 1. Clone repository
git clone https://github.com/damanknows/SVH_ps_VVP_hackathon.git
cd SVH_ps_VVP_hackathon

# 2. Build and launch all services in detached mode
docker compose up -d --build

# 3. Verify status
docker compose ps
```

- **Frontend**: `http://<your-server-ip>:3000`
- **Backend API**: `http://<your-server-ip>:8000`
- **Interactive Swagger Docs**: `http://<your-server-ip>:8000/docs`
- **Health Check**: `http://<your-server-ip>:8000/health`

---

## Option 2: Render.com (Managed Cloud Deployment)

The repository includes a ready-to-use [`render.yaml`](file:///d:/simulator/render.yaml) blueprint.

1. Create a free account at [render.com](https://render.com).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your GitHub repository: `damanknows/SVH_ps_VVP_hackathon`.
4. Render will automatically parse `render.yaml` and provision:
   - `vvp-maker-backend` (Python Web Service running on port 10000)
   - `vvp-maker-frontend` (Node Web Service running Next.js)
5. Click **Apply**. Both services will build and deploy with automatic HTTPS URLs!

---

## Option 3: Hybrid Deployment (Vercel + Render / Railway)

For maximum frontend performance using Vercel's global CDN:

### 1. Deploy Backend to Render or Railway
- Deploy the `backend/` directory as a Python Web Service.
- Build Command: `pip install -r backend/requirements.txt scikit-learn pvlib`
- Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Copy your deployed backend URL (e.g. `https://vvp-backend.onrender.com`).

### 2. Deploy Frontend to Vercel
- Go to [vercel.com](https://vercel.com) and import `damanknows/SVH_ps_VVP_hackathon`.
- Set **Root Directory** to `frontend`.
- Under **Environment Variables**, add:
  ```env
  NEXT_PUBLIC_BACKEND_URL=https://vvp-backend.onrender.com
  ```
- Click **Deploy**. Vercel will build the standalone Next.js dashboard and connect to your live backend.

---

## ⚙️ Environment Variables

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend | `8000` | Port for FastAPI / Uvicorn server |
| `NEXT_PUBLIC_BACKEND_URL` | Frontend | `http://localhost:8000` | Public URL of the FastAPI backend |
| `NODE_ENV` | Frontend | `production` | Node.js production mode |

---

## 🔍 Verification & Health Checks

Once deployed, verify that the deployment is operating correctly:

1. **Backend Health Probe**:
   ```bash
   curl -f https://<your-backend-url>/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "service": "vvp-maker-backend",
     "ml_engine_available": true,
     "inference_mode": "ONNX/PKL Surrogate",
     "active_campuses": ["gec-bikaner", "mbm-jodhpur", "rtu-kota", "ctae-udaipur"]
   }
   ```

2. **24-Hour Forecast Endpoint**:
   ```bash
   curl -f "https://<your-backend-url>/api/forecast/24h?scenario=SUNNY_PEAK&campus_id=mbm-jodhpur"
   ```

3. **Frontend Check**:
   Open `https://<your-frontend-url>` in your browser. Verify that the SCADA single-line diagram, battery gauges, and 24h charts load and reflect the active campus telemetry.
