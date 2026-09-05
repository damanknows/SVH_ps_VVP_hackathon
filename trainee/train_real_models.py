"""
Microgrid Machine Learning Training & Calibration Pipeline
---------------------------------------------------------
1. Trains and benchmarks ML models (Random Forest vs XGBoost) against an 80/20
   chronological time-series split of real historical data.
2. Incorporates cyclical temporal encoding (day_sin, day_cos) for solar irradiance.
3. Evaluates RMSE and R^2 against naive hourly-average baselines.
4. Performs 5-fold TimeSeriesSplit cross-validation for campus demand.
5. Extracts and serializes tree feature importances.
6. Calibrates empirical residual quantiles (p10, p90) for uncertainty quantification.
7. Serializes champion models (.pkl) and writes model_metadata.json version-locked to physics.py.
"""

import json
import os
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import root_mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
import joblib

from physics import PHYSICS_VERSION, campus_load_kw
from features import engineer_features
from quantile_utils import compute_residual_offsets

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "real_historical_training_data.csv")


def train_and_evaluate():
    print("=" * 75)
    print("  CAMPUS MICROGRID MACHINE LEARNING MODEL TRAINING & BENCHMARK")
    print(f"  Physics Single Source of Truth Version: {PHYSICS_VERSION}")
    print("=" * 75)

    # 1. Load ground truth dataset
    df = pd.read_csv(DATASET_PATH)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    # Apply shared feature engineering (cyclical day_sin/day_cos, academic schedules)
    df = engineer_features(df)

    print(f"Loaded {len(df)} historical hours from {DATASET_PATH}")
    print(f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")

    # 2. Define Feature Spaces (cyclical day_sin/day_cos used for solar)
    solar_features = [
        "hour_of_day", "day_sin", "day_cos", "cloud_pct", "temp_c",
        "shortwave_radiation_instant", "direct_normal_irradiance", "diffuse_radiation"
    ]
    wind_features = [
        "wind_speed", "wind_speed_100m", "wind_gust", "surface_pressure", "temp_c"
    ]
    demand_features = [
        "hour_of_day", "day_of_week", "is_lab_hour", "is_hostel_peak", "temp_c"
    ]

    # 3. Chronological 80/20 Train/Test Split
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
        "benchmarks": {},
        "quantile_offsets": {},
    }

    # Helper evaluator
    def benchmark_target(name, target_col, features, train_data=None):
        print(f"\n--- BENCHMARK: {name.upper()} ({target_col}) ---")
        curr_train = train_df if train_data is None else train_data
        y_train, y_test = curr_train[target_col], test_df[target_col]
        X_train, X_test = curr_train[features], test_df[features]

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
            champ_pred = xgb_pred
        else:
            champion_name = "RandomForest"
            champion_model = rf
            champ_rmse = rf_rmse
            champ_r2 = rf_r2
            champ_pred = rf_pred

        improvement_pct = ((naive_rmse - champ_rmse) / naive_rmse) * 100.0
        print(f"  --> Champion: {champion_name} ({improvement_pct:.1f}% error reduction over baseline)")

        # Verify invariant: must beat naive baseline
        assert champ_rmse < naive_rmse, f"{name} champion failed to beat naive baseline RMSE!"
        assert champ_r2 > naive_r2, f"{name} champion failed to beat naive baseline R^2!"

        # Extract feature importances
        feature_importance = {}
        if hasattr(champion_model, "feature_importances_"):
            importances = champion_model.feature_importances_
            feature_importance = {
                feat: round(float(imp), 4)
                for feat, imp in sorted(zip(features, importances), key=lambda x: x[1], reverse=True)
            }

        # Calculate empirical residual quantiles on test set: residual = y_test - champ_pred
        offsets = compute_residual_offsets(y_test, champ_pred)
        metadata["quantile_offsets"][name] = offsets

        metadata["benchmarks"][name] = {
            "target": target_col,
            "naive_baseline": {"rmse_kw": round(naive_rmse, 3), "r2": round(naive_r2, 4)},
            "random_forest": {"rmse_kw": round(rf_rmse, 3), "r2": round(rf_r2, 4)},
            "xgboost": {"rmse_kw": round(xgb_rmse, 3), "r2": round(xgb_r2, 4)},
            "champion": champion_name,
            "champion_rmse_kw": round(champ_rmse, 3),
            "champion_r2": round(champ_r2, 4),
            "error_reduction_pct": round(improvement_pct, 2),
            "feature_importance": feature_importance,
        }

        return champion_model, xgb

    # Run benchmarks for all 3 microgrid assets
    solar_champ, solar_xgb = benchmark_target("solar", "solar_kw", solar_features)
    wind_champ, _ = benchmark_target("wind", "wind_kw", wind_features)

    # 3.b Physics-Informed Thermal Stress Augmentation for Demand:
    # Synthesize high-temperature rows (41.0 to 49.5 C) for summer months using the ground-truth
    # physics.py campus_load_kw function so XGBoost learns branch splits for extreme heatwaves
    # without plateauing out-of-distribution.
    summer_train = train_df[(train_df["day_of_year"] >= 120) & (train_df["day_of_year"] <= 180)].copy()
    rng = np.random.default_rng(42)
    summer_train["temp_c"] = rng.uniform(41.0, 49.5, len(summer_train)).round(1)
    summer_train["demand_kw"] = campus_load_kw(summer_train["timestamp"], summer_train["temp_c"])
    train_df_demand = pd.concat([train_df, summer_train], ignore_index=True)

    demand_champ, _ = benchmark_target("demand", "demand_kw", demand_features, train_data=train_df_demand)

    # 4. Time-Series Cross-Validation for Demand Model (5 splits)
    print("\n--- TIME-SERIES CROSS-VALIDATION: DEMAND (5-Fold TimeSeriesSplit) ---")
    tscv = TimeSeriesSplit(n_splits=5)
    X_demand_all = df[demand_features]
    y_demand_all = df["demand_kw"]
    fold_rmses = []

    for fold_idx, (cv_train_idx, cv_val_idx) in enumerate(tscv.split(X_demand_all)):
        X_cv_train, y_cv_train = X_demand_all.iloc[cv_train_idx], y_demand_all.iloc[cv_train_idx]
        X_cv_val, y_cv_val = X_demand_all.iloc[cv_val_idx], y_demand_all.iloc[cv_val_idx]

        cv_xgb = XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=6, random_state=42, n_jobs=-1)
        cv_xgb.fit(X_cv_train, y_cv_train)
        val_pred = cv_xgb.predict(X_cv_val)
        fold_rmse = float(root_mean_squared_error(y_cv_val, val_pred))
        fold_rmses.append(round(fold_rmse, 3))
        print(f"  Fold {fold_idx + 1}/5 Validation RMSE: {fold_rmse:5.3f} kW")

    mean_cv_rmse = float(np.mean(fold_rmses))
    std_cv_rmse = float(np.std(fold_rmses))
    print(f"  --> Demand Time-Series CV Mean RMSE: {mean_cv_rmse:5.3f} +/- {std_cv_rmse:5.3f} kW")

    metadata["benchmarks"]["demand"]["demand_cv"] = {
        "cv_method": "TimeSeriesSplit(n_splits=5)",
        "fold_rmses_kw": fold_rmses,
        "mean_rmse_kw": round(mean_cv_rmse, 3),
        "std_rmse_kw": round(std_cv_rmse, 3),
    }

    # 5. Save Models and Metadata
    print("\n[Serialization] Saving champion models and metadata...")
    joblib.dump(solar_champ, os.path.join(BASE_DIR, "solar_model.pkl"))
    joblib.dump(solar_xgb, os.path.join(BASE_DIR, "solar_xgb_model.pkl"))
    joblib.dump(wind_champ, os.path.join(BASE_DIR, "wind_model.pkl"))
    joblib.dump(demand_champ, os.path.join(BASE_DIR, "demand_model.pkl"))

    metadata_path = os.path.join(BASE_DIR, "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print("  -> Saved solar_model.pkl")
    print("  -> Saved solar_xgb_model.pkl")
    print("  -> Saved wind_model.pkl")
    print("  -> Saved demand_model.pkl")
    print(f"  -> Saved {metadata_path}")
    print("\nAll models trained, calibrated with quantiles, and verified successfully!")


if __name__ == "__main__":
    train_and_evaluate()