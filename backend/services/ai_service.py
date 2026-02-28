"""
FinanceIQ v6 — AI Prediction Service
LSTM model for price forecasting with XAI feature importance.
Uses PyTorch (CPU-only) for fast, lightweight inference.
"""
import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler
import warnings

warnings.filterwarnings("ignore")

# Define the PyTorch LSTM Model
class PricePredictorLSTM(nn.Module):
    def __init__(self, input_size=5, hidden_layer_size=50, output_size=1):
        super().__init__()
        self.hidden_layer_size = hidden_layer_size
        self.lstm = nn.LSTM(input_size, hidden_layer_size, batch_first=True)
        self.linear = nn.Linear(hidden_layer_size, output_size)

    def forward(self, input_seq):
        lstm_out, _ = self.lstm(input_seq)
        predictions = self.linear(lstm_out[:, -1, :])
        return predictions


def prepare_data(df: pd.DataFrame, sequence_length: int = 20):
    """Clean data and create sequences for LSTM."""
    # Features: Close, Volume, High, Low, Open
    features = ["Close", "Volume", "High", "Low", "Open"]
    data = df[features].values
    
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data)
    
    x, y = [], []
    for i in range(len(scaled_data) - sequence_length):
        x.append(scaled_data[i:(i + sequence_length)])
        y.append(scaled_data[i + sequence_length, 0])  # Predicting 'Close'
        
    return np.array(x), np.array(y), scaler


def train_lstm_model(x_train, y_train, epochs=20, lr=0.01):
    """Train the PyTorch LSTM model on historical data."""
    model = PricePredictorLSTM(input_size=5)
    loss_function = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    X = torch.tensor(x_train, dtype=torch.float32)
    Y = torch.tensor(y_train, dtype=torch.float32).unsqueeze(1)

    model.train()
    for _ in range(epochs):
        optimizer.zero_grad()
        y_pred = model(X)
        loss = loss_function(y_pred, Y)
        loss.backward()
        optimizer.step()

    return model


def predict_future(model, last_sequence, scaler, days_to_predict=10):
    """Auto-regressive prediction for future prices."""
    model.eval()
    predictions_scaled = []
    
    # Copy to avoid mutating original
    current_seq = last_sequence.copy()
    
    with torch.no_grad():
        for _ in range(days_to_predict):
            X = torch.tensor(current_seq, dtype=torch.float32).unsqueeze(0)
            pred = model(X).item()
            predictions_scaled.append(pred)
            
            # Auto-regressive step: shift sequence, append new prediction
            # We pad other features (Volume, High, Low, Open) with the last known value
            # Note: This is a simplification for fast forecasting
            new_row = current_seq[-1].copy()
            new_row[0] = pred  # Update 'Close'
            current_seq = np.vstack([current_seq[1:], new_row])

    # Inverse transform
    # We only care about the first feature (Close)
    pred_full = np.zeros((len(predictions_scaled), 5))
    pred_full[:, 0] = predictions_scaled
    predictions = scaler.inverse_transform(pred_full)[:, 0]
    
    return [round(float(p), 2) for p in predictions]


def compute_xai_importance(model, test_seq):
    """
    Explainable AI (XAI) using occlusion sensitivity.
    We mask (zero-out) each feature and measure the change in prediction.
    Features: ["Close", "Volume", "High", "Low", "Open"]
    """
    model.eval()
    X = torch.tensor(test_seq, dtype=torch.float32).unsqueeze(0)
    
    with torch.no_grad():
        baseline_pred = model(X).item()
        
    importances = []
    features = ["Price Trend (Close)", "Momentum (Volume)", "Resistance (High)", "Support (Low)", "Opening Gaps (Open)"]
    
    for i in range(5):
        # Mask the i-th feature across the sequence
        X_masked = X.clone()
        X_masked[:, :, i] = 0
        
        with torch.no_grad():
            masked_pred = model(X_masked).item()
            
        # Absolute difference is the importance
        diff = abs(baseline_pred - masked_pred)
        importances.append(diff)
        
    # Normalize to percentages
    total = sum(importances)
    if total == 0:
        norm_importances = [20, 20, 20, 20, 20]
    else:
        norm_importances = [round((imp / total) * 100) for imp in importances]
        
    return [{"feature": f, "importance": v} for f, v in zip(features, norm_importances)]


def generate_forecast(ticker: str, period: str = "2y", days: int = 10) -> dict:
    """End-to-end pipeline: Fetch -> Train -> Predict -> Explain"""
    try:
        stock = yf.Ticker(ticker.upper())
        df = stock.history(period=period)
        
        if len(df) < 100:
            return {"error": f"Insufficient historical data for {ticker}. Need at least 100 days."}
            
        x, y, scaler = prepare_data(df, sequence_length=20)
        
        # Train on 90% of data, use last 10% for validation
        train_size = int(len(x) * 0.9)
        x_train, y_train = x[:train_size], y[:train_size]
        
        # Fast training (20 epochs) for UI responsiveness
        model = train_lstm_model(x_train, y_train, epochs=25, lr=0.01)
        
        # Predict future
        last_seq = x[-1]
        future_prices = predict_future(model, last_seq, scaler, days_to_predict=days)
        
        # Generate XAI explanation
        xai_data = compute_xai_importance(model, last_seq)
        
        # Format historical data context (last 30 days)
        last_30 = df.iloc[-30:]["Close"].round(2).tolist()
        dates = df.iloc[-30:].index.strftime("%Y-%m-%d").tolist()
        
        current_price = last_30[-1]
        target_price = future_prices[-1]
        pct_change = ((target_price - current_price) / current_price) * 100
        
        return {
            "ticker": ticker.upper(),
            "target": "Close Price",
            "current_price": current_price,
            "forecast_price": target_price,
            "projected_return": round(pct_change, 2),
            "historical_context": {
                "dates": dates,
                "prices": last_30,
            },
            "forecast": {
                "days": days,
                "prices": future_prices,
            },
            "xai_explanation": {
                "description": "Occlusion sensitivity analysis shows which market factors drove this prediction.",
                "feature_importance": xai_data
            }
        }
        
    except Exception as e:
        return {"error": str(e)}
