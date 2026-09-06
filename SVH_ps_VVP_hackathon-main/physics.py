"""
Physics Engine for Campus Renewable Microgrid (Single Source of Truth)
----------------------------------------------------------------------
Provides peer-reviewed physical calculations for:
1. Solar PV Output: Using pvlib (NREL-maintained) for solar position,
   Plane of Array (POA) irradiance, NOCT cell temperature derating,
   and inverter clipping.
2. Wind Turbine Output: Hub-height wind shear extrapolation from dual-height
   measurements (10m & 100m), dynamic air density, and standard 3-stage
   aerodynamic power curve (cut-in, cubic ramp, rated plateau, cut-out).
3. Campus Microgrid Load: Schedule-based academic/laboratory draw with
   lunch dip, diurnal hostel morning/evening peaks, and non-linear HVAC cooling.

Version: 2.0.0
"""

import numpy as np
import pandas as pd
import pvlib

PHYSICS_VERSION = "2.0.0"


def solar_output_kw(
    ghi,
    dni,
    dhi,
    temp_c,
    timestamp,
    lat: float = 26.2389,
    lon: float = 73.0243,
    tilt: float = 26.0,
    azimuth: float = 180.0,
    dc_capacity_kw: float = 250.0,
    ac_capacity_kw: float = 200.0,
    soiling_derate: float = 0.95,
    gamma_pmp: float = -0.0038,
    noct_c: float = 45.0,
):
    """
    Computes solar PV AC power output (kW) using pvlib.

    Parameters:
    - ghi: Global Horizontal Irradiance (W/m^2)
    - dni: Direct Normal Irradiance (W/m^2)
    - dhi: Diffuse Horizontal Irradiance (W/m^2)
    - temp_c: Ambient dry-bulb temperature (deg C)
    - timestamp: DatetimeIndex or Timestamp(s) (localized or naive assumed Asia/Kolkata)
    - lat, lon: Campus coordinates (default: Jodhpur, Rajasthan)
    - tilt: Panel tilt angle (deg, default: 26.0 south-facing latitude tilt)
    - azimuth: Panel azimuth (deg, default: 180.0 south)
    - dc_capacity_kw: Nameplate DC capacity (default: 250.0 kW)
    - ac_capacity_kw: Inverter maximum continuous AC rating (default: 200.0 kW)
    - soiling_derate: Combined soiling/cabling/mismatch factor (default: 0.95)
    - gamma_pmp: Temperature coefficient of power (%/deg C, default: -0.38%/deg C)
    - noct_c: Nominal Operating Cell Temperature (deg C, default: 45.0)

    Returns:
    - AC power generation in kW (float or numpy array/pd.Series)
    """
    is_scalar = isinstance(timestamp, (str, pd.Timestamp)) or not hasattr(timestamp, "__len__")

    if is_scalar:
        times = pd.DatetimeIndex([pd.to_datetime(timestamp)])
        ghi_arr = np.array([ghi], dtype=float)
        dni_arr = np.array([dni], dtype=float)
        dhi_arr = np.array([dhi], dtype=float)
        temp_arr = np.array([temp_c], dtype=float)
    else:
        times = pd.DatetimeIndex(pd.to_datetime(timestamp))
        ghi_arr = np.asarray(ghi, dtype=float)
        dni_arr = np.asarray(dni, dtype=float)
        dhi_arr = np.asarray(dhi, dtype=float)
        temp_arr = np.asarray(temp_c, dtype=float)

    if times.tz is None:
        times = times.tz_localize("Asia/Kolkata")
    else:
        times = times.tz_convert("Asia/Kolkata")

    # 1. Solar Position
    solpos = pvlib.solarposition.get_solarposition(times, lat, lon)
    zenith = solpos["apparent_zenith"].values
    solar_azimuth = solpos["azimuth"].values

    # 2. Plane of Array (POA) Irradiance
    poa = pvlib.irradiance.get_total_irradiance(
        surface_tilt=tilt,
        surface_azimuth=azimuth,
        solar_zenith=zenith,
        solar_azimuth=solar_azimuth,
        dni=np.maximum(0.0, dni_arr),
        ghi=np.maximum(0.0, ghi_arr),
        dhi=np.maximum(0.0, dhi_arr),
    )
    poa_val = poa["poa_global"]
    poa_global = np.maximum(0.0, poa_val.values if hasattr(poa_val, "values") else np.asarray(poa_val))

    # 3. Cell Temperature (Standard NOCT model)
    t_cell = temp_arr + poa_global * ((noct_c - 20.0) / 800.0)

    # 4. DC Power via PVWatts
    pdc = pvlib.pvsystem.pvwatts_dc(
        effective_irradiance=poa_global,
        temp_cell=t_cell,
        pdc0=dc_capacity_kw,
        gamma_pdc=gamma_pmp,
        temp_ref=25.0,
    )
    pdc = np.maximum(0.0, pdc) * soiling_derate

    # 5. Inverter clipping (flat 97% nominal efficiency up to ac_capacity_kw)
    pac = np.minimum(ac_capacity_kw, pdc * 0.97)

    # Hard night mask: If apparent zenith >= 90 or GHI <= 0, generation is strictly 0.0
    is_night = (zenith >= 90.0) | (ghi_arr <= 0.0)
    pac = np.where(is_night, 0.0, np.maximum(0.0, pac))
    pac = np.round(pac, 2)

    if is_scalar:
        return float(pac[0])
    if isinstance(ghi, pd.Series):
        return pd.Series(pac, index=ghi.index)
    return pac


