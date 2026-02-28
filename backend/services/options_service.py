"""
FinanceIQ v6 — Options Analytics Service
Ported from legacy options_engine.py. Black-Scholes, Greeks, IV, payoff diagrams.
"""
import math
from datetime import datetime


def _norm_cdf(x: float) -> float:
    """Standard normal CDF using math.erfc."""
    return 0.5 * math.erfc(-x / math.sqrt(2))


def _norm_pdf(x: float) -> float:
    """Standard normal PDF."""
    return math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)


def d1(S, K, T, r, sigma):
    if T <= 0 or sigma <= 0:
        return 0.0
    return (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))


def d2(S, K, T, r, sigma):
    return d1(S, K, T, r, sigma) - sigma * math.sqrt(T) if T > 0 and sigma > 0 else 0.0


def bs_call(S, K, T, r, sigma):
    if T <= 0: return max(S - K, 0)
    _d1, _d2 = d1(S, K, T, r, sigma), d2(S, K, T, r, sigma)
    return S * _norm_cdf(_d1) - K * math.exp(-r * T) * _norm_cdf(_d2)


def bs_put(S, K, T, r, sigma):
    if T <= 0: return max(K - S, 0)
    _d1, _d2 = d1(S, K, T, r, sigma), d2(S, K, T, r, sigma)
    return K * math.exp(-r * T) * _norm_cdf(-_d2) - S * _norm_cdf(-_d1)


def greeks(S, K, T, r, sigma, opt_type="call") -> dict:
    """Calculate all Greeks for an option."""
    if T <= 0 or sigma <= 0:
        intrinsic = max(S - K, 0) if opt_type == "call" else max(K - S, 0)
        return {"delta": 0, "gamma": 0, "theta": 0, "vega": 0, "rho": 0, "price": intrinsic}

    _d1, _d2 = d1(S, K, T, r, sigma), d2(S, K, T, r, sigma)
    sqrt_T = math.sqrt(T)

    delta = _norm_cdf(_d1) if opt_type == "call" else _norm_cdf(_d1) - 1
    gamma = _norm_pdf(_d1) / (S * sigma * sqrt_T)

    theta_common = -(S * _norm_pdf(_d1) * sigma) / (2 * sqrt_T)
    if opt_type == "call":
        theta = (theta_common - r * K * math.exp(-r * T) * _norm_cdf(_d2)) / 365
    else:
        theta = (theta_common + r * K * math.exp(-r * T) * _norm_cdf(-_d2)) / 365

    vega = S * sqrt_T * _norm_pdf(_d1) / 100
    rho_val = (K * T * math.exp(-r * T) * _norm_cdf(_d2 if opt_type == "call" else -_d2)) / 100
    if opt_type == "put": rho_val = -rho_val

    price = bs_call(S, K, T, r, sigma) if opt_type == "call" else bs_put(S, K, T, r, sigma)

    return {k: round(v, 4) for k, v in {
        "delta": delta, "gamma": gamma, "theta": theta,
        "vega": vega, "rho": rho_val, "price": price,
    }.items()}


def implied_vol(market_price, S, K, T, r, opt_type="call") -> float:
    """Newton-Raphson implied volatility solver."""
    if T <= 0 or market_price <= 0: return 0.0
    sigma = 0.3
    for _ in range(100):
        price = bs_call(S, K, T, r, sigma) if opt_type == "call" else bs_put(S, K, T, r, sigma)
        diff = price - market_price
        if abs(diff) < 1e-6: return round(sigma, 6)
        v = S * math.sqrt(T) * _norm_pdf(d1(S, K, T, r, sigma))
        if v < 1e-12: break
        sigma = max(sigma - diff / v, 0.001)
    return round(sigma, 6)


def payoff_diagram(K, premium, opt_type="call", is_long=True, n=50) -> list[dict]:
    """Generate payoff diagram data points."""
    low, high = K * 0.7, K * 1.3
    step = (high - low) / n
    pts = []
    for i in range(n + 1):
        px = low + i * step
        payoff = max(px - K, 0) if opt_type == "call" else max(K - px, 0)
        profit = (payoff - premium) if is_long else (premium - payoff)
        pts.append({"price": round(px, 2), "payoff": round(payoff, 2), "profit": round(profit, 2)})
    return pts
