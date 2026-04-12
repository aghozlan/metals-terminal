// ─────────────────────────────────────────────
//  PRICES.JS — Live price fetching & management
// ─────────────────────────────────────────────

const PriceManager = (() => {
  let priceData = {};
  let eurRate = null;
  let lastUpdated = null;
  let updateTimer = null;
  let countdownTimer = null;
  let secondsUntilUpdate = 60;

  // ── Fetch a single metal from GoldAPI ──────────────────────
  async function fetchMetal(symbol) {
    const url = `${CONFIG.GOLDAPI_BASE}/${symbol}/USD`;
    const response = await fetch(url, {
      headers: { 'x-access-token': CONFIG.GOLDAPI_KEY }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return {
      symbol,
      price:      data.price,
      prev_close: data.prev_close_price,
      open:       data.open_price,
      high:       data.high_price,
      low:        data.low_price,
      change:     data.ch,
      change_pct: data.chp,
      timestamp:  data.timestamp,
      ask:        data.ask  || data.price * 1.0003,
      bid:        data.bid  || data.price * 0.9997,
    };
  }

  // ── Fetch EUR rate from Frankfurter ───────────────────────
  async function fetchEurRate() {
    const url = `${CONFIG.FRANKFURTER_BASE}/latest?from=USD&to=EUR`;
    const res = await fetch(url);
    const data = await res.json();
    return data.rates.EUR;
  }

  // ── Build price object from fallback ─────────────────────
  function buildFallback(symbol) {
    const fb = CONFIG.FALLBACK_PRICES[symbol];
    const change = fb.price - fb.prev_close;
    return {
      symbol,
      price:      fb.price,
      prev_close: fb.prev_close,
      open:       fb.open,
      high:       fb.high,
      low:        fb.low,
      change,
      change_pct: (change / fb.prev_close) * 100,
      timestamp:  Date.now() / 1000,
      ask:        fb.price * 1.0003,
      bid:        fb.price * 0.9997,
      isFallback: true
    };
  }

  // ── Fetch all metals ──────────────────────────────────────
  async function fetchAllPrices() {
    const results = {};
    for (const symbol of CONFIG.METALS) {
      try {
        results[symbol] = await fetchMetal(symbol);
      } catch (err) {
        console.warn(`[PriceManager] API failed for ${symbol}, using fallback:`, err.message);
        results[symbol] = buildFallback(symbol);
      }
    }
    return results;
  }

  // ── Main update cycle ─────────────────────────────────────
  async function update() {
    try {
      document.getElementById('market-status-dot')?.classList.add('fetching');

      const [prices, eur] = await Promise.all([
        fetchAllPrices(),
        fetchEurRate().catch(() => 0.922)   // fallback EUR rate
      ]);

      const oldData = { ...priceData };
      priceData = prices;
      eurRate = eur;
      lastUpdated = new Date();

      // Dispatch custom event so all modules can react
      document.dispatchEvent(new CustomEvent('pricesUpdated', {
        detail: { prices: priceData, eurRate, lastUpdated, oldData }
      }));

      secondsUntilUpdate = CONFIG.REFRESH_INTERVAL / 1000;
      updateCountdownUI();

    } catch (err) {
      console.error('[PriceManager] Update failed:', err);
    } finally {
      document.getElementById('market-status-dot')?.classList.remove('fetching');
    }
  }

  // ── Countdown display ─────────────────────────────────────
  function updateCountdownUI() {
    const el = document.getElementById('update-countdown');
    if (el) el.textContent = `${secondsUntilUpdate}s`;
    secondsUntilUpdate--;
    if (secondsUntilUpdate < 0) secondsUntilUpdate = CONFIG.REFRESH_INTERVAL / 1000;
  }

  // ── Market session status ─────────────────────────────────
  function getMarketStatus() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay  = now.getUTCDay();   // 0=Sun, 6=Sat

    // Forex / spot gold: 22:00 Sun – 21:00 Fri UTC
    if (utcDay === 6) return { open: false, session: 'Weekend', color: '#888' };
    if (utcDay === 0 && utcHour < 22) return { open: false, session: 'Pre-Open', color: '#f0a500' };
    if (utcDay === 5 && utcHour >= 21) return { open: false, session: 'Closed', color: '#888' };

    // Sessions
    if (utcHour >= 0 && utcHour < 8)   return { open: true, session: 'Asia', color: '#00ff88' };
    if (utcHour >= 7 && utcHour < 16)  return { open: true, session: 'London', color: '#00ff88' };
    if (utcHour >= 13 && utcHour < 21) return { open: true, session: 'New York', color: '#00ff88' };
    return { open: true, session: 'Spot', color: '#00ff88' };
  }

  // ── Public API ────────────────────────────────────────────
  function start() {
    update();
    updateTimer = setInterval(update, CONFIG.REFRESH_INTERVAL);
    countdownTimer = setInterval(updateCountdownUI, 1000);
  }

  function stop() {
    clearInterval(updateTimer);
    clearInterval(countdownTimer);
  }

  function getPrice(symbol)  { return priceData[symbol] || null; }
  function getAllPrices()     { return priceData; }
  function getEurRate()      { return eurRate || 0.922; }
  function getLastUpdated()  { return lastUpdated; }
  function getStatus()       { return getMarketStatus(); }

  // Helpers
  function toEur(usd)  { return usd * (eurRate || 0.922); }
  function toLbp(usd)  { return usd * CONFIG.LBP_RATE; }
  function toGram(usd) { return usd / CONFIG.TROY_OZ_TO_GRAM; }

  function format(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  return { start, stop, getPrice, getAllPrices, getEurRate, getLastUpdated,
           getStatus, toEur, toLbp, toGram, format };
})();
