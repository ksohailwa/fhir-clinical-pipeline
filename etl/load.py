import logging
from collections.abc import Iterator, Sequence
from typing import Any

import requests

from config import REQUEST_TIMEOUT_SECONDS
from transform import Resource

log = logging.getLogger(__name__)

FHIR_JSON = "application/fhir+json"
MAX_ERROR_BODY_CHARS = 2000


def chunked(items: Sequence[Resource], size: int) -> Iterator[Sequence[Resource]]:
    if size < 1:
        raise ValueError("batch size must be at least 1")
    for start in range(0, len(items), size):
        yield items[start : start + size]


def to_bundle(resources: Sequence[Resource]) -> dict[str, Any]:
    return {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "resource": resource,
                "request": {
                    "method": "PUT",
                    "url": f"{resource['resourceType']}/{resource['id']}",
                },
            }
            for resource in resources
        ],
    }


def post_bundle(session: requests.Session, bundle: dict[str, Any], base_url: str) -> None:
    response = session.post(
        base_url,
        json=bundle,
        headers={"Content-Type": FHIR_JSON, "Accept": FHIR_JSON},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if not response.ok:
        log.error(
            "Bundle rejected with HTTP %s: %s",
            response.status_code,
            response.text[:MAX_ERROR_BODY_CHARS],
        )
    response.raise_for_status()


def load_resources(
    resources: Sequence[Resource],
    base_url: str,
    batch_size: int,
    session: requests.Session | None = None,
) -> int:
    session = session or requests.Session()
    bundles_sent = 0
    total = (len(resources) + batch_size - 1) // batch_size
    for batch in chunked(resources, batch_size):
        post_bundle(session, to_bundle(batch), base_url)
        bundles_sent += 1
        log.debug("Sent bundle %d/%d (%d entries)", bundles_sent, total, len(batch))
        if bundles_sent % 10 == 0 or bundles_sent == total:
            log.info("  %d/%d bundles sent", bundles_sent, total)
    return bundles_sent
