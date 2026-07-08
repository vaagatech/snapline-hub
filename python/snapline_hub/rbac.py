from __future__ import annotations

import json
import os
from typing import Any


def load_api_key_config(raw: str | None = None) -> dict[str, Any]:
    """Parse HUB_RBAC_API_KEYS JSON for automation RBAC."""
    value = raw if raw is not None else os.environ.get("HUB_RBAC_API_KEYS", "")
    if not value.strip():
        return {"keys": {}}
    return json.loads(value)
