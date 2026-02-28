"""
FinanceIQ v6 — Supply Chain Contagion Engine
Extracts SEC 10-K Risk Factors and categorizes risks using LLM (Groq/Ollama).
"""
import os
import json
from sec_api import ExtractorApi, QueryApi
from core.logging import logger


def fetch_sec_risk_factors(ticker: str) -> str:
    """Fetch 'Item 1A: Risk Factors' from the latest 10-K filing using sec-api."""
    api_key = os.getenv("SEC_API_KEY")
    if not api_key:
        logger.warning("SEC_API_KEY missing. Returning mock risk vector for demonstration.")
        return mock_sec_risk(ticker)

    try:
        queryApi = QueryApi(api_key=api_key)

        # Find latest 10-K
        query = {
          "query": { "query_string": { "query": f"ticker:{ticker} AND formType:\"10-K\"" } },
          "from": "0",
          "size": "1",
          "sort": [{ "filedAt": { "order": "desc" } }]
        }

        filings = queryApi.get_filings(query)
        if not filings or "filings" not in filings or not filings["filings"]:
            return "No recent 10-K filings found."

        latest_filing_url = filings["filings"][0]["linkToFilingDetails"]

        # Extract Item 1A
        extractorApi = ExtractorApi(api_key=api_key)
        item_1a_text = extractorApi.get_section(latest_filing_url, "1A", "text")

        # Truncate to reasonable length for LLMs (~10000 chars)
        return item_1a_text[:10000]
    except Exception as e:
        logger.error(f"SEC API Error: {e}")
        return mock_sec_risk(ticker)


async def categorize_risks_with_llm(risk_text: str, ticker: str) -> dict:
    """Pass unstructured SEC risk text to LLM (Groq/Ollama) and output categorized JSON."""
    if not risk_text or risk_text == "No recent 10-K filings found.":
        return {"geopolitics": 0, "governance": 0, "supply_routes": 0, "summary": "No data"}

    prompt = f"""
    You are the AlphaFilter Risk Assessor. Read the following excerpt from {ticker}'s SEC 10-K Risk Factors:
    ---
    {risk_text[:3000]}
    ---
    Analyze this text specifically for Supply Chain Contagion. Evaluate the severity of these 3 risk vectors on a scale of 1 to 10 (10 being extreme risk):
    1. Geopolitics (tariffs, wars, sanctions)
    2. Governance (management failures, regulatory fines)
    3. Supply Routes (shipping disruptions, factory shutdowns, port strikes)

    Return EXACTLY a valid JSON object with no markdown and no other text, in this format:
    {{
      "geopolitics": 5,
      "governance": 2,
      "supply_routes": 8,
      "summary": "1 sentence summarizing the primary contagion risk."
    }}
    """

    try:
        from services.llm_service import llm_chat
        content = await llm_chat(
            messages=[{"role": "user", "content": prompt}],
            json_mode=True,
        )
        data = json.loads(content)
        return {
            "geopolitics": int(data.get("geopolitics", 3)),
            "governance": int(data.get("governance", 3)),
            "supply_routes": int(data.get("supply_routes", 3)),
            "summary": data.get("summary", "Summarized by LLM.")
        }
    except Exception as e:
        logger.error(f"LLM Risk Extraction Error: {e}")
        return {"geopolitics": 3, "governance": 3, "supply_routes": 3, "summary": "Failed to parse risk data via LLM."}


def mock_sec_risk(ticker: str) -> str:
    """Provides a realistic mock for hackathon demo purposes without an API key."""
    if ticker.upper() in ['AAPL', 'MSFT', 'NVDA', 'TSM']:
        return "The company faces significant risks related to global semiconductor supply chains. Geopolitical tensions in East Asia could disrupt our foundry partners. We also face regulatory scrutiny in the EU and US regarding anti-trust and data privacy, posing governance and operational threats. Furthermore, reliance on specific shipping lanes and logistics partners creates vulnerability to freight cost spikes and delays."
    elif ticker.upper() in ['TSLA', 'F', 'GM']:
        return "Our supply chain depends heavily on raw materials like lithium and cobalt, often sourced from volatile regions. Tariffs and trade wars could impact margins. Factory shutdowns due to labor strikes or component shortages (especially chips) remain a severe threat. Environmental regulations require constant governance adaptations."
    else:
        return f"We rely on third-party suppliers and logistics providers. Any disruption in trade relations, natural disasters, or labor disputes could negatively impact {ticker}'s operations and financial condition. Regulatory compliance and shifting global tariffs pose continuous oversight challenges."


def calculate_contagion_score(sec_risks: dict, peer_sentiment: float) -> dict:
    """
    Combine normalized SEC categorical risks with peer sentiment
    to produce a definitive 'Contagion Score' (0-100 scale, higher is worse).
    """
    geo = sec_risks.get("geopolitics", 5)
    gov = sec_risks.get("governance", 5)
    routes = sec_risks.get("supply_routes", 5)

    avg_sec_risk = (geo + gov + routes) / 3.0  # Scale 1-10

    # peer_sentiment is typically -1.0 to 1.0 (from FinBERT).
    # If peers are negative (e.g., -0.8), contagion is HIGH.
    sentiment_risk = (1.0 - peer_sentiment) * 5.0  # Max 10

    # 60% weighting to SEC fundamentals, 40% to peer sentiment
    baseline = (avg_sec_risk * 0.6) + (sentiment_risk * 0.4)
    contagion_score = round(min(100.0, max(0.0, baseline * 10.0)), 1)

    return {
        "contagion_score": contagion_score,
        "risk_breakdown": sec_risks,
        "peer_sentiment_impact": round(peer_sentiment, 2)
    }


async def analyze_supply_chain_contagion(ticker: str, peer_sentiment: float) -> dict:
    """Main orchestrator — now async to support Groq/Ollama LLM calls."""
    raw_sec_text = fetch_sec_risk_factors(ticker)
    structured_risks = await categorize_risks_with_llm(raw_sec_text, ticker)
    final_analysis = calculate_contagion_score(structured_risks, peer_sentiment)
    return final_analysis
