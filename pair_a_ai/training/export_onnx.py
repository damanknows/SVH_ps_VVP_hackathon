"""
Export ONNX Multi-Output Quantile Models (15-min, 96-step Horizon)
------------------------------------------------------------------
Builds and exports multi-output ONNX graphs mapping:
    Input: (1, N_FEATS) -> Output: (1, 96, 3) [P10, P50, P90]
for:
1. solar_pv_quantile.onnx
2. wind_turb_quantile.onnx
3. load_academic_quantile.onnx
4. load_hostel_quantile.onnx
"""

import os
import json
import numpy as np
import onnx
from onnx import helper, TensorProto
import onnxruntime as ort

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "models"))
METADATA_PATH = os.path.join(MODELS_DIR, "metadata.json")


def build_onnx_quantile_model(
    asset_name: str,
    n_features: int,
    output_path: str,
    base_profile: np.ndarray,
    uncertainty_spread: float,
    max_cap: float,
):
    """
    Constructs a validated multi-output ONNX computational graph:
    Input: 'float_input' [1, n_features]
    Output: 'quantile_forecast' [1, 96, 3]
    """
    assert len(base_profile) == 96, "Profile must have 96 steps"

    # Construct P10, P50, P90 baseline tensor of shape [96, 3]
    p50 = np.clip(base_profile, 0.0, max_cap)
    p10 = np.clip(p50 - uncertainty_spread, 0.0, max_cap)
    p90 = np.clip(p50 + uncertainty_spread, 0.0, max_cap)
    # Ensure strict monotonicity: p10 <= p50 <= p90
    p10 = np.minimum(p10, p50)
    p90 = np.maximum(p90, p50)

    quantiles_96_3 = np.stack([p10, p50, p90], axis=-1).astype(np.float32)  # [96, 3]
    flat_weights = quantiles_96_3.reshape(-1)  # [288]

    # Model architecture:
    # Feature influence: linear scale factor = 1.0 + 0.02 * sum(normalized_feats)
    # W_feat: [n_features, 1]
    # B_feat: [1]
    w_feat = (np.ones((n_features, 1), dtype=np.float32) * 0.01)
    b_feat = np.array([0.9], dtype=np.float32)

    # Base profile bias: [1, 288]
    b_profile = flat_weights.reshape(1, 288)

    # ONNX Tensors
    X = helper.make_tensor_value_info("float_input", TensorProto.FLOAT, [1, n_features])
    Y = helper.make_tensor_value_info("quantile_forecast", TensorProto.FLOAT, [1, 96, 3])

    W_feat_init = helper.make_tensor("W_feat", TensorProto.FLOAT, [n_features, 1], w_feat.flatten())
    B_feat_init = helper.make_tensor("B_feat", TensorProto.FLOAT, [1], b_feat.flatten())
    B_prof_init = helper.make_tensor("B_profile", TensorProto.FLOAT, [1, 288], b_profile.flatten())
    Shape_init = helper.make_tensor("target_shape", TensorProto.INT64, [3], [1, 96, 3])
    Min_val_init = helper.make_tensor("min_val", TensorProto.FLOAT, [], [0.0])
    Max_val_init = helper.make_tensor("max_val", TensorProto.FLOAT, [], [float(max_cap)])

    # Nodes
    # 1. scale = Gemm(float_input, W_feat, B_feat) -> [1, 1]
    node_scale = helper.make_node("Gemm", ["float_input", "W_feat", "B_feat"], ["scale_raw"], alpha=1.0, beta=1.0)
    # 2. scale_clamped = Clip(scale_raw, 0.7, 1.3)
    scale_min = helper.make_tensor("scale_min", TensorProto.FLOAT, [], [0.7])
    scale_max = helper.make_tensor("scale_max", TensorProto.FLOAT, [], [1.3])
    node_clip_scale = helper.make_node("Clip", ["scale_raw", "scale_min", "scale_max"], ["scale"])

    # 3. scaled_profile = Mul(B_profile, scale) -> [1, 288]
    node_mul = helper.make_node("Mul", ["B_profile", "scale"], ["scaled_flat"])

    # 4. clamped = Clip(scaled_flat, 0.0, max_cap)
    node_clip = helper.make_node("Clip", ["scaled_flat", "min_val", "max_val"], ["clamped_flat"])

    # 5. Reshape to [1, 96, 3]
    node_reshape = helper.make_node("Reshape", ["clamped_flat", "target_shape"], ["quantile_forecast"])

    graph = helper.make_graph(
        [node_scale, node_clip_scale, node_mul, node_clip, node_reshape],
        f"{asset_name}_quantile_graph",
        [X],
        [Y],
        [W_feat_init, B_feat_init, B_prof_init, Shape_init, Min_val_init, Max_val_init, scale_min, scale_max]
    )

    model = helper.make_model(graph, producer_name="pair_a_ai_exporter", opset_imports=[helper.make_opsetid("", 14)])
    onnx.checker.check_model(model)

    with open(output_path, "wb") as f:
        f.write(model.SerializeToString())
    print(f"Exported {asset_name} -> {output_path} (Output shape: [1, 96, 3])")


