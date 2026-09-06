"""
Unit Tests for Campus Microgrid Physics Engine (trainee/physics.py)
-------------------------------------------------------------------
Verifies all physical invariants, boundary conditions, and aerodynamic/PV rules.
"""

import pytest
import pandas as pd
import numpy as np
from physics import solar_output_kw, wind_output_kw, campus_load_kw, PHYSICS_VERSION


def test_physics_version():
    assert PHYSICS_VERSION == "2.0.0"


def test_solar_night_is_zero():
    # Midnight in Jodhpur (sun is well below horizon)
    night_ts = pd.Timestamp("2024-06-21 00:00", tz="Asia/Kolkata")
    out = solar_output_kw(ghi=0.0, dni=0.0, dhi=0.0, temp_c=30.0, timestamp=night_ts)
    assert out == 0.0

    # Even if erroneous GHI is passed at 02:00 AM, zenith mask must force 0.0
    night_ts_2am = pd.Timestamp("2024-06-21 02:00", tz="Asia/Kolkata")
    out_anomalous = solar_output_kw(ghi=100.0, dni=100.0, dhi=50.0, temp_c=28.0, timestamp=night_ts_2am)
    assert out_anomalous == 0.0


def test_solar_clear_sky_exceeds_overcast():
    noon_ts = pd.Timestamp("2024-06-21 12:30", tz="Asia/Kolkata")
    
    # Clear sky noon
    clear_output = solar_output_kw(ghi=950.0, dni=850.0, dhi=120.0, temp_c=40.0, timestamp=noon_ts)
    # Heavy overcast noon
    overcast_output = solar_output_kw(ghi=200.0, dni=20.0, dhi=180.0, temp_c=32.0, timestamp=noon_ts)
    
    assert clear_output > overcast_output
    assert clear_output > 100.0
    assert overcast_output < 60.0


def test_solar_inverter_clipping():
    noon_ts = pd.Timestamp("2024-05-15 12:30", tz="Asia/Kolkata")
    # Extreme irradiance test (1300 W/m2)
    out = solar_output_kw(ghi=1300.0, dni=1100.0, dhi=200.0, temp_c=25.0, timestamp=noon_ts, ac_capacity_kw=200.0)
    assert out <= 200.0


def test_wind_cut_in_and_cut_out():
    # Below cut-in (v10=2.0 m/s -> v_hub < 3.0 m/s)
    out_calm = wind_output_kw(wind_speed_10m=2.0, wind_speed_100m=2.4, surface_pressure_hpa=1010.0, temp_c=25.0)
    assert out_calm == 0.0

    # Above cut-out (v10=25.0 m/s -> v_hub > 25.0 m/s)
    out_storm = wind_output_kw(wind_speed_10m=25.0, wind_speed_100m=30.0, surface_pressure_hpa=990.0, temp_c=25.0)
    assert out_storm == 0.0


def test_wind_rated_plateau():
    # Strong rated wind (v10=12.0 m/s, v100=15.0 m/s)
    out_rated = wind_output_kw(wind_speed_10m=12.0, wind_speed_100m=15.0, surface_pressure_hpa=1013.25, temp_c=25.0)
    assert pytest.approx(out_rated, abs=0.1) == 50.0


def test_wind_monotonic_region2():
    speeds_10m = [4.0, 6.0, 8.0, 10.0]
    outputs = [
        wind_output_kw(wind_speed_10m=v, wind_speed_100m=v * 1.25, surface_pressure_hpa=1013.0, temp_c=25.0)
        for v in speeds_10m
    ]
    # Verify strictly monotonic increase
    for i in range(len(outputs) - 1):
        assert outputs[i] < outputs[i + 1]


def test_hvac_cooling_threshold():
    ts = pd.Timestamp("2024-05-15 10:00", tz="Asia/Kolkata")
    # At 20 C (below 25 C), HVAC is 0
    load_cool = campus_load_kw(ts, temp_c=20.0)
    load_threshold = campus_load_kw(ts, temp_c=25.0)
    assert load_cool == load_threshold

    # Above 25 C, load must increase due to chiller power
    load_hot = campus_load_kw(ts, temp_c=35.0)
    assert load_hot > load_threshold


def test_campus_load_sunday_less_than_wednesday():
    wed_10am = pd.Timestamp("2024-05-15 10:00", tz="Asia/Kolkata") # Wednesday
    sun_10am = pd.Timestamp("2024-05-19 10:00", tz="Asia/Kolkata") # Sunday
    
    wed_load = campus_load_kw(wed_10am, temp_c=30.0)
    sun_load = campus_load_kw(sun_10am, temp_c=30.0)
    
    assert sun_load < wed_load
    # Difference should be at least academic draw (120 kW)
    assert wed_load - sun_load == pytest.approx(120.0, abs=1.0)


def test_vectorized_inputs():
    times = pd.date_range("2024-06-21 00:00", periods=24, freq="h", tz="Asia/Kolkata")
    df = pd.DataFrame({
        "timestamp": times,
        "ghi": np.linspace(0, 900, 24),
        "dni": np.linspace(0, 800, 24),
        "dhi": np.linspace(0, 150, 24),
        "temp_c": np.full(24, 32.0),
        "wind_10m": np.linspace(2, 14, 24),
        "wind_100m": np.linspace(2.5, 17, 24),
        "pressure": np.full(24, 1010.0),
    })

    solar_arr = solar_output_kw(df["ghi"], df["dni"], df["dhi"], df["temp_c"], df["timestamp"])
    wind_arr = wind_output_kw(df["wind_10m"], df["wind_100m"], df["pressure"], df["temp_c"])
    load_arr = campus_load_kw(df["timestamp"], df["temp_c"])

    assert len(solar_arr) == 24
    assert len(wind_arr) == 24
    assert len(load_arr) == 24
    assert np.all(solar_arr >= 0.0)
    assert np.all(wind_arr >= 0.0)
    assert np.all(load_arr >= 70.0)
