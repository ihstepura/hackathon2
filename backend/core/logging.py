"""
FinanceIQ v6 — Structured Logging
JSON-formatted logs to stdout for observability.
"""
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","name":"%(name)s","msg":"%(message)s"}',
    stream=sys.stdout,
)

logger = logging.getLogger("financeiq")