def wind_output_kw(
    wind_speed_10m,
    wind_speed_100m,
    surface_pressure_hpa,
    temp_c,
    hub_height_m: float = 37.0,
    rated_kw: float = 50.0,
    cut_in: float = 3.0,
    rated_speed: float = 11.5,
    cut_out: float = 25.0,
):
    """
    Computes wind turbine electrical power output (kW).

    Parameters:
    - wind_speed_10m: Wind speed at 10m height (m/s)
    - wind_speed_100m: Wind speed at 100m height (m/s)
    - surface_pressure_hpa: Atmospheric surface pressure (hPa)
    - temp_c: Ambient temperature (deg C)
    - hub_height_m: Turbine tower hub height (m, default: 37.0m)
    - rated_kw: Nameplate rated generator capacity (default: 50.0 kW)
    - cut_in: Cut-in wind speed threshold (m/s, default: 3.0 m/s)
    - rated_speed: Wind speed at which rated power is reached (m/s, default: 11.5 m/s)
    - cut_out: Storm furling / cut-out speed (m/s, default: 25.0 m/s)

    Returns:
    - Wind power generation in kW (float or numpy array/pd.Series)
    """
    is_scalar = not hasattr(wind_speed_10m, "__len__") or isinstance(wind_speed_10m, (int, float))

    v10 = np.asarray([wind_speed_10m] if is_scalar else wind_speed_10m, dtype=float)
    v100 = np.asarray([wind_speed_100m] if is_scalar else wind_speed_100m, dtype=float)
    p_hpa = np.asarray([surface_pressure_hpa] if is_scalar else surface_pressure_hpa, dtype=float)
    temp = np.asarray([temp_c] if is_scalar else temp_c, dtype=float)

    # 1. Real Wind Shear Exponent from dual-height measurements
    valid_shear = (v10 > 0.5) & (v100 > 0.5)
    ratio = np.where(valid_shear, v100 / np.maximum(v10, 0.05), 1.0)
    alpha = np.where(valid_shear, np.log(np.maximum(ratio, 1e-4)) / np.log(100.0 / 10.0), 0.16)
    alpha = np.clip(alpha, 0.05, 0.45)

    # 2. Extrapolate to Hub Height
    v_hub = v10 * ((hub_height_m / 10.0) ** alpha)

    # 3. Dynamic Air Density Correction
    rho = (p_hpa * 100.0) / (287.058 * (temp + 273.15))
    rho_ratio = np.clip(rho / 1.225, 0.70, 1.30)

    # 4. Standard 3-stage aerodynamic power curve
    cubic_fraction = (v_hub**3 - cut_in**3) / (rated_speed**3 - cut_in**3)
    p_cubic = np.clip(rated_kw * rho_ratio * cubic_fraction, 0.0, rated_kw)

    out = np.where(
        v_hub < cut_in,
        0.0,
        np.where(
            v_hub < rated_speed,
            p_cubic,
            np.where(v_hub < cut_out, rated_kw, 0.0),
        ),
    )
    out = np.round(out, 2)

    if is_scalar:
        return float(out[0])
    if isinstance(wind_speed_10m, pd.Series):
        return pd.Series(out, index=wind_speed_10m.index)
    return out


