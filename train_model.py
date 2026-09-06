"""
Legacy Training Entrypoint
--------------------------
Redirects to the unified benchmarking pipeline in train_real_models.py.
Trains and evaluates both Random Forest and XGBoost against real historical
meteorological data for Jodhpur and naive baselines.
"""

from train_real_models import train_and_evaluate

if __name__ == "__main__":
    train_and_evaluate()