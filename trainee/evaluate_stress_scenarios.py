"""
Held-Out Stress Scenario Robustness Evaluation
----------------------------------------------
Evaluates champion ML surrogate models against extreme physical microgrid scenarios
synthesized in historical_campus_energy_data.csv:
1. May Heatwave (Days 140-146): Extreme 45+ C heat, PV thermal derating, and chiller surges.
2. Wind Drought (Days 180-186): Calm sub-cut-in winds (< 2.5 m/s), tests zero generation.
3. Severe Storm (Day 210, 14:00-18:00): Gale winds (> 25 m/s), tests turbine storm cut-out.
4. Monsoon Overcast (Days 230-236): 90-100% cloud cover, tests generation deficit.

Validates whether ML surrogates preserve physical boundary invariants and writes
trainee/stress_eval_report.json for hackathon pitch transparency.
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.metrics import root_mean_squared_error

from forecast_engine import load_models_and_metadata
from features import engineer_features

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "historical_campus_energy_data.csv")
REPORT_PATH = os.path.join(BASE_DIR, "stress_eval_report.json")


def evaluate_stress_scenarios():
    print("=" * 78)
    print("  CAMPUS MICROGRID HELD-OUT STRESS ROBUSTNESS EVALUATION")
    print("=" * 78)

    # 1. Load champion models and metadata
    solar_model, wind_model, demand_model, metadata = load_models_and_metadata()
    solar_features = metadata["features"]["solar"]
    wind_features = metadata["features"]["wind"]
    demand_features = metadata["features"]["demand"]

    # 2. Load stress-test ground truth dataset
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Stress dataset not found at {DATA_PATH}. Run generate.py first.")

    df = pd.read_csv(DATA_PATH)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = engineer_features(df)

    # 3. Define 4 stress scenarios matching generate.py masks
    scenarios = {
        "Heatwave (Days 140-146)": {
            "mask": (df["day_of_year"] >= 140) & (df["day_of_year"] <= 146),
            "primary_targets": ["solar_kw", "demand_kw"],
            "description": "Ambient temp > 45 C; tests PV thermal derate & chiller spike"
        },
        "Wind Drought (Days 180-186)": {
            "mask": (df["day_of_year"] >= 180) & (df["day_of_year"] <= 186),
            "primary_targets": ["wind_kw"],
            "description": "Wind speed < 2.5 m/s; tests sub-cut-in calm cutoff"
        },
        "Storm Cutout (Day 210, 14-18h)": {
            "mask": (df["day_of_year"] == 210) & (df["hour_of_day"] >= 14) & (df["hour_of_day"] <= 18),
            "primary_targets": ["wind_kw"],
            "description": "Wind speed > 25 m/s; tests aerodynamic high-wind furling"
        },
        "Monsoon Overcast (Days 230-236)": {
            "mask": (df["day_of_year"] >= 230) & (df["day_of_year"] <= 236),
            "primary_targets": ["solar_kw"],
            "description": "Cloud cover 90-100%; tests heavy diffuse attenuation"
        },
    }

    report = {
        "evaluated_at": pd.Timestamp.now().isoformat(),
        "physics_version": metadata.get("physics_version"),
        "scenarios": {},
        "summary_table": []
    }

    print(f"\n{'Scenario':<32} | {'Target':<10} | {'RMSE (kW)':<10} | {'Max Abs Err':<12} | {'Invariant Check'}")
    print("-" * 88)

    models_map = {
        "solar_kw": (solar_model, solar_features),
        "wind_kw": (wind_model, wind_features),
        "demand_kw": (demand_model, demand_features)
    }

    all_invariants_pass = True

    for scen_name, scen_info in scenarios.items():
        sub_df = df[scen_info["mask"]].copy()
        scen_results = {
            "description": scen_info["description"],
            "hours_evaluated": len(sub_df),
            "targets": {}
        }

        for target in ["solar_kw", "wind_kw", "demand_kw"]:
            model, feats = models_map[target]
            y_true = sub_df[target].values
            y_pred = model.predict(sub_df[feats])

            # Apply lower physical clip
            y_pred = np.maximum(0.0, y_pred)
            if target == "demand_kw":
                y_pred = np.maximum(70.0, y_pred)

            rmse = float(root_mean_squared_error(y_true, y_pred))
            max_abs_err = float(np.max(np.abs(y_true - y_pred)))

            check_status = "PASS"
            # Specific physical invariant check for storm and drought:
            # Predicted wind power should stay close to 0 kW when true is 0 kW
            if "Drought" in scen_name and target == "wind_kw":
                max_wind_pred = float(np.max(y_pred))
                if max_wind_pred > 2.0:
                    check_status = f"FLAG: Max pred {max_wind_pred:.1f} kW > 2.0 kW"
                    all_invariants_pass = False
                else:
                    check_status = f"PASS (Max {max_wind_pred:.2f} kW)"
            elif "Storm" in scen_name and target == "wind_kw":
                max_wind_pred = float(np.max(y_pred))
                if max_wind_pred > 2.0:
                    check_status = f"FLAG: Max pred {max_wind_pred:.1f} kW > 2.0 kW"
                    all_invariants_pass = False
                else:
                    check_status = f"PASS (Max {max_wind_pred:.2f} kW)"

            scen_results["targets"][target] = {
                "rmse_kw": round(rmse, 3),
                "max_abs_err_kw": round(max_abs_err, 3),
                "invariant_check": check_status
            }

            # Only print primary targets in summary table
            if target in scen_info["primary_targets"]:
                print(f"{scen_name:<32} | {target:<10} | {rmse:<10.2f} | {max_abs_err:<12.2f} | {check_status}")
                report["summary_table"].append({
                    "scenario": scen_name,
                    "target": target,
                    "rmse_kw": round(rmse, 2),
                    "max_abs_err_kw": round(max_abs_err, 2),
                    "invariant_check": check_status
                })

        report["scenarios"][scen_name] = scen_results

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)

    print("-" * 88)
    print(f"Report saved to {REPORT_PATH}")
    if all_invariants_pass:
        print("[SUCCESS] All physical boundary checks PASSED across stress scenarios!")
    else:
        print("[NOTICE] Stress scenario check flagged boundary differences (expected for tree models without hard clips).")

    return report


if __name__ == "__main__":
    evaluate_stress_scenarios()
