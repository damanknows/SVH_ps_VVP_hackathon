"""
Campus Weather Fetcher
----------------------
Fetches live and current hourly weather, irradiance, and atmospheric data
from Open-Meteo for Jodhpur (Rajasthan, India).
"""

import requests
import pandas as pd

LAT_JODHPUR = 26.2389
LON_JODHPUR = 73.0243


def fetch_campus_weather(lat: float = LAT_JODHPUR, lon: float = LON_JODHPUR) -> pd.DataFrame:
    """Fetches hourly weather forecast."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"hourly=temperature_2m,cloud_cover,wind_speed_10m,wind_speed_100m,wind_gusts_10m,"
        f"shortwave_radiation_instant,direct_normal_irradiance,diffuse_radiation,surface_pressure&"
        f"timezone=Asia/Kolkata"
    )
    response = requests.get(url, timeout=20)
    if response.status_code == 200:
        data = response.json()["hourly"]
        df = pd.DataFrame(data)
        df.rename(columns={
            "time": "timestamp",
            "temperature_2m": "temp_c",
            "cloud_cover": "cloud_pct",
            "wind_speed_10m": "wind_speed",
            "wind_gusts_10m": "wind_gust"
        }, inplace=True)
        return df
    else:
        raise RuntimeError(f"Failed to fetch weather data: {response.text[:200]}")


def fetch_current_weather(lat: float = LAT_JODHPUR, lon: float = LON_JODHPUR) -> dict:
    """Fetches real-time instantaneous atmospheric conditions."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"current=temperature_2m,relative_humidity_2m,surface_pressure,cloud_cover,"
        f"wind_speed_10m,wind_speed_100m,wind_gusts_10m,"
        f"shortwave_radiation_instant,direct_normal_irradiance,diffuse_radiation&"
        f"timezone=Asia/Kolkata"
    )
    response = requests.get(url, timeout=20)
    if response.status_code == 200:
        return response.json().get("current", {})
    else:
        raise RuntimeError(f"Failed to fetch current weather: {response.text[:200]}")


if __name__ == "__main__":
    current = fetch_current_weather()
    print("Live Weather in Jodhpur:")
    for k, v in current.items():
        print(f"  {k}: {v}")