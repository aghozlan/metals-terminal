// ─────────────────────────────────────────────
//  CHARTS.JS — All Chart.js chart management
// ─────────────────────────────────────────────

const Charts = (() => {
  let mainChart     = null;
  let rsiChart      = null;
  let macdChart     = null;
  let bbChart       = null;
  let forecastChart = null;

  let activeMetal  = 'XAU';
  let activeRange  = '1Y';
  let historicalData = null;

  // Overlay toggles
  const overlays = { sma7: true, sma30: true, sma200: false, bb: true, volume: true };

  // ── Date range filter ─────────────────────────────────────
  function filterByRange(data, range) {
    const now  = new Date();
    const cutoff = new Date(now);
    switch (range) {
      case '1D': cutoff.setDate(now.getDate() - 1);   break;
      case '1W': cutoff.setDate(now.getDate() - 7);   break;
      case '1M': cutoff.setMonth(now.getMonth() - 1); break;
      case '3M': cutoff.setMonth(now.getMonth() - 3); break;
      case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
      case '5Y': cutoff.setFullYear(now.getFullYear() - 5); break;
      default:   return data;
    }
    return data.filter(d => new Date(d.date) >= cutoff);
  }

  // ── Build candlestick datasets ─────────────────────────────
  function buildMainDatasets(data) {
    const filtered = filterByRange(data, activeRange);
    const dates    = filtered.map(d => d.date);
    const closes   = filtered.map(d => d.close);

    const candleData = filtered.map(d => ({
      x: d.date,
      o: d.open,
      h: d.high,
      l: d.low,
      c: d.close
    }));

    const datasets = [];

    // Candlesticks
    datasets.push({
      label: 'OHLC',
      type: 'candlestick',
      data: candleData,
      color: {
        up:   '#00ff88',
        down: '#ff4444',
        unchanged: '#888888'
      },
      borderColor: {
        up:   '#00ff88',
        down: '#ff4444',
        unchanged: '#888888'
      }
    });

    // SMAs
    if (overlays.sma7) {
      const sma7 = Indicators.sma(closes, 7);
      datasets.push({
        label: 'SMA 7',
        type: 'line',
        data: dates.map((d, i) => ({ x: d, y: sma7[i] })),
        borderColor: '#00e5ff',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: 'y'
      });
    }

    if (overlays.sma30) {
      const sma30 = Indicators.sma(closes, 30);
      datasets.push({
        label: 'SMA 30',
        type: 'line',
        data: dates.map((d, i) => ({ x: d, y: sma30[i] })),
        borderColor: '#f0a500',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: 'y'
      });
    }

    if (overlays.sma200) {
      const sma200 = Indicators.sma(closes, 200);
      datasets.push({
        label: 'SMA 200',
        type: 'line',
        data: dates.map((d, i) => ({ x: d, y: sma200[i] })),
        borderColor: '#b46ef5',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: 'y'
      });
    }

    // Bollinger Bands
    if (overlays.bb) {
      const bb = Indicators.bollingerBands(closes, 20, 2);
      datasets.push({
        label: 'BB Upper',
        type: 'line',
        data: dates.map((d, i) => ({ x: d, y: bb.upper[i] })),
        borderColor: 'rgba(200,200,200,0.4)',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: false,
        yAxisID: 'y'
      });
      datasets.push({
        label: 'BB Lower',
        type: 'line',
        data: dates.map((d, i) => ({ x: d, y: bb.lower[i] })),
        borderColor: 'rgba(200,200,200,0.4)',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: '-1',
        backgroundColor: 'rgba(200,200,200,0.05)',
        yAxisID: 'y'
      });
    }

    // Volume bars
    if (overlays.volume) {
      const maxVol = Math.max(...filtered.map(d => d.volume || 0));
      datasets.push({
        label: 'Volume',
        type: 'bar',
        data: dates.map((d, i) => ({ x: d, y: filtered[i].volume || 0 })),
        backgroundColor: filtered.map(d =>
          d.close >= d.open ? 'rgba(0,255,136,0.25)' : 'rgba(255,68,68,0.25)'),
        borderWidth: 0,
        yAxisID: 'volume'
      });
    }

    // Event annotation data
    const events = filtered.filter(d => d.event).map(d => ({ date: d.date, label: d.event }));

    return { datasets, dates, closes, filtered, events };
  }

  // ── Main chart ─────────────────────────────────────────────
  function initMainChart() {
    const canvas = document.getElementById('main-chart');
    if (!canvas || !historicalData) return;

    const metal = historicalData[activeMetal];
    const { datasets, events } = buildMainDatasets(metal.weekly);

    // Build annotations
    const annotations = {};
    events.forEach((ev, i) => {
      annotations[`event${i}`] = {
        type: 'line',
        xMin: ev.date, xMax: ev.date,
        borderColor: '#D4AF37',
        borderWidth: 1.5,
        borderDash: [4, 4],
        label: {
          content: ev.label,
          enabled: true,
          position: 'start',
          backgroundColor: 'rgba(212,175,55,0.9)',
          color: '#0a0a0a',
          font: { size: 10, weight: 'bold' },
          padding: { x: 4, y: 2 }
        }
      };
    });

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(canvas, {
      type: 'bar',    // base type — datasets override
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#999', font: { size: 11 }, boxWidth: 20, padding: 12 }
          },
          tooltip: {
            backgroundColor: 'rgba(15,15,20,0.95)',
            borderColor: 'rgba(212,175,55,0.4)',
            borderWidth: 1,
            titleColor: '#D4AF37',
            bodyColor: '#ccc',
            callbacks: {
              label: ctx => {
                if (ctx.dataset.label === 'OHLC') {
                  const d = ctx.raw;
                  return [
                    `O: $${d.o?.toFixed(2)}  H: $${d.h?.toFixed(2)}`,
                    `L: $${d.l?.toFixed(2)}  C: $${d.c?.toFixed(2)}`
                  ];
                }
                return `${ctx.dataset.label}: ${ctx.parsed.y != null ? '$' + ctx.parsed.y.toFixed(2) : '—'}`;
              }
            }
          },
          annotation: { annotations }
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: activeRange === '1D' ? 'hour' : activeRange === '1W' ? 'day' : 'week' },
            ticks: { color: '#666', maxTicksLimit: 12 },
            grid:  { color: 'rgba(255,255,255,0.04)' }
          },
          y: {
            position: 'right',
            ticks: {
              color: '#888',
              callback: v => '$' + new Intl.NumberFormat('en-US').format(v)
            },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          volume: {
            position: 'left',
            display: overlays.volume,
            max: v => v.max * 5,
            ticks: { color: '#555', font: { size: 9 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  // ── RSI chart ─────────────────────────────────────────────
  function initRSIChart() {
    const canvas = document.getElementById('rsi-chart');
    if (!canvas || !historicalData) return;

    const metal    = historicalData[activeMetal];
    const filtered = filterByRange(metal.weekly, activeRange);
    const dates    = filtered.map(d => d.date);
    const closes   = filtered.map(d => d.close);
    const rsiVals  = Indicators.rsi(closes, 14);

    const currentRSI = rsiVals.filter(v => v !== null).slice(-1)[0] || 50;
    const rsiEl = document.getElementById('rsi-current');
    if (rsiEl) {
      rsiEl.textContent = currentRSI.toFixed(1);
      rsiEl.className   = `rsi-current ${currentRSI > 70 ? 'overbought' : currentRSI < 30 ? 'oversold' : 'neutral'}`;
    }
    const badgeEl = document.getElementById('rsi-badge');
    if (badgeEl) {
      badgeEl.textContent = currentRSI > 70 ? 'OVERBOUGHT' : currentRSI < 30 ? 'OVERSOLD' : 'NEUTRAL';
      badgeEl.className   = `rsi-badge ${currentRSI > 70 ? 'overbought' : currentRSI < 30 ? 'oversold' : 'neutral'}`;
    }

    if (rsiChart) rsiChart.destroy();
    rsiChart = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [{
          label: 'RSI(14)',
          data: dates.map((d, i) => ({ x: d, y: rsiVals[i] })),
          borderColor: '#D4AF37',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          annotation: {
            annotations: {
              ob: { type: 'line', yMin: 70, yMax: 70, borderColor: 'rgba(255,68,68,0.6)', borderWidth: 1, borderDash: [4, 4] },
              os: { type: 'line', yMin: 30, yMax: 30, borderColor: 'rgba(0,255,136,0.6)', borderWidth: 1, borderDash: [4, 4] }
            }
          }
        },
        scales: {
          x: { type: 'time', ticks: { color: '#555', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.03)' } },
          y: {
            min: 0, max: 100,
            position: 'right',
            ticks: { color: '#666', stepSize: 20 },
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  }

  // ── MACD chart ────────────────────────────────────────────
  function initMACDChart() {
    const canvas = document.getElementById('macd-chart');
    if (!canvas || !historicalData) return;

    const metal    = historicalData[activeMetal];
    const filtered = filterByRange(metal.weekly, activeRange);
    const dates    = filtered.map(d => d.date);
    const closes   = filtered.map(d => d.close);
    const { macdLine, signalLine, histogram } = Indicators.macd(closes);

    const lastMACD   = macdLine.filter(v => v !== null).slice(-1)[0] || 0;
    const lastSignal = signalLine.filter(v => v !== null).slice(-1)[0] || 0;
    const bullish    = lastMACD > lastSignal;

    const badgeEl = document.getElementById('macd-badge');
    if (badgeEl) {
      badgeEl.textContent = bullish ? 'BULLISH' : 'BEARISH';
      badgeEl.className   = `macd-badge ${bullish ? 'bullish' : 'bearish'}`;
    }

    if (macdChart) macdChart.destroy();
    macdChart = new Chart(canvas, {
      type: 'bar',
      data: {
        datasets: [
          {
            label: 'Histogram',
            type: 'bar',
            data: dates.map((d, i) => ({ x: d, y: histogram[i] })),
            backgroundColor: dates.map((d, i) =>
              (histogram[i] || 0) >= 0 ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.5)'),
            borderWidth: 0
          },
          {
            label: 'MACD',
            type: 'line',
            data: dates.map((d, i) => ({ x: d, y: macdLine[i] })),
            borderColor: '#4da6ff',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.3
          },
          {
            label: 'Signal',
            type: 'line',
            data: dates.map((d, i) => ({ x: d, y: signalLine[i] })),
            borderColor: '#f0a500',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#777', font: { size: 10 }, boxWidth: 14, padding: 8 }
          }
        },
        scales: {
          x: { type: 'time', ticks: { color: '#555', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.03)' } },
          y: { position: 'right', ticks: { color: '#666' }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
  }

  // ── BB position chart ─────────────────────────────────────
  function initBBChart() {
    const canvas = document.getElementById('bb-chart');
    if (!canvas || !historicalData) return;

    const metal    = historicalData[activeMetal];
    const filtered = filterByRange(metal.weekly, activeRange);
    const dates    = filtered.map(d => d.date);
    const closes   = filtered.map(d => d.close);
    const bb       = Indicators.bollingerBands(closes, 20, 2);

    // % B = (price - lower) / (upper - lower)
    const pctB = closes.map((c, i) => {
      if (bb.upper[i] === null || bb.lower[i] === null) return null;
      const range = bb.upper[i] - bb.lower[i];
      return range > 0 ? (c - bb.lower[i]) / range * 100 : 50;
    });

    const lastBW    = bb.bandwidth.filter(v => v !== null).slice(-1)[0] || 0;
    const lastPctB  = pctB.filter(v => v !== null).slice(-1)[0] || 50;
    const squeeze   = lastBW < 2;

    const bwEl = document.getElementById('bb-bandwidth');
    if (bwEl) bwEl.textContent = lastBW.toFixed(2) + '%';
    const squeezeEl = document.getElementById('bb-squeeze');
    if (squeezeEl) {
      squeezeEl.textContent = squeeze ? '⚡ SQUEEZE DETECTED' : 'No Squeeze';
      squeezeEl.className   = squeeze ? 'bb-squeeze-badge active' : 'bb-squeeze-badge';
    }

    if (bbChart) bbChart.destroy();
    bbChart = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [
          {
            label: '%B Position',
            data: dates.map((d, i) => ({ x: d, y: pctB[i] })),
            borderColor: '#D4AF37',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            backgroundColor: pctB.map(v =>
              v === null ? 'transparent' :
              v > 100 ? 'rgba(255,68,68,0.15)' :
              v < 0   ? 'rgba(0,255,136,0.15)' : 'rgba(212,175,55,0.07)'),
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          annotation: {
            annotations: {
              top: { type: 'line', yMin: 100, yMax: 100, borderColor: 'rgba(255,68,68,0.5)', borderWidth: 1, borderDash: [4, 4] },
              bot: { type: 'line', yMin: 0,   yMax: 0,   borderColor: 'rgba(0,255,136,0.5)', borderWidth: 1, borderDash: [4, 4] },
              mid: { type: 'line', yMin: 50,  yMax: 50,  borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 }
            }
          }
        },
        scales: {
          x: { type: 'time', ticks: { color: '#555', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.03)' } },
          y: {
            position: 'right',
            min: -20, max: 120,
            ticks: {
              color: '#666',
              callback: v => v + '%'
            },
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  }

  // ── Forecast chart ────────────────────────────────────────
  function initForecastChart(closes, preds) {
    const canvas = document.getElementById('forecast-chart');
    if (!canvas) return;

    const histDates  = Array.from({ length: closes.length }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (closes.length - i));
      return d.toISOString().split('T')[0];
    });

    const today   = new Date();
    const predDates = preds.map(p => {
      const d = new Date(today);
      d.setDate(today.getDate() + p.day);
      return d.toISOString().split('T')[0];
    });

    if (forecastChart) forecastChart.destroy();
    forecastChart = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Historical',
            data: histDates.map((d, i) => ({ x: d, y: closes[i] })),
            borderColor: '#D4AF37',
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Forecast',
            data: [
              { x: histDates[histDates.length - 1], y: closes[closes.length - 1] },
              ...predDates.map((d, i) => ({ x: d, y: preds[i].price }))
            ],
            borderColor: '#fff',
            borderWidth: 2,
            borderDash: [6, 3],
            pointRadius: 3,
            pointBackgroundColor: '#D4AF37',
            fill: false
          },
          {
            label: '95% CI Upper',
            data: [
              { x: histDates[histDates.length - 1], y: closes[closes.length - 1] },
              ...predDates.map((d, i) => ({ x: d, y: preds[i].upper }))
            ],
            borderColor: 'rgba(212,175,55,0.3)',
            borderWidth: 1,
            pointRadius: 0,
            fill: false
          },
          {
            label: '95% CI Lower',
            data: [
              { x: histDates[histDates.length - 1], y: closes[closes.length - 1] },
              ...predDates.map((d, i) => ({ x: d, y: preds[i].lower }))
            ],
            borderColor: 'rgba(212,175,55,0.3)',
            borderWidth: 1,
            pointRadius: 0,
            fill: '-1',
            backgroundColor: 'rgba(212,175,55,0.06)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { labels: { color: '#888', font: { size: 11 } } },
          tooltip: {
            backgroundColor: 'rgba(10,10,15,0.95)',
            borderColor: 'rgba(212,175,55,0.4)',
            borderWidth: 1,
            titleColor: '#D4AF37',
            bodyColor: '#ccc'
          }
        },
        scales: {
          x: { type: 'time', ticks: { color: '#555' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { position: 'right', ticks: { color: '#777', callback: v => '$' + v.toFixed(0) }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  // ── Refresh all indicator sub-charts ──────────────────────
  function refreshIndicators() {
    initRSIChart();
    initMACDChart();
    initBBChart();
  }

  // ── Public setters ─────────────────────────────────────────
  function setMetal(symbol) {
    activeMetal = symbol;
    initMainChart();
    refreshIndicators();
  }

  function setRange(range) {
    activeRange = range;
    initMainChart();
    refreshIndicators();
  }

  function toggleOverlay(key) {
    overlays[key] = !overlays[key];
    initMainChart();
  }

  function setHistoricalData(data) {
    historicalData = data;
  }

  function initAll(data) {
    historicalData = data;
    initMainChart();
    refreshIndicators();
  }

  // Listen for forecast data
  document.addEventListener('forecastReady', e => {
    initForecastChart(e.detail.closes, e.detail.preds);
  });

  return { initAll, setMetal, setRange, toggleOverlay, refreshIndicators };
})();
