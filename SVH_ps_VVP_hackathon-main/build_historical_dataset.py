"""
Build Historical Microgrid Dataset
----------------------------------
Fetches 1 full year (2024 leap year: 8,784 hours) of real historical meteorological
and solar irradiance observations for Jodhpur (Rajasthan, India) via Open-Meteo Archive API.
Computes ground-truth physical targets using the peer-reviewed physics module:
- Solar PV generation (pvlib PVWatts model, NOCT cell temp derating, 200 kW inverter clip)
- Wind turbine generation (dual-height wind shear, dynamic air density, 3-stage aerodynamic power curve)
- Campus microgrid load (baseload, academic schedule with lunch dip, hostel peaks, non-linear HVAC cooling)

Saves output to: real_historical_training_data.csv
"""

import requests
import pandas as pd
import numpy as np
from physics import solar_output_kw, wind_output_kw, campus_load_kw, PHYSICS_VERSION

YEAR = 2024
EXPECTED_HOURS = 8784  # 366 days in 2024 leap year * 24 hours

LAT = 26.2389
LON = 73.0243


def build_dataset():
    print(f"[1/4] Fetching {YEAR} historical meteorological archive for Jodhpur ({LAT} N, {LON} E)...")
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={LAT}&longitude={LON}&"
        f"start_date={YEAR}-01-01&end_date={YEAR}-12-31&"
        f"hourly=temperature_2m,relative_humidity_2m,surface_pressure,cloud_cover,"
        f"wind_speed_10m,wind_speed_100m,wind_gusts_10m,"
        f"direct_normal_irradiance,diffuse_radiation,shortwave_radiation_instant&"
        f"timezone=Asia/Kolkata"
    )

    response = requests.get(url, timeout=60)
    if response.status_code != 200:
        raise RuntimeError(f"Open-Meteo API failed with status {response.status_code}: {response.text[:200]}")

    payload = response.json()
    if "hourly" not in payload:
        raise ValueError("Response payload does not contain 'hourly' data.")

    df = pd.DataFrame(payload["hourly"])
    print(f"      Retrieved {len(df)} hourly records from Open-Meteo API.")

    # 1. Column normalization & feature naming
    df.rename(columns={
        "time": "timestamp",
        "temperature_2m": "temp_c",
        "cloud_cover": "cloud_pct",
        "wind_speed_10m": "wind_speed",
        "wind_gusts_10m": "wind_gust"
    }, inplace=True)

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    if df["timestamp"].dt.tz is None:
        df["timestamp"] = df["timestamp"].dt.tz_localize("Asia/Kolkata")

    # Verify expected rows
    if len(df) != EXPECTED_HOURS:
        raise AssertionError(f"Expected exactly {EXPECTED_HOURS} hours for {YEAR}, got {len(df)} rows.")

    # 2. Time-series Feature Engineering
    print("[2/4] Engineering temporal and academic calendar features...")
    df["hour_of_day"] = df["timestamp"].dt.hour
    df["day_of_year"] = df["timestamp"].dt.dayofyear
    df["day_of_week"] = df["timestamp"].dt.dayofweek

    # Campus academic & lab schedule features
    df["is_lab_hour"] = ((df["hour_of_day"] >= 9) & (df["hour_of_day"] <= 17) & (df["day_of_week"] < 5)).astype(int)
    df["is_hostel_peak"] = ((df["hour_of_day"] >= 18) & (df["hour_of_day"] <= 23)).astype(int)

    # 3. Apply Single Source of Truth Physics Engine
    print("[3/4] Computing physical energy targets via physics.py (pvlib + aerodynamic power curve)...")
    df["solar_kw"] = solar_output_kw(
        ghi=df["shortwave_radiation_instant"],
        dni=df["direct_normal_irradiance"],
        dhi=df["diffuse_radiation"],
        temp_c=df["temp_c"],
        timestamp=df["timestamp"],
        lat=LAT,
        lon=LON,
    )

    df["wind_kw"] = wind_output_kw(
        wind_speed_10m=df["wind_speed"],
        wind_speed_100m=df["wind_speed_100m"],
        surface_pressure_hpa=df["surface_pressure"],
        temp_c=df["temp_c"],
    )

    df["demand_kw"] = campus_load_kw(
        timestamp=df["timestamp"],
        temp_c=df["temp_c"],
    )

    # 4. Rigorous Dataset Sanity Checks
    print("[4/4] Running dataset integrity verification checks...")
    assert len(df) == EXPECTED_HOURS, f"Row count mismatch: {len(df)} != {EXPECTED_HOURS}"
    assert (df["solar_kw"] >= 0.0).all(), "Negative solar generation detected!"
    assert (df["wind_kw"] >= 0.0).all(), "Negative wind generation detected!"
    assert (df["demand_kw"] >= 70.0).all(), "Demand below baseload (70 kW) detected!"
    assert (df["solar_kw"] <= 200.0).all(), "Solar generation exceeded 200 kW inverter rating!"
    assert (df["wind_kw"] <= 50.0).all(), "Wind generation exceeded 50 kW turbine rating!"

    # Invariant: zero solar when radiation is 0
    zero_rad_mask = df["shortwave_radiation_instant"] == 0.0
    assert (df.loc[zero_rad_mask, "solar_kw"] == 0.0).all(), "Non-zero solar generation during zero radiation!"

    output_csv = "real_historical_training_data.csv"
    df.to_csv(output_csv, index=False)
    print(f"SUCCESS: Labeled dataset with {len(df)} real historical hours saved to {output_csv}")
    print(f"Physics Version: {PHYSICS_VERSION}")
    print(df[["timestamp", "temp_c", "shortwave_radiation_instant", "solar_kw", "wind_kw", "demand_kw"]].head(10))
    return df


if __name__ == "__main__":
    build_dataset()