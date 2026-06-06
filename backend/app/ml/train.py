"""Train TF-IDF + sklearn classifiers. Run: python -m app.ml.train"""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

DATA = Path(__file__).parent / "data" / "labeled_tasks.csv"
OUT = Path(__file__).parent / "models"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(DATA)
    X = df["text"].astype(str)
    y_cat = df["category"]
    y_pri = df["priority"]

    vec = TfidfVectorizer(max_features=3000, ngram_range=(1, 2))
    Xv = vec.fit_transform(X)

    X_train, X_test, yc_train, yc_test = train_test_split(Xv, y_cat, test_size=0.2, random_state=42)
    _, _, yp_train, yp_test = train_test_split(Xv, y_pri, test_size=0.2, random_state=42)

    cat_model = LogisticRegression(max_iter=1000)
    cat_model.fit(X_train, yc_train)
    pri_model = LogisticRegression(max_iter=1000)
    pri_model.fit(X_train, yp_train)

    print("Category report:")
    print(classification_report(yc_test, cat_model.predict(X_test)))
    print("Priority report:")
    print(classification_report(yp_test, pri_model.predict(X_test)))

    joblib.dump(vec, OUT / "vectorizer.joblib")
    joblib.dump(cat_model, OUT / "category_model.joblib")
    joblib.dump(pri_model, OUT / "priority_model.joblib")
    print(f"Models saved to {OUT}")


if __name__ == "__main__":
    main()
