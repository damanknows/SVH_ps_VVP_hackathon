"""
Synthetic Stress-Test Dataset Generator
---------------------------------------
Generates synthetic multi-scenario meteorological data to stress-test microgrid
physics and operational boundaries at extremes:
1. Severe Rajasthan Heatwave: Days with temp > 45 C to test PV thermal derate & chiller surges.
2. Extended Wind Drought: Consecutive days of calm wind (< 2.5 m/s) testing zero wind power.
3. Severe Dust/Gale Storm: Wind speeds exceeding cut-out (> 25 m/s) testing storm cut-off.
4. Monsoon Heavy Overcast: Prolonged low solar irradiance testing microgrid deficit.

All physical power and load targets are computed via the shared physics.py module.
Saves output to: historical_campus_energy_data.csv
"""

import pandas as pd
import numpy as np
from physics import solar_output_kw, wind_output_kw, campus_load_kw, PHYSICS_VERSION

YEAR = 2024
HOURS = 8784  # 366 days * 24 hours


def generate_stress_test_dataset():
    print(f"[1/3] Generating {HOURS} hours of synthetic meteorological data with stress-test periods...")
    timestamps = pd.date_range(start=f"{YEAR}-01-01 00:00", periods=HOURS, freq="h", tz="Asia/Kolkata")
    df = pd.DataFrame({"timestamp": timestamps})

    df["hour"] = df["timestamp"].dt.hour
    df["day_of_year"] = df["timestamp"].dt.dayofyear
    df["day_of_week"] = df["timestamp"].dt.dayofweek

    # Base realistic seasonal temperatures (Rajasthan climate)
    # Seasonal wave peaking in May/June (day ~150), daily diurnal wave peaking at 15:00
    seasonal_temp = 25.0 + 12.0 * np.sin(2 * np.pi * (df["day_of_year"] - 80) / 365.25)
    diurnal_temp = 5.0 * np.sin(2 * np.pi * (df["hour"] - 9) / 24.0)
    df["temp_c"] = (seasonal_temp + diurnal_temp + np.random.normal(0, 2.0, HOURS)).round(1)

    # Base surface pressure (hPa)
    df["surface_pressure"] = (1005.0 - 5.0 * np.sin(2 * np.pi * df["day_of_year"] / 365.25) + np.random.normal(0, 2.0, HOURS)).round(1)

    # Solar Irradiance components (bell curve peaking at solar noon)
    is_day = (df["hour"] >= 6) & (df["hour"] <= 19)
    solar_angle = np.maximum(0.0, np.sin(np.pi * (df["hour"] - 6) / 13.0))
    
    # Base clear-sky GHI with cloud attenuation
    base_ghi = np.where(is_day, 950.0 * (solar_angle ** 1.1), 0.0)
    df["cloud_pct"] = np.random.uniform(0, 40, HOURS).round(1)

    # Wind speeds (10m and 100m) with natural shear
    df["wind_speed"] = np.random.weibull(a=2.0, size=HOURS) * 5.0 # mean ~4.5 m/s
    df["wind_speed_100m"] = df["wind_speed"] * np.random.uniform(1.25, 1.45, HOURS)
    df["wind_gust"] = df["wind_speed"] * np.random.uniform(1.2, 1.6, HOURS)

    # --- INJECT STRESS TEST REGIONS ---
    # Scenario A: May Heatwave (Days 140-146): Extreme temp 44-48 C, intense sun
    heatwave_mask = (df["day_of_year"] >= 140) & (df["day_of_year"] <= 146)
    df.loc[heatwave_mask, "temp_c"] = np.clip(df.loc[heatwave_mask, "temp_c"] + 10.0, 42.0, 49.5)
    df.loc[heatwave_mask, "cloud_pct"] = 0.0

    # Scenario B: Extended Wind Drought (Days 180-186): Wind speed drops below cut-in (< 2.5 m/s)
    calm_mask = (df["day_of_year"] >= 180) & (df["day_of_year"] <= 186)
    df.loc[calm_mask, "wind_speed"] = np.random.uniform(0.5, 2.2, calm_mask.sum())
    df.loc[calm_mask, "wind_speed_100m"] = df.loc[calm_mask, "wind_speed"] * 1.15

    # Scenario C: Severe Storm Gusts (Day 210): Wind speed exceeds 25 m/s cut-out
    storm_mask = (df["day_of_year"] == 210) & (df["hour"] >= 14) & (df["hour"] <= 18)
    df.loc[storm_mask, "wind_speed"] = np.random.uniform(26.0, 32.0, storm_mask.sum())
    df.loc[storm_mask, "wind_speed_100m"] = df.loc[storm_mask, "wind_speed"] * 1.3

    # Scenario D: Monsoon Dense Overcast (Days 230-236): 100% cloud cover, low GHI
    monsoon_mask = (df["day_of_year"] >= 230) & (df["day_of_year"] <= 236)
    df.loc[monsoon_mask, "cloud_pct"] = np.random.uniform(90, 100, monsoon_mask.sum())

    # Derive GHI, DNI, DHI after cloud and stress adjustments
    cloud_factor = np.maximum(0.1, 1.0 - (df["cloud_pct"] / 100.0) * 0.75)
    df["shortwave_radiation_instant"] = np.maximum(0.0, base_ghi * cloud_factor).round(1)
    df["direct_normal_irradiance"] = np.maximum(0.0, df["shortwave_radiation_instant"] * 0.85 * cloud_factor).round(1)
    df["diffuse_radiation"] = np.maximum(0.0, df["shortwave_radiation_instant"] - df["direct_normal_irradiance"] * 0.5).round(1)

    # [2/3] Apply Single Source of Truth Physics Engine
    print("[2/3] Evaluating physics equations from shared physics.py...")
    df["solar_kw"] = solar_output_kw(
        ghi=df["shortwave_radiation_instant"],
        dni=df["direct_normal_irradiance"],
        dhi=df["diffuse_radiation"],
        temp_c=df["temp_c"],
        timestamp=df["timestamp"]
    )

    df["wind_kw"] = wind_output_kw(
        wind_speed_10m=df["wind_speed"],
        wind_speed_100m=df["wind_speed_100m"],
        surface_pressure_hpa=df["surface_pressure"],
        temp_c=df["temp_c"]
    )

    df["demand_kw"] = campus_load_kw(
        timestamp=df["timestamp"],
        temp_c=df["temp_c"]
    )

    # [3/3] Sanity Verification
    print("[3/3] Verifying synthetic stress output...")
    assert (df["solar_kw"] >= 0.0).all()
    assert (df["wind_kw"] >= 0.0).all()
    assert (df["demand_kw"] >= 70.0).all()

    # Verify storm cut-out behavior
    storm_wind_power = df.loc[storm_mask, "wind_kw"]
    assert (storm_wind_power == 0.0).all(), "Turbine did not cut-out during storm speeds > 25 m/s!"

    # Verify wind drought behavior
    calm_wind_power = df.loc[calm_mask, "wind_kw"]
    assert (calm_wind_power == 0.0).all(), "Turbine produced power below cut-in speed!"

    output_csv = "historical_campus_energy_data.csv"
    df.to_csv(output_csv, index=False)
    print(f"SUCCESS: Synthetic stress-test dataset ({len(df)} hours) saved to {output_csv}")
    print(f"Physics Version: {PHYSICS_VERSION}")
    return df


if __name__ == "__main__":
    generate_stress_test_dataset()