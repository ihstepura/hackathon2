/* FinanceIQ v5 — Frontend Logic */

// ══════════════ THEME TOGGLE ══════════════
function getTheme() { return localStorage.getItem('fiq-theme') || 'dark'; }
function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('fiq-theme', t);
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon) icon.setAttribute('data-lucide', t === 'dark' ? 'moon' : 'sun');
    if (label) label.textContent = t === 'dark' ? 'Dark Mode' : 'Light Mode';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    // Update charts if they exist
    if (chartInstance) updateChartTheme();
    if (mcChartInstance) updateMCChartTheme();
}
function updateChartTheme() {
    const t = getTheme();
    const bg = t === 'dark' ? '#141a2a' : '#ffffff';
    const txt = t === 'dark' ? '#8b95a8' : '#5a6577';
    const grid = t === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
    const border = t === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    chartInstance.applyOptions({ layout: { background: { color: bg }, textColor: txt }, grid: { vertLines: { color: grid }, horzLines: { color: grid } }, timeScale: { borderColor: border }, rightPriceScale: { borderColor: border } });
}
function updateMCChartTheme() {
    const t = getTheme();
    const bg = t === 'dark' ? '#141a2a' : '#ffffff';
    const txt = t === 'dark' ? '#8b95a8' : '#5a6577';
    const grid = t === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
    const border = t === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    mcChartInstance.applyOptions({ layout: { background: { color: bg }, textColor: txt }, grid: { vertLines: { color: grid }, horzLines: { color: grid } }, timeScale: { borderColor: border }, rightPriceScale: { borderColor: border } });
}
function getChartColors() {
    const t = getTheme();
    return {
        bg: t === 'dark' ? '#141a2a' : '#ffffff',
        text: t === 'dark' ? '#8b95a8' : '#5a6577',
        grid: t === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
        border: t === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    };
}
// Apply saved theme on load
document.addEventListener('DOMContentLoaded', () => {
    setTheme(getTheme());
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
    // Sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
    // Asset type selector
    document.querySelectorAll('.asset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAssetType = btn.dataset.asset;
            const input = document.getElementById('tickerInput');
            const placeholders = { stocks: 'Search ticker (e.g. AAPL, TSLA, NIFTY)', futures: 'Search futures (e.g. ES=F, NQ=F, GC=F)', options: 'Search underlying (e.g. AAPL, SPY)', currencies: 'Search pair (e.g. USDINR=X, EURUSD=X)' };
            if (input) input.placeholder = placeholders[currentAssetType] || placeholders.stocks;
            // Filter sidebar nav items by asset type
            filterSidebarByAsset(currentAssetType);
        });
    });
});

let chartInstance = null;
let candleSeries = null;
let volumeSeries = null;
let overlays = {};
let analysisData = null;
let newsData = null;
let currentTicker = "";
let currentAssetType = "stocks";

// Helper: detect asset type from ticker
function getAssetType(ticker) {
    if (!ticker) return currentAssetType;
    if (ticker.endsWith('=F')) return 'futures';
    if (ticker.endsWith('=X')) return 'currencies';
    if (ticker.startsWith('^')) return 'stocks'; // indices treated as stocks
    return currentAssetType; // use the selector's value
}

// Filter sidebar nav items by asset type
function filterSidebarByAsset(assetType) {
    document.querySelectorAll('.nav-item[data-asset]').forEach(btn => {
        const allowed = (btn.dataset.asset || '').split(',');
        if (allowed.includes(assetType)) {
            btn.style.display = '';
        } else {
            btn.style.display = 'none';
            // If this tab was active, switch to overview
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
                const overviewBtn = document.querySelector('.nav-item[data-tab="overview"]');
                if (overviewBtn) overviewBtn.classList.add('active');
                const overviewPage = document.getElementById('page-overview');
                if (overviewPage) overviewPage.classList.add('active');
            }
        }
    });
}

// ══════════════ CURRENCY STATE ══════════════
let currencyRates = { USD: 1.0, GBP: 0.79, INR: 83.5 };
let currentCurrency = "GBP"; // default
const currencySymbols = { USD: "$", GBP: "£", INR: "₹" };

// Fetch live rates on load
(async function fetchCurrencyRates() {
    try {
        const res = await fetch("/api/currency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        const data = await res.json();
        currencyRates = data;
    } catch (e) { console.warn("Using fallback currency rates"); }
})();

function convertCurrency(usdValue) {
    if (usdValue === null || usdValue === undefined || usdValue === "N/A") return "N/A";
    const n = parseFloat(usdValue);
    if (isNaN(n)) return String(usdValue);
    return n * currencyRates[currentCurrency];
}
function fmtCurrency(usdValue) {
    const c = convertCurrency(usdValue);
    if (c === "N/A") return "N/A";
    const sym = currencySymbols[currentCurrency];
    return sym + Number(c).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ══════════════ WELCOME PAGE ══════════════
document.getElementById("letsBeginBtn").addEventListener("click", () => {
    document.getElementById("welcomePage").style.display = "none";
    document.getElementById("mainApp").style.display = "flex";
});

// ══════════════ SIDEBAR NAVIGATION ══════════════
document.querySelectorAll(".nav-item[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-item[data-tab]").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("page-" + btn.dataset.tab).classList.add("active");
        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth <= 1024) sidebar.classList.remove('open');
    });
});

// ══════════════ SEARCH / SUGGEST ══════════════
const tickerInput = document.getElementById("tickerInput");
const dropdown = document.getElementById("dropdown");
const timeframeSelect = document.getElementById("timeframeSelect");
const periodSelect = document.getElementById("periodSelect");
const currencySelect = document.getElementById("currencySelect");
const customDates = document.getElementById("customDates");
let debounceTimer;

tickerInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        const q = tickerInput.value.trim();
        if (q.length < 1) { dropdown.style.display = "none"; return; }
        try {
            const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}&asset_type=${encodeURIComponent(currentAssetType)}`);
            const data = await res.json();
            if (!data.length) { dropdown.style.display = "none"; return; }
            dropdown.innerHTML = data.map(d =>
                `<div class="dropdown-item" data-ticker="${d.ticker}">
                    <span class="dropdown-ticker">${d.ticker}</span>
                    <span class="dropdown-name">${d.name}</span>
                </div>`
            ).join("");
            dropdown.style.display = "block";
            dropdown.querySelectorAll(".dropdown-item").forEach(item => {
                item.addEventListener("click", () => {
                    tickerInput.value = item.dataset.ticker;
                    dropdown.style.display = "none";
                });
            });
        } catch (e) { dropdown.style.display = "none"; }
    }, 200);
});

tickerInput.addEventListener("keydown", e => { if (e.key === "Enter") { dropdown.style.display = "none"; runAnalysis(); } });
document.addEventListener("click", e => { if (!e.target.closest(".ticker-wrapper")) dropdown.style.display = "none"; });
timeframeSelect.addEventListener("change", () => { customDates.style.display = timeframeSelect.value === "custom" ? "flex" : "none"; });
currencySelect.addEventListener("change", () => {
    currentCurrency = currencySelect.value;
    if (analysisData) refreshCurrencyDisplay();
});
document.getElementById("analyzeBtn").addEventListener("click", runAnalysis);

// ══════════════ REFRESH CURRENCY DISPLAY ══════════════
function refreshCurrencyDisplay() {
    if (!analysisData) return;
    renderKeyMetrics(analysisData);
    renderTechnicalIndicators(analysisData);
    renderFinancials(analysisData);
    // Re-render items that show currency values
    if (analysisData._dcf) renderDCFData(analysisData._dcf);
    if (analysisData._dividends) renderDividendData(analysisData._dividends);
    if (analysisData._mc) renderMCStats(analysisData._mc);
}

// ══════════════ MAIN ANALYSIS ══════════════
async function runAnalysis() {
    const ticker = tickerInput.value.trim().toUpperCase();
    if (!ticker) return;
    currentTicker = ticker;
    const detectedType = getAssetType(ticker);
    filterSidebarByAsset(detectedType);

    showLoader("Fetching market data...");
    const body = { ticker, timeframe: timeframeSelect.value, period: periodSelect.value };
    if (timeframeSelect.value === "custom") {
        body.start = document.getElementById("startDate").value;
        body.end = document.getElementById("endDate").value;
    }

    try {
        updateLoader("Analyzing " + ticker + "...");
        const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`); }
        analysisData = await res.json();

        const exportBtn = document.getElementById("exportBtnSidebar");
        if (exportBtn) exportBtn.style.display = "flex";
        document.querySelectorAll(".nav-item[data-tab]").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
        document.querySelector('.nav-item[data-tab="overview"]').classList.add("active");
        document.getElementById("page-overview").classList.add("active");

        // Always render chart & key metrics
        renderChart(analysisData);
        renderKeyMetrics(analysisData);
        renderQuickSignal(analysisData);
        renderTechnicalIndicators(analysisData);

        // Conditional fetches based on asset type
        if (detectedType === 'stocks') {
            renderFinancials(analysisData);
            fetchPatterns(ticker, analysisData.price_history);
            fetchAnalyst(ticker);
            fetchInsider(ticker);
            fetchEarnings(ticker);
            fetchDCF(ticker);
            fetchZScore(ticker);
            fetchDividends(ticker);
            fetchHeatmap();
            fetchCompetitors(ticker);
        }

        if (detectedType === 'stocks' || detectedType === 'futures') {
            fetchMonteCarlo(ticker, analysisData.price_history);
            fetchCorrelation(ticker);
            fetchMacro();
            fetchPatterns(ticker, analysisData.price_history);
        }

        if (detectedType === 'currencies') {
            fetchMonteCarlo(ticker, analysisData.price_history);
            fetchCorrelation(ticker);
        }

        if (detectedType === 'options') {
            // Load the options chain for this ticker
            loadOptionsChainForTicker(ticker);
        }

        // Always fetch these
        fetchSentiment();
        fetchNews(ticker);
        fetchAI(ticker);

        hideLoader();
        startLivePolling();

    } catch (err) {
        hideLoader();
        alert("Error: " + err.message);
    }
}

