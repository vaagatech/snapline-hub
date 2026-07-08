"""Snapline Hub Python client — ingest reports and RBAC-aware API calls."""

from snapline_hub.client import HubClient, HubClientConfig
from snapline_hub.rbac import load_api_key_config

__all__ = ["HubClient", "HubClientConfig", "load_api_key_config"]
__version__ = "0.2.4"
