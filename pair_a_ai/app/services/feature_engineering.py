"""
Feature Engineering Service
---------------------------
Shared logic for computing temporal lags, rolling statistics, cyclical encodings,
and constructing formatted feature vectors for multi-asset inference.
"""

from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd


def compute_cyclical_features(dt: pd.Timestamp) -> Dict[str, float]:
    """Computes sine and cosine cyclical encodings for hour, day, and day-of-week."""
    hour_frac = dt.hour + dt.minute / 60.0
    day_frac = dt.dayofyear / 365.25
    dow = dt.dayofweek

    return {
        "hour_sin": float(np.sin(2 * np.pi * hour_frac / 24.0)),
        "hour_cos": float(np.cos(2 * np.pi * hour_frac / 24.0)),
        "day_sin": float(np.sin(2 * np.pi * day_frac)),
        "day_cos": float(np.cos(2 * np.pi * day_frac)),
        "dow_sin": float(np.sin(2 * np.pi * dow / 7.0)),
        "dow_cos": float(np.cos(2 * np.pi * dow / 7.0)),
        "is_weekday": float(1.0 if dow < 5 else 0.0),
        "is_lab_hour": float(1.0 if (hour_frac >= 9.0 and hour_frac <= 17.0 and dow < 5) else 0.0),
        "is_morning_surge": float(1.0 if (hour_frac >= 6.5 and hour_frac < 8.5) else 0.0),
        "is_hostel_peak": float(1.0 if (hour_frac >= 18.0 and hour_frac < 23.5) else 0.0),
    }


def construct_asset_feature_vectors(
    telemetry: Dict[str, Any],
    weather: Dict[str, Any],
    dt: Optional[pd.Timestamp] = None,
) -> Dict[str, List[float]]:
    """
    Constructs feature vectors for all 4 target assets matching metadata.json column orders.
    """
    ts = dt or pd.Timestamp.now(tz="Asia/Kolkata")
    cyclical = compute_cyclical_features(ts)

    temp_c = float(weather.get("temp_c", 30.0))
    ghi = float(weather.get("shortwave_radiation_instant", 500.0))
    dni = float(weather.get("direct_normal_irradiance", 400.0))
    dhi = float(weather.get("diffuse_radiation", 100.0))
    cloud_pct = float(weather.get("cloud_pct", 10.0))

    ws = float(weather.get("wind_speed", 6.5))
    ws_100 = float(weather.get("wind_speed_100m", ws * 1.35))
    wg = float(weather.get("wind_gust", ws * 1.45))
    press = float(weather.get("surface_pressure", 1008.0))

    # Solar feature vector (14 features)
    solar_feats = [
        temp_c, ghi, dni, dhi, cloud_pct,
        cyclical["hour_sin"], cyclical["hour_cos"], cyclical["day_sin"], cyclical["day_cos"],
        float(telemetry.get("solar_lag_1", ghi * 0.2)),
        float(telemetry.get("solar_lag_4", ghi * 0.18)),
        float(telemetry.get("solar_lag_96", ghi * 0.19)),
        float(telemetry.get("solar_rolling_4", ghi * 0.2)),
        float(telemetry.get("solar_rolling_16", ghi * 0.2)),
    ]

    # Wind feature vector (14 features)
    wind_feats = [
        ws, ws_100, wg, press, temp_c,
        cyclical["hour_sin"], cyclical["hour_cos"], cyclical["day_sin"], cyclical["day_cos"],
        float(telemetry.get("wind_lag_1", ws)),
        float(telemetry.get("wind_lag_4", ws)),
        float(telemetry.get("wind_lag_96", ws)),
        float(telemetry.get("wind_rolling_4", ws)),
        float(telemetry.get("wind_rolling_16", ws)),
    ]

    # Academic load feature vector (12 features)
    acad_feats = [
        temp_c,
        cyclical["hour_sin"], cyclical["hour_cos"], cyclical["dow_sin"], cyclical["dow_cos"],
        cyclical["is_weekday"], cyclical["is_lab_hour"],
        float(telemetry.get("acad_lag_1", 100.0)),
        float(telemetry.get("acad_lag_4", 100.0)),
        float(telemetry.get("acad_lag_96", 100.0)),
        float(telemetry.get("acad_rolling_4", 100.0)),
        float(telemetry.get("acad_rolling_16", 100.0)),
    ]

    # Hostel load feature vector (12 features)
    hostel_feats = [
        temp_c,
        cyclical["hour_sin"], cyclical["hour_cos"], cyclical["dow_sin"], cyclical["dow_cos"],
        cyclical["is_morning_surge"], cyclical["is_hostel_peak"],
        float(telemetry.get("hostel_lag_1", 50.0)),
        float(telemetry.get("hostel_lag_4", 50.0)),
        float(telemetry.get("hostel_lag_96", 50.0)),
        float(telemetry.get("hostel_rolling_4", 50.0)),
        float(telemetry.get("hostel_rolling_16", 50.0)),
    ]

    return {
        "solar-pv-block-a": solar_feats,
        "wind-turb-1": wind_feats,
        "load-academic": acad_feats,
        "load-hostel": hostel_feats,
    }
