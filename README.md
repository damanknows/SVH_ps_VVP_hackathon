# VVP-Maker • SVH26004 Eco-Hackathon 🌍⚡

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Frontend](https://img.shields.io/badge/frontend-Next.js%2015-black)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688)
![ML](https://img.shields.io/badge/ML-scikit--learn%20%7C%20XGBoost%20%7C%20ONNX-F7931E)
![Optimizer](https://img.shields.io/badge/optimizer-Pyomo%20%2B%20HiGHS-2E7D32)

An intelligent Energy Management System & Virtual Power Plant (EMS/VPP) Orchestration Platform developed for the Rajasthan Technical Education Department (Problem Statement: SVH26004). 

The VVP-Maker platform optimizes multi-campus energy dispatch, manages battery storage (BESS) arbitrage, quantifies weather uncertainty with probabilistic quantiles, and orchestrates solar and wind power generation across institutional microgrids.

---

## ⚠️ Data & Modeling Transparency Disclosure

> **Weather inputs are real historical observations for Jodhpur.** Power outputs are computed with peer-reviewed physical models (`pvlib` PVWatts-style PV performance, IEC 61400-12-1-style wind turbine power curve, and schedule-based institutional microgrid demand with non-linear HVAC chiller load) rather than measured campus meters, since hardware smart-meter sub-meter data was unavailable. 
>
> **Surrogate-Model Framing**: By design, the Machine Learning models are trained on physics-derived ground truth labels. This deliberate architecture creates high-throughput, sub-millisecond *neural surrogates* for real-time SCADA deployment (see [Why ML on top of physics?](#-why-ml-on-top-of-physics) below).
> 
> To evaluate genuine out-of-sample skill against unobserved future weather without circularity, our pipeline includes an automated [Live 24h Forecast Backtesting Engine](file:///d:/simulator/trainee/backtest_forecast_skill.py) and held-out [Stress Scenario Robustness Evaluation](file:///d:/simulator/trainee/stress_eval_report.json).

---

## 🧠 Why ML on Top of Physics?

A common question from hackathon judges: *If you already have physical equations in `physics.py`, why train Machine Learning models at all?*

1. **Sub-Millisecond SCADA Latency**: `pvlib` and numerical solvers perform complex solar geometry, air mass transposition, and cell temperature differential integrals. While accurate, computing these equations on every client request or inside a 96-step optimization loop creates severe latency. Our trained tree models (XGBoost / Random Forest) and exported ONNX graphs emulate the physics engine in **sub-2ms**, offloading numerical heavy-lifting from the production API hot path.
2. **Probabilistic Quantile Uncertainty ({P10, P50, P90})**: Physical deterministic equations yield single point numbers. Our ML pipeline extracts empirical quantiles (Quantile Regression Forests for wind turbulence, residual distributions for solar/demand), giving the optimization engine the P10 worst-case solar trajectory required for risk-aware battery dispatch.
3. **Seamless Drop-In for Physical Sensors**: The pipeline interfaces identically with physics data or hardware IoT meters. Once physical sub-meters are installed across campus feeders, the training pipeline retrains on live smart-meter telemetry with zero code changes.

For full mathematical proofs, complexity analysis ($\mathcal{O}(N)$ LP vs MILP), and solver benchmarks, see [ALGORITHM.md](file:///d:/simulator/trainee/ALGORITHM.md).

---

## 📊 3-Way Model Evaluation Matrix

| Microgrid Target | 1. Physics-Fit Accuracy (Surrogate Test) | 2. Live 24h Forecast Skill (Real-World Meteo) | 3. Stress Robustness (Held-Out Extremes) |
|---|---|---|---|
| **Solar Generation** | **RMSE: 2.36 kW** ($R^2$: 0.9987)<br>*-75.9% error vs baseline* | Evaluated daily via [backtest engine](file:///d:/simulator/trainee/backtest_forecast_skill.py)<br>*(Timestamped snapshot logged)* | **Monsoon Cloudburst**: RMSE 2.24 kW<br>**May Heatwave**: RMSE 12.30 kW ([Report](file:///d:/simulator/trainee/stress_eval_report.json)) |
| **Wind Generation** | **RMSE: 0.78 kW** ($R^2$: 0.9985)<br>*-96.0% error vs baseline* | Evaluated daily via [backtest engine](file:///d:/simulator/trainee/backtest_forecast_skill.py)<br>*(Timestamped snapshot logged)* | **Wind Drought**: RMSE 0.00 kW (0.0 kW max)<br>**Storm Cutout**: Max 1.0 kW $\le$ 2.0 kW cutoff |
| **Campus Demand** | **RMSE: 0.57 kW** ($R^2$: 0.9999)<br>5-fold CV: $12.35 \pm 13.9$ kW | Evaluated daily via [backtest engine](file:///d:/simulator/trainee/backtest_forecast_skill.py)<br>*(Timestamped snapshot logged)* | **Chiller Heatwave Surge**: RMSE 3.07 kW (-95% error vs baseline)<br>Preserves baseline $\ge$ 70 kW invariant |
---

## 🏗️ Repository Architecture

```text
d:\simulator\
├── frontend/             # Next.js 15 App Router Dashboard UI (SCADA Dark Theme)
│   ├── src/
│   │   ├── app/          # App Router Pages & API Routes
│   │   ├── components/   # TelemetryBar, EnergyFlowHero, ForecastChart, BatteryGauge, RecommendationsPanel
│   │   ├── hooks/        # useMicrogridData unified fetch hook & backend fallback
│   │   └── types/        # Data contract TypeScript interfaces
│   └── package.json
│
├── backend/              # FastAPI Python Backend
│   ├── main.py           # REST endpoints (/api/telemetry, /api/forecast, /api/recommendations)
│   └── requirements.txt
│
├── trainee/              # Physics, Quantiles, Optimizer & Backtest Pipeline
│   ├── physics.py        # Single source of truth (pvlib solar, aerodynamic curve, campus load)
│   ├── features.py       # Shared feature engineering (cyclical day_sin/day_cos, academic calendar)
│   ├── quantile_utils.py # Quantile Regression Forests (QRF) & residual offset calibration
│   ├── forecasting.py    # Probabilistic forecasting ({P10, P50, P90} + thermal & night guardrails)
│   ├── optimizer.py      # Pyomo + HiGHS 96-step LP optimizer with closed-loop quantile hedge
│   ├── explainer.py      # Jinja2 AI dispatch explanation & executive recommendations
│   ├── serve.py          # Standalone FastAPI engine (/forecast, /demo/scenario, /health)
│   ├── evaluate_stress_scenarios.py # Held-out extreme stress robustness evaluator
│   ├── backtest_forecast_skill.py  # Out-of-sample forecast snapshot & backtest scoring framework
│   ├── convert_to_onnx.py# ONNX graph converter for edge deployment
│   ├── test_physics.py   # Unit test suite verifying physical invariants (pytest)
│   ├── test_integration.py # End-to-end integration test (telemetry -> forecast -> opt -> explain)
│   ├── model_metadata.json # Champion models, features, CV metrics, and feature importances
│   └── ALGORITHM.md      # Mathematical LP formulation, complexity analysis, and solver proofs
│
└── pair_a_ai/            # Microservice Package for Hackathon Inter-Team Interoperability
    ├── app/              # FastAPI microservice with /v1/forecast and /v1/optimize
    ├── models/           # Exported ONNX quantile and point models
    └── tests/            # Test suite verifying sub-second LP latency & feasibility
```

---

## ✨ Production Microgrid Engine Capabilities

- **Real-Time Physical Telemetry**: Live streams grounded in real weather with closed-loop battery state-of-charge (SoC) dynamics and reproducible sensor jitter (`np.random.default_rng(42)`).
- **Probabilistic Quantile Forecasting**: Calibrated $\{P_{10}, P_{50}, P_{90}\}$ prediction intervals with a strict `pvlib` apparent zenith night mask to eliminate dawn/dusk leakage, and physics-informed thermal extrapolation for extreme heat (>45°C).
- **Mathematical LP Optimization**: 96-step (15-min resolution) economic dispatch formulated in Pyomo and solved with **HiGHS** in $< 120\,\text{ms}$, minimizing electricity tariff costs, battery degradation, and carbon emissions.
- **Closed-Loop Quantile Risk Actuator**: Projects worst-case battery SoC under $P_{10}$ solar deficits; when reserve depletion is detected, automatically tightens reserve constraints and re-solves the LP to force preemptive BESS pre-charging during off-peak windows.
- **Emergency Dispatch Fallback**: High-availability exception handling that switches to safe grid-supported dispatch without crashing during unexpected conditions.
- **Explainable SCADA Insights**: Jinja2-powered natural language explanations and financial/carbon impact justifications for every dispatch decision.

---

## 🚀 Quickstart Guide

### 1. Physics & Mathematical Optimization Pipeline (`trainee/`)

```bash
cd trainee

# 1. Run physical invariant unit tests
pytest test_physics.py -v

# 2. Run end-to-end integration test (telemetry -> forecast -> opt -> explain)
pytest test_integration.py -v

# 3. Retrain & calibrate models with 5-fold TimeSeries CV and feature importances
python train_real_models.py

# 4. Convert champion models to lightweight ONNX graphs
python convert_to_onnx.py

# 5. Execute 24-hour probabilistic quantile forecast engine
python forecasting.py

# 6. Execute 96-step mathematical optimization dispatch
python optimizer.py

# 7. Evaluate held-out stress scenario robustness
python evaluate_stress_scenarios.py

# 8. Log a live forecast snapshot and score elapsed windows
python backtest_forecast_skill.py
```

> **Pre-Hackathon Tip**: Run `python backtest_forecast_skill.py` once daily in the days leading up to judging. Each run logs an immutable, timestamped forecast snapshot; once 24 hours elapse, subsequent runs automatically query historical weather and calculate real-world forecast skill for your pitch slides!

### 2. Standalone Trainee Microgrid API

```bash
cd trainee
python serve.py
```
- Interactive Swagger UI: `http://localhost:8001/docs`
- `POST /forecast`: Returns `{p10, p50, p90}` probabilistic curves
- `POST /demo/scenario`: Injects validated extreme stress presets (`HEATWAVE`, `DROUGHT`, `STORM`, `MONSOON`)

### 3. FastAPI Backend Engine (`backend/`)

```bash
cd backend
python main.py
```
> API available at `http://localhost:8000`

### 4. Next.js Frontend Dashboard (`frontend/`)

```bash
cd frontend
npm install
npm run dev
```
> Open [http://localhost:3000](http://localhost:3000) to launch the SCADA VPP Dashboard.

---

## 📄 License
This project is licensed under the MIT License.
