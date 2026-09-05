"""
Feature Engineering Service (Shared Logic)
------------------------------------------
Computes cyclical temporal encodings, lag features, and academic microgrid schedule states.
"""

from typing import Dict, List, Union
import numpy as np
import pandas as pd


def compute_cyclical_features(df: pd.DataFrame, timestamp_col: str = "timestamp") -> pd.DataFrame:
    df = df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df[timestamp_col]):
        df[timestamp_col] = pd.to_datetime(df[timestamp_col])

    df["hour_of_day"] = df[timestamp_col].dt.hour + df[timestamp_col].dt.minute / 60.0
    df["day_of_year"] = df[timestamp_col].dt.dayofyear
    df["day_of_week"] = df[timestamp_col].dt.dayofweek

    # Cyclical day-of-year
    angle_year = 2.0 * np.pi * df["day_of_year"] / 365.25
    df["day_sin"] = np.round(np.sin(angle_year), 5)
    df["day_cos"] = np.round(np.cos(angle_year), 5)

    # Cyclical hour-of-day
    angle_hour = 2.0 * np.pi * df["hour_of_day"] / 24.0
    df["hour_sin"] = np.round(np.sin(angle_hour), 5)
    df["hour_cos"] = np.round(np.cos(angle_hour), 5)

    # Institutional campus schedule
    df["is_lab_hour"] = (
        (df["hour_of_day"] >= 9.0) & (df["hour_of_day"] <= 17.0) & (df["day_of_week"] < 5)
    ).astype(int)
    df["is_hostel_peak"] = (
        (df["hour_of_day"] >= 18.0) & (df["hour_of_day"] <= 23.5)
    ).astype(int)

    return df
