"""
ETL + ML pipeline for Yazaki import tracking data.

Outputs:
1) suivi_import_yazaki_cleaned_ml.xlsx
2) ml_dataset_montant_euro.xlsx
3) best_import_cost_model.pkl
4) suivi_import_yazaki_with_anomalies.xlsx
5) suivi_import_yazaki_out_of_scope.xlsx
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


TARGET_COLUMN = "MONTANT_EN_EURO"#variable cible pour le ML(objectif )
DATE_COLUMNS = ["PICK_UP_DATE", "DATE_RECEPTION"]
NUMERIC_COLUMNS = ["NBR_COLIS", TARGET_COLUMN]
DEFAULT_INPUT_FILE = r"C:\Users\medra\Downloads\SUIVI IMPORT YAZAKI  2025+2026.xlsx"
SCOPE_START_YEAR = 2025
SCOPE_END_YEAR = 2026

#extracte des donneés puis il retourné sous forme de dataframe
def extract_excel(file_path: str | Path) -> pd.DataFrame:
    """Read Excel file into a DataFrame."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Fichier introuvable: {path}")
    return pd.read_excel(path, engine="openpyxl")

#sauvergarder le DATAF dans f xls
def write_excel_with_fallback(df: pd.DataFrame, output_path: str | Path) -> Path:
    """
    Write Excel file.
    If target file is locked (opened in Excel), save a timestamped fallback file.
    """
    path = Path(output_path)
    try:
        df.to_excel(path, index=False)
        return path
    except PermissionError:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        fallback = path.with_name(f"{path.stem}_{timestamp}{path.suffix}")
        df.to_excel(fallback, index=False)
        print(f"[WARN] Fichier verrouille: {path.name}. Sauvegarde alternative: {fallback.name}")
        return fallback


def _normalize_header(value: object) -> str:
    text = str(value or "").strip()
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.upper()
    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^A-Z0-9_]", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text


def clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names: uppercase + underscores + clean special chars."""
    cleaned = df.copy()
    cleaned.columns = [_normalize_header(col) for col in cleaned.columns]
    return cleaned


def drop_useless_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Drop unnamed columns and fully empty columns."""
    cleaned = df.copy()
    columns_to_drop: list[str] = []

    for col in cleaned.columns:
        if not col or col.startswith("UNNAMED"):
            columns_to_drop.append(col)
            continue

        series = cleaned[col]
        if series.isna().all():
            columns_to_drop.append(col)
            continue

        as_text = series.fillna("").astype(str).str.strip()
        if as_text.eq("").all():
            columns_to_drop.append(col)

    if columns_to_drop:
        cleaned = cleaned.drop(columns=columns_to_drop, errors="ignore")
    return cleaned


def clean_text_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Clean text columns: strip + uppercase + UNKNOWN."""
    cleaned = df.copy()
    excluded = set(DATE_COLUMNS + NUMERIC_COLUMNS)

    text_cols = cleaned.select_dtypes(include=["object", "string"]).columns
    for col in text_cols:
        if col in excluded:
            continue
        series = cleaned[col].astype("string").str.strip().str.upper()
        series = series.replace({"": pd.NA, "NAN": pd.NA, "NONE": pd.NA, "<NA>": pd.NA})
        cleaned[col] = series.fillna("UNKNOWN")

    return cleaned


def convert_dates(df: pd.DataFrame) -> pd.DataFrame:
    """Convert known date columns to datetime."""
    converted = df.copy()
    for col in DATE_COLUMNS:
        if col in converted.columns:
            converted[col] = pd.to_datetime(converted[col], errors="coerce", dayfirst=True)
    return converted


def convert_numeric_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Convert known numeric columns to numeric type."""
    converted = df.copy()
    for col in NUMERIC_COLUMNS:
        if col in converted.columns:
            converted[col] = pd.to_numeric(converted[col], errors="coerce")
    return converted


