// ─────────────────────────────────────────────
//  PRICES.JS — Live price fetching & management
//  Source chain: CurrencyAPI (XAU/XAG) → GoldAPI → Metals.dev → hardcoded
// ─────────────────────────────────────────────

const PriceManager = (() => {
  let priceData      = {};
  let eurRate        = null;
  let lastUpdated    = null;
  let updateTimer    = null;
  let countdownTimer = null;
  let secondsUntilUpdate = CONFIG.REFRESH_INTERVAL / 1000;

  // Metals.dev uses lowercase names, not symbols
  const METALSDEV_NAMES = { XAU: 'gold', XAG: 'silver', XPT: 'platinum' };

  // ── SOURCE 1: fawazahmed0 currency-api (XAU + XAG only) ──
  // Free, no key, CORS-enabled. Returns inverse rates: invert to get USD/oz.
  // Cache is shared across all three metal fetches in one update cycle.
  let _currencyApiPromise = null;

  async function _loadCurrencyAPI() {
    if (_currencyApiPromise) return _currencyApiPromise;
    _currencyApiPromise = (async () => {
      const urls = [CONFIG.CURRENCY_API_PRIMARY, CONFIG.CURRENCY_API_FALLBACK];
      for (const url of urls) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) continue;
          return await res.json();
        } catch { /* try next */ }
      }
      throw new Error('CurrencyAPI: both endpoints failed');
    })();
    return _currencyApiPromise;
  }

  async function fetchCurrencyAPI(symbol) {
    const key = symbol.toLowerCase();   // 'xau' or 'xag'
    const data = await _loadCurrencyAPI();
    const inverseRate = data?.usd?.[key];
    if (!inverseRate) throw new Error(`CurrencyAPI: no rate for ${symbol}`);
    const price = 1 / inverseRate;
    const PRICE_FLOOR   = { XAU: 200, XAG: 2 };
    const PRICE_CEILING = { XAU: 20000, XAG: 500 };
    if (price < PRICE_FLOOR[symbol] || price > PRICE_CEILING[symbol]) {
      throw new Error(`CurrencyAPI: ${symbol} price ${price.toFixed(2)} out of range`);
    }
    return {
      symbol,
      price,
      prev_close: price,   // daily API — no intraday prev-close
      open:       price,
      high:       price,
      low:        price,
      change:     0,
      change_pct: 0,
      timestamp:  Date.now() / 1000,
      ask:        price * 1.0003,
      bid:        price * 0.9997,
      source:     'CurrencyAPI'
    };
  }

  // ── SOURCE 2: GoldAPI.io ──────────────────────────────────
  async function fetchGoldAPI(symbol) {
    const url = `${CONFIG.GOLDAPI_BASE}/${symbol}/USD`;
    const res = await fetch(url, {
      headers: { 'x-access-token': CONFIG.GOLDAPI_KEY },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`GoldAPI HTTP ${res.status}`);
    const d = await res.json();
    if (!d.price) throw new Error('GoldAPI: no price field');

    // GoldAPI can return the inverse rate (oz per USD) in certain configurations.
    // If price is below a realistic floor we invert; above a ceiling we also reject.
    const PRICE_FLOOR   = { XAU: 200,   XAG: 2,    XPT: 200   };
    const PRICE_CEILING = { XAU: 20000, XAG: 500,  XPT: 10000 };
    let price = d.price;
    if (price > 0 && price < PRICE_FLOOR[symbol]) {
      console.warn(`[PriceManager] GoldAPI ${symbol}: price ${price} looks inverted — using 1/price`);
      price = 1 / price;
    }
    if (price < PRICE_FLOOR[symbol] || price > PRICE_CEILING[symbol]) {
      throw new Error(`GoldAPI: ${symbol} price ${price} out of expected range`);
    }

    return {
      symbol,
      price,
      prev_close: d.prev_close_price || price,
      open:       d.open_price       || price,
      high:       d.high_price       || price,
      low:        d.low_price        || price,
      change:     d.ch               || 0,
      change_pct: d.chp              || 0,
      timestamp:  d.timestamp        || Date.now() / 1000,
      ask:        d.ask              || price * 1.0003,
      bid:        d.bid              || price * 0.9997,
      source:     'GoldAPI'
    };
  }

  // ── SOURCE 2: Metals.dev ──────────────────────────────────
  async function fetchMetalsDev(symbol) {
    const metal = METALSDEV_NAMES[symbol];
    const url   = `${CONFIG.METALSDEV_BASE}?metal=${metal}&currency=USD&unit=toz&api_key=${CONFIG.METALSDEV_KEY}`;
    const res   = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Metals.dev HTTP ${res.status}`);
    const d = await res.json();
    // Metals.dev returns { status, metal, currency, unit, price, change, change_percentage }
    if (d.status !== 'success' || !d.price) throw new Error(`Metals.dev: ${d.message || 'bad response'}`);
    const price  = d.price;
    const change = d.change             || 0;
    const chp    = d.change_percentage  || 0;
    return {
      symbol,
      price,
      prev_close: price - change,
      open:       price - change,
      high:       price * 1.003,     // Metals.dev doesn't give day OHLC — estimate
      low:        price * 0.997,
      change,
      change_pct: chp,
      timestamp:  Date.now() / 1000,
      ask:        price * 1.0003,
      bid:        price * 0.9997,
      source:     'Metals.dev'
    };
  }

  // ── SOURCE 3: Hardcoded fallback ──────────────────────────
  function buildFallback(symbol) {
    const fb     = CONFIG.FALLBACK_PRICES[symbol];
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
      source:     'Offline'
    };
  }

  // ── Fetch one metal: try chain in order ───────────────────
  async function fetchMetal(symbol) {
    // 1. CurrencyAPI — free, no key, CORS-safe (XAU + XAG only)
    if (symbol !== 'XPT') {
      try {
        const data = await fetchCurrencyAPI(symbol);
        console.info(`[PriceManager] ${symbol} via CurrencyAPI — $${data.price.toFixed(2)}`);
        return data;
      } catch (e) {
        console.warn(`[PriceManager] CurrencyAPI failed for ${symbol}: ${e.message}`);
      }
    }

    // 2. GoldAPI (intraday; free tier = 100 req/month)
    try {
      const data = await fetchGoldAPI(symbol);
      console.info(`[PriceManager] ${symbol} via GoldAPI — $${data.price}`);
      return data;
    } catch (e) {
      console.warn(`[PriceManager] GoldAPI failed for ${symbol}: ${e.message}`);
    }

    // 3. Metals.dev
    try {
      const data = await fetchMetalsDev(symbol);
      console.info(`[PriceManager] ${symbol} via Metals.dev — $${data.price}`);
      return data;
    } catch (e) {
      console.warn(`[PriceManager] Metals.dev failed for ${symbol}: ${e.message}`);
    }

    // 4. Hardcoded
    console.warn(`[PriceManager] ${symbol} using hardcoded fallback`);
    return buildFallback(symbol);
  }

  // ── EUR rate ──────────────────────────────────────────────
  // Primary: reuse the CurrencyAPI payload already fetched this cycle (usd.eur).
  // Fallback: Frankfurter (blocks CORS on some networks — caught upstream).
  async function fetchEurRate() {
    try {
      const data = await _loadCurrencyAPI();
      const rate = data?.usd?.eur;
      if (rate && rate > 0.5 && rate < 1.5) return rate;
    } catch { /* fall through to Frankfurter */ }

    const res  = await fetch(`${CONFIG.FRANKFURTER_BASE}/latest?from=USD&to=EUR`,
                              { signal: AbortSignal.timeout(6000) });
    const d = await res.json();
    return d.rates.EUR;
  }

  // ── Fetch all three metals (in parallel) ──────────────────
  async function fetchAllPrices() {
    const [xau, xag, xpt] = await Promise.all(
      CONFIG.METALS.map(s => fetchMetal(s))
    );
    return { XAU: xau, XAG: xag, XPT: xpt };
  }

  // ── Update source badge in header ─────────────────────────
  function updateSourceBadge(prices) {
    const vals         = Object.values(prices);
    const sources      = [...new Set(vals.map(p => p.source))];
    const offlineCount = vals.filter(p => p.source === 'Offline').length;
    const allOffline   = offlineCount === vals.length;
    const el = document.getElementById('data-source-badge');
    if (el) {
      if (allOffline) {
        el.textContent = '⚠ Offline data';
        el.style.color = '#f0a500';
      } else if (sources.includes('GoldAPI')) {
        el.textContent = offlineCount ? '● GoldAPI (partial)' : '● GoldAPI Live';
        el.style.color = 'var(--green)';
      } else if (sources.includes('Metals.dev')) {
        el.textContent = offlineCount ? '● Metals.dev (partial)' : '● Metals.dev';
        el.style.color = '#4da6ff';
      } else if (sources.includes('CurrencyAPI')) {
        // XPT may be on fallback — note it in the badge
        el.textContent = offlineCount ? '● ECB Daily (XPT est.)' : '● ECB Daily';
        el.style.color = '#4da6ff';
      } else {
        el.textContent = '● Live';
        el.style.color = 'var(--green)';
      }
    }

    // Banner: only show when every metal is on hardcoded fallback
    const banner = document.getElementById('api-fallback-banner');
    if (banner) banner.classList.toggle('show', allOffline);
  }

  // ── Main update cycle ─────────────────────────────────────
  async function update() {
    _currencyApiPromise = null;   // reset per-cycle cache
    const dot = document.getElementById('market-status-dot');
    try {
      dot?.classList.add('fetching');

      const [prices, eur] = await Promise.all([
        fetchAllPrices(),
        fetchEurRate().catch(() => eurRate || 0.922)
      ]);

      const oldData = { ...priceData };
      priceData   = prices;
      eurRate     = eur;
      lastUpdated = new Date();

      updateSourceBadge(prices);

      document.dispatchEvent(new CustomEvent('pricesUpdated', {
        detail: { prices: priceData, eurRate, lastUpdated, oldData }
      }));

      secondsUntilUpdate = CONFIG.REFRESH_INTERVAL / 1000;

    } catch (err) {
      console.error('[PriceManager] Update cycle error:', err);
    } finally {
      dot?.classList.remove('fetching');
    }
  }

  // ── Countdown ─────────────────────────────────────────────
  function updateCountdownUI() {
    const el = document.getElementById('update-countdown');
    if (el) el.textContent = `${secondsUntilUpdate}s`;
    if (secondsUntilUpdate > 0) secondsUntilUpdate--;
  }

  // ── Market session ────────────────────────────────────────
  function getMarketStatus() {
    const now     = new Date();
    const utcHour = now.getUTCHours();
    const utcDay  = now.getUTCDay();

    if (utcDay === 6) return { open: false, session: 'Weekend',  color: '#888' };
    if (utcDay === 0 && utcHour < 22) return { open: false, session: 'Pre-Open', color: '#f0a500' };
    if (utcDay === 5 && utcHour >= 21) return { open: false, session: 'Closed',  color: '#888' };

    if (utcHour >= 22 || utcHour < 7)  return { open: true, session: 'Asia Session',     color: '#00ff88' };
    if (utcHour >= 7  && utcHour < 13) return { open: true, session: 'London Session',   color: '#00ff88' };
    if (utcHour >= 13 && utcHour < 21) return { open: true, session: 'New York Session', color: '#00ff88' };
    return { open: true, session: 'Spot Market', color: '#00ff88' };
  }

  // ── Public ────────────────────────────────────────────────
  function start() {
    update();
    updateTimer    = setInterval(update, CONFIG.REFRESH_INTERVAL);
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
  function toEur(usd)        { return usd * (eurRate || 0.922); }
  function toLbp(usd)        { return usd * CONFIG.LBP_RATE; }
  function toGram(usd)       { return usd / CONFIG.TROY_OZ_TO_GRAM; }

  function format(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  return { start, stop, getPrice, getAllPrices, getEurRate, getLastUpdated,
           getStatus, toEur, toLbp, toGram, format };
})();
