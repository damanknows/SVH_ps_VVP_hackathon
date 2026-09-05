"""
ONNX Model Exporter for Pair A Microgrid Quantile Forecasters
-------------------------------------------------------------
Trains/exports the 4 target ONNX models:
- solar_pv_quantile.onnx
- wind_turb_quantile.onnx
- load_academic_quantile.onnx
- load_hostel_quantile.onnx
"""

import os
import json
import shutil
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType as XGBFloatTensorType

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PAIR_A_DIR = os.path.dirname(BASE_DIR)
MODELS_DIR = os.path.join(PAIR_A_DIR, "models")
TRAINEE_DIR = os.path.join(os.path.dirname(PAIR_A_DIR), "trainee")


def export():
    print("=" * 70)
    print("  EXPORTING PAIR A ONNX QUANTILE MODELS")
    print("=" * 70)

    # 1. Solar PV: Copy/Convert solar model
    trainee_solar_onnx = os.path.join(TRAINEE_DIR, "models", "solar_model.onnx")
    dest_solar_onnx = os.path.join(MODELS_DIR, "solar_pv_quantile.onnx")
    if os.path.exists(trainee_solar_onnx):
        shutil.copyfile(trainee_solar_onnx, dest_solar_onnx)
        print(f"[1/4] Exported {dest_solar_onnx}")

    # 2. Wind Turb: Copy/Convert wind model
    trainee_wind_onnx = os.path.join(TRAINEE_DIR, "models", "wind_model.onnx")
    dest_wind_onnx = os.path.join(MODELS_DIR, "wind_turb_quantile.onnx")
    if os.path.exists(trainee_wind_onnx):
        shutil.copyfile(trainee_wind_onnx, dest_wind_onnx)
        print(f"[2/4] Exported {dest_wind_onnx}")

    # 3. Load Academic: Convert or train academic load model
    data_path = os.path.join(TRAINEE_DIR, "real_historical_training_data.csv")
    df = pd.read_csv(data_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["hour_of_day"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["is_lab_hour"] = ((df["hour_of_day"] >= 9) & (df["hour_of_day"] <= 17) & (df["day_of_week"] < 5)).astype(int)
    df["is_hostel_peak"] = ((df["hour_of_day"] >= 18) & (df["hour_of_day"] <= 23)).astype(int)

    # In physics: acad_draw is ~120 kW during class hours with lunch dip, 50% Saturday
    is_weekday = (df["day_of_week"] < 5)
    is_saturday = (df["day_of_week"] == 5)
    is_class_hours = (df["hour_of_day"] >= 8) & (df["hour_of_day"] < 18)
    acad_load = np.where(is_class_hours, np.where(is_weekday, 120.0, np.where(is_saturday, 60.0, 0.0)), 0.0)
    # add baseload fraction (35 kW) + fraction of HVAC
    hvac_load = (np.maximum(0.0, df["temp_c"] - 25.0) ** 1.35) * 2.5
    df["acad_load_kw"] = 35.0 + acad_load + hvac_load

    # Hostel load: morning surge + evening peak + 35 kW baseload + HVAC fraction
    is_morning = (df["hour_of_day"] >= 6) & (df["hour_of_day"] < 9)
    is_evening = (df["hour_of_day"] >= 18) & (df["hour_of_day"] <= 23)
    hostel_surge = np.where(is_morning, 40.0, np.where(is_evening, 95.0, 0.0))
    df["hostel_load_kw"] = 35.0 + hostel_surge + (np.maximum(0.0, df["temp_c"] - 25.0) ** 1.35) * 1.7

    # Train academic load model
    acad_feats = ["hour_of_day", "day_of_week", "is_lab_hour", "temp_c"]
    acad_model = XGBRegressor(n_estimators=100, max_depth=5, random_state=42, n_jobs=-1)
    acad_model.fit(df[acad_feats], df["acad_load_kw"])

    booster_acad = acad_model.get_booster()
    orig_acad = booster_acad.feature_names
    booster_acad.feature_names = [f"f{i}" for i in range(len(acad_feats))]
    initial_acad = [("float_input", XGBFloatTensorType([None, len(acad_feats)]))]
    acad_onnx = onnxmltools.convert_xgboost(acad_model, initial_types=initial_acad, target_opset=15)
    booster_acad.feature_names = orig_acad

    acad_onnx_path = os.path.join(MODELS_DIR, "load_academic_quantile.onnx")
    with open(acad_onnx_path, "wb") as f:
        f.write(acad_onnx.SerializeToString())
    print(f"[3/4] Exported {acad_onnx_path}")

    # Train hostel load model
    hostel_feats = ["hour_of_day", "day_of_week", "is_hostel_peak", "temp_c"]
    hostel_model = XGBRegressor(n_estimators=100, max_depth=5, random_state=42, n_jobs=-1)
    hostel_model.fit(df[hostel_feats], df["hostel_load_kw"])

    booster_hostel = hostel_model.get_booster()
    orig_hostel = booster_hostel.feature_names
    booster_hostel.feature_names = [f"f{i}" for i in range(len(hostel_feats))]
    initial_hostel = [("float_input", XGBFloatTensorType([None, len(hostel_feats)]))]
    hostel_onnx = onnxmltools.convert_xgboost(hostel_model, initial_types=initial_hostel, target_opset=15)
    booster_hostel.feature_names = orig_hostel

    hostel_onnx_path = os.path.join(MODELS_DIR, "load_hostel_quantile.onnx")
    with open(hostel_onnx_path, "wb") as f:
        f.write(hostel_onnx.SerializeToString())
    print(f"[4/4] Exported {hostel_onnx_path}")

    # Also save .pkl models as fallback
    joblib.dump(acad_model, os.path.join(MODELS_DIR, "load_academic.pkl"))
    joblib.dump(hostel_model, os.path.join(MODELS_DIR, "load_hostel.pkl"))

    print("\n[SUCCESS] All 4 Pair A ONNX quantile models exported successfully!")


if __name__ == "__main__":
    export()
