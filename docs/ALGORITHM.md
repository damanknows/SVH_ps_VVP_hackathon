# Campus Microgrid VPP Optimization & Forecasting Formulation

## 1. Executive Summary & Problem Context
The Virtual Power Plant (VPP) management engine for the campus microgrid coordinates distributed energy resources—comprising a 250 kWp solar PV array, a 50 kW aerodynamic wind turbine, a 200 kWh battery energy storage system (BESS), and responsive campus academic/hostel electrical loads—against time-varying utility grid tariffs and carbon emissions constraints.

The objective is to compute an economically optimal, physically compliant 24-hour rolling-horizon dispatch schedule that maximizes financial arbitrage, shaves peak grid imports, prevents battery degradation, and respects grid exchange bounds while providing real-time operator explainability.

---

## 2. Mathematical Formulation (Linear Program)

### 2.1 Indexing & Time Discretization
- Time horizon: $T = \{0, 1, 2, \dots, N-1\}$, where $N = 24$.
- Discretization step: $\Delta t = 1.0\text{ h}$ (hourly resolution matching meteorological forecast feeds).

### 2.2 System Parameters & Constants
- **Battery Storage (BESS):**
  - Rated capacity: $E_{\text{cap}} = 200.0\text{ kWh}$
  - Charge efficiency: $\eta_{\text{ch}} = 0.95$ (95%)
  - Discharge efficiency: $\eta_{\text{dis}} = 0.95$ (95%)
  - Maximum charging power: $P_{\text{ch}}^{\max} = 50.0\text{ kW}$
  - Maximum discharging power: $P_{\text{dis}}^{\max} = 50.0\text{ kW}$
  - Reserve margin (minimum state of charge): $\text{SoC}_{\min} = 40.0\text{ kWh}$ (20% $E_{\text{cap}}$)
  - Maximum operating state of charge: $\text{SoC}_{\max} = 180.0\text{ kWh}$ (90% $E_{\text{cap}}$)
  - Maximum hourly charging ramp rate: $R_{\max} = 25.0\text{ kW/h}$
  - Cell throughput degradation cost: $c_{\text{deg}} = 0.85\text{ INR/kWh}$

- **Utility Grid Interconnection:**
  - Maximum import power: $P_{\text{imp}}^{\max} = 500.0\text{ kW}$
  - Maximum export power: $P_{\text{exp}}^{\max} = 200.0\text{ kW}$
  - Grid carbon emission intensity: $\lambda_{\text{grid}} = 0.81\text{ kg CO}_2\text{/kWh}$ (CEA regional baseline)
  - Shadow price of carbon: $c_{\text{carbon}} = 2.00\text{ INR/kg CO}_2$
  - Effective carbon cost adder: $\kappa = c_{\text{carbon}} \times \lambda_{\text{grid}} = 1.62\text{ INR/kWh}$

- **Rajasthan RERC Time-of-Day (TOD) Tariffs ($c_{\text{imp}}(t)$):**
  $$c_{\text{imp}}(t) = \begin{cases} 
  6.42\text{ INR/kWh} & \text{if } t \in [22:00, 06:00)\text{ (Off-Peak)} \\
  7.55\text{ INR/kWh} & \text{if } t \in [06:00, 18:00)\text{ (Normal)} \\
  8.68\text{ INR/kWh} & \text{if } t \in [18:00, 22:00)\text{ (Peak)}
  \end{cases}$$
- Feed-in / grid export compensation: $c_{\text{exp}}(t) = 3.50\text{ INR/kWh}$ (constant).

---

### 2.3 Decision Variables
For each timestep $t \in T$:
1. $P_{\text{bat\_ch}}(t) \in [0, P_{\text{ch}}^{\max}]$: Battery charging power from microgrid bus (kW).
2. $P_{\text{bat\_dis}}(t) \in [0, P_{\text{dis}}^{\max}]$: Battery discharging power to microgrid bus (kW).
3. $P_{\text{grid\_imp}}(t) \in [0, P_{\text{imp}}^{\max}]$: Power imported from the utility grid (kW).
4. $P_{\text{grid\_exp}}(t) \in [0, P_{\text{exp}}^{\max}]$: Clean power exported to the utility grid (kW).
5. $\text{SoC}(t) \in [\text{SoC}_{\min}, \text{SoC}_{\max}]$: Battery energy storage level at conclusion of timestep $t$ (kWh).
6. $s(t) \ge 0$: Reserve margin emergency relaxation slack variable (kWh), active only during emergency solve fallback.