// ══════════════ LOADER ══════════════
function showLoader(msg) { document.getElementById("loader").style.display = "flex"; document.getElementById("loaderText").textContent = msg || "Analyzing..."; }
function updateLoader(msg) { document.getElementById("loaderText").textContent = msg; }
function hideLoader() { document.getElementById("loader").style.display = "none"; }

// ══════════════ CHART ══════════════
let chartResizeObserver = null;

function renderChart(data) {
    const container = document.getElementById("chartContainer");
    container.innerHTML = "";
    document.getElementById("chartControls").style.display = "flex";

    // Cleanup previous chart & observer
    if (chartResizeObserver) { chartResizeObserver.disconnect(); chartResizeObserver = null; }
    if (chartInstance) { chartInstance.remove(); chartInstance = null; }

    const cc = getChartColors();
    const rect = container.getBoundingClientRect();
    chartInstance = LightweightCharts.createChart(container, {
        width: rect.width || 800,
        height: rect.height || 420,
        layout: { background: { color: cc.bg }, textColor: cc.text },
        grid: { vertLines: { color: cc.grid }, horzLines: { color: cc.grid } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        timeScale: { borderColor: cc.border, timeVisible: false },
        rightPriceScale: { borderColor: cc.border },
    });

    // Responsive resize
    chartResizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (chartInstance && width > 0 && height > 0) {
                chartInstance.resize(width, height);
            }
        }
    });
    chartResizeObserver.observe(container);

    candleSeries = chartInstance.addCandlestickSeries({
        upColor: "#22c55e", downColor: "#ef4444",
        borderUpColor: "#22c55e", borderDownColor: "#ef4444",
        wickUpColor: "#22c55e", wickDownColor: "#ef4444"
    });

    // Validate and sort price data
    const prices = (data.price_history || [])
        .filter(p => p.date && p.open != null && p.close != null && !isNaN(p.open) && !isNaN(p.close))
        .map(p => ({
            time: String(p.date).slice(0, 10),
            open: Number(p.open),
            high: Number(p.high),
            low: Number(p.low),
            close: Number(p.close)
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

    // Remove duplicates (same date)
    const seen = new Set();
    const uniquePrices = prices.filter(p => {
        if (seen.has(p.time)) return false;
        seen.add(p.time);
        return true;
    });
    candleSeries.setData(uniquePrices);

    volumeSeries = chartInstance.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol" });
    chartInstance.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    const volumeData = (data.price_history || [])
        .filter(p => p.date && p.volume != null)
        .map(p => ({
            time: String(p.date).slice(0, 10),
            value: Number(p.volume) || 0,
            color: Number(p.close) >= Number(p.open) ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
    const seenVol = new Set();
    volumeSeries.setData(volumeData.filter(p => { if (seenVol.has(p.time)) return false; seenVol.add(p.time); return true; }));

    chartInstance.timeScale().fitContent();
    overlays = {};
    setupOverlayToggles(data);
}


function setupOverlayToggles(data) {
    const prices = data.price_history || [];
    const closes = prices.map(p => p.close);
    const times = prices.map(p => p.time || p.date);

    function ema(arr, period) {
        const k = 2 / (period + 1);
        const result = [arr[0]];
        for (let i = 1; i < arr.length; i++) result.push(arr[i] * k + result[i - 1] * (1 - k));
        return result;
    }
    function sma(arr, period) {
        const result = [];
        for (let i = 0; i < arr.length; i++) {
            if (i < period - 1) { result.push(null); continue; }
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) sum += arr[j];
            result.push(sum / period);
        }
        return result;
    }

    function addLine(id, values, color) {
        if (overlays[id]) { chartInstance.removeSeries(overlays[id]); delete overlays[id]; }
        const s = chartInstance.addLineSeries({ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        const d = [];
        for (let i = 0; i < values.length; i++) { if (values[i] !== null) d.push({ time: times[i], value: values[i] }); }
        s.setData(d);
        overlays[id] = s;
    }
    function removeLine(id) { if (overlays[id]) { chartInstance.removeSeries(overlays[id]); delete overlays[id]; } }

    const emaConfig = { togEma5: [5, "#f59e0b"], togEma10: [10, "#06b6d4"], togEma20: [20, "#8b5cf6"], togSma200: [200, "#ec4899"] };
    Object.entries(emaConfig).forEach(([id, [period, color]]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.checked = false;
        el.onchange = () => {
            if (el.checked) {
                const vals = id.startsWith("togSma") ? sma(closes, period) : ema(closes, period);
                addLine(id, vals, color);
            } else removeLine(id);
        };
    });

    const bbEl = document.getElementById("togBb");
    if (bbEl) {
        bbEl.checked = false;
        bbEl.onchange = () => {
            if (bbEl.checked) {
                const sma20 = sma(closes, 20);
                const upper = [], lower = [];
                for (let i = 0; i < closes.length; i++) {
                    if (sma20[i] === null) { upper.push(null); lower.push(null); continue; }
                    let sum = 0;
                    for (let j = i - 19; j <= i; j++) sum += (closes[j] - sma20[i]) ** 2;
                    const std = Math.sqrt(sum / 20);
                    upper.push(sma20[i] + 2 * std);
                    lower.push(sma20[i] - 2 * std);
                }
                addLine("bbUpper", upper, "rgba(99,102,241,0.5)");
                addLine("bbLower", lower, "rgba(99,102,241,0.5)");
                addLine("bbMid", sma20, "rgba(99,102,241,0.3)");
            } else { removeLine("bbUpper"); removeLine("bbLower"); removeLine("bbMid"); }
        };
    }

    const fibEl = document.getElementById("togFib");
    if (fibEl) {
        fibEl.checked = false;
        fibEl.onchange = () => {
            if (fibEl.checked) {
                const hi = Math.max(...closes), lo = Math.min(...closes);
                [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].forEach((lvl, idx) => {
                    const val = hi - (hi - lo) * lvl;
                    const colors = ["#22c55e", "#84cc16", "#eab308", "#f59e0b", "#f97316", "#ef4444", "#dc2626"];
                    addLine("fib" + idx, closes.map(() => val), colors[idx]);
                });
            } else { for (let i = 0; i < 7; i++) removeLine("fib" + i); }
        };
    }

    const customBtn = document.getElementById("addCustomEma");
    if (customBtn) {
        customBtn.onclick = () => {
            const period = parseInt(document.getElementById("customEmaPeriod").value);
            if (period >= 2 && period <= 500) addLine("custom" + period, ema(closes, period), "#a78bfa");
        };
    }
}

// ══════════════ KEY METRICS ══════════════
function renderKeyMetrics(data) {
    const t = data.technicals || {};
    const r = data.ratios || {};
    const items = [
        { label: "Price", value: fmtCurrency(t.price) },
        { label: "RSI", value: fmt(t.rsi), cls: t.rsi > 70 ? "negative" : t.rsi < 30 ? "positive" : "" },
        { label: "MACD", value: fmt(t.macd), cls: t.macd > t.macd_signal ? "positive" : "negative" },
        { label: "SMA 200", value: fmtCurrency(t.sma_200) },
        { label: "P/E", value: fmt(r.pe) },
        { label: "EV/EBITDA", value: fmt(r.ev_ebitda) },
        { label: "ROE", value: fmtPct(r.roe) },
        { label: "ATR", value: fmtCurrency(t.atr) },
    ];
    document.getElementById("keyMetrics").innerHTML = items.map(i =>
        `<div class="data-item"><div class="label">${i.label}</div><div class="value ${i.cls || ""}">${i.value}</div></div>`
    ).join("");
}

// ══════════════ QUICK SIGNAL ══════════════
function renderQuickSignal(data) {
    const t = data.technicals || {};
    let score = 0, reasons = [];
    if (t.rsi < 30) { score += 2; reasons.push("RSI oversold"); }
    else if (t.rsi > 70) { score -= 2; reasons.push("RSI overbought"); }
    if (t.macd > t.macd_signal) { score += 1; reasons.push("MACD bullish"); }
    else { score -= 1; reasons.push("MACD bearish"); }
    if (t.price > t.sma_200) { score += 1; reasons.push("Above SMA200"); }
    else if (t.sma_200) { score -= 1; reasons.push("Below SMA200"); }
    if (t.price > t.ema_20) { score += 1; reasons.push("Above EMA20"); }

    const cls = score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";
    const label = score >= 2 ? "BULLISH" : score <= -2 ? "BEARISH" : "NEUTRAL";
    document.getElementById("quickSignal").innerHTML = `
        <div class="signal-box ${cls}">
            <div class="signal-verdict ${cls}">${label}</div>
            <div class="signal-reason">${reasons.join(" · ")}</div>
        </div>`;
}

// ══════════════ TECHNICAL INDICATORS ══════════════
function renderTechnicalIndicators(data) {
    const t = data.technicals || {};
    const items = [
        { label: "EMA 5", value: fmtCurrency(t.ema_5) }, { label: "EMA 10", value: fmtCurrency(t.ema_10) },
        { label: "EMA 20", value: fmtCurrency(t.ema_20) }, { label: "EMA 50", value: fmtCurrency(t.ema_50) },
        { label: "SMA 200", value: fmtCurrency(t.sma_200) }, { label: "RSI (14)", value: fmt(t.rsi), cls: t.rsi > 70 ? "negative" : t.rsi < 30 ? "positive" : "" },
        { label: "MACD", value: fmt(t.macd) }, { label: "MACD Signal", value: fmt(t.macd_signal) },
        { label: "BB Upper", value: fmtCurrency(t.bb_upper) }, { label: "BB Lower", value: fmtCurrency(t.bb_lower) },
        { label: "ATR (14)", value: fmtCurrency(t.atr) }, { label: "VWAP", value: fmtCurrency(t.vwap) },
    ];
    document.getElementById("technicalIndicators").innerHTML = items.map(i =>
        `<div class="data-item"><div class="label">${i.label}</div><div class="value ${i.cls || ""}">${i.value}</div></div>`
    ).join("");
}

// ══════════════ FINANCIALS ══════════════
function renderFinancials(data) {
    const f = data.financials || {}, r = data.ratios || {}, fc = data.fcff || {};
    document.getElementById("incomeStatement").innerHTML = renderGrid(f, true);
    document.getElementById("ratiosGrid").innerHTML = renderGrid(r, false);
    document.getElementById("fcffGrid").innerHTML = renderGrid(fc, true);
}
function renderGrid(obj, asCurrency) {
    return Object.entries(obj).map(([k, v]) => {
        const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const val = asCurrency && typeof v === "number" && Math.abs(v) > 100 ? fmtCurrencyLarge(v) : fmtVal(v);
        return `<div class="data-item"><div class="label">${label}</div><div class="value">${val}</div></div>`;
    }).join("");
}

// ══════════════ FETCH: CANDLESTICK PATTERNS (last 7 days + prediction) ══════════════
async function fetchPatterns(ticker, prices) {
    try {
        const res = await fetch("/api/patterns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker, prices, lookback_days: 7 }) });
        const data = await res.json();
        const el = document.getElementById("candlestickPatterns");
        const outlookEl = document.getElementById("patternOutlook");

        // Render outlook summary
        if (data.outlook) {
            const cls = data.outlook.startsWith("BULLISH") ? "bullish" : data.outlook.startsWith("BEARISH") ? "bearish" : "neutral";
            outlookEl.className = "pattern-outlook-box " + cls;
            outlookEl.innerHTML = `
                <div>🔮 7-Day Pattern Outlook: ${data.outlook}</div>
                <div class="pattern-outlook-sub">Bullish: ${data.bullish_count || 0} · Bearish: ${data.bearish_count || 0} · Neutral: ${data.neutral_count || 0}</div>`;
        }

        if (!data.patterns || !data.patterns.length) {
            el.innerHTML = '<p style="color:var(--text-muted);font-style:italic;">No significant patterns detected in the last 7 trading days.</p>';
            return;
        }
        el.innerHTML = data.patterns.map(p => `
            <div class="pattern-card">
                <span class="pattern-badge ${p.type}">${p.type}</span>
                <div class="pattern-info">
                    <h4>${p.pattern}</h4>
                    <div class="date">${p.date}</div>
                    <p>${p.description}</p>
                    <div class="pattern-prediction">🔮 ${p.prediction || ""}</div>
                </div>
            </div>
        `).join("");
    } catch (e) { console.error("Patterns:", e); }
}

// ══════════════ FETCH: ANALYST RATINGS (N/A handling) ══════════════
async function fetchAnalyst(ticker) {
    try {
        const res = await fetch("/api/analyst", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker }) });
        const data = await res.json();
        const el = document.getElementById("analystRatings");

        if (data.error || data.available === false) {
            el.innerHTML = `<div class="analyst-na">📊 Analyst ratings are not available for ${ticker}.<br><small>This ticker may not be covered by Wall Street analysts on Finnhub.</small></div>`;
            return;
        }

        const r = data.recommendation || {};
        const total = (r.strong_buy || 0) + (r.buy || 0) + (r.hold || 0) + (r.sell || 0) + (r.strong_sell || 0) || 1;
        const pt = data.price_target || {};

        el.innerHTML = `
            <div class="analyst-bars">
                ${analystBar("Strong Buy", r.strong_buy, total, "buy")}
                ${analystBar("Buy", r.buy, total, "buy")}
                ${analystBar("Hold", r.hold, total, "hold")}
                ${analystBar("Sell", r.sell, total, "sell")}
                ${analystBar("Strong Sell", r.strong_sell, total, "sell")}
            </div>
            <div class="price-target-grid">
                <div class="data-item"><div class="label">Target Low</div><div class="value negative">${pt.low !== "N/A" ? fmtCurrency(pt.low) : "N/A"}</div></div>
                <div class="data-item"><div class="label">Target Mean</div><div class="value">${pt.mean !== "N/A" ? fmtCurrency(pt.mean) : "N/A"}</div></div>
                <div class="data-item"><div class="label">Target Median</div><div class="value">${pt.median !== "N/A" ? fmtCurrency(pt.median) : "N/A"}</div></div>
                <div class="data-item"><div class="label">Target High</div><div class="value positive">${pt.high !== "N/A" ? fmtCurrency(pt.high) : "N/A"}</div></div>
            </div>`;
    } catch (e) { console.error("Analyst:", e); }
}
function analystBar(label, count, total, cls) {
    const pct = Math.round((count || 0) / total * 100);
    return `<div class="analyst-bar-row">
        <div class="analyst-bar-label">${label}</div>
        <div class="analyst-bar-track"><div class="analyst-bar-fill ${cls}" style="width:${pct}%">${count || 0}</div></div>
    </div>`;
}

// ══════════════ FETCH: INSIDER TRADING ══════════════
async function fetchInsider(ticker) {
    try {
        const res = await fetch("/api/insider", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker }) });
        const data = await res.json();
        const el = document.getElementById("insiderTrading");
        if (!data.transactions || !data.transactions.length) { el.innerHTML = '<p style="color:var(--text-muted);">No recent insider transactions.</p>'; return; }
        const rows = data.transactions.slice(0, 10).map(t => {
            const isBuy = (t.change > 0 || t.transaction_type === "P - Purchase");
            return `<tr><td>${t.filing_date}</td><td>${t.name}</td><td class="${isBuy ? 'positive' : 'negative'}">${t.transaction_type || (isBuy ? 'Buy' : 'Sell')}</td><td>${fmtNum(t.change)}</td></tr>`;
        }).join("");
        el.innerHTML = `<table class="insider-table"><thead><tr><th>Date</th><th>Insider</th><th>Type</th><th>Shares</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (e) { console.error("Insider:", e); }
}

// ══════════════ FETCH: MARKET SENTIMENT ══════════════
async function fetchSentiment() {
    try {
        const res = await fetch("/api/sentiment-market", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        const data = await res.json();

        const fg = data.fear_greed || {};
        const fgVal = fg.value || 50;
        const fgCls = fgVal < 25 ? "negative" : fgVal < 45 ? "muted" : fgVal < 55 ? "" : fgVal < 75 ? "" : "positive";
        document.getElementById("fearGreedGauge").innerHTML = `
            <div class="fg-gauge">
                <div class="fg-value">${fgVal}</div>
                <div class="fg-label ${fgCls}">${fg.description || "Neutral"}</div>
                <div class="fg-bar"><div class="fg-marker" style="left:${fgVal}%"></div></div>
            </div>`;

        const vix = data.vix || {};
        const vixCls = vix.value < 15 ? "positive" : vix.value < 25 ? "" : vix.value < 35 ? "muted" : "negative";
        document.getElementById("vixDisplay").innerHTML = `
            <div class="vix-display">
                <div class="vix-value ${vixCls}">${vix.value || "N/A"}</div>
                <div class="vix-label">${vix.label || ""}</div>
            </div>`;
    } catch (e) { console.error("Sentiment:", e); }
}

// ══════════════ FETCH: NEWS ══════════════
async function fetchNews(ticker) {
    try {
        const res = await fetch("/api/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker }) });
        newsData = await res.json();
        const el = document.getElementById("newsSection");
        if (!newsData.news || !newsData.news.length) { el.innerHTML = '<p style="color:var(--text-muted);">No recent news.</p>'; return; }

        const avgCls = newsData.overall_label === "Positive" ? "positive" : newsData.overall_label === "Negative" ? "negative" : "neutral";
        el.innerHTML = `<div class="sentiment-badge"><span class="sentiment-pill ${avgCls}">Overall: ${newsData.overall_label} (${newsData.average_sentiment})</span></div>` +
            newsData.news.map(n => {
                const cls = n.sentiment_label === "Positive" ? "positive" : n.sentiment_label === "Negative" ? "negative" : "neutral";
                return `<div class="news-item"><div class="news-title"><a href="${n.link}" target="_blank">${n.title}</a></div>
                    <div class="news-meta"><span class="sentiment-pill ${cls}">${n.sentiment_label} (${n.sentiment_score})</span><span>${n.source || ""}</span></div></div>`;
            }).join("");
    } catch (e) { console.error("News:", e); }
}

// ══════════════ FETCH: FRED MACRO (with good/bad + explanations) ══════════════
async function fetchMacro() {
    try {
        const res = await fetch("/api/macro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        const data = await res.json();
        const el = document.getElementById("macroIndicators");
        if (data.error) { el.innerHTML = `<p style="color:var(--text-muted);">${data.error}</p>`; return; }
        el.innerHTML = Object.entries(data.indicators || {}).map(([k, v]) => {
            const statusBadge = v.status ? `<span class="macro-status-badge ${v.status}">${v.status}</span>` : "";
            const explanation = v.explanation ? `<div class="macro-explanation">${v.explanation}</div>` : "";
            return `<div class="data-item macro-item">
                <div class="label">${v.label} ${statusBadge}</div>
                <div class="value">${v.value}</div>
                ${explanation}
            </div>`;
        }).join("");
    } catch (e) { console.error("Macro:", e); }
}

// ══════════════ FETCH: EARNINGS ══════════════
async function fetchEarnings(ticker) {
    try {
        const res = await fetch("/api/earnings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker }) });
        const data = await res.json();
        const el = document.getElementById("earningsTable");
        if (!data.earnings || !data.earnings.length) { el.innerHTML = '<p style="color:var(--text-muted);">No earnings data available.</p>'; return; }
        const rows = data.earnings.map(e => {
            const surprise = parseFloat(e.surprise_pct);
            const cls = surprise > 0 ? "surprise-positive" : surprise < 0 ? "surprise-negative" : "";
            return `<tr><td>${e.period}</td><td>${fmtCurrency(e.estimate)}</td><td>${fmtCurrency(e.actual)}</td><td class="${cls}">${fmtCurrency(e.surprise)}</td><td class="${cls}">${fmtPctRaw(e.surprise_pct)}</td></tr>`;
        }).join("");
        el.innerHTML = `<table class="earnings-table"><thead><tr><th>Period</th><th>Estimate</th><th>Actual</th><th>Surprise</th><th>Surprise %</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (e) { console.error("Earnings:", e); }
}

// ══════════════ FETCH: MONTE CARLO (selectable bands) ══════════════
let mcChartInstance = null;
let mcBandSeries = {};
let mcRawData = null;

async function fetchMonteCarlo(ticker, prices) {
    try {
        const res = await fetch("/api/monte-carlo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker, prices, days: 60, simulations: 1000 }) });
        mcRawData = await res.json();
        if (mcRawData.error) { document.getElementById("monteCarloChart").innerHTML = `<p style="color:var(--text-muted);padding:20px;">${mcRawData.error}</p>`; return; }

        analysisData._mc = mcRawData;
        renderMCChart(mcRawData);
        renderMCStats(mcRawData);
        setupMCBandToggles();
    } catch (e) { console.error("Monte Carlo:", e); }
}

function renderMCChart(data) {
    const container = document.getElementById("monteCarloChart");
    container.innerHTML = "";
    mcBandSeries = {};

    const cc = getChartColors();
    mcChartInstance = LightweightCharts.createChart(container, {
        layout: { background: { color: cc.bg }, textColor: cc.text },
        grid: { vertLines: { color: cc.grid }, horzLines: { color: cc.grid } },
        timeScale: { borderColor: cc.border }, rightPriceScale: { borderColor: cc.border },
    });

    const today = new Date();
    function dayStr(offset) { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); }

    const bands = [
        { key: "p90", color: "rgba(34,197,94,0.4)", label: "P90 (Bull)", lineWidth: 1 },
        { key: "p75", color: "rgba(34,197,94,0.6)", label: "P75", lineWidth: 1 },
        { key: "p50", color: "rgba(99,102,241,0.9)", label: "P50 (Median)", lineWidth: 2 },
        { key: "p25", color: "rgba(239,68,68,0.6)", label: "P25", lineWidth: 1 },
        { key: "p10", color: "rgba(239,68,68,0.4)", label: "P10 (Bear)", lineWidth: 1 },
    ];

    bands.forEach(b => {
        if (data.percentiles && data.percentiles[b.key]) {
            const series = mcChartInstance.addLineSeries({ color: b.color, lineWidth: b.lineWidth, priceLineVisible: false, lastValueVisible: false });
            series.setData(data.percentiles[b.key].map((v, i) => ({ time: dayStr(i + 1), value: v })));
            mcBandSeries[b.key] = series;
        }
    });
    mcChartInstance.timeScale().fitContent();
}

function renderMCStats(data) {
    const s = data.final_stats || {};
    document.getElementById("monteCarloStats").innerHTML = [
        { label: "Start Price", value: fmtCurrency(data.start_price) },
        { label: "Median (P50)", value: fmtCurrency(s.median) },
        { label: "Mean", value: fmtCurrency(s.mean) },
        { label: "P10 (Bearish)", value: fmtCurrency(s.p10), cls: "negative" },
        { label: "P90 (Bullish)", value: fmtCurrency(s.p90), cls: "positive" },
    ].map(i => `<div class="data-item"><div class="label">${i.label}</div><div class="value ${i.cls || ""}">${i.value}</div></div>`).join("");
}

function setupMCBandToggles() {
    const bandMap = { togP90: "p90", togP75: "p75", togP50: "p50", togP25: "p25", togP10: "p10" };
    Object.entries(bandMap).forEach(([elId, bandKey]) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.checked = true;
        el.onchange = () => {
            if (mcBandSeries[bandKey]) {
                if (el.checked) {
                    mcBandSeries[bandKey].applyOptions({ visible: true });
                } else {
                    mcBandSeries[bandKey].applyOptions({ visible: false });
                }
            }
        };
    });
}

// ══════════════ FETCH: DCF ══════════════
async function fetchDCF(ticker) {
    try {
        const res = await fetch("/api/dcf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker }) });
        const data = await res.json();
        if (data.error) { document.getElementById("dcfValuation").innerHTML = `<p style="color:var(--text-muted);">${data.error}</p>`; return; }
        analysisData._dcf = data;
        renderDCFData(data);
    } catch (e) { console.error("DCF:", e); }
}
function renderDCFData(data) {
    const el = document.getElementById("dcfValuation");
    const cls = data.verdict === "UNDERVALUED" ? "undervalued" : data.verdict === "OVERVALUED" ? "overvalued" : "fair";
    const arrow = data.upside_pct > 0 ? "↑" : "↓";
    el.innerHTML = `
        <div class="dcf-hero">
            <div class="dcf-verdict ${cls}">
                ${data.verdict}
                <div class="dcf-sub">${arrow} ${Math.abs(data.upside_pct)}% ${data.upside_pct > 0 ? 'upside' : 'downside'}</div>
            </div>
            <div class="dcf-metrics">
                <div class="data-item"><div class="label">Intrinsic Value</div><div class="value positive">${fmtCurrency(data.intrinsic_value)}</div></div>
                <div class="data-item"><div class="label">Current Price</div><div class="value">${fmtCurrency(data.current_price)}</div></div>
                <div class="data-item"><div class="label">WACC</div><div class="value">${data.wacc}%</div></div>
                <div class="data-item"><div class="label">Growth Rate</div><div class="value">${data.growth_rate}%</div></div>
                <div class="data-item"><div class="label">Base FCF</div><div class="value">${fmtCurrencyLarge(data.base_fcf)}</div></div>
                <div class="data-item"><div class="label">Enterprise Value</div><div class="value">${fmtCurrencyLarge(data.enterprise_value)}</div></div>
            </div>
        </div>`;
}

// ══════════════ FETCH: Z-SCORE ══════════════
async function fetchZScore(ticker) {
    try {
        const res = await fetch("/api/zscore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker }) });
        const data = await res.json();
        const el = document.getElementById("zScore");
        if (data.error) { el.innerHTML = `<p style="color:var(--text-muted);">${data.error}</p>`; return; }

        const cls = data.zone === "Safe Zone" ? "safe" : data.zone === "Grey Zone" ? "grey" : "distress";
        el.innerHTML = `
            <div class="zscore-badge ${cls}">${data.z_score}<br><span style="font-size:14px;font-weight:500;">${data.zone}</span></div>
            <div class="zscore-components">
                ${Object.entries(data.components || {}).map(([k, v]) =>
            `<div class="data-item"><div class="label">${k.replace(/_/g, " ")}</div><div class="value">${v}</div></div>`
        ).join("")}
            </div>`;
    } catch (e) { console.error("ZScore:", e); }
}

// ══════════════ FETCH: DIVIDENDS ══════════════
async function fetchDividends(ticker) {
    try {
        const res = await fetch("/api/dividends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker }) });
        const data = await res.json();
        if (data.error) { document.getElementById("dividendAnalysis").innerHTML = `<p style="color:var(--text-muted);">${data.error}</p>`; return; }
        analysisData._dividends = data;
        renderDividendData(data);
    } catch (e) { console.error("Dividends:", e); }
}
function renderDividendData(data) {
    const el = document.getElementById("dividendAnalysis");
    const yld = data.dividend_yield && data.dividend_yield !== "N/A" ? (data.dividend_yield * 100).toFixed(2) + "%" : "N/A";
    const payout = data.payout_ratio && data.payout_ratio !== "N/A" ? (data.payout_ratio * 100).toFixed(1) + "%" : "N/A";
    el.innerHTML = `
        <div class="dividend-grid">
            <div class="data-item"><div class="label">Yield</div><div class="value positive">${yld}</div></div>
            <div class="data-item"><div class="label">Annual Rate</div><div class="value">${fmtCurrency(data.dividend_rate)}</div></div>
            <div class="data-item"><div class="label">Payout Ratio</div><div class="value">${payout}</div></div>
            <div class="data-item"><div class="label">5Y Avg Yield</div><div class="value">${data.five_year_avg_yield !== "N/A" ? data.five_year_avg_yield + "%" : "N/A"}</div></div>
        </div>`;
}

// ══════════════ FETCH: CORRELATION (FIXED) ══════════════
async function fetchCorrelation(ticker) {
    try {
        const res = await fetch("/api/correlation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker }) });
        const data = await res.json();
        const el = document.getElementById("correlationMatrix");
        if (data.error) { el.innerHTML = `<p style="color:var(--text-muted);">${data.error}</p>`; return; }

        const tickers = data.tickers || [];
        const m = data.matrix || {};
        let html = '<table class="corr-table"><thead><tr><th></th>';
        tickers.forEach(t => html += `<th>${t}</th>`);
        html += '</tr></thead><tbody>';
        tickers.forEach(row => {
            html += `<tr><td><strong>${row}</strong></td>`;
            tickers.forEach(col => {
                const val = (m[col] && m[col][row] !== undefined) ? m[col][row] : 0;
                const bg = corrColor(val);
                html += `<td style="background:${bg};color:${Math.abs(val) > 0.5 ? 'white' : 'var(--text-secondary)'};font-weight:${Math.abs(val) > 0.7 ? '700' : '400'}">${val.toFixed(2)}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        el.innerHTML = html;
    } catch (e) { console.error("Correlation:", e); }
}
function corrColor(val) {
    if (val >= 0) return `rgba(34,197,94,${Math.abs(val) * 0.6})`;
    return `rgba(239,68,68,${Math.abs(val) * 0.6})`;
}

// ══════════════ FETCH: SECTOR HEATMAP ══════════════
let heatmapData = null;
async function fetchHeatmap() {
    try {
        const res = await fetch("/api/heatmap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        heatmapData = await res.json();
        if (heatmapData.error) { document.getElementById("sectorHeatmap").innerHTML = `<p style="color:var(--text-muted);">${heatmapData.error}</p>`; return; }

        const controls = document.getElementById("heatmapControls");
        controls.innerHTML = (heatmapData.timeframes || []).map((tf, i) =>
            `<button class="heatmap-btn ${i === 0 ? 'active' : ''}" data-tf="${tf}">${tf}</button>`
        ).join("");
        controls.querySelectorAll(".heatmap-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                controls.querySelectorAll(".heatmap-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                renderHeatmap(btn.dataset.tf);
            });
        });
        if (heatmapData.timeframes && heatmapData.timeframes.length) renderHeatmap(heatmapData.timeframes[0]);
    } catch (e) { console.error("Heatmap:", e); }
}
function renderHeatmap(tf) {
    const sectors = heatmapData.sectors[tf] || {};
    const entries = Object.entries(sectors);
    if (!entries.length) {
        document.getElementById("sectorHeatmap").innerHTML = '<p style="color:var(--text-muted);">Sector data temporarily unavailable (API rate limit).</p>';
        return;
    }
    document.getElementById("sectorHeatmap").innerHTML = entries.map(([name, pct]) => {
        const bg = pct >= 0 ? `rgba(34,197,94,${Math.min(Math.abs(pct) / 5, 0.7) + 0.1})` : `rgba(239,68,68,${Math.min(Math.abs(pct) / 5, 0.7) + 0.1})`;
        const color = Math.abs(pct) > 1 ? "white" : "var(--text-secondary)";
        return `<div class="heatmap-cell" style="background:${bg};color:${color}"><div class="sector-name">${name}</div><div class="sector-pct">${pct > 0 ? "+" : ""}${pct.toFixed(2)}%</div></div>`;
    }).join("");
}

// ══════════════ FETCH: COMPETITORS (FIXED field names) ══════════════
async function fetchCompetitors(ticker) {
    try {
        const res = await fetch("/api/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker }) });
        const data = await res.json();
        const el = document.getElementById("compSection");
        if (!data.peers || !data.peers.length) {
            el.innerHTML = `<p style="color:var(--text-muted);">No competitor data available. <span class="badge-sector">${data.sector || "unknown"}</span></p>`;
            if (data.error) el.innerHTML += `<p style="color:var(--text-muted);font-size:12px;margin-top:8px;">${data.error}</p>`;
            return;
        }

        let html = `<p style="margin-bottom:10px;">Sector: <span class="badge-sector">${data.sector}</span></p>`;
        html += '<table class="comp-table"><thead><tr><th>Ticker</th><th>Market Cap</th><th>P/E</th><th>EV/EBITDA</th><th>ROE</th><th>Net Margin</th><th>Gross Margin</th></tr></thead><tbody>';
        data.peers.forEach(p => {
            const cls = p.is_target ? ' class="comp-target"' : '';
            html += `<tr${cls}>
                <td><strong>${p.ticker}</strong></td>
                <td>${fmtCurrencyLarge(p.market_cap)}</td>
                <td>${fmtVal(p.pe_ratio)}</td>
                <td>${fmtVal(p.ev_ebitda)}</td>
                <td>${fmtPctVal(p.roe)}</td>
                <td>${fmtPctVal(p.net_margin)}</td>
                <td>${fmtPctVal(p.gross_margin)}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        el.innerHTML = html;
    } catch (e) { console.error("Competitors:", e); }
}

// ══════════════ FETCH: AI ══════════════
async function fetchAI(ticker) {
    try {
        const payload = { ticker, analysis: analysisData || {}, news: newsData || {} };
        const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        document.getElementById("aiContent").innerHTML = data.overview ? formatAI(data.overview) : `<p class="ai-placeholder">${data.error || "No response"}</p>`;
    } catch (e) { document.getElementById("aiContent").innerHTML = '<p class="ai-placeholder">AI unavailable.</p>'; }
}

document.getElementById("askAi").addEventListener("click", async () => {
    const q = document.getElementById("aiInput").value.trim();
    if (!q || !currentTicker) return;
    document.getElementById("aiContent").innerHTML = '<p class="ai-placeholder">Thinking...</p>';
    try {
        const payload = { ticker: currentTicker, analysis: analysisData || {}, news: newsData || {}, question: q };
        const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        document.getElementById("aiContent").innerHTML = data.overview ? formatAI(data.overview) : `<p class="ai-placeholder">${data.error || "No response"}</p>`;
    } catch (e) { document.getElementById("aiContent").innerHTML = '<p class="ai-placeholder">Error.</p>'; }
});

function formatAI(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^### (.*?)$/gm, '<h4>$1</h4>')
        .replace(/^## (.*?)$/gm, '<h3>$1</h3>')
        .replace(/^# (.*?)$/gm, '<h2>$1</h2>')
        .replace(/\n- /g, '\n• ')
        .replace(/\n/g, '<br>');
}

// ══════════════ EXPORT ══════════════
document.getElementById("exportBtnSidebar").addEventListener("click", async () => {
    if (!currentTicker || !analysisData) return;
    try {
        const payload = { ticker: currentTicker, analysis: analysisData, news: newsData || {}, ai_overview: document.getElementById("aiContent").innerText || "" };
        const res = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${currentTicker}_analysis.xlsx`; a.click();
    } catch (e) { alert("Export failed."); }
});

// ══════════════ FORMATTING HELPERS ══════════════
function fmt(v) { if (v === null || v === undefined || v === "N/A") return "N/A"; return typeof v === "number" ? v.toFixed(2) : String(v); }
function fmtPct(v) { if (v === null || v === undefined || v === "N/A") return "N/A"; return (v * 100).toFixed(2) + "%"; }
function fmtPctRaw(v) { if (v === null || v === undefined || v === "N/A") return "N/A"; return parseFloat(v).toFixed(2) + "%"; }
function fmtVal(v) { if (v === null || v === undefined || v === "N/A") return "N/A"; return typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v); }
function fmtPctVal(v) { if (v === null || v === undefined || v === "N/A") return "N/A"; return typeof v === "number" ? (v * 100).toFixed(2) + "%" : String(v); }
function fmtNum(v) { if (v === null || v === undefined || v === "N/A") return "N/A"; return Number(v).toLocaleString(); }
function fmtLarge(v) {
    if (v === null || v === undefined || v === "N/A") return "N/A";
    const n = Number(v);
    if (isNaN(n)) return String(v);
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toFixed(2);
}
function fmtCurrencyLarge(v) {
    if (v === null || v === undefined || v === "N/A") return "N/A";
    const converted = convertCurrency(v);
    if (converted === "N/A") return "N/A";
    const sym = currencySymbols[currentCurrency];
    const n = Number(converted);
    if (isNaN(n)) return String(v);
    if (Math.abs(n) >= 1e12) return sym + (n / 1e12).toFixed(2) + "T";
    if (Math.abs(n) >= 1e9) return sym + (n / 1e9).toFixed(2) + "B";
    if (Math.abs(n) >= 1e6) return sym + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return sym + (n / 1e3).toFixed(1) + "K";
    return sym + n.toFixed(2);
}

// ══════════════ LIVE PRICE AUTO-REFRESH (15s) ══════════════
let livePollInterval = null;

function startLivePolling() {
    stopLivePolling();
    livePollInterval = setInterval(async () => {
        if (!currentTicker) return;
        try {
            const res = await fetch("/api/live-price", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticker: currentTicker })
            });
            const data = await res.json();
            if (data.price && analysisData && analysisData.technicals) {
                analysisData.technicals.price = data.price;
                // Update the price display in Key Metrics
                const priceEl = document.querySelector("#keyMetrics .data-item .data-value");
                if (priceEl) {
                    priceEl.textContent = fmtCurrency(data.price);
                    priceEl.classList.add("price-flash");
                    setTimeout(() => priceEl.classList.remove("price-flash"), 600);
                }
                // Update last candle on chart if available
                if (candleSeries && data.price) {
                    const now = new Date();
                    const todayStr = now.toISOString().slice(0, 10);
                    candleSeries.update({
                        time: todayStr,
                        open: data.price,
                        high: data.price,
                        low: data.price,
                        close: data.price,
                    });
                }
            }
        } catch (e) { /* silent fail for polling */ }
    }, 15000);
}

function stopLivePolling() {
    if (livePollInterval) {
        clearInterval(livePollInterval);
        livePollInterval = null;
    }
}

// Start polling after each analysis
const origRunAnalysis = runAnalysis;

// ══════════════ OPTIONS CHAIN ══════════════
let optionsChainData = null;
let showCallsOrPuts = 'calls';

async function loadOptionsChainForTicker(ticker) {
    try {
        const res = await fetch("/api/options/chain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker })
        });
        optionsChainData = await res.json();
        if (optionsChainData.error) {
            document.getElementById("optionsChainTable").innerHTML = `<p class="ai-placeholder">${optionsChainData.error}</p>`;
            return;
        }
        // Populate expiry selector
        const sel = document.getElementById("optExpiry");
        sel.innerHTML = (optionsChainData.expirations || []).map(e => `<option value="${e}" ${e === optionsChainData.expiration ? 'selected' : ''}>${e}</option>`).join("");
        // Set payoff strike default to current price
        if (optionsChainData.current_price) {
            document.getElementById("payoffStrike").value = Math.round(optionsChainData.current_price);
        }
        renderOptionsChain();
    } catch (e) {
        document.getElementById("optionsChainTable").innerHTML = `<p class="ai-placeholder">Failed to load options chain</p>`;
    }
}

function renderOptionsChain() {
    if (!optionsChainData) return;
    const data = showCallsOrPuts === 'calls' ? optionsChainData.calls : optionsChainData.puts;
    if (!data || !data.length) {
        document.getElementById("optionsChainTable").innerHTML = `<p class="ai-placeholder">No data available</p>`;
        return;
    }
    const curPrice = optionsChainData.current_price || 0;
    let html = `<table class="data-table"><thead><tr>
        <th>Strike</th><th>Last</th><th>Bid</th><th>Ask</th><th>Volume</th><th>OI</th><th>IV</th>
        <th>Delta</th><th>Gamma</th><th>Theta</th><th>Vega</th>
    </tr></thead><tbody>`;
    for (const opt of data) {
        const itm = (showCallsOrPuts === 'calls' && opt.strike < curPrice) || (showCallsOrPuts === 'puts' && opt.strike > curPrice);
        const cls = itm ? ' class="positive"' : '';
        html += `<tr${cls}>
            <td><strong>${opt.strike}</strong></td>
            <td>${(opt.lastPrice || 0).toFixed(2)}</td>
            <td>${(opt.bid || 0).toFixed(2)}</td>
            <td>${(opt.ask || 0).toFixed(2)}</td>
            <td>${(opt.volume || 0).toLocaleString()}</td>
            <td>${(opt.openInterest || 0).toLocaleString()}</td>
            <td>${((opt.impliedVolatility || 0) * 100).toFixed(1)}%</td>
            <td>${(opt.delta || 0).toFixed(4)}</td>
            <td>${(opt.gamma || 0).toFixed(6)}</td>
            <td>${(opt.theta || 0).toFixed(4)}</td>
            <td>${(opt.vega || 0).toFixed(4)}</td>
        </tr>`;
    }
    html += '</tbody></table>';
    document.getElementById("optionsChainTable").innerHTML = html;
}

// Options chain button events
document.getElementById("loadChainBtn")?.addEventListener("click", async () => {
    if (!currentTicker) return;
    const exp = document.getElementById("optExpiry").value;
    try {
        const res = await fetch("/api/options/chain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker: currentTicker, expiration: exp })
        });
        optionsChainData = await res.json();
        renderOptionsChain();
    } catch (e) { console.error(e); }
});

document.querySelectorAll('[data-chain]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-chain]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showCallsOrPuts = btn.dataset.chain;
        renderOptionsChain();
    });
});

// Payoff Diagram
let payoffChartInstance = null;
document.getElementById("drawPayoffBtn")?.addEventListener("click", async () => {
    const strike = parseFloat(document.getElementById("payoffStrike").value) || 100;
    const premium = parseFloat(document.getElementById("payoffPremium").value) || 5;
    const optType = document.getElementById("payoffType").value;
    const dir = document.getElementById("payoffDirection").value;
    const curPrice = optionsChainData?.current_price || strike;
    try {
        const res = await fetch("/api/options/payoff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ strike, premium, option_type: optType, is_long: dir === 'long', current_price: curPrice })
        });
        const data = await res.json();
        renderPayoffChart(data.points, strike);
    } catch (e) { console.error(e); }
});

function renderPayoffChart(points, strike) {
    const container = document.getElementById("payoffChart");
    container.innerHTML = "";
    if (payoffChartInstance) { payoffChartInstance.remove(); payoffChartInstance = null; }
    const cc = getChartColors();
    payoffChartInstance = LightweightCharts.createChart(container, {
        width: container.clientWidth || 600, height: 300,
        layout: { background: { color: cc.bg }, textColor: cc.text },
        grid: { vertLines: { color: cc.grid }, horzLines: { color: cc.grid } },
        rightPriceScale: { borderColor: cc.border },
    });
    const series = payoffChartInstance.addLineSeries({ color: '#6366f1', lineWidth: 2 });
    const d = points.map((p, i) => ({ time: i + 1, value: p.profit }));
    series.setData(d);
    // Add zero line
    const zeroLine = payoffChartInstance.addLineSeries({ color: 'rgba(255,255,255,0.2)', lineWidth: 1, lineStyle: 2 });
    zeroLine.setData(d.map(p => ({ time: p.time, value: 0 })));
    payoffChartInstance.timeScale().fitContent();
}


// ══════════════ MARKET DASHBOARD ══════════════
async function loadMarketDashboard() {
    try {
        const res = await fetch("/api/market-summary");
        const data = await res.json();
        if (data.error) { console.error(data.error); return; }
        renderMarketCards("dashIndices", data.indices || []);
        renderMarketCards("dashCommodities", data.commodities || []);
        renderMarketCards("dashCurrencies", data.currencies || []);
    } catch (e) { console.error("Market dashboard failed:", e); }
}

function renderMarketCards(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container || !items.length) return;
    container.innerHTML = items.map(item => {
        const sign = item.change >= 0 ? '+' : '';
        const cls = item.change >= 0 ? 'positive' : 'negative';
        const arrow = item.change >= 0 ? '▲' : '▼';
        return `<div class="market-card">
            <div class="mc-name">${item.name}</div>
            <div class="mc-price" data-target="${item.price}">${item.price > 0 ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</div>
            <div class="mc-change ${cls}">${arrow} ${sign}${item.change.toFixed(2)} (${sign}${item.change_pct.toFixed(2)}%)</div>
        </div>`;
    }).join('');
    // Animate counters
    container.querySelectorAll('.mc-price[data-target]').forEach(el => {
        animateCounter(el, parseFloat(el.dataset.target));
    });
}

function animateCounter(el, target) {
    if (!target || target <= 0) return;
    const duration = 800;
    const start = performance.now();
    const startVal = 0;
    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = startVal + (target - startVal) * eased;
        el.textContent = current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// Auto-refresh dashboard every 60s
let dashboardInterval = null;
function startDashboardRefresh() {
    if (dashboardInterval) clearInterval(dashboardInterval);
    loadMarketDashboard();
    dashboardInterval = setInterval(loadMarketDashboard, 60000);
}

// ══════════════ PORTFOLIO ══════════════
let equityCurveChart = null;

async function loadPortfolio() {
    try {
        const res = await fetch("/api/portfolio");
        const data = await res.json();
        if (data.error) { console.error(data.error); return; }
        renderPortfolioSummary(data);
        renderPositionsTable(data.positions);
        renderPendingOrders(data.pending_orders || []);
        loadPortfolioAnalytics();
        loadTransactionHistory();
        loadEquityCurve();
    } catch (e) { console.error("Portfolio load failed:", e); }
}

function renderPortfolioSummary(data) {
    const fmt = (v) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2 });
    const pnlClass = data.total_pnl >= 0 ? 'positive' : 'negative';

    document.getElementById("pfTotalValue").textContent = fmt(data.total_value);
    document.getElementById("pfCash").textContent = fmt(data.cash);
    const bpEl = document.getElementById("pfBuyingPower");
    if (bpEl) bpEl.textContent = fmt(data.buying_power || data.cash);
    document.getElementById("pfPositionsValue").textContent = fmt(data.positions_value);
    const muEl = document.getElementById("pfMarginUsed");
    if (muEl) muEl.textContent = fmt(data.margin_used || 0);
    const pnlEl = document.getElementById("pfPnL");
    pnlEl.textContent = (data.total_pnl >= 0 ? '+' : '') + fmt(data.total_pnl);
    pnlEl.className = 'data-value ' + pnlClass;
    const retEl = document.getElementById("pfReturnPct");
    retEl.textContent = (data.total_pnl_pct >= 0 ? '+' : '') + data.total_pnl_pct.toFixed(2) + '%';
    retEl.className = 'data-value ' + pnlClass;

    // Update badges
    const slipEl = document.getElementById("pfSlippageLabel");
    if (slipEl && data.slippage_bps !== undefined) slipEl.textContent = `Slip: ${data.slippage_bps} bps`;
    const commEl = document.getElementById("pfCommLabel");
    if (commEl && data.commission_per_share !== undefined) commEl.textContent = `Comm: $${data.commission_per_share}/sh`;
}

function renderPositionsTable(positions) {
    const container = document.getElementById("positionsTable");
    if (!positions || !positions.length) {
        container.innerHTML = '<p class="ai-placeholder">No open positions. Use the Trade Terminal to buy your first asset.</p>';
        return;
    }
    let html = `<table class="data-table"><thead><tr>
        <th>Ticker</th><th>Side</th><th>Type</th><th>Shares</th><th>Avg Cost</th><th>Current</th><th>Value</th><th>P&L</th><th>P&L %</th><th>Alloc %</th>
    </tr></thead><tbody>`;
    for (const p of positions) {
        const pnlClass = p.pnl >= 0 ? 'positive' : 'negative';
        const sideClass = p.side === 'LONG' ? 'positive' : 'negative';
        html += `<tr>
            <td><strong>${p.ticker}</strong></td>
            <td class="${sideClass}">${p.side}</td>
            <td>${p.asset_type}</td>
            <td>${p.shares}</td>
            <td>$${p.avg_cost.toFixed(2)}</td>
            <td>$${p.current_price.toFixed(2)}</td>
            <td>$${p.market_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td class="${pnlClass}">${p.pnl >= 0 ? '+' : ''}$${p.pnl.toFixed(2)}</td>
            <td class="${pnlClass}">${p.pnl_pct >= 0 ? '+' : ''}${p.pnl_pct.toFixed(2)}%</td>
            <td>${p.allocation_pct.toFixed(1)}%</td>
        </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderPendingOrders(orders) {
    const container = document.getElementById("pendingOrdersTable");
    if (!container) return;
    if (!orders || !orders.length) {
        container.innerHTML = '<p class="ai-placeholder">No pending orders.</p>';
        return;
    }
    let html = `<table class="data-table"><thead><tr>
        <th>ID</th><th>Type</th><th>Side</th><th>Ticker</th><th>Shares</th><th>Target Price</th><th>Created</th><th>Action</th>
    </tr></thead><tbody>`;
    for (const o of orders) {
        html += `<tr>
            <td>#${o.id}</td>
            <td>${o.order_type}</td>
            <td class="${o.side === 'BUY' ? 'positive' : 'negative'}">${o.side}</td>
            <td><strong>${o.ticker}</strong></td>
            <td>${o.shares}</td>
            <td>$${o.target_price.toFixed(2)}</td>
            <td>${o.created_at}</td>
            <td><button class="btn-sm btn-danger" onclick="cancelPendingOrder(${o.id})">Cancel</button></td>
        </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function cancelPendingOrder(orderId) {
    try {
        await fetch("/api/portfolio/cancel-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: orderId })
        });
        loadPortfolio();
    } catch (e) { console.error(e); }
}

async function loadEquityCurve() {
    try {
        const res = await fetch("/api/portfolio/equity-curve");
        const data = await res.json();
        if (!data.curve || data.curve.length < 2) return;

        const container = document.getElementById("equityCurveContainer");
        if (!container) return;

        if (equityCurveChart) {
            equityCurveChart.remove();
            equityCurveChart = null;
        }

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        equityCurveChart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: 260,
            layout: { background: { type: 'solid', color: 'transparent' }, textColor: isDark ? '#94a3b8' : '#64748b' },
            grid: { vertLines: { visible: false }, horzLines: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' } },
            rightPriceScale: { borderVisible: false },
            timeScale: { borderVisible: false },
        });

        const series = equityCurveChart.addAreaSeries({
            topColor: 'rgba(99,102,241,0.3)',
            bottomColor: 'rgba(99,102,241,0.02)',
            lineColor: '#6366f1',
            lineWidth: 2,
        });

        const chartData = data.curve.map((pt, i) => ({
            time: pt.timestamp.split('T')[0] || pt.timestamp.split(' ')[0],
            value: pt.total_value
        }));

        // Deduplicate by time (keep last)
        const seen = {};
        const uniqueData = [];
        for (const d of chartData) {
            seen[d.time] = d;
        }
        for (const key of Object.keys(seen).sort()) {
            uniqueData.push(seen[key]);
        }

        if (uniqueData.length >= 2) {
            series.setData(uniqueData);
            equityCurveChart.timeScale().fitContent();
        }

        new ResizeObserver(() => {
            equityCurveChart?.applyOptions({ width: container.clientWidth });
        }).observe(container);
    } catch (e) { console.error("Equity curve:", e); }
}

async function loadPortfolioAnalytics() {
    try {
        const res = await fetch("/api/portfolio/analytics");
        const data = await res.json();
        const container = document.getElementById("portfolioAnalytics");
        container.innerHTML = `
            <div class="data-grid">
                <div class="data-item"><div class="data-label">Sharpe Ratio</div><div class="data-value">${data.sharpe_ratio}</div></div>
                <div class="data-item"><div class="data-label">Sortino Ratio</div><div class="data-value">${data.sortino_ratio || 0}</div></div>
                <div class="data-item"><div class="data-label">Calmar Ratio</div><div class="data-value">${data.calmar_ratio || 0}</div></div>
                <div class="data-item"><div class="data-label">Profit Factor</div><div class="data-value">${data.profit_factor || 0}</div></div>
                <div class="data-item"><div class="data-label">Max Drawdown</div><div class="data-value negative">${data.max_drawdown_pct}%</div></div>
                <div class="data-item"><div class="data-label">Win Rate</div><div class="data-value">${data.win_rate}%</div></div>
                <div class="data-item"><div class="data-label">Total Trades</div><div class="data-value">${data.total_trades}</div></div>
                <div class="data-item"><div class="data-label">Winning</div><div class="data-value positive">${data.winning_trades}</div></div>
                <div class="data-item"><div class="data-label">Losing</div><div class="data-value negative">${data.losing_trades}</div></div>
                <div class="data-item"><div class="data-label">Avg Win</div><div class="data-value positive">$${data.avg_win}</div></div>
                <div class="data-item"><div class="data-label">Avg Loss</div><div class="data-value negative">$${data.avg_loss}</div></div>
                <div class="data-item"><div class="data-label">Best Trade</div><div class="data-value positive">$${data.best_trade}</div></div>
                <div class="data-item"><div class="data-label">Worst Trade</div><div class="data-value negative">$${data.worst_trade}</div></div>
                <div class="data-item"><div class="data-label">Gross Profit</div><div class="data-value positive">$${data.gross_profit || 0}</div></div>
                <div class="data-item"><div class="data-label">Gross Loss</div><div class="data-value negative">$${data.gross_loss || 0}</div></div>
                <div class="data-item"><div class="data-label">Total Commission</div><div class="data-value">${data.total_commission || 0}</div></div>
                <div class="data-item"><div class="data-label">Total Slippage</div><div class="data-value">${data.total_slippage || 0}</div></div>
                <div class="data-item"><div class="data-label">Total Return</div><div class="data-value ${data.total_return_pct >= 0 ? 'positive' : 'negative'}">${data.total_return_pct}%</div></div>
            </div>
        `;
    } catch (e) { console.error(e); }
}

async function loadTransactionHistory() {
    try {
        const res = await fetch("/api/portfolio/history");
        const data = await res.json();
        const container = document.getElementById("transactionHistory");
        if (!data.transactions || !data.transactions.length) {
            container.innerHTML = '<p class="ai-placeholder">No transactions yet.</p>';
            return;
        }
        let html = `<table class="data-table"><thead><tr>
            <th>Date</th><th>Action</th><th>Side</th><th>Ticker</th><th>Shares</th><th>Price</th><th>Slip</th><th>Comm</th><th>Total</th><th>P&L</th>
        </tr></thead><tbody>`;
        for (const t of data.transactions) {
            const actionColors = { BUY: 'positive', SELL: 'negative', SHORT: 'negative', COVER: 'positive' };
            const actionClass = actionColors[t.action] || '';
            const pnlStr = t.pnl != null ? `<span class="${t.pnl >= 0 ? 'positive' : 'negative'}">${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}</span>` : '—';
            html += `<tr>
                <td>${t.timestamp}</td>
                <td class="${actionClass}"><strong>${t.action}</strong></td>
                <td>${t.side || 'LONG'}</td>
                <td>${t.ticker}</td>
                <td>${t.shares}</td>
                <td>$${t.price.toFixed(4)}</td>
                <td>$${(t.slippage || 0).toFixed(4)}</td>
                <td>$${(t.commission || 0).toFixed(2)}</td>
                <td>$${t.total.toFixed(2)}</td>
                <td>${pnlStr}</td>
            </tr>`;
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) { console.error(e); }
}

// ── Trade Terminal Controls ──────────────────────

// Order type toggle: show/hide limit price field
document.getElementById("tradeOrderType")?.addEventListener("change", (e) => {
    const priceField = document.getElementById("tradeLimitPrice");
    if (priceField) {
        priceField.style.display = (e.target.value === 'market') ? 'none' : '';
    }
});

// Trade search autocomplete
let tradeSearchTimeout = null;
document.getElementById("tradeTicker")?.addEventListener("input", async (e) => {
    const q = e.target.value.trim();
    const dropdown = document.getElementById("tradeDropdown");
    if (!dropdown) return;
    if (q.length < 1) { dropdown.classList.remove("open"); return; }

    clearTimeout(tradeSearchTimeout);
    tradeSearchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
            const results = await res.json();
            if (!results.length) { dropdown.classList.remove("open"); return; }
            dropdown.innerHTML = results.slice(0, 8).map(r =>
                `<div class="trade-dropdown-item" data-ticker="${r.ticker}">
                    <span class="ticker-sym">${r.ticker}</span>
                    <span class="ticker-name">${r.name}</span>
                </div>`
            ).join('');
            dropdown.classList.add("open");

            dropdown.querySelectorAll('.trade-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    document.getElementById("tradeTicker").value = item.dataset.ticker;
                    dropdown.classList.remove("open");
                });
            });
        } catch (e) { dropdown.classList.remove("open"); }
    }, 250);
});

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById("tradeDropdown");
    const input = document.getElementById("tradeTicker");
    if (dropdown && !dropdown.contains(e.target) && e.target !== input) {
        dropdown.classList.remove("open");
    }
});

// Helper to get trade params
function getTradeParams() {
    const ticker = document.getElementById("tradeTicker").value.trim().toUpperCase();
    const shares = parseFloat(document.getElementById("tradeShares").value);
    const assetType = document.getElementById("tradeAssetType").value;
    const orderType = document.getElementById("tradeOrderType")?.value || 'market';
    const limitPrice = parseFloat(document.getElementById("tradeLimitPrice")?.value) || 0;
    return { ticker, shares, assetType, orderType, limitPrice };
}

async function executeTrade(action) {
    const { ticker, shares, assetType, orderType, limitPrice } = getTradeParams();
    const resultEl = document.getElementById("tradeResult");
    if (!ticker || !shares || shares <= 0) {
        resultEl.innerHTML = '<span class="negative">Enter a valid ticker and quantity</span>';
        return;
    }

    // Handle limit/stop orders
    if (orderType !== 'market' && (action === 'buy' || action === 'sell')) {
        if (limitPrice <= 0) {
            resultEl.innerHTML = '<span class="negative">Enter a valid price for limit/stop order</span>';
            return;
        }
        const endpoint = orderType === 'limit' ? '/api/portfolio/limit-order' : '/api/portfolio/stop-order';
        resultEl.innerHTML = '<span>Placing order...</span>';
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticker, shares, price: limitPrice,
                    side: action === 'buy' ? 'BUY' : 'SELL',
                    asset_type: assetType
                })
            });
            const data = await res.json();
            if (data.error) {
                resultEl.innerHTML = `<span class="negative">${data.error}</span>`;
            } else {
                resultEl.innerHTML = `<span class="positive">${orderType.toUpperCase()} order placed: ${data.side} ${data.shares} ${data.ticker} @ $${data.target_price}</span>`;
                loadPortfolio();
            }
        } catch (e) { resultEl.innerHTML = `<span class="negative">Error: ${e.message}</span>`; }
        return;
    }

    // Market orders
    const endpoints = {
        buy: '/api/portfolio/buy',
        sell: '/api/portfolio/sell',
        short: '/api/portfolio/short',
        cover: '/api/portfolio/cover'
    };
    resultEl.innerHTML = '<span>Processing...</span>';
    try {
        const res = await fetch(endpoints[action], {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker, shares, asset_type: assetType })
        });
        const data = await res.json();
        if (data.error) {
            resultEl.innerHTML = `<span class="negative">${data.error}</span>`;
        } else {
            const labels = { buy: 'Bought', sell: 'Sold', short: 'Shorted', cover: 'Covered' };
            let msg = `${labels[action]} ${data.shares} ${data.ticker} @ $${data.price.toFixed(2)}`;
            if (data.commission) msg += ` | Comm: $${data.commission.toFixed(2)}`;
            if (data.pnl !== undefined) msg += ` | P&L: <span class="${data.pnl >= 0 ? 'positive' : 'negative'}">${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}</span>`;
            resultEl.innerHTML = `<span class="positive">${msg}</span>`;
            loadPortfolio();
        }
    } catch (e) { resultEl.innerHTML = `<span class="negative">Error: ${e.message}</span>`; }
}

// Button handlers
document.getElementById("buyBtn")?.addEventListener("click", () => executeTrade('buy'));
document.getElementById("sellBtn")?.addEventListener("click", () => executeTrade('sell'));
document.getElementById("shortBtn")?.addEventListener("click", () => executeTrade('short'));
document.getElementById("coverBtn")?.addEventListener("click", () => executeTrade('cover'));

// Reset portfolio
document.getElementById("resetPortfolioBtn")?.addEventListener("click", async () => {
    if (!confirm("Reset portfolio to $100,000? All positions, orders, and history will be deleted.")) return;
    try {
        await fetch("/api/portfolio/reset", { method: "POST" });
        loadPortfolio();
    } catch (e) { console.error(e); }
});

// Load portfolio when tab is clicked
document.querySelector('.nav-item[data-tab="portfolio"]')?.addEventListener("click", () => {
    loadPortfolio();
});

// ── App Init ──────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    // Load market dashboard when app starts (after welcome dismiss)
    const letsBeginBtn = document.getElementById("letsBeginBtn");
    if (letsBeginBtn) {
        const origHandler = letsBeginBtn.onclick;
        letsBeginBtn.addEventListener("click", () => {
            setTimeout(() => startDashboardRefresh(), 500);
        });
    }
    // Also load portfolio after a delay
    setTimeout(() => loadPortfolio(), 1500);
});