def _fill_numeric_with_median(series: pd.Series) -> pd.Series:
    median_value = series.median(skipna=True)
    if pd.isna(median_value):
        median_value = 0
    return series.fillna(median_value)


def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Missing values policy:
    - text: UNKNOWN
    - numeric: median
    - dates: keep NaT
    """
    cleaned = df.copy()

    # Fill numeric columns
    numeric_cols = cleaned.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        cleaned[col] = _fill_numeric_with_median(cleaned[col])

    # Fill text columns (date columns are datetime and not touched here)
    text_cols = cleaned.select_dtypes(include=["object", "string"]).columns
    for col in text_cols:
        series = cleaned[col].astype("string").str.strip().str.upper()
        series = series.replace({"": pd.NA, "NAN": pd.NA, "NONE": pd.NA, "<NA>": pd.NA})
        cleaned[col] = series.fillna("UNKNOWN")

    return cleaned


def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """Drop exact duplicate rows."""
    return df.drop_duplicates().copy()


def create_ml_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create temporal and delay features for ML."""
    featured = df.copy()

    if "DATE_RECEPTION" in featured.columns:
        dt = featured["DATE_RECEPTION"]
        featured["RECEPTION_YEAR"] = dt.dt.year
        featured["RECEPTION_MONTH"] = dt.dt.month
        featured["RECEPTION_WEEK"] = dt.dt.isocalendar().week.astype("Int64")
        featured["RECEPTION_DAY"] = dt.dt.day
        featured["RECEPTION_WEEKDAY"] = dt.dt.weekday

    if "PICK_UP_DATE" in featured.columns and "DATE_RECEPTION" in featured.columns:
        featured["IMPORT_DELAY_DAYS"] = (
            featured["DATE_RECEPTION"] - featured["PICK_UP_DATE"]
        ).dt.days

    return featured


def add_date_scope_flag(
    df: pd.DataFrame,
    start_year: int = SCOPE_START_YEAR,
    end_year: int = SCOPE_END_YEAR,
) -> pd.DataFrame:
    """
    Flag reception date scope for governance:
    - IN_SCOPE: year between start_year and end_year (inclusive)
    - OUT_OF_SCOPE: valid date but out of range
    - UNKNOWN: missing/invalid date
    """
    scoped = df.copy()

    if "DATE_RECEPTION" not in scoped.columns:
        scoped["DATE_SCOPE"] = "UNKNOWN"
        return scoped

    years = pd.to_datetime(scoped["DATE_RECEPTION"], errors="coerce").dt.year
    in_scope = years.between(start_year, end_year, inclusive="both")

    scoped["DATE_SCOPE"] = np.where(
        years.isna(),
        "UNKNOWN",
        np.where(in_scope, "IN_SCOPE", "OUT_OF_SCOPE"),
    )
    return scoped


