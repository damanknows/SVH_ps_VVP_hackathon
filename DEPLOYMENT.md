# Deployment Guide: VVP-Maker Microgrid Platform

This repository ([damanknows/SVH_ps_VVP_hackathon](https://github.com/damanknows/SVH_ps_VVP_hackathon)) contains a full-stack Virtual Power Plant (VPP) energy management system with:
1. **Frontend**: Next.js 16 + React 19 + Tailwind CSS + Recharts + Lucide Icons (located in /frontend).
2. **Backend**: FastAPI + Pyomo/HiGHS LP Dispatch Optimizer + ONNX Runtime Probabilistic Forecaster (located in /backend and /pair_a_ai).

---

## Part 1: Deploying the Frontend (Next.js) on Vercel (1-Click, Free)

Vercel provides free, high-speed global CDN hosting with automatic SSL and zero configuration.

### Steps:
1. Navigate to **[https://vercel.com/new](https://vercel.com/new)**.
2. Sign in with GitHub and select the repository: damanknows/SVH_ps_VVP_hackathon.
3. In the **Configure Project** screen:
   - **Framework Preset**: Next.js (detected automatically).
   - **Root Directory**: Click **Edit** and select **rontend** (Crucial step!).
   - **Build Command**: 
pm run build (default).
   - **Output Directory**: .next (default).
   - **Install Command**: 
pm install --legacy-peer-deps (if prompted).
4. Click **Deploy**.
5. Within 60 seconds, your site will be live at a public HTTPS URL (e.g., https://svh-ps-vvp-hackathon.vercel.app).

*(Note: The frontend has a built-in interactive fallback simulator, so all charts, KPI cards, SoC gauges, and scenario stress tests function perfectly out of the box even before the backend URL is hooked up!)*

---

## Part 2: Deploying the Backend (FastAPI + HiGHS Optimizer) on Render (Free)

Render offers free Web Service hosting for Python applications.

### Steps:
1. Go to **[https://dashboard.render.com](https://dashboard.render.com)** and log in with GitHub.
2. Click **New +** -> **Web Service**.
3. Connect your repository: damanknows/SVH_ps_VVP_hackathon.
4. Configure the service:
   - **Name**: pp-microgrid-backend
   - **Region**: Singapore or Frankfurt (lowest latency to India).
   - **Branch**: main
   - **Runtime**: Python 3
   - **Build Command**: pip install -r pair_a_ai/requirements.txt
   - **Start Command**: uvicorn backend.main:app --host 0.0.0.0 --port 
   - **Instance Type**: Free
5. Click **Create Web Service**.
6. Once deployed, Render will generate a live URL (e.g., https://vpp-microgrid-backend.onrender.com).
   - Test endpoints:
     - GET https://vpp-microgrid-backend.onrender.com/api/v1/health
     - POST https://vpp-microgrid-backend.onrender.com/api/v1/optimize
     - Interactive Swagger Docs: https://vpp-microgrid-backend.onrender.com/docs

---

## Part 3: Connecting Frontend to Backend

1. In your **Vercel Project Dashboard**, go to **Settings** -> **Environment Variables**.
2. Add the following:
   - NEXT_PUBLIC_API_URL: https://vpp-microgrid-backend.onrender.com
   - NEXT_PUBLIC_WS_URL: wss://vpp-microgrid-backend.onrender.com/ws/live
3. Click **Save** and trigger a **Redeploy**.

---

## Alternative: Docker Container Deployment (Railway / Fly.io / HuggingFace)

A production-ready Dockerfile is included at pair_a_ai/Dockerfile.
To deploy on Railway or Fly.io:
`ash
# Local container build & run
docker build -t vpp-maker:latest -f pair_a_ai/Dockerfile .
docker run -p 8000:8000 vpp-maker:latest
`
