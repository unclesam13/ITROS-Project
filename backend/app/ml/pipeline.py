import re
import time
from dataclasses import dataclass
from pathlib import Path

import joblib

from app.core.config import settings
from app.models.enums import TaskPriority

CATEGORIES = ["administrative", "support", "technical", "finance", "general"]

URGENT_WORDS = {"urgent", "asap", "critical", "immediately", "emergency"}
HIGH_WORDS = {"important", "priority", "deadline", "soon"}
FINANCE_WORDS = {"invoice", "budget", "payment", "finance", "accounting"}
TECH_WORDS = {"software", "server", "network", "install", "technical", "it", "computer"}
SUPPORT_WORDS = {"help", "support", "customer", "inquiry", "ticket"}


@dataclass
class ClassificationResult:
    category: str
    predicted_priority: TaskPriority
    confidence: float
    model_version: str
    processing_time_ms: int


class ClassifierPipeline:
    def __init__(self) -> None:
        self.model_path = Path(settings.ml_model_path)
        self.vectorizer = None
        self.category_model = None
        self.priority_model = None
        self._load_models()

    def _load_models(self) -> None:
        vec_path = self.model_path / "vectorizer.joblib"
        cat_path = self.model_path / "category_model.joblib"
        pri_path = self.model_path / "priority_model.joblib"
        if vec_path.exists() and cat_path.exists() and pri_path.exists():
            self.vectorizer = joblib.load(vec_path)
            self.category_model = joblib.load(cat_path)
            self.priority_model = joblib.load(pri_path)

    def classify(self, title: str, description: str) -> ClassificationResult:
        start = time.perf_counter()
        text = self._combine(title, description)
        if self.vectorizer and self.category_model and self.priority_model:
            features = self.vectorizer.transform([text])
            category = str(self.category_model.predict(features)[0])
            priority_label = str(self.priority_model.predict(features)[0])
            confidence = 0.85
            version = "tfidf-sklearn-v1"
        else:
            category, priority_label, confidence = self._rule_based(text)
            version = "rules-fallback-v1"
        priority = TaskPriority(priority_label)
        elapsed = int((time.perf_counter() - start) * 1000)
        return ClassificationResult(category, priority, confidence, version, elapsed)

    def _combine(self, title: str, description: str) -> str:
        return f"{title.strip()} [SEP] {description.strip()}".lower()

    def _rule_based(self, text: str) -> tuple[str, str, float]:
        words = set(re.findall(r"[a-z]+", text))
        if words & FINANCE_WORDS:
            category = "finance"
        elif words & TECH_WORDS:
            category = "technical"
        elif words & SUPPORT_WORDS:
            category = "support"
        elif "admin" in text or "office" in text or "schedule" in text:
            category = "administrative"
        else:
            category = "general"

        if words & URGENT_WORDS:
            priority = "critical"
        elif words & HIGH_WORDS:
            priority = "high"
        elif category == "finance":
            priority = "medium"
        else:
            priority = "medium"
        return category, priority, 0.65


_classifier: ClassifierPipeline | None = None


def get_classifier() -> ClassifierPipeline:
    global _classifier
    if _classifier is None:
        _classifier = ClassifierPipeline()
    return _classifier
