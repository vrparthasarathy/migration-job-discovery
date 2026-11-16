"""Refund Retry for Harborline (fictional example, not a real script)."""
import time

MAX_TRIES = 3
WAIT_SECONDS = 30


def call_gateway(refund):
    """Stands in for the payment gateway call; it fails for refunds marked "slow"."""
    return refund.get("kind") != "slow"


def retry_refund(refund):
    for attempt in range(1, MAX_TRIES + 1):
        if call_gateway(refund):
            return "refunded"
        time.sleep(WAIT_SECONDS)
    return "failed"
