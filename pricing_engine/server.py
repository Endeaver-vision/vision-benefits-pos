"""
Lightweight HTTP server exposing the Pricing & Benefits Engine.

Endpoints:
- GET /health -> {"status": "ok"}
- POST /quote -> body is JSON request payload; response is JSON quote.

Standard library only (no external deps). Suitable for local dev/testing.
"""
from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict

from .engine import quote_order


class QuoteHandler(BaseHTTPRequestHandler):
    def _send(self, code: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 (HTTP verb name)
        if self.path.rstrip("/") == "/health":
            self._send(200, {"status": "ok"})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/quote":
            self._send(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        try:
            raw = self.rfile.read(length)
            payload = json.loads(raw or b"{}")
            result = quote_order(payload)
            self._send(200, result)
        except Exception as exc:  # broad catch for dev server
            self._send(400, {"error": str(exc)})


def run_server(host: str = "0.0.0.0", port: int = 8000) -> None:
    server = HTTPServer((host, port), QuoteHandler)
    print(f"Serving on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
