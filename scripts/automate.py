#!/usr/bin/env python3
import os
import sys
import logging
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> int:
    api_url = os.environ.get("API_URL", "")
    api_token = os.environ.get("API_TOKEN", "")
    if not api_url or not api_token:
        logger.error("API_URL e API_TOKEN são obrigatórios")
        return 1
    headers = {"Authorization": f"Bearer {api_token}"}
    r = requests.get(f"{api_url}/health", headers=headers, timeout=30)
    r.raise_for_status()
    logger.info("✅ API OK: %s", r.json())
    return 0


if __name__ == "__main__":
    sys.exit(main())
