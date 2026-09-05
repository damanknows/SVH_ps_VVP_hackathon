"""
ONNX Model Converter for Microgrid Surrogate Forecasters
--------------------------------------------------------
Converts scikit-learn (RandomForest) and XGBoost champion models into ONNX graphs
for high-throughput, low-latency microgrid edge inference.
Outputs are saved to models/ and trainee/models/.
Maintains .pkl as dual-engine fallback.
"""

import os
import json
import joblib
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType as XGBFloatTensorType

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
ROOT_MODELS_DIR = os.path.join(os.path.dirname(BASE_DIR), "models")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(ROOT_MODELS_DIR, exist_ok=True)


def convert_all():
    print("=" * 70)
    print("  CONVERTING MICROGRID CHAMPION MODELS TO ONNX")
    print("=" * 70)

    # 1. Load metadata to get exact feature counts
    with open(os.path.join(BASE_DIR, "model_metadata.json"), "r") as f:
        metadata = json.load(f)

    solar_feats = metadata["features"]["solar"]
    wind_feats = metadata["features"]["wind"]
    demand_feats = metadata["features"]["demand"]

    # 2. Convert Wind Model (RandomForest -> ONNX via skl2onnx)
    print(f"\n[1/3] Converting Wind Model ({len(wind_feats)} features)...")
    wind_model = joblib.load(os.path.join(BASE_DIR, "wind_model.pkl"))
    initial_type_wind = [("float_input", FloatTensorType([None, len(wind_feats)]))]
    wind_onnx = convert_sklearn(wind_model, initial_types=initial_type_wind, target_opset=15)

    wind_onnx_path = os.path.join(MODELS_DIR, "wind_model.onnx")
    with open(wind_onnx_path, "wb") as f:
        f.write(wind_onnx.SerializeToString())
    with open(os.path.join(ROOT_MODELS_DIR, "wind_model.onnx"), "wb") as f:
        f.write(wind_onnx.SerializeToString())
    print(f"  -> Saved {wind_onnx_path}")

    # 3. Convert Solar Model (XGBoost -> ONNX via onnxmltools)
    print(f"\n[2/3] Converting Solar Model ({len(solar_feats)} features)...")
    solar_model = joblib.load(os.path.join(BASE_DIR, "solar_model.pkl"))
    # Map feature names to 'f0', 'f1', ... to satisfy onnxmltools requirements
    booster_solar = solar_model.get_booster()
    orig_solar_names = booster_solar.feature_names
    booster_solar.feature_names = [f"f{i}" for i in range(len(orig_solar_names))]

    initial_type_solar = [("float_input", XGBFloatTensorType([None, len(solar_feats)]))]
    solar_onnx = onnxmltools.convert_xgboost(solar_model, initial_types=initial_type_solar, target_opset=15)
    booster_solar.feature_names = orig_solar_names  # Restore original names

    solar_onnx_path = os.path.join(MODELS_DIR, "solar_model.onnx")
    with open(solar_onnx_path, "wb") as f:
        f.write(solar_onnx.SerializeToString())
    with open(os.path.join(ROOT_MODELS_DIR, "solar_model.onnx"), "wb") as f:
        f.write(solar_onnx.SerializeToString())
    print(f"  -> Saved {solar_onnx_path}")

    # 4. Convert Demand Model (XGBoost -> ONNX via onnxmltools)
    print(f"\n[3/3] Converting Demand Model ({len(demand_feats)} features)...")
    demand_model = joblib.load(os.path.join(BASE_DIR, "demand_model.pkl"))
    booster_demand = demand_model.get_booster()
    orig_demand_names = booster_demand.feature_names
    booster_demand.feature_names = [f"f{i}" for i in range(len(orig_demand_names))]

    initial_type_demand = [("float_input", XGBFloatTensorType([None, len(demand_feats)]))]
    demand_onnx = onnxmltools.convert_xgboost(demand_model, initial_types=initial_type_demand, target_opset=15)
    booster_demand.feature_names = orig_demand_names  # Restore original names

    demand_onnx_path = os.path.join(MODELS_DIR, "demand_model.onnx")
    with open(demand_onnx_path, "wb") as f:
        f.write(demand_onnx.SerializeToString())
    with open(os.path.join(ROOT_MODELS_DIR, "demand_model.onnx"), "wb") as f:
        f.write(demand_onnx.SerializeToString())
    with open(os.path.join(MODELS_DIR, "load_model.onnx"), "wb") as f:
        f.write(demand_onnx.SerializeToString())
    with open(os.path.join(ROOT_MODELS_DIR, "load_model.onnx"), "wb") as f:
        f.write(demand_onnx.SerializeToString())
    print(f"  -> Saved {demand_onnx_path} (and load_model.onnx)")

    print("\n[SUCCESS] All 3 microgrid models converted to ONNX successfully!")


if __name__ == "__main__":
    convert_all()