def prepare_ml_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Build the ML dataset using available required features and target."""
    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Colonne cible manquante: {TARGET_COLUMN}")

    feature_candidates = [
        "TRANSPORTEUR",
        "FOURNISSEUR",
        "TYPE_TRANSPORT",
        "DESIGNATION",
        "NBR_COLIS",
        "RECEPTION_YEAR",      # Capture annual cost inflation trends
        "RECEPTION_MONTH",
        "RECEPTION_WEEK",
        "RECEPTION_WEEKDAY",
        "IMPORT_DELAY_DAYS",
    ]

    available_features = [col for col in feature_candidates if col in df.columns]
    if not available_features:
        raise ValueError("Aucune feature exploitable trouvee pour le ML.")

    scoped_df = df.copy()
    if "DATE_SCOPE" in scoped_df.columns:
        scoped_df = scoped_df[scoped_df["DATE_SCOPE"] == "IN_SCOPE"].copy()

    ml_df = scoped_df[available_features + [TARGET_COLUMN]].copy()
    ml_df[TARGET_COLUMN] = pd.to_numeric(ml_df[TARGET_COLUMN], errors="coerce")
    ml_df = ml_df.dropna(subset=[TARGET_COLUMN])

    if ml_df.empty:
        raise ValueError("Aucune ligne exploitable: target vide ou invalide.")

    categorical_cols = ml_df.select_dtypes(include=["object", "string", "category"]).columns
    categorical_cols = [col for col in categorical_cols if col != TARGET_COLUMN]
    for col in categorical_cols:
        series = ml_df[col].astype("string").str.strip().str.upper()
        series = series.replace({"": pd.NA, "NAN": pd.NA, "NONE": pd.NA, "<NA>": pd.NA})
        ml_df[col] = series.fillna("UNKNOWN")

    numeric_feature_cols = [
        col for col in available_features if col not in categorical_cols
    ]
    for col in numeric_feature_cols:
        ml_df[col] = pd.to_numeric(ml_df[col], errors="coerce")
        ml_df[col] = _fill_numeric_with_median(ml_df[col])

    return ml_df

#creations des models
def train_regression_models(
    ml_df: pd.DataFrame,
    model_output_path: str | Path = "best_import_cost_model.pkl",
    results_output_path: str | Path | None = None,
    predictions_output_path: str | Path | None = None,
) -> dict[str, object]:
    """Train and compare 3 regression models, then save best by RMSE."""
    if TARGET_COLUMN not in ml_df.columns:
        raise ValueError(f"Colonne cible manquante: {TARGET_COLUMN}")
    if len(ml_df) < 5:
        raise ValueError("Pas assez de lignes pour entrainer les modeles (minimum 5).")
#separation des features et de la target x est variables explicatives et y la variable a predire
    X = ml_df.drop(columns=[TARGET_COLUMN])
    y = ml_df[TARGET_COLUMN]

    categorical_cols = list(X.select_dtypes(include=["object", "string", "category"]).columns)
    numeric_cols = [col for col in X.columns if col not in categorical_cols]

    transformers = []
    if categorical_cols:
        transformers.append(
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols)
        )
    if numeric_cols:
        transformers.append(("num", "passthrough", numeric_cols))
    if not transformers:
        raise ValueError("Aucune colonne exploitable pour le training.")

    preprocessor = ColumnTransformer(transformers=transformers)
# separation des données en train et test pour évaluer
#  les modèles sur des données non vues pendant l'entraînement, avec 20% des données pour le test et une graine aléatoire fixe pour la reproductibilité
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
#creations des models
    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=300, random_state=42, n_jobs=1
        ),
        "Gradient Boosting Regressor": GradientBoostingRegressor(
            n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42
        ),
    }

    results: list[dict[str, float | str]] = []
    fitted_pipelines: dict[str, Pipeline] = {}
#entr et evalution pour chaque model et calcul les metrique
    for model_name, estimator in models.items():
        pipeline = Pipeline(
            steps=[("preprocessor", preprocessor), ("model", estimator)]
        )
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        r2 = r2_score(y_test, y_pred)

        #comparaison des models
        try:
            cv_r2_scores = cross_val_score(
                pipeline, X, y, cv=5, scoring="r2", n_jobs=-1
            )
        except Exception:
            
            cv_r2_scores = cross_val_score(
                pipeline, X, y, cv=5, scoring="r2", n_jobs=1
            )
        cv_r2_mean = float(cv_r2_scores.mean())
        cv_r2_std = float(cv_r2_scores.std())
#sauvergarder les rst pour chaque model
        results.append(
            {
                "MODEL": model_name,
                "MAE": round(float(mae), 4),
                "RMSE": round(rmse, 4),
                "R2": round(float(r2), 4),
                "CV_R2_MEAN": round(cv_r2_mean, 4),
                "CV_R2_STD": round(cv_r2_std, 4),
            }
        )
        fitted_pipelines[model_name] = pipeline

    results_df = pd.DataFrame(results).sort_values(by="RMSE", ascending=True).reset_index(
        drop=True #meilleur model selon RMSE
    )
    best_model_name = str(results_df.iloc[0]["MODEL"])#ihot ahsn model selon rmse f tableau

    #i3wd entrainii ahsn model sur tout datasetmodel 
    best_pipeline = fitted_pipelines[best_model_name]
    best_pipeline.fit(X, y)

    model_payload = {
        "model_name": best_model_name,
        "pipeline": best_pipeline,
        "feature_columns": list(X.columns),
        "target_column": TARGET_COLUMN,
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    #sauvergarder le meilleur modéle
    joblib.dump(model_payload, Path(model_output_path))

    predictions = best_pipeline.predict(X)
    predictions_df = X.copy()
    predictions_df[TARGET_COLUMN] = y.values
    predictions_df["PREDICTED_MONTANT_EN_EURO"] = np.round(predictions, 4)
    predictions_df["ABS_ERROR"] = np.round(
        np.abs(predictions_df[TARGET_COLUMN] - predictions_df["PREDICTED_MONTANT_EN_EURO"]),
        4,
    )
    predictions_df["ERROR_PCT"] = np.round(
        np.where(
            predictions_df[TARGET_COLUMN] != 0,
            (predictions_df["ABS_ERROR"] / np.abs(predictions_df[TARGET_COLUMN])) * 100,
            0,
        ),
        4,
    )

    best_row = results_df.loc[results_df["MODEL"] == best_model_name].iloc[0].to_dict()
    summary_payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "best_model": best_model_name,
        "rows_used_for_training": int(len(ml_df)),
        "metrics": results_df.to_dict(orient="records"),
        "best_model_metrics": {
            "MAE": float(best_row["MAE"]),
            "RMSE": float(best_row["RMSE"]),
            "R2": float(best_row["R2"]),
        },
    }

    if results_output_path:
        Path(results_output_path).write_text(
            json.dumps(summary_payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    if predictions_output_path:
        saved_predictions_path = write_excel_with_fallback(
            predictions_df, Path(predictions_output_path)
        )
        summary_payload["predictions_file"] = str(saved_predictions_path)

    print("\nResultats modeles (MAE / RMSE / R2):")
    print(results_df.to_string(index=False))
    print(f"\nMeilleur modele (RMSE min): {best_model_name}")

    return {
        "results_df": results_df,
        "best_model_name": best_model_name,
        "predictions_df": predictions_df,
        "summary_payload": summary_payload,
    }


def detect_cost_anomalies(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detect abnormal import cost rows using IsolationForest.
    Uses available subset of:
    - MONTANT_EN_EURO
    - NBR_COLIS
    - IMPORT_DELAY_DAYS
    """
    detected = df.copy()
    required_candidates = [TARGET_COLUMN, "NBR_COLIS", "IMPORT_DELAY_DAYS"]
    available = [col for col in required_candidates if col in detected.columns]

    if TARGET_COLUMN not in available:
        detected["COST_ANOMALY"] = "NORMAL"
        print("Detection anomalies ignoree: MONTANT_EN_EURO manquant.")
        return detected

    features = pd.DataFrame(index=detected.index)
    for col in available:
        features[col] = pd.to_numeric(detected[col], errors="coerce")
        features[col] = _fill_numeric_with_median(features[col])

    if len(features) < 5:
        detected["COST_ANOMALY"] = "NORMAL"
        print("Detection anomalies ignoree: dataset trop petit (< 5 lignes).")
        return detected

    iso = IsolationForest(contamination="auto", random_state=42)  # auto-estimates anomaly rate
    labels = iso.fit_predict(features)
    detected["COST_ANOMALY"] = np.where(labels == -1, "ANOMALY", "NORMAL")

    anomaly_count = int((detected["COST_ANOMALY"] == "ANOMALY").sum())
    print(f"Nombre d'anomalies detectees: {anomaly_count}")

    return detected