def campus_load_kw(
    timestamp,
    temp_c,
    base_load_kw: float = 70.0,
    academic_peak_kw: float = 120.0,
    hostel_peak_kw: float = 95.0,
):
    """
    Computes university campus microgrid electrical load (kW).

    Components:
    1. Baseload: Continuous 24/7 infrastructure (servers, pumps, cold storage).
    2. Academic Schedule: Mon-Fri active 08:30-17:30 with lunch dip (12:30-13:30),
       Saturday at 50% capacity, Sunday idle.
    3. Hostel Schedule: Morning surge (06:30-08:30) and evening peak (18:00-23:30).
    4. Non-linear HVAC Cooling: max(0, temp_c - 25.0)^1.35 * 4.2 kW.

    Parameters:
    - timestamp: DatetimeIndex or Timestamp(s)
    - temp_c: Ambient temperature (deg C)
    - base_load_kw: Uninterruptible base draw (default: 70.0 kW)

    Returns:
    - Campus electrical load in kW (float or numpy array/pd.Series)
    """
    is_scalar = isinstance(timestamp, (str, pd.Timestamp)) or not hasattr(timestamp, "__len__")

    if is_scalar:
        ts = pd.to_datetime(timestamp)
        dow = np.array([ts.dayofweek])
        hours = np.array([ts.hour + ts.minute / 60.0])
        temp_arr = np.array([temp_c], dtype=float)
    else:
        ts = pd.to_datetime(timestamp)
        if hasattr(ts, "dt"):
            dow = ts.dt.dayofweek.values
            hours = (ts.dt.hour + ts.dt.minute / 60.0).values
        else:
            ts_idx = pd.DatetimeIndex(ts)
            dow = ts_idx.dayofweek.values
            hours = (ts_idx.hour + ts_idx.minute / 60.0).values
        temp_arr = np.asarray(temp_c, dtype=float)

    # Academic Schedule
    is_weekday = (dow < 5)
    is_saturday = (dow == 5)
    is_class_hours = (hours >= 8.5) & (hours < 17.5)
    is_lunch_dip = (hours >= 12.5) & (hours < 13.5)

    acad_multiplier = np.where(is_weekday, 1.0, np.where(is_saturday, 0.5, 0.0))
    acad_draw = np.where(is_class_hours, np.where(is_lunch_dip, academic_peak_kw * 0.70, academic_peak_kw), 0.0)
    acad_load = acad_draw * acad_multiplier

    # Hostel Schedule
    is_morning_surge = (hours >= 6.5) & (hours < 8.5)
    is_evening_peak = (hours >= 18.0) & (hours < 23.5)
    hostel_load = np.where(is_morning_surge, 40.0, np.where(is_evening_peak, hostel_peak_kw, 0.0))

    # HVAC Cooling (Heuristic non-linear chiller load above 25 deg C)
    hvac_load = (np.maximum(0.0, temp_arr - 25.0) ** 1.35) * 4.2

    total_load = np.round(base_load_kw + acad_load + hostel_load + hvac_load, 2)

    if is_scalar:
        return float(total_load[0])
    if isinstance(temp_c, pd.Series):
        return pd.Series(total_load, index=temp_c.index)
    return total_load
