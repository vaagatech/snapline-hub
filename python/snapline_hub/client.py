from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Mapping, MutableMapping, Optional


@dataclass
class HubClientConfig:
    base_url: str = "http://127.0.0.1:3847"
    api_key: Optional[str] = None
    user: Optional[str] = None
    automation: Optional[str] = None
    timeout_s: float = 30.0

    @classmethod
    def from_env(cls) -> "HubClientConfig":
        return cls(
            base_url=os.environ.get("SNAPLINE_HUB_URL", "http://127.0.0.1:3847").rstrip("/"),
            api_key=os.environ.get("SNAPLINE_HUB_API_KEY") or os.environ.get("HUB_API_KEY"),
            user=os.environ.get("HUB_USER"),
            automation=os.environ.get("HUB_AUTOMATION"),
        )


class HubClient:
    def __init__(self, config: HubClientConfig | None = None) -> None:
        self.config = config or HubClientConfig.from_env()

    @classmethod
    def from_env(cls) -> "HubClient":
        return cls(HubClientConfig.from_env())

    def _headers(self, extra: Optional[Mapping[str, str]] = None) -> MutableMapping[str, str]:
        headers: MutableMapping[str, str] = {"Content-Type": "application/json"}
        if self.config.api_key:
            headers["X-Hub-Api-Key"] = self.config.api_key
        if self.config.user:
            headers["X-Hub-User"] = self.config.user
        if self.config.automation:
            headers["X-Hub-Automation"] = self.config.automation
        if extra:
            headers.update(extra)
        return headers

    def _request(
        self,
        method: str,
        path: str,
        body: Any | None = None,
    ) -> Any:
        url = f"{self.config.base_url}{path}"
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(url, data=data, method=method, headers=self._headers())
        try:
            with urllib.request.urlopen(req, timeout=self.config.timeout_s) as resp:
                if resp.status == 204:
                    return None
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            payload = err.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Hub API {method} {path} failed ({err.code}): {payload}") from err

    def health(self) -> dict[str, Any]:
        return self._request("GET", "/api/health")

    def me(self) -> dict[str, Any]:
        return self._request("GET", "/api/auth/me")

    def ingest_report(
        self,
        report: Mapping[str, Any],
        *,
        project: str | None = None,
        label: str | None = None,
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        query: list[str] = []
        if project:
            query.append(f"project={urllib.parse.quote(project)}")
        if label:
            query.append(f"label={urllib.parse.quote(label)}")
        if tags:
            query.append(f"tags={urllib.parse.quote(','.join(tags))}")
        qs = f"?{'&'.join(query)}" if query else ""
        return self._request("POST", f"/api/reports{qs}", dict(report))
