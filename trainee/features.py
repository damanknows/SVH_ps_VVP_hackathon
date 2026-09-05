"""
Shared Microgrid Feature Engineering Module
-------------------------------------------
Single source of truth for time-series and calendar feature transformations.
Provides cyclical day-of-year encoding (day_sin, day_cos) to eliminate artificial
December 31 -> January 1 boundary discontinuities, alongside academic microgrid
operational schedule indicators.
"""

import numpy as np
import pandas as pd


def engineer_features(df: pd.DataFrame, timestamp_col: str = "timestamp") -> pd.DataFrame:
    """
    Computes standard temporal, cyclical, and calendar schedule features.

    Parameters:
    - df: Input pandas DataFrame containing a timestamp column
    - timestamp_col: Name of the timestamp column (default: "timestamp")

    Returns:
    - Augmented DataFrame with:
        - hour_of_day: 0-23
        - day_of_year: 1-366
        - day_of_week: 0 (Monday) - 6 (Sunday)
        - day_sin: sin(2 * pi * day_of_year / 365.25)
        - day_cos: cos(2 * pi * day_of_year / 365.25)
        - is_lab_hour: 1 if weekday 09:00-17:00, 0 otherwise
        - is_hostel_peak: 1 if 18:00-23:00, 0 otherwise
    """
    df = df.copy()

    if not pd.api.types.is_datetime64_any_dtype(df[timestamp_col]):
        df[timestamp_col] = pd.to_datetime(df[timestamp_col])

    # Temporal components
    df["hour_of_day"] = df[timestamp_col].dt.hour
    df["day_of_year"] = df[timestamp_col].dt.dayofyear
    df["day_of_week"] = df[timestamp_col].dt.dayofweek

    # Cyclical day-of-year encoding (365.25 accounting for leap year cycle)
    angle = 2.0 * np.pi * df["day_of_year"] / 365.25
    df["day_sin"] = np.round(np.sin(angle), 5)
    df["day_cos"] = np.round(np.cos(angle), 5)

    # Campus academic & lab schedule features
    df["is_lab_hour"] = (
        (df["hour_of_day"] >= 9) & (df["hour_of_day"] <= 17) & (df["day_of_week"] < 5)
    ).astype(int)

    # Hostel morning/evening peak activity
    df["is_hostel_peak"] = (
        (df["hour_of_day"] >= 18) & (df["hour_of_day"] <= 23)
    ).astype(int)

    return df
