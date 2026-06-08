import re
import time
from dataclasses import dataclass
from pathlib import Path

import joblib

from app.core.config import settings
from app.models.enums import TaskPriority

CATEGORIES = ["administrative", "support", "technical", "finance", "hr", "general"]

FINANCE_WORDS = {
    "report", "calculation", "finance", "invoice", "budget", "expense",
    "payment", "accounting",
}
HR_WORDS = {"onboarding", "hire", "training", "recruitment", "payroll"}
TECH_WORDS = {
    "website", "bug", "error", "feature", "system", "server", "database",
    "software", "network", "install", "technical", "computer",
}
SUPPORT_WORDS = {"help", "support", "customer", "inquiry", "ticket"}
ADMIN_WORDS = {"meeting", "schedule", "agenda", "minutes", "office", "admin"}

CRITICAL_SIGNALS = ("asap", "immediately", "urgent", "critical", "emergency")
HIGH_SIGNALS = ("2 hours", "today", "by end of day", "end of day")
MEDIUM_SIGNALS = ("this week",)


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

        keyword_priority = self._detect_priority_from_text(text, category)
        priority = keyword_priority or TaskPriority(priority_label)
        elapsed = int((time.perf_counter() - start) * 1000)
        return ClassificationResult(category, priority, confidence, version, elapsed)

    def _combine(self, title: str, description: str) -> str:
        return f"{title.strip()} [SEP] {description.strip()}".lower()

    def _detect_priority_from_text(self, text: str, category: str) -> TaskPriority | None:
        text_lower = text.lower()
        if any(signal in text_lower for signal in CRITICAL_SIGNALS):
            return TaskPriority.critical
        if any(signal in text_lower for signal in HIGH_SIGNALS):
            return TaskPriority.high
        if any(signal in text_lower for signal in MEDIUM_SIGNALS):
            return TaskPriority.medium
        if category == "finance" and any(signal in text_lower for signal in ("urgent", "asap", "immediately", "deadline")):
            return TaskPriority.high
        return None

    def _rule_based(self, text: str) -> tuple[str, str, float]:
        text_lower = text.lower()
        words = set(re.findall(r"[a-z0-9]+", text_lower))

        if words & FINANCE_WORDS or any(
            phrase in text_lower for phrase in ("report", "calculation", "invoice", "budget", "expense")
        ):
            category = "finance"
        elif "onboarding" in text_lower or "new employee" in text_lower or words & HR_WORDS:
            category = "hr"
        elif words & TECH_WORDS or " it " in f" {text_lower} ":
            category = "technical"
        elif words & SUPPORT_WORDS:
            category = "support"
        elif words & ADMIN_WORDS or any(phrase in text_lower for phrase in ("meeting", "schedule", "agenda", "minutes")):
            category = "administrative"
        else:
            category = "general"

        keyword_priority = self._detect_priority_from_text(text, category)
        if keyword_priority:
            priority = keyword_priority.value
        elif self._has_time_indicators(text_lower):
            priority = "medium"
        else:
            priority = "medium"
        return category, priority, 0.65

    def _has_time_indicators(self, text_lower: str) -> bool:
        return any(
            signal in text_lower
            for signal in (*CRITICAL_SIGNALS, *HIGH_SIGNALS, *MEDIUM_SIGNALS, "deadline", "soon", "priority")
        )


_classifier: ClassifierPipeline | None = None


def get_classifier() -> ClassifierPipeline:
    global _classifier
    if _classifier is None:
        _classifier = ClassifierPipeline()
    return _classifier