##la fonction mt3 ETL ml transform

def run_etl_pipeline(input_file: str | Path, cleaned_output_file: str | Path) -> pd.DataFrame:
    """Run complete ETL preprocessing pipeline and save cleaned file."""
    raw_df = extract_excel(input_file)#exttraction des doneés xls puis metter en dataframe
    before_rows = len(raw_df)

    df = clean_column_names(raw_df)##metter les noms de colonnes en MJ
    df = drop_useless_columns(df)#ifs5 colonnes vides
    df = clean_text_columns(df)
    df = convert_dates(df)
    df = convert_numeric_columns(df)
    df = handle_missing_values(df)
    df = remove_duplicates(df)#suppression des doublons
    df = create_ml_features(df)#creations des feautures
    df = add_date_scope_flag(df)

    after_rows = len(df)
    missing_values = int(df.isna().sum().sum())
#load
    output_path = write_excel_with_fallback(df, Path(cleaned_output_file))

    print("\n--- ETL SUMMARY ---")
    print(f"Lignes avant nettoyage: {before_rows}")
    print(f"Lignes apres nettoyage: {after_rows}")
    print(f"Valeurs manquantes restantes (NaN/NaT): {missing_values}")
    if "DATE_SCOPE" in df.columns:
        scope_counts = df["DATE_SCOPE"].value_counts(dropna=False).to_dict()
        print(f"Repartition DATE_SCOPE: {scope_counts}")
    print(f"Colonnes finales ({len(df.columns)}):")
    print(", ".join(df.columns))
    print(f"Fichier nettoye sauvegarde: {output_path}")

    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="ETL + ML pipeline for Yazaki import data")
    parser.add_argument(
        "--input-file",
        default=DEFAULT_INPUT_FILE,
        help="Chemin du fichier Excel source",
    )
    parser.add_argument(
        "--output-dir",
        default=".",
        help="Dossier de sortie pour les fichiers generes",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    cleaned_output = output_dir / "suivi_import_yazaki_cleaned_ml.xlsx"
    ml_dataset_output = output_dir / "ml_dataset_montant_euro.xlsx"
    model_output = output_dir / "best_import_cost_model.pkl"
    model_results_output = output_dir / "ml_model_results.json"
    predictions_output = output_dir / "ml_predictions_montant_euro.xlsx"
    anomalies_output = output_dir / "suivi_import_yazaki_with_anomalies.xlsx"
    out_of_scope_output = output_dir / "suivi_import_yazaki_out_of_scope.xlsx"

    cleaned_df = run_etl_pipeline(args.input_file, cleaned_output)

    ml_df = prepare_ml_dataset(cleaned_df)
    saved_ml_dataset = write_excel_with_fallback(ml_df, ml_dataset_output)
    print(f"Dataset ML sauvegarde: {saved_ml_dataset}")
    print(f"Lignes retenues pour ML (IN_SCOPE): {len(ml_df)}")

    train_regression_models(
        ml_df,
        model_output_path=model_output,
        results_output_path=model_results_output,
        predictions_output_path=predictions_output,
    )
    print(f"Modele sauvegarde: {model_output}")
    print(f"Resultats ML sauvegardes: {model_results_output}")
    print(f"Predictions ML sauvegardees: {predictions_output}")

    anomalies_df = detect_cost_anomalies(cleaned_df)
    saved_anomalies_output = write_excel_with_fallback(anomalies_df, anomalies_output)
    print(f"Fichier avec anomalies sauvegarde: {saved_anomalies_output}")

    if "DATE_SCOPE" in cleaned_df.columns:
        out_of_scope_df = cleaned_df[cleaned_df["DATE_SCOPE"] == "OUT_OF_SCOPE"].copy()
        saved_out_scope = write_excel_with_fallback(out_of_scope_df, out_of_scope_output)
        print(f"Fichier quarantaine hors plage sauvegarde: {saved_out_scope}")
        print(f"Lignes hors plage (quarantaine): {len(out_of_scope_df)}")

    print("\nPipeline termine avec succes.")


if __name__ == "__main__":
    main()
