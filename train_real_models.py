"""
Microgrid Machine Learning Training Pipeline
-------------------------------------------
Trains and benchmarks Machine Learning models (Random Forest vs XGBoost)
against an 80/20 chronological time-series split of real historical data.
Evaluates both RMSE and R^2 against naive hourly-average baselines.
Selects champion models, exports .pkl serializations, and writes model_metadata.json
version-locked to physics.py.
"""

import json
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import root_mean_squared_error, r2_score
import joblib
from physics import PHYSICS_VERSION

DATASET_PATH = "real_historical_training_data.csv"


def train_and_evaluate():
    print("=" * 70)
    print("  CAMPUS MICROGRID MACHINE LEARNING MODEL TRAINING & BENCHMARK")
    print(f"  Physics Single Source of Truth Version: {PHYSICS_VERSION}")
    print("=" * 70)

    # 1. Load ground truth dataset
    df = pd.read_csv(DATASET_PATH)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    print(f"Loaded {len(df)} historical hours from {DATASET_PATH}")
    print(f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")

    # 2. Define Feature Spaces
    solar_features = [
        "hour_of_day", "day_of_year", "cloud_pct", "temp_c",
        "shortwave_radiation_instant", "direct_normal_irradiance", "diffuse_radiation"
    ]
    wind_features = [
        "wind_speed", "wind_speed_100m", "wind_gust", "surface_pressure", "temp_c"
    ]
    demand_features = [
        "hour_of_day", "day_of_week", "is_lab_hour", "is_hostel_peak", "temp_c"
    ]

    # 3. Chronological 80/20 Train/Test Split (Preserves temporal order)
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx].copy()
    test_df = df.iloc[split_idx:].copy()

    print(f"\nTrain set: {len(train_df)} hours ({train_df['timestamp'].min().date()} -> {train_df['timestamp'].max().date()})")
    print(f"Test set:  {len(test_df)} hours ({test_df['timestamp'].min().date()} -> {test_df['timestamp'].max().date()})")

    metadata = {
        "physics_version": PHYSICS_VERSION,
        "trained_at": datetime.now().isoformat(),
        "dataset_rows": len(df),
        "split_ratio": 0.8,
        "train_hours": len(train_df),
        "test_hours": len(test_df),
        "features": {
            "solar": solar_features,
            "wind": wind_features,
            "demand": demand_features,
        },
        "benchmarks": {}
    }

    # Helper evaluator
    def benchmark_target(name, target_col, features):
        print(f"\n--- BENCHMARK: {name.upper()} ({target_col}) ---")
        y_train, y_test = train_df[target_col], test_df[target_col]
        X_train, X_test = train_df[features], test_df[features]

        # 1. Naive Hourly Average Baseline
        naive_lookup = train_df.groupby("hour_of_day")[target_col].mean()
        naive_pred = test_df["hour_of_day"].map(naive_lookup)
        naive_rmse = float(root_mean_squared_error(y_test, naive_pred))
        naive_r2 = float(r2_score(y_test, naive_pred))
        print(f"  [Naive Baseline]     RMSE: {naive_rmse:6.2f} kW | R^2: {naive_r2:.4f}")

        # 2. Random Forest Regressor
        rf = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        rf_pred = rf.predict(X_test)
        rf_rmse = float(root_mean_squared_error(y_test, rf_pred))
        rf_r2 = float(r2_score(y_test, rf_pred))
        print(f"  [Random Forest]      RMSE: {rf_rmse:6.2f} kW | R^2: {rf_r2:.4f}")

        # 3. XGBoost Regressor
        xgb = XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=6, random_state=42, n_jobs=-1)
        xgb.fit(X_train, y_train)
        xgb_pred = xgb.predict(X_test)
        xgb_rmse = float(root_mean_squared_error(y_test, xgb_pred))
        xgb_r2 = float(r2_score(y_test, xgb_pred))
        print(f"  [XGBoost Regressor]  RMSE: {xgb_rmse:6.2f} kW | R^2: {xgb_r2:.4f}")

        # Choose champion model
        if xgb_rmse <= rf_rmse:
            champion_name = "XGBoost"
            champion_model = xgb
            champ_rmse = xgb_rmse
            champ_r2 = xgb_r2
        else:
            champion_name = "RandomForest"
            champion_model = rf
            champ_rmse = rf_rmse
            champ_r2 = rf_r2

        improvement_pct = ((naive_rmse - champ_rmse) / naive_rmse) * 100.0
        print(f"  --> Champion: {champion_name} ({improvement_pct:.1f}% error reduction over baseline)")

        # Verify invariant: must beat naive baseline
        assert champ_rmse < naive_rmse, f"{name} champion failed to beat naive baseline RMSE!"
        assert champ_r2 > naive_r2, f"{name} champion failed to beat naive baseline R^2!"

        metadata["benchmarks"][name] = {
            "target": target_col,
            "naive_baseline": {"rmse_kw": round(naive_rmse, 3), "r2": round(naive_r2, 4)},
            "random_forest": {"rmse_kw": round(rf_rmse, 3), "r2": round(rf_r2, 4)},
            "xgboost": {"rmse_kw": round(xgb_rmse, 3), "r2": round(xgb_r2, 4)},
            "champion": champion_name,
            "champion_rmse_kw": round(champ_rmse, 3),
            "champion_r2": round(champ_r2, 4),
            "error_reduction_pct": round(improvement_pct, 2)
        }

        return champion_model, xgb

    # Run benchmarks for all 3 microgrid assets
    solar_champ, solar_xgb = benchmark_target("solar", "solar_kw", solar_features)
    wind_champ, _ = benchmark_target("wind", "wind_kw", wind_features)
    demand_champ, _ = benchmark_target("demand", "demand_kw", demand_features)

    # 4. Save Models and Metadata
    print("\n[Serialization] Saving champion models and metadata...")
    joblib.dump(solar_champ, "solar_model.pkl")
    joblib.dump(solar_xgb, "solar_xgb_model.pkl")
    joblib.dump(wind_champ, "wind_model.pkl")
    joblib.dump(demand_champ, "demand_model.pkl")

    with open("model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("  -> Saved solar_model.pkl")
    print("  -> Saved solar_xgb_model.pkl")
    print("  -> Saved wind_model.pkl")
    print("  -> Saved demand_model.pkl")
    print("  -> Saved model_metadata.json")
    print("\nAll models trained and verified successfully!")


if __name__ == "__main__":
    train_and_evaluate()