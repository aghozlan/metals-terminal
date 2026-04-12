# Precious Metals Terminal

Bloomberg-style precious metals trading terminal by **Ahmad Ghozlan** — Data Scientist · MSc Applied Statistics · Lebanon 🇱🇧

**Live:** [aghozlan.github.io/metals-terminal](https://aghozlan.github.io/metals-terminal)

---

## Features

- **Live spot prices** — Gold, Silver, Platinum via GoldAPI.io (60s refresh)
- **Price cards** — bid/ask spread, day range, 52-week bar, sparkline, EUR + LBP equivalent
- **Gold/Silver ratio** gauge with historical context
- **Currency converter** — USD ↔ EUR ↔ LBP ↔ troy oz ↔ grams
- **Interactive chart** — candlestick OHLC + SMA 7/30/200 + Bollinger Bands + volume
- **Technical indicators** — RSI(14), MACD(12,26,9), Bollinger %B
- **Quantitative analysis** — volatility, correlation matrix, regression, returns distribution
- **AI forecast** — 7-day trend extrapolation with 95% CI
- **Market context** — geopolitical event timeline, macro correlations
- **Price alerts** — browser notifications, localStorage persistence
- **ATH records table**

## Setup

1. Get a free API key from [goldapi.io](https://www.goldapi.io)
2. Edit `data/config.js` — replace `YOUR_GOLDAPI_KEY` with your key
3. Open `index.html` or serve with `npx serve .`

## Tech Stack

- Pure HTML / CSS / JavaScript — no build step
- [Chart.js](https://www.chartjs.org/) + chartjs-chart-financial
- [Frankfurter API](https://www.frankfurter.app/) for EUR/USD (free, no key)
- LBP rate hardcoded at 89,500/USD

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/aghozlan/metals-terminal.git
git push -u origin main
# Enable GitHub Pages → main branch in repo settings
```

## License

CC BY 4.0 — Ahmad Ghozlan

---

*Prices delayed max 60 seconds · Not financial advice · For educational purposes only*
