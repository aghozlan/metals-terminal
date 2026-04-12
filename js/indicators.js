// ─────────────────────────────────────────────
//  INDICATORS.JS — Technical analysis calculations
// ─────────────────────────────────────────────

const Indicators = (() => {

  // ── Simple Moving Average ─────────────────────────────────
  function sma(data, period) {
    const results = new Array(data.length).fill(null);
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      results[i] = slice.reduce((a, b) => a + b, 0) / period;
    }
    return results;
  }

  // ── Exponential Moving Average ────────────────────────────
  function ema(data, period) {
    const k = 2 / (period + 1);
    const results = new Array(data.length).fill(null);
    // Find first valid index
    let startIdx = data.findIndex(v => v !== null);
    if (startIdx < 0) return results;
    results[startIdx + period - 1] = data.slice(startIdx, startIdx + period)
      .reduce((a, b) => a + b, 0) / period;
    for (let i = startIdx + period; i < data.length; i++) {
      results[i] = data[i] * k + results[i - 1] * (1 - k);
    }
    return results;
  }

  // ── Bollinger Bands ───────────────────────────────────────
  function bollingerBands(data, period = 20, stdDevMult = 2) {
    const middle = sma(data, period);
    const upper  = new Array(data.length).fill(null);
    const lower  = new Array(data.length).fill(null);
    const bw     = new Array(data.length).fill(null);   // bandwidth

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean  = middle[i];
      const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
      const sd = Math.sqrt(variance);
      upper[i] = mean + stdDevMult * sd;
      lower[i] = mean - stdDevMult * sd;
      bw[i]    = middle[i] > 0 ? (upper[i] - lower[i]) / middle[i] * 100 : 0;
    }
    return { upper, middle, lower, bandwidth: bw };
  }

  // ── RSI ────────────────────────────────────────────────────
  function rsi(data, period = 14) {
    const results = new Array(data.length).fill(null);
    if (data.length < period + 1) return results;

    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff > 0) gains  += diff;
      else          losses -= diff;
    }

    let avgGain = gains  / period;
    let avgLoss = losses / period;

    for (let i = period; i < data.length; i++) {
      if (i === period) {
        results[i] = 100 - 100 / (1 + (avgGain / (avgLoss || 0.001)));
        continue;
      }
      const diff = data[i] - data[i - 1];
      const g = diff > 0 ? diff : 0;
      const l = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + g) / period;
      avgLoss = (avgLoss * (period - 1) + l) / period;
      results[i] = 100 - 100 / (1 + (avgGain / (avgLoss || 0.001)));
    }
    return results;
  }

  // ── MACD ───────────────────────────────────────────────────
  function macd(data, fast = 12, slow = 26, signal = 9) {
    const emaFast   = ema(data, fast);
    const emaSlow   = ema(data, slow);
    const macdLine  = emaFast.map((v, i) =>
      v !== null && emaSlow[i] !== null ? v - emaSlow[i] : null);
    const signalLine = ema(macdLine.map(v => v === null ? 0 : v), signal);
    // Clean up leading nulls on signal
    const histogram = macdLine.map((v, i) =>
      v !== null && signalLine[i] !== null ? v - signalLine[i] : null);
    return { macdLine, signalLine, histogram };
  }

  // ── Volatility (annualised, %) ─────────────────────────────
  function historicalVolatility(closes, period = 30) {
    if (closes.length < 2) return null;
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
    const recent = returns.slice(-period);
    const mean   = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recent.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;  // annualised %
  }

  // ── Daily volatility ──────────────────────────────────────
  function dailyVolatility(closes, period = 30) {
    if (closes.length < 2) return null;
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
    const recent = returns.slice(-period);
    const mean   = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recent.length;
    return Math.sqrt(variance) * 100;
  }

  // ── Correlation coefficient (Pearson) ─────────────────────
  function correlation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const xs = x.slice(-n), ys = y.slice(-n);
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx, dy = ys[i] - my;
      num  += dx * dy;
      dx2  += dx * dx;
      dy2  += dy * dy;
    }
    return dx2 && dy2 ? num / Math.sqrt(dx2 * dy2) : 0;
  }

  // ── Returns distribution ──────────────────────────────────
  function returnsDistribution(closes) {
    if (closes.length < 3) return null;
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
    }
    const n    = returns.length;
    const mean = returns.reduce((a, b) => a + b, 0) / n;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
    const std  = Math.sqrt(variance);
    const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / std, 3), 0) / n;
    const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / std, 4), 0) / n - 3;

    // Build histogram (20 bins)
    const bins = 20;
    const min  = Math.min(...returns);
    const max  = Math.max(...returns);
    const step = (max - min) / bins;
    const counts = new Array(bins).fill(0);
    const centers = [];
    for (let i = 0; i < bins; i++) centers.push(min + step * (i + 0.5));
    returns.forEach(r => {
      const idx = Math.min(Math.floor((r - min) / step), bins - 1);
      counts[idx]++;
    });

    // Normal distribution overlay
    const normalCurve = centers.map(x => {
      return (n * step) * (1 / (std * Math.sqrt(2 * Math.PI))) *
             Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
    });

    return { returns, mean, std, skewness, kurtosis, bins: { centers, counts, normalCurve } };
  }

  // ── Linear regression ─────────────────────────────────────
  function linearRegression(x, y) {
    const n = Math.min(x.length, y.length);
    const xs = x.slice(-n), ys = y.slice(-n);
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += Math.pow(xs[i] - mx, 2);
    }
    const slope     = den ? num / den : 0;
    const intercept = my - slope * mx;
    const r         = correlation(xs, ys);
    const r2        = r * r;
    return { slope, intercept, r2 };
  }

  // ── ARIMA-style trend forecast ─────────────────────────────
  function forecast(closes, days = 7) {
    if (closes.length < 30) return null;
    const recent = closes.slice(-30);
    const n = recent.length;

    // Linear trend from last 30 points
    const xs = Array.from({ length: n }, (_, i) => i);
    const reg = linearRegression(xs, recent);

    // Calculate residual std for confidence interval
    const residuals = recent.map((c, i) => c - (reg.intercept + reg.slope * i));
    const residStd  = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / n);

    const lastClose = recent[n - 1];
    const predictions = [];
    for (let d = 1; d <= days; d++) {
      const trend = reg.intercept + reg.slope * (n + d - 1);
      const ci95  = 1.96 * residStd * Math.sqrt(1 + 1/n + Math.pow(d - 1, 2) /
                    xs.reduce((sum, x) => sum + Math.pow(x - xs[n - 1], 2), 0.001));
      predictions.push({
        day:   d,
        price: Math.max(trend, lastClose * 0.9),
        upper: trend + ci95,
        lower: Math.max(trend - ci95, lastClose * 0.85)
      });
    }
    return predictions;
  }

  // ── Gold / Silver ratio ───────────────────────────────────
  function gsRatio(goldPrice, silverPrice) {
    return silverPrice > 0 ? goldPrice / silverPrice : null;
  }

  return {
    sma, ema, bollingerBands, rsi, macd,
    historicalVolatility, dailyVolatility,
    correlation, returnsDistribution, linearRegression,
    forecast, gsRatio
  };
})();
