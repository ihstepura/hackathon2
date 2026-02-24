from financetoolkit import Toolkit

API_KEY = "wybWEsp1oB9abHfz3yPpQYwffxaN21B7"
TICKER = "NVDA"

try:
    companies = Toolkit(tickers=[TICKER], api_key=API_KEY)
    # Try fetching intraday
    print("Attempting to fetch 1min data...")
    # Note: verify correct method for intraday in financetoolkit
    # Usually get_intraday_data or similar, or interval argument in get_historical_data
    # Looking at docs/usage from memory or previous files:
    # get_historical_data(period="daily") was used.
    # Let's try interval='1m' if supported.
    intra = companies.get_historical_data(period="1m") # Guessing '1m' is period
    print(intra.head())
    print("Success!")
except Exception as e:
    print(f"Failed: {e}")