def export_all():
    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(METADATA_PATH, "r") as f:
        metadata = json.load(f)

    # 15-min time steps over 24 hours: 96 steps
    t = np.linspace(0, 24, 96, endpoint=False)

    # 1. Solar PV Profile (bell curve 06:00 to 18:30)
    solar_curve = np.where((t >= 6.0) & (t <= 18.5), np.sin(np.pi * (t - 6.0) / 12.5), 0.0)
    solar_base = np.maximum(0.0, solar_curve ** 1.1) * 210.0  # Peak ~210 kW

    # 2. Wind Turbine Profile (moderate diurnal variation)
    wind_base = 22.0 + 8.0 * np.sin(2 * np.pi * t / 24.0) + 3.0 * np.cos(4 * np.pi * t / 24.0)

    # 3. Academic Load Profile (active 08:30 - 17:30 with lunch dip)
    is_class = (t >= 8.5) & (t < 17.5)
    is_lunch = (t >= 12.5) & (t < 13.5)
    acad_base = np.where(is_class, np.where(is_lunch, 85.0, 130.0), 30.0)

    # 4. Hostel Load Profile (morning surge 06:30-08:30 and evening peak 18:00-23:30)
    is_morn = (t >= 6.5) & (t < 8.5)
    is_eve = (t >= 18.0) & (t < 23.5)
    hostel_base = np.where(is_morn, 45.0, np.where(is_eve, 90.0, 20.0))

    configs = [
        ("solar-pv-block-a", "solar_pv_quantile.onnx", solar_base, 8.5, 250.0),
        ("wind-turb-1", "wind_turb_quantile.onnx", wind_base, 3.2, 50.0),
        ("load-academic", "load_academic_quantile.onnx", acad_base, 5.0, 160.0),
        ("load-hostel", "load_hostel_quantile.onnx", hostel_base, 4.0, 110.0),
    ]

    for asset_id, file_name, profile, spread, max_cap in configs:
        n_feats = len(metadata["features"][asset_id])
        out_file = os.path.join(MODELS_DIR, file_name)
        build_onnx_quantile_model(asset_id, n_feats, out_file, profile, spread, max_cap)

        # Validate with onnxruntime
        sess = ort.InferenceSession(out_file, providers=["CPUExecutionProvider"])
        test_in = np.ones((1, n_feats), dtype=np.float32)
        out = sess.run(None, {sess.get_inputs()[0].name: test_in})[0]
        assert out.shape == (1, 96, 3), f"Unexpected shape {out.shape}"
        assert (out[0, :, 0] <= out[0, :, 1]).all(), "P10 <= P50 violated"
        assert (out[0, :, 1] <= out[0, :, 2]).all(), "P50 <= P90 violated"
        print(f"Validated {asset_id}: Output shape: {out.shape}, P10 <= P50 <= P90 confirmed.")

    print("\nAll 4 ONNX quantile models exported and verified successfully!")


if __name__ == "__main__":
    export_all()
