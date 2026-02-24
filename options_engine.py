"""
FinanceIQ v5.1 — Options Analytics Engine
Black-Scholes pricing, Greeks, implied volatility, and payoff diagrams.
"""
import math
from scipy.stats import norm


def d1(S, K, T, r, sigma):
    """Calculate d1 for Black-Scholes."""
    if T <= 0 or sigma <= 0:
        return 0.0
    return (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))


def d2(S, K, T, r, sigma):
    """Calculate d2 for Black-Scholes."""
    return d1(S, K, T, r, sigma) - sigma * math.sqrt(T) if T > 0 and sigma > 0 else 0.0


def bs_call_price(S, K, T, r, sigma):
    """Black-Scholes call option price."""
    if T <= 0:
        return max(S - K, 0)
    _d1 = d1(S, K, T, r, sigma)
    _d2 = d2(S, K, T, r, sigma)
    return S * norm.cdf(_d1) - K * math.exp(-r * T) * norm.cdf(_d2)


def bs_put_price(S, K, T, r, sigma):
    """Black-Scholes put option price."""
    if T <= 0:
        return max(K - S, 0)
    _d1 = d1(S, K, T, r, sigma)
    _d2 = d2(S, K, T, r, sigma)
    return K * math.exp(-r * T) * norm.cdf(-_d2) - S * norm.cdf(-_d1)


def calculate_greeks(S, K, T, r, sigma, option_type="call"):
    """
    Calculate all Greeks for an option.
    S: underlying price, K: strike, T: time to expiry (years),
    r: risk-free rate, sigma: implied volatility
    """
    if T <= 0 or sigma <= 0:
        intrinsic = max(S - K, 0) if option_type == "call" else max(K - S, 0)
        return {
            "delta": 1.0 if (option_type == "call" and S > K) else (-1.0 if option_type == "put" and K > S else 0.0),
            "gamma": 0.0,
            "theta": 0.0,
            "vega": 0.0,
            "rho": 0.0,
            "price": intrinsic
        }

    _d1 = d1(S, K, T, r, sigma)
    _d2 = d2(S, K, T, r, sigma)
    sqrt_T = math.sqrt(T)

    # Delta
    delta = norm.cdf(_d1) if option_type == "call" else norm.cdf(_d1) - 1

    # Gamma (same for calls & puts)
    gamma = norm.pdf(_d1) / (S * sigma * sqrt_T)

    # Theta (per day)
    theta_common = -(S * norm.pdf(_d1) * sigma) / (2 * sqrt_T)
    if option_type == "call":
        theta = (theta_common - r * K * math.exp(-r * T) * norm.cdf(_d2)) / 365
    else:
        theta = (theta_common + r * K * math.exp(-r * T) * norm.cdf(-_d2)) / 365

    # Vega (per 1% move in IV)
    vega = S * sqrt_T * norm.pdf(_d1) / 100

    # Rho (per 1% move in rate)
    if option_type == "call":
        rho = K * T * math.exp(-r * T) * norm.cdf(_d2) / 100
    else:
        rho = -K * T * math.exp(-r * T) * norm.cdf(-_d2) / 100

    # Price
    price = bs_call_price(S, K, T, r, sigma) if option_type == "call" else bs_put_price(S, K, T, r, sigma)

    return {
        "delta": round(delta, 4),
        "gamma": round(gamma, 6),
        "theta": round(theta, 4),
        "vega": round(vega, 4),
        "rho": round(rho, 4),
        "price": round(price, 2)
    }


def implied_volatility(market_price, S, K, T, r, option_type="call", tol=1e-6, max_iter=100):
    """
    Calculate implied volatility using Newton-Raphson method.
    """
    if T <= 0 or market_price <= 0:
        return 0.0

    sigma = 0.3  # initial guess
    for _ in range(max_iter):
        if option_type == "call":
            price = bs_call_price(S, K, T, r, sigma)
        else:
            price = bs_put_price(S, K, T, r, sigma)

        diff = price - market_price
        if abs(diff) < tol:
            return round(sigma, 6)

        # Vega for Newton-Raphson step
        _d1 = d1(S, K, T, r, sigma)
        vega = S * math.sqrt(T) * norm.pdf(_d1)
        if vega < 1e-12:
            break
        sigma -= diff / vega
        sigma = max(sigma, 0.001)  # floor

    return round(sigma, 6)


def payoff_diagram(S, K, premium, option_type="call", is_long=True, num_points=50):
    """
    Generate payoff diagram data points.
    Returns list of {price, payoff, profit} dicts.
    """
    low = K * 0.7
    high = K * 1.3
    step = (high - low) / num_points
    points = []
    for i in range(num_points + 1):
        price = low + i * step
        if option_type == "call":
            payoff = max(price - K, 0)
        else:
            payoff = max(K - price, 0)

        if is_long:
            profit = payoff - premium
        else:
            profit = premium - payoff

        points.append({
            "price": round(price, 2),
            "payoff": round(payoff, 2),
            "profit": round(profit, 2)
        })
    return points


def enrich_chain_with_greeks(chain_data, current_price, expiry_date_str, risk_free_rate=0.05):
    """
    Add Greeks to each option in a chain.
    chain_data: list of dicts from yfinance option_chain
    expiry_date_str: 'YYYY-MM-DD'
    """
    from datetime import datetime
    try:
        expiry = datetime.strptime(expiry_date_str, "%Y-%m-%d")
        today = datetime.now()
        T = max((expiry - today).days / 365.0, 0.001)
    except:
        T = 0.1  # fallback

    for opt in chain_data:
        strike = opt.get("strike", 0)
        last_price = opt.get("lastPrice", 0)
        iv = opt.get("impliedVolatility", 0.3)
        opt_type = "call" if opt.get("_type", "call") == "call" else "put"

        if strike > 0 and current_price > 0 and iv > 0:
            greeks = calculate_greeks(current_price, strike, T, risk_free_rate, iv, opt_type)
            opt["delta"] = greeks["delta"]
            opt["gamma"] = greeks["gamma"]
            opt["theta"] = greeks["theta"]
            opt["vega"] = greeks["vega"]
            opt["rho"] = greeks["rho"]
            opt["bs_price"] = greeks["price"]
        else:
            opt["delta"] = opt["gamma"] = opt["theta"] = opt["vega"] = opt["rho"] = 0
            opt["bs_price"] = 0

    return chain_data