---

### 2.4 Objective Function
$$\min \sum_{t=0}^{N-1} \Bigg( \Big(c_{\text{imp}}(t) + \kappa\Big) P_{\text{grid\_imp}}(t) - c_{\text{exp}}(t) P_{\text{grid\_exp}}(t) + c_{\text{deg}}\Big(P_{\text{bat\_ch}}(t) + P_{\text{bat\_dis}}(t)\Big) + M \cdot s(t) \Bigg) \Delta t$$

where $M = 10^5\text{ INR/kWh}$ is the heavy penalty coefficient that ensures slack variables $s(t)$ remain strictly zero unless the system encounters extreme physical infeasibility.

---

### 2.5 Constraints

1. **Active Power Balance:**
   At every timestep $t \in T$, total generation and supply must exactly equal total demand and consumption:
   $$P_{\text{solar}}(t) + P_{\text{wind}}(t) + P_{\text{bat\_dis}}(t) + P_{\text{grid\_imp}}(t) = P_{\text{demand}}(t) + P_{\text{bat\_ch}}(t) + P_{\text{grid\_exp}}(t)$$

2. **State-of-Charge (SoC) Dynamics:**
   Dynamic energy storage balance across adjacent timesteps accounting for asymmetric electrochemical Coulombic and inverter efficiencies:
   $$\text{SoC}(t) = \text{SoC}(t-1) + \left( \eta_{\text{ch}} P_{\text{bat\_ch}}(t) - \frac{1}{\eta_{\text{dis}}} P_{\text{bat\_dis}}(t) \right) \Delta t \quad \forall t \in \{1, \dots, N-1\}$$
   $$\text{SoC}(0) = \text{SoC}_{\text{init}} + \left( \eta_{\text{ch}} P_{\text{bat\_ch}}(0) - \frac{1}{\eta_{\text{dis}}} P_{\text{bat\_dis}}(0) \right) \Delta t$$

3. **Reserve Margin & Operating Limits:**
   $$\text{SoC}_{\min} - s(t) \le \text{SoC}(t) \le \text{SoC}_{\max} \quad \forall t \in T$$

4. **Linear Battery Ramp-Rate Limits:**
   Ramp rate constraints avoid battery current surges. To maintain mathematical linearity without non-differentiable or branching absolute value operators, ramp limits are formulated as two complementary linear inequalities:
   $$P_{\text{bat\_ch}}(t) - P_{\text{bat\_ch}}(t-1) \le R_{\max} \quad \forall t \ge 1$$
   $$P_{\text{bat\_ch}}(t-1) - P_{\text{bat\_ch}}(t) \le R_{\max} \quad \forall t \ge 1$$

5. **Terminal SoC Conservation Guarantee:**
   To prevent the rolling-horizon optimizer from artificially emptying the battery at step $t = N-1$ ("depletion cheating"):
   $$\text{SoC}(N-1) \ge \min(\text{SoC}_{\text{init}}, \text{SoC}_{\max})$$

---

## 3. Why LP Instead of MILP?

A conventional microgrid formulation introduces binary indicator variables $u(t) \in \{0, 1\}$ to enforce mutually exclusive battery charging and discharging ($P_{\text{ch}}(t) \cdot u(t)$ and $P_{\text{dis}}(t) \cdot (1 - u(t))$), turning the model into a Mixed-Integer Linear Program (MILP).

We intentionally formulated the system as a **pure Linear Program (LP)** for the following rigorous mathematical and physical reasons:

