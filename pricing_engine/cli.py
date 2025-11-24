"""
Command-line wrapper for the Pricing & Benefits Engine.

Usage examples:
  python -m pricing_engine.cli --request-file my_request.json
  python -m pricing_engine.cli --request-json '{"customer": {...}, "plan": {...}, "cart": [...]}'
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict

from .engine import quote_order


def load_request(args: argparse.Namespace) -> Dict[str, Any]:
    if args.request_file:
        return json.loads(Path(args.request_file).read_text())
    if args.request_json:
        return json.loads(args.request_json)
    raise SystemExit("Provide --request-file or --request-json")


def main() -> None:
    parser = argparse.ArgumentParser(description="Pricing & Benefits Engine CLI")
    parser.add_argument("--request-file", help="Path to a JSON file containing the request payload.")
    parser.add_argument("--request-json", help="Inline JSON string for the request payload.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print the response.")
    args = parser.parse_args()

    try:
        request = load_request(args)
        result = quote_order(request)
        if args.pretty:
            print(json.dumps(result, indent=2))
        else:
            print(json.dumps(result))
    except Exception as exc:  # broad catch to make CLI user-friendly
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
