"""
Application metrics and observability tracking.
Tracks request counts, AI call latency, error rates.
Designed to be swapped for Prometheus in production.
"""
import time
from dataclasses import dataclass, field


@dataclass
class AppMetrics:
    """In-memory application metrics store."""

    start_time: float = field(default_factory=time.time)
    requests_total: int = 0
    errors_total: int = 0
    ai_calls_total: int = 0
    ai_latency_total_ms: float = 0.0

    def record_request(self) -> None:
        """Increment total request counter."""
        self.requests_total += 1

    def record_error(self) -> None:
        """Increment error counter."""
        self.errors_total += 1

    def record_ai_call(self, latency_ms: float) -> None:
        """Record an AI API call with latency."""
        self.ai_calls_total += 1
        self.ai_latency_total_ms += latency_ms

    @property
    def uptime_seconds(self) -> float:
        """Seconds since application start."""
        return time.time() - self.start_time

    @property
    def requests_per_minute(self) -> float:
        """Average requests per minute since startup."""
        minutes = self.uptime_seconds / 60
        if minutes == 0:
            return 0.0
        return round(self.requests_total / minutes, 2)

    @property
    def error_rate(self) -> float:
        """Fraction of requests that resulted in errors."""
        if self.requests_total == 0:
            return 0.0
        return round(self.errors_total / self.requests_total, 4)

    @property
    def avg_ai_latency_ms(self) -> float:
        """Average AI call latency in milliseconds."""
        if self.ai_calls_total == 0:
            return 0.0
        return round(self.ai_latency_total_ms / self.ai_calls_total, 2)


# Singleton metrics instance
metrics = AppMetrics()