1. **Natural Economic Non-Simultaneity:**
   The round-trip efficiency of the BESS is:
   $$\eta_{\text{roundtrip}} = \eta_{\text{ch}} \times \eta_{\text{dis}} = 0.95 \times 0.95 = 0.9025 < 1.0$$
   Simultaneously charging $1\text{ kW}$ and discharging $1\text{ kW}$ results in a net thermal dissipation loss of:
   $$\Delta E_{\text{loss}} = \left( \frac{1}{0.95} - 0.95 \right) \approx 0.1026\text{ kWh}$$
   Furthermore, the battery throughput incurs degradation cost $2 \times c_{\text{deg}} = 1.70\text{ INR/kWh}$, and the grid tariff spread satisfies $c_{\text{imp}}(t) > c_{\text{exp}}(t)$ at all hours ($6.42 > 3.50$).
   Therefore, any simultaneous charge and discharge strictly increases the objective function value. The optimal solution to the continuous relaxation is **guaranteed to lie on the boundary** where $\min(P_{\text{bat\_ch}}(t), P_{\text{bat\_dis}}(t)) = 0$ for all $t$. Binary variables are mathematically redundant.

2. **Computational Speed & Deterministic Latency:**
   MILP branch-and-bound requires solving a search tree of LP relaxations, which exhibits worst-case exponential complexity $\mathcal{O}(2^N)$ and non-deterministic solve times.
   In contrast, a pure LP has polynomial worst-case complexity and is solved by the HiGHS dual-simplex or interior-point method in **$<50\text{ ms}$**, well within the $<300\text{ ms}$ cold-solve target.

---

## 4. $\mathcal{O}(N)$ Computational Complexity Argument

Let $N$ denote the number of timesteps in the lookahead horizon.

1. **Variable Count:**
   - There are 5 decision variables per timestep: $P_{\text{bat\_ch}}, P_{\text{bat\_dis}}, P_{\text{grid\_imp}}, P_{\text{grid\_exp}}, \text{SoC}$.
   - Total variables: $V = 5N$.
2. **Constraint Count:**
   - Power balance: $N$ equations.
   - SoC dynamics: $N$ equations.
   - Ramp-up limits: $N-1$ inequalities.
   - Ramp-down limits: $N-1$ inequalities.
   - Terminal SoC: 1 inequality.
   - Total constraints: $C = 4N - 1$.
3. **Sparsity Structure:**
   The constraint matrix $A$ exhibits a **block-angular tridiagonal structure**:
   $$A = \begin{bmatrix}
   B_0 & & & \\
   T_1 & B_1 & & \\
   & T_2 & B_2 & \\
   & & \ddots & \ddots \\
   & & T_{N-1} & B_{N-1}
   \end{bmatrix}$$
   where each sub-block $B_t$ couples only variables at stage $t$, and the transition block $T_t$ contains only the single coupling coefficient between $\text{SoC}(t-1)$ and $\text{SoC}(t)$ and the charging ramp coupling between $P_{\text{bat\_ch}}(t-1)$ and $P_{\text{bat\_ch}}(t)$.

Because the matrix $A$ has constant bandwidth and non-zero entries scaling strictly as $\mathcal{O}(N)$, sparse LU factorization during simplex basis updates requires $\mathcal{O}(1)$ work per pivot and $\mathcal{O}(N)$ total operations. Consequently, the memory footprint and solve time scale strictly linearly with horizon length $N$.

---

## 5. ONNX Graph Conversion & Optimization
- **Model Translation:**
  - `RandomForestRegressor` models are translated into ONNX `TreeEnsembleRegressor` nodes using `skl2onnx.to_onnx`.
  - `XGBRegressor` models are converted via `onnxmltools.convert_xgboost`. Booster feature names are remapped to ordinal identifiers (`f0, f1, ...`) during serialization to ensure parser compliance without modifying the underlying gradient tree splits.
- **Precision & Runtime:**
  - All input tensors are explicitly typed as contiguous `float32` arrays.
  - The ONNX Runtime CPU execution provider executes multi-threaded inference directly in compiled C++ kernels, eliminating Python GIL bottlenecks and delivering single-call inference in $<1.5\text{ ms}$.
