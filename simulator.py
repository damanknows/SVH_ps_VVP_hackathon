"""
Campus Microgrid Live Telemetry Simulator
-----------------------------------------
Streams physically coherent telemetry based on real-time Jodhpur weather
and the single source of truth physics engine (physics.py).
Incorporates solar PV generation, wind turbine power, campus load, and
closed-loop battery state-of-charge (SoC) dynamics.
"""

import time
import random
from datetime import datetime
import pandas as pd
import numpy as np
from physics import solar_output_kw, wind_output_kw, campus_load_kw, PHYSICS_VERSION
from fetch_weather import fetch_current_weather

# Microgrid Campus Identifier
CAMPUS_ID = "DTE_JODHPUR"
BATTERY_CAPACITY_KWH = 500.0  # 500 kWh campus storage
battery_soc = 65.0  # Initial SoC (%)

# Cached weather to prevent aggressive rate-limiting
_cached_weather = None
_last_weather_fetch = 0


def get_current_weather_safe():
    """Fetches real weather with a 5-minute cache and fallback."""
    global _cached_weather, _last_weather_fetch
    now_epoch = time.time()
    if _cached_weather is None or (now_epoch - _last_weather_fetch > 300):
        try:
            _cached_weather = fetch_current_weather()
            _last_weather_fetch = now_epoch
        except Exception as e:
            if _cached_weather is None:
                # Fallback to realistic Jodhpur afternoon conditions
                _cached_weather = {
                    "temperature_2m": 34.0,
                    "surface_pressure": 980.0,
                    "wind_speed_10m": 8.0,
                    "wind_speed_100m": 11.5,
                    "shortwave_radiation_instant": 450.0,
                    "direct_normal_irradiance": 500.0,
                    "diffuse_radiation": 120.0
                }
    return _cached_weather


def generate_telemetry():
    """Generates physically grounded real-time telemetry."""
    global battery_soc
    now = datetime.now()
    ts = pd.Timestamp(now).tz_localize("Asia/Kolkata") if pd.Timestamp(now).tz is None else pd.Timestamp(now)

    w = get_current_weather_safe()

    # Base physics calculations
    solar_base = solar_output_kw(
        ghi=w.get("shortwave_radiation_instant", 0.0),
        dni=w.get("direct_normal_irradiance", 0.0),
        dhi=w.get("diffuse_radiation", 0.0),
        temp_c=w.get("temperature_2m", 30.0),
        timestamp=ts,
    )

    wind_base = wind_output_kw(
        wind_speed_10m=w.get("wind_speed_10m", 6.0),
        wind_speed_100m=w.get("wind_speed_100m", 8.5),
        surface_pressure_hpa=w.get("surface_pressure", 1005.0),
        temp_c=w.get("temperature_2m", 30.0),
    )

    load_base = campus_load_kw(
        timestamp=ts,
        temp_c=w.get("temperature_2m", 30.0),
    )

    # Realistic micro-fluctuations (sensor jitter / small cloud passage / gust turbulence)
    solar_actual = max(0.0, round(solar_base + (random.uniform(-2.0, 2.0) if solar_base > 0 else 0.0), 1))
    wind_actual = max(0.0, round(wind_base + random.uniform(-1.5, 1.5), 1))
    load_actual = max(70.0, round(load_base + random.uniform(-3.0, 3.0), 1))

    # Closed-loop Battery State of Charge (SoC) Dynamics
    # Net generation surplus charges battery; deficit discharges battery
    net_kw = (solar_actual + wind_actual) - load_actual
    # 1 second step energy (kWh) = net_kw * (1 / 3600)
    delta_soc_pct = (net_kw / BATTERY_CAPACITY_KWH) * (1.0 / 3600.0) * 100.0
    battery_soc = float(round(np.clip(battery_soc + delta_soc_pct, 15.0, 95.0), 2))

    return {
        "timestamp": now.isoformat(),
        "campus_id": CAMPUS_ID,
        "solar_kw": solar_actual,
        "wind_kw": wind_actual,
        "battery_soc_pct": battery_soc,
        "campus_load_kw": load_actual
    }


if __name__ == "__main__":
    print(f"Starting Physical Microgrid Telemetry Stream (Physics v{PHYSICS_VERSION})...")
    print("Press Ctrl+C to terminate.\n")
    try:
        count = 0
        while count < 3:  # Stream 3 ticks when executed directly as test
            payload = generate_telemetry()
            print(f"[SIMULATOR STREAM] {payload}")
            time.sleep(1)
            count += 1
    except KeyboardInterrupt:
        print("\nSimulator stopped.")