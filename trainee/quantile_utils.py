"""
Quantile Prediction Utilities for Microgrid Uncertainty Quantification
-----------------------------------------------------------------------
Implements:
1. Quantile Regression Forest (QRF) extraction for Random Forest models:
   Extracts individual decision tree predictions across all estimators and computes
   empirical percentiles (p10, p50, p90) to capture wind turbulence and speed uncertainty.
2. Empirical Residual Quantiles for Gradient Boosted Trees (XGBoost):
   Leverages out-of-sample calibration residual distributions to project calibrated
   prediction intervals [p10, p90] around point forecast p50.
"""

from typing import Dict, Tuple, Union
import numpy as np
import pandas as pd


def rf_quantile_predict(
    rf_model,
    X: Union[np.ndarray, pd.DataFrame],
    quantiles: Tuple[float, ...] = (0.1, 0.5, 0.9),
) -> Dict[float, np.ndarray]:
    """
    Computes ensemble percentiles across all decision trees in a RandomForestRegressor.

    Parameters:
    - rf_model: Trained scikit-learn RandomForestRegressor
    - X: Feature matrix (array-like or DataFrame)
    - quantiles: Tuple of target quantiles, e.g. (0.1, 0.5, 0.9)

    Returns:
    - Dictionary mapping quantile float (e.g. 0.1, 0.5, 0.9) to 1D numpy array of predictions.
    """
    if hasattr(X, "values"):
        X_arr = X.values
    else:
        X_arr = np.asarray(X)

    # Collect predictions from every individual decision tree in the ensemble
    all_preds = np.stack([tree.predict(X_arr) for tree in rf_model.estimators_], axis=0)

    # Compute percentiles along tree axis (axis 0)
    result = {}
    for q in quantiles:
        result[q] = np.percentile(all_preds, q * 100.0, axis=0)

    return result


def compute_residual_offsets(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Calculates 10th and 90th percentile empirical residuals from evaluation data:
        residual = y_true - y_pred
    """
    y_true_arr = np.asarray(y_true, dtype=float)
    y_pred_arr = np.asarray(y_pred, dtype=float)
    residuals = y_true_arr - y_pred_arr

    p10_offset = float(np.percentile(residuals, 10.0))
    p90_offset = float(np.percentile(residuals, 90.0))

    return {
        "p10_offset": round(p10_offset, 3),
        "p90_offset": round(p90_offset, 3),
    }


def apply_residual_quantiles(
    p50_preds: np.ndarray,
    p10_offset: float,
    p90_offset: float,
    clip_min: float = 0.0,
    clip_max: float = None,
) -> Dict[str, np.ndarray]:
    """
    Applies calibrated empirical residual offsets to produce p10 and p90 prediction intervals.

    Parameters:
    - p50_preds: Point predictions (p50)
    - p10_offset: Lower residual offset (y_true - y_pred at 10th percentile, typically <= 0)
    - p90_offset: Upper residual offset (y_true - y_pred at 90th percentile, typically >= 0)
    - clip_min: Lower physical bound (e.g. 0.0 kW for generation)
    - clip_max: Optional upper physical bound (e.g. nameplate capacity)

    Returns:
    - Dictionary with "p10", "p50", "p90" numpy arrays
    """
    p50 = np.asarray(p50_preds, dtype=float)
    p10 = p50 + p10_offset
    p90 = p50 + p90_offset

    if clip_min is not None:
        p10 = np.maximum(clip_min, p10)
        p50 = np.maximum(clip_min, p50)
        p90 = np.maximum(clip_min, p90)

    if clip_max is not None:
        p10 = np.minimum(clip_max, p10)
        p50 = np.minimum(clip_max, p50)
        p90 = np.minimum(clip_max, p90)

    return {
        "p10": np.round(p10, 2),
        "p50": np.round(p50, 2),
        "p90": np.round(p90, 2),
    }
