# 8. NLP Classification Module

**Source:** [specification-extract.md](specification-extract.md) - text-based classification; **scikit-learn** for efficient, interpretable models.

**Team stack alignment:** scikit-learn is primary (per spec); spaCy and sentence-transformers are **optional preprocessing** layers that feed features into sklearn classifiers.

## 8.1 Objectives

| Output | Used by |
|--------|---------|
| **Category** | Reporting, optional routing rules |
| **Priority** | Routing urgency weight (FR-031, FR-041) |
| **Confidence** | UI display; low-confidence flag for manager review |

## 8.2 Pipeline overview

```mermaid
flowchart LR
  Input[title_plus_description]
  Pre[Preprocessing]
  Feat[Feature_Extraction]
  Clf[sklearn_Classifiers]
  Out[category_priority_confidence]
  Input --> Pre --> Feat --> Clf --> Out
```

## 8.3 Preprocessing

| Step | Tool | Action |
|------|------|--------|
| Clean | Python regex | Lowercase, strip HTML, normalize whitespace |
| Tokenize | spaCy `en_core_web_sm` OR sklearn | Remove stopwords, lemmatize |
| Combine | - | `text = title + " [SEP] " + description` |

## 8.4 Feature extraction (choose primary path)

### Path A - Specification-aligned baseline (recommended for thesis clarity)

**TF-IDF** vectorization (`sklearn.feature_extraction.text.TfidfVectorizer`):

- `max_features=5000`, ngram_range=(1, 2)
- Interpretable; fast on CPU; easy to explain in diploma text

### Path B - Enhanced (team stack)

1. `sentence-transformers` (`all-MiniLM-L6-v2`) → 384-d embedding
2. Optionally reduce dimension with `TruncatedSVD`
3. Feed dense vectors to sklearn classifier

**Documentation choice:** Implement Path A for minimum viable evaluation; Path B as improvement experiment in thesis.

## 8.5 Models (scikit-learn)

| Task | Model | Notes |
|------|-------|-------|
| Category (multi-class) | `LinearSVC` or `LogisticRegression` | `class_weight='balanced'` |
| Priority (ordinal mapped to 4 classes) | Separate classifier OR single multi-output | Map labels: low/medium/high/critical |

**Persistence:** `joblib.dump` to `backend/app/ml/models/category_model.joblib`, `priority_model.joblib`, `vectorizer.joblib`.

**Versioning:** `model_version` string in DB (e.g. `tfidf-lsvc-v1.0.0`).

## 8.6 Training workflow (offline)

```
backend/app/ml/
├── data/
│   ├── labeled_tasks.csv      # text, category, priority
│   └── README.md              # labeling guidelines
├── train.py
└── models/                    # gitignored artifacts
```

| Step | Detail |
|------|--------|
| Dataset | ≥ 200 labeled office-task samples (synthetic + manual labels acceptable) |
| Split | 80/10/10 train/val/test stratified by category |
| Metrics | classification_report, confusion matrix (FR-082) |
| Export | joblib + metadata JSON (labels, sklearn version, train date) |

### Labeling guidelines (default)

| Category | Examples |
|----------|----------|
| administrative | scheduling, paperwork, office supplies |
| support | helpdesk, client inquiry |
| technical | IT, software, equipment repair |
| finance | invoices, budgets |
| general | uncategorized |

## 8.7 Inference

```python
# Conceptual inference contract
def classify(text: str) -> ClassificationResult:
    start = time.perf_counter()
    features = vectorizer.transform([preprocess(text)])
    category = category_model.predict(features)[0]
    proba = max(category_model.decision_function(features)[0])  # or predict_proba
    priority = priority_model.predict(features)[0]
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return ClassificationResult(category, priority, confidence, elapsed_ms)
```

Called synchronously from `TaskIntakeService` (FR-033).

## 8.8 Fallback (degraded mode)

Rule-based keywords if model files missing:

| Keyword in text | Priority bump |
|-----------------|-----------------|
| urgent, asap, critical | high/critical |
| invoice, budget | finance category |

Log `ML_DEGRADED`; still complete intake.

## 8.9 Evaluation (FR-082)

| Metric | Target (prototype) |
|--------|-------------------|
| Macro F1 (category) | ≥ 0.70 on test set (document actual) |
| Priority accuracy | ≥ 0.65 (harder label; report honestly) |

Store results in evaluation export; include confusion matrix figure for thesis.

## 8.10 Dependencies

```
scikit-learn>=1.4
spacy>=3.7          # optional preprocess
sentence-transformers>=2.7  # optional Path B
joblib>=1.3
```

## 8.11 Assumptions

| ID | Item |
|----|------|
| A-ML-01 | English-only corpus |
| A-ML-02 | No online learning in prototype; retrain offline |
