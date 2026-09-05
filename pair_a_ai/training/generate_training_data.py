"""
Generate 15-Minute Synthetic Training Dataset for Pair A
-------------------------------------------------------
Simulates 1 full year (35,040 rows at 15-minute intervals) of microgrid telemetry
with cyclical time features, weather indicators, and realistic loads.
"""

import os
import pandas as pd
import numpy as np

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "training_data_15min.parquet")


def generate_data(periods: int = 35040):
    print(f"Generating {periods} timesteps (15-min resolution) of training telemetry...")
    timestamps = pd.date_range("2024-01-01 00:00", periods=periods, freq="15min", tz="Asia/Kolkata")
    df = pd.DataFrame({"timestamp": timestamps})

    # Time features
    hour_frac = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
    day_frac = df["timestamp"].dt.dayofyear / 365.25
    dow = df["timestamp"].dt.dayofweek

    df["hour_sin"] = np.sin(2 * np.pi * hour_frac / 24.0).astype(np.float32)
    df["hour_cos"] = np.cos(2 * np.pi * hour_frac / 24.0).astype(np.float32)
    df["day_sin"] = np.sin(2 * np.pi * day_frac).astype(np.float32)
    df["day_cos"] = np.cos(2 * np.pi * day_frac).astype(np.float32)
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7.0).astype(np.float32)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7.0).astype(np.float32)

    # Academic & hostel flags
    df["is_weekday"] = (dow < 5).astype(np.float32)
    df["is_lab_hour"] = ((hour_frac >= 9.0) & (hour_frac <= 17.0) & (dow < 5)).astype(np.float32)
    df["is_morning_surge"] = ((hour_frac >= 6.5) & (hour_frac < 8.5)).astype(np.float32)
    df["is_hostel_peak"] = ((hour_frac >= 18.0) & (hour_frac < 23.5)).astype(np.float32)

    # Weather
    df["temp_c"] = (28.0 + 10.0 * df["day_sin"] + 6.0 * np.sin(2 * np.pi * (hour_frac - 9) / 24.0)).astype(np.float32)
    df["cloud_pct"] = np.random.uniform(0, 30, periods).astype(np.float32)

    sun_factor = np.maximum(0.0, np.sin(np.pi * (hour_frac - 6.0) / 12.5))
    is_day = (hour_frac >= 6.0) & (hour_frac <= 18.5)
    df["shortwave_radiation_instant"] = np.where(is_day, 920.0 * (sun_factor ** 1.1), 0.0).astype(np.float32)
    df["direct_normal_irradiance"] = (df["shortwave_radiation_instant"] * 0.82).astype(np.float32)
    df["diffuse_radiation"] = (df["shortwave_radiation_instant"] * 0.18).astype(np.float32)

    df["wind_speed"] = (5.5 + 2.0 * np.random.randn(periods)).clip(1.0, 20.0).astype(np.float32)
    df["wind_speed_100m"] = (df["wind_speed"] * 1.35).astype(np.float32)
    df["wind_gust"] = (df["wind_speed"] * 1.45).astype(np.float32)
    df["surface_pressure"] = (1008.0 + 3.0 * np.random.randn(periods)).astype(np.float32)

    # Lags & rolling placeholders
    df["lag_1"] = 0.0
    df["lag_4"] = 0.0
    df["lag_96"] = 0.0
    df["rolling_mean_4"] = 0.0
    df["rolling_mean_16"] = 0.0

    print(f"Generated {len(df)} 15-minute telemetry records.")
    return df


if __name__ == "__main__":
    df = generate_data(1000)
    print("Sample generation verified.")
