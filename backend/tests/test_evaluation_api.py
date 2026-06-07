from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_evaluation_run_requires_auth() -> None:
    res = client.post("/api/v1/evaluation/run", json={"batch_size": 50})
    assert res.status_code == 401


def test_evaluation_report_requires_auth() -> None:
    res = client.get("/api/v1/evaluation/report")
    assert res.status_code == 401


def test_analytics_pipeline_requires_auth() -> None:
    res = client.get("/api/v1/analytics/pipeline")
    assert res.status_code == 401
