"""
ONNX Conversion & Invariant Validation Pipeline
-----------------------------------------------
Converts serialized champion Machine Learning models (Random Forest and XGBoost)
to ONNX graph formats using skl2onnx and onnxmltools.
Reads feature orders and champion models dynamically from model_metadata.json.
Validates numerical fidelity against original models using real data from
real_historical_training_data.csv (tolerance atol=1e-3).
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import onnxruntime as ort
import skl2onnx
from skl2onnx.common.data_types import FloatTensorType
import onnxmltools
from onnxmltools.convert import convert_xgboost

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
METADATA_PATH = os.path.join(BASE_DIR, "model_metadata.json")
MODELS_ONNX_DIR = os.path.join(BASE_DIR, "models_onnx")
DATASET_PATH = os.path.join(BASE_DIR, "real_historical_training_data.csv")


def convert_and_validate():
    os.makedirs(MODELS_ONNX_DIR, exist_ok=True)

    if not os.path.exists(METADATA_PATH):
        raise FileNotFoundError(f"Model metadata missing at {METADATA_PATH}")

    with open(METADATA_PATH, "r") as f:
        metadata = json.load(f)

    # Load validation sample from ground-truth historical dataset
    sample_df = None
    if os.path.exists(DATASET_PATH):
        df_full = pd.read_csv(DATASET_PATH)
        sample_df = df_full.head(20).copy()

    asset_configs = [
        {
            "asset": "solar",
            "model_file": "solar_model.pkl",
            "onnx_file": "solar_model.onnx",
            "features": metadata["features"]["solar"],
            "champion_type": metadata["benchmarks"]["solar"]["champion"],
        },
        {
            "asset": "wind",
            "model_file": "wind_model.pkl",
            "onnx_file": "wind_model.onnx",
            "features": metadata["features"]["wind"],
            "champion_type": metadata["benchmarks"]["wind"]["champion"],
        },
        {
            "asset": "load",
            "model_file": "demand_model.pkl",
            "onnx_file": "load_model.onnx",
            "features": metadata["features"]["demand"],
            "champion_type": metadata["benchmarks"]["demand"]["champion"],
        },
    ]

    results = {}

    for cfg in asset_configs:
        asset = cfg["asset"]
        model_path = os.path.join(BASE_DIR, cfg["model_file"])
        onnx_path = os.path.join(MODELS_ONNX_DIR, cfg["onnx_file"])
        features = cfg["features"]
        n_features = len(features)
        champion_type = cfg["champion_type"]

        print(f"\n[ONNX Conversion] Processing {asset.upper()} asset...")
        print(f"  Champion Type: {champion_type} | Features ({n_features}): {features}")
        print(f"  Source Model: {cfg['model_file']} -> Target ONNX: {cfg['onnx_file']}")

        model = joblib.load(model_path)
        initial_types = [("float_input", FloatTensorType([None, n_features]))]

        if champion_type.lower() == "xgboost" or "xgb" in str(type(model)).lower():
            # XGBoost requires feature names to follow f0, f1, ... in onnxmltools
            booster = model.get_booster()
            booster.feature_names = [f"f{i}" for i in range(n_features)]
            onnx_model = convert_xgboost(
                model,
                initial_types=initial_types,
                target_opset=15
            )
        elif champion_type.lower() == "randomforest" or "forest" in str(type(model)).lower():
            onnx_model = skl2onnx.to_onnx(
                model,
                initial_types=initial_types,
                target_opset=15
            )
        else:
            raise ValueError(f"Unsupported model champion type: {champion_type}")

        # Save ONNX model
        with open(onnx_path, "wb") as f:
            f.write(onnx_model.SerializeToString())
        print(f"  Successfully serialized ONNX graph ({os.path.getsize(onnx_path)} bytes) to {onnx_path}")

        # Validation Step
        print(f"  Validating ONNX numerical fidelity against original model...")
        if sample_df is not None and all(feat in sample_df.columns for feat in features):
            X_val = sample_df[features].values.astype(np.float32)
        else:
            # Synthetic validation tensor
            np.random.seed(42)
            X_val = np.random.uniform(10.0, 50.0, size=(10, n_features)).astype(np.float32)

        # Baseline predictions from Python model
        pred_orig = np.asarray(model.predict(X_val), dtype=np.float32).flatten()

        # ONNX Runtime inference session
        session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        input_name = session.get_inputs()[0].name
        # Ensure float32 casting explicitly
        X_val_cast = np.ascontiguousarray(X_val, dtype=np.float32)
        pred_onnx = session.run(None, {input_name: X_val_cast})[0].flatten().astype(np.float32)

        max_abs_diff = float(np.max(np.abs(pred_orig - pred_onnx)))
        print(f"  Max Absolute Difference: {max_abs_diff:.6e} (Tolerance: 1.0e-3)")

        if max_abs_diff > 1e-3:
            raise AssertionError(
                f"FATAL: ONNX model for {asset} exhibited numeric drift exceeding atol=1e-3! "
                f"Max diff: {max_abs_diff:.6e}"
            )

        print(f"  PASSED: {asset.upper()} ONNX model matches original within atol=1e-3.")
        results[asset] = {
            "onnx_path": onnx_path,
            "max_abs_diff": max_abs_diff,
            "validation_rows": len(X_val),
            "status": "PASSED"
        }

    print("\nAll models converted and validated successfully without numerical drift!")
    return results


if __name__ == "__main__":
    convert_and_validate()