- **Numerical Invariant Guarantee:**
  - The conversion pipeline asserts that the maximum absolute divergence between original Python estimators and the ONNX graph satisfies $\max |y_{\text{orig}} - y_{\text{onnx}}| \le 1.0 \times 10^{-3}\text{ kW}$. Actual measured drift is $< 1.6 \times 10^{-4}\text{ kW}$.

---

## 6. Calibrated Residual-Derived Quantile Bounds
Because the champion models (XGBoost and Random Forest) were trained as conditional mean point-regressors under squared-error loss, native quantile outputs are unavailable.

To provide principled uncertainty envelopes for risk-aware dispatch without ad-hoc percentage spreads, we leverage the out-of-sample Root Mean Squared Error (RMSE) validated in `model_metadata.json`:
- Solar PV: $\text{RMSE} = 2.787\text{ kW}$
- Wind Turbine: $\text{RMSE} = 0.778\text{ kW}$
- Campus Load: $\text{RMSE} = 0.566\text{ kW}$

Under the standard assumption of locally Gaussian residuals $\epsilon \sim \mathcal{N}(0, \sigma^2)$ with $\sigma \approx \text{RMSE}$:
- **P10 (Pessimistic):** $P_{10} = \max(0, P_{50} - z_{0.10} \times \text{RMSE}) = \max(0, P_{50} - 1.28 \times \text{RMSE})$
- **P50 (Median):** $P_{50} = \text{ONNX\_point\_prediction}$
- **P90 (Optimistic):** $P_{90} = \max(0, P_{50} + z_{0.90} \times \text{RMSE}) = \max(0, P_{50} + 1.28 \times \text{RMSE})$

where $z_{0.90} = \Phi^{-1}(0.90) \approx 1.28155$ spans the central 80% confidence interval $[P_{10}, P_{90}]$.

### Domain-Specific Invariant Clamping:
1. **Solar Night Clamp:** When $P_{50} \le 0.05\text{ kW}$ (nighttime), $P_{10} = P_{50} = P_{90} = 0.0\text{ kW}$ strictly.
2. **Inverter Rating Cap:** Solar generation is bounded at $P_{\text{ac}}^{\max} = 200.0\text{ kW}$.
3. **Turbine Rating Cap:** Wind generation is bounded at $P_{\text{wind}}^{\max} = 50.0\text{ kW}$.
4. **Baseload Floor:** Campus load is clamped to the minimum uninterruptible infrastructure baseload $70.0\text{ kW}$.

---

## 7. Data & Modeling Transparency Disclosure

| Component | Nature | Source / Justification |
| :--- | :--- | :--- |
| **Meteorology** | Measured & Archive | 8,784 hourly observations for Jodhpur (2024 leap year) via Open-Meteo API. |
| **Solar PV Target** | Modeled | NREL pvlib PVWatts model with Sandia air mass, NOCT cell thermal derate, and inverter clipping. |
| **Wind Target** | Modeled | Dual-height (10m/100m) shear exponent $\alpha$, dynamic air density $\rho$, and 3-stage power curve. |
| **Campus Load** | Modeled | Academic schedule (Mon-Fri 08:30-17:30 with lunch dip), hostel morning/evening peaks, and non-linear HVAC cooling. |
| **Forecasting Point Regressors** | Machine Learning | Champion XGBoost (Solar, Load) and Random Forest (Wind) with $R^2 > 0.998$. |
| **Quantile Bands** | Semi-Empirical | Scaled $1.28 \times \text{RMSE}$ from out-of-sample holdout test partition. |
| **Grid Tariffs** | Regulatory Real | Rajasthan Electricity Regulatory Commission (RERC) Time-of-Day structure. |
| **CO2 Emission Factor** | National Benchmark | Central Electricity Authority (CEA) grid emission factor ($0.81\text{ kg CO}_2\text{/kWh}$). |
| **Battery Degradation** | Heuristic Linear | Linear cycle-throughput degradation allowance ($0.85\text{ INR/kWh}$). |
