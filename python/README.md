# snapline-hub (Python)

RBAC-aware HTTP client for the Snapline Hub API.

```bash
pip install snapline-hub
```

```python
from snapline_hub import HubClient

client = HubClient.from_env()
client.ingest_report(report, project="my-app", tags=["ci"])
```

Environment: `SNAPLINE_HUB_URL`, `SNAPLINE_HUB_API_KEY`, `HUB_USER`, `HUB_AUTOMATION`.
