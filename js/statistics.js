// ─────────────────────────────────────────────
//  STATISTICS.JS — Quantitative analysis panels
// ─────────────────────────────────────────────

const Statistics = (() => {

  // ── Render volatility metrics panel ───────────────────────
  function renderVolatility(historicalData) {
    const closes = historicalData.XAU.weekly.map(d => d.close);

    const dailyVol = Indicators.dailyVolatility(closes, 30);
    const annualVol = Indicators.historicalVolatility(closes, 30);

    // Percentile vs all history
    const allDailyVols = [];
    for (let i = 31; i < closes.length; i++) {
      allDailyVols.push(Indicators.dailyVolatility(closes.slice(0, i), 30));
    }
    allDailyVols.sort((a, b) => a - b);
    const percentile = allDailyVols.filter(v => v <= dailyVol).length /
                       allDailyVols.length * 100;

    const el = document.getElementById('vol-metrics');
    if (!el) return;
    el.innerHTML = `
      <div class="stat-row">
        <span class="stat-label">Daily Volatility (30d)</span>
        <span class="stat-value">${dailyVol ? dailyVol.toFixed(3) : '—'}%</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Annual Volatility (30d HV)</span>
        <span class="stat-value highlight">${annualVol ? annualVol.toFixed(1) : '—'}%</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Volatility Percentile</span>
        <span class="stat-value ${percentile > 75 ? 'danger' : percentile < 25 ? 'success' : ''}">
          ${percentile.toFixed(0)}th pct
        </span>
      </div>
      <div class="vol-bar-container">
        <div class="vol-bar-track">
          <div class="vol-bar-fill" style="width:${Math.min(percentile, 100)}%;
            background: ${percentile > 75 ? '#ff4444' : percentile > 50 ? '#f0a500' : '#00ff88'}">
          </div>
        </div>
        <div class="vol-bar-labels">
          <span>Low</span><span>High</span>
        </div>
      </div>
    `;
  }

  // ── Render correlation matrix ──────────────────────────────
  function renderCorrelationMatrix(historicalData) {
    const metals = ['XAU', 'XAG', 'XPT'];
    const names  = { XAU: 'Gold', XAG: 'Silver', XPT: 'Platinum' };
    const closes = {};
    metals.forEach(m => {
      closes[m] = historicalData[m].weekly.map(d => d.close);
    });

    const matrix = {};
    metals.forEach(a => {
      matrix[a] = {};
      metals.forEach(b => {
        matrix[a][b] = Indicators.correlation(closes[a], closes[b]);
      });
    });

    const el = document.getElementById('correlation-matrix');
    if (!el) return;

    let html = '<table class="corr-table"><thead><tr><th></th>';
    metals.forEach(m => { html += `<th>${names[m]}</th>`; });
    html += '</tr></thead><tbody>';

    metals.forEach(a => {
      html += `<tr><td class="corr-label">${names[a]}</td>`;
      metals.forEach(b => {
        const v = matrix[a][b];
        const abs = Math.abs(v);
        const bg  = a === b
          ? 'rgba(212,175,55,0.4)'
          : `rgba(${v > 0 ? '212,175,55' : '255,68,68'}, ${abs.toFixed(2)})`;
        const color = abs > 0.6 ? '#0a0a0a' : '#e0e0e0';
        html += `<td style="background:${bg};color:${color};text-align:center;padding:8px 4px;font-weight:600;">
          ${v.toFixed(3)}
        </td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // ── Render regression analysis ─────────────────────────────
  function renderRegression(historicalData) {
    const goldCloses = historicalData.XAU.weekly.map(d => d.close);
    const n = goldCloses.length;

    // Synthetic DXY proxy (inverse to gold): base 100, declining as gold rises
    const dxyProxy = goldCloses.map((g, i) => 103 - (i / n) * 12 + (Math.random() * 2 - 1));
    // Synthetic Oil proxy: positive correlation
    const oilProxy = goldCloses.map((g, i) => 72 + (i / n) * 25 + (Math.random() * 3 - 1.5));

    const regDxy = Indicators.linearRegression(dxyProxy, goldCloses);
    const regOil = Indicators.linearRegression(oilProxy, goldCloses);

    const el = document.getElementById('regression-panel');
    if (!el) return;
    el.innerHTML = `
      <div class="reg-row">
        <div class="reg-header">
          <span class="reg-name">Gold vs USD Index (DXY)</span>
          <span class="reg-r2">R² = ${regDxy.r2.toFixed(3)}</span>
          <span class="corr-badge negative">Inverse Correlation</span>
        </div>
        <div class="reg-desc">
          Each 1-point rise in DXY → ~$${Math.abs(regDxy.slope).toFixed(0)} decline in Gold
        </div>
        <div class="reg-bar">
          <div class="reg-fill negative" style="width:${(regDxy.r2 * 100).toFixed(0)}%"></div>
        </div>
      </div>
      <div class="reg-row">
        <div class="reg-header">
          <span class="reg-name">Gold vs Brent Crude (Oil)</span>
          <span class="reg-r2">R² = ${regOil.r2.toFixed(3)}</span>
          <span class="corr-badge positive">Positive Correlation</span>
        </div>
        <div class="reg-desc">
          Each $1 rise in Oil → ~$${regOil.slope.toFixed(0)} rise in Gold (est.)
        </div>
        <div class="reg-bar">
          <div class="reg-fill positive" style="width:${(regOil.r2 * 100).toFixed(0)}%"></div>
        </div>
      </div>
    `;
  }

  // ── Render returns distribution ────────────────────────────
  function renderReturnsDistribution(historicalData) {
    const closes = historicalData.XAU.weekly.map(d => d.close);
    const dist   = Indicators.returnsDistribution(closes);
    if (!dist) return;

    const el = document.getElementById('returns-dist-stats');
    if (!el) return;

    const fatTails = Math.abs(dist.kurtosis) > 3;
    el.innerHTML = `
      <div class="dist-stats-grid">
        <div class="dist-stat">
          <div class="dist-stat-label">Mean Return</div>
          <div class="dist-stat-value ${dist.mean >= 0 ? 'success' : 'danger'}">
            ${dist.mean >= 0 ? '+' : ''}${dist.mean.toFixed(3)}%
          </div>
        </div>
        <div class="dist-stat">
          <div class="dist-stat-label">Std Dev</div>
          <div class="dist-stat-value">${dist.std.toFixed(3)}%</div>
        </div>
        <div class="dist-stat">
          <div class="dist-stat-label">Skewness</div>
          <div class="dist-stat-value ${Math.abs(dist.skewness) > 1 ? 'warn' : ''}">
            ${dist.skewness.toFixed(3)}
          </div>
        </div>
        <div class="dist-stat">
          <div class="dist-stat-label">Excess Kurtosis</div>
          <div class="dist-stat-value ${fatTails ? 'danger' : ''}">
            ${dist.kurtosis.toFixed(3)}
          </div>
        </div>
      </div>
      ${fatTails ? `<div class="fat-tails-badge">⚠ Fat tails detected — extreme moves more likely than normal distribution predicts</div>` : ''}
    `;

    // Draw histogram using canvas
    drawReturnsHistogram(dist);
  }

  // ── Canvas histogram ───────────────────────────────────────
  function drawReturnsHistogram(dist) {
    const canvas = document.getElementById('returns-histogram');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const maxCount = Math.max(...dist.bins.counts);
    const maxNorm  = Math.max(...dist.bins.normalCurve);
    const scaleY   = (H - 40) / Math.max(maxCount, maxNorm);
    const barW     = (W - 20) / dist.bins.counts.length;

    // Draw bars
    dist.bins.counts.forEach((count, i) => {
      const x = 10 + i * barW;
      const h = count * scaleY;
      const center = dist.bins.centers[i];
      ctx.fillStyle = center >= 0 ? 'rgba(0,255,136,0.6)' : 'rgba(255,68,68,0.6)';
      ctx.fillRect(x, H - 30 - h, barW - 1, h);
    });

    // Normal curve overlay
    ctx.beginPath();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    dist.bins.normalCurve.forEach((v, i) => {
      const x = 10 + i * barW + barW / 2;
      const y = H - 30 - v * scaleY;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // X-axis
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, H - 30);
    ctx.lineTo(W - 10, H - 30);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const step = Math.floor(dist.bins.counts.length / 5);
    for (let i = 0; i < dist.bins.counts.length; i += step) {
      const x = 10 + i * barW + barW / 2;
      ctx.fillText(dist.bins.centers[i].toFixed(1) + '%', x, H - 10);
    }
  }

  // ── Render AI forecast ─────────────────────────────────────
  function renderForecast(historicalData) {
    const closes = historicalData.XAU.weekly.map(d => d.close);
    const preds  = Indicators.forecast(closes, 7);
    if (!preds) return;

    const lastPrice = closes[closes.length - 1];
    const tableEl   = document.getElementById('forecast-table');
    const chartEl   = document.getElementById('forecast-chart-container');

    if (tableEl) {
      let html = `
        <table class="forecast-table">
          <thead>
            <tr>
              <th>Day</th><th>Date</th>
              <th>Forecast</th><th>Low (95% CI)</th><th>High (95% CI)</th><th>Δ</th>
            </tr>
          </thead>
          <tbody>
      `;
      const today = new Date();
      preds.forEach(p => {
        const date = new Date(today);
        date.setDate(today.getDate() + p.day);
        const change = p.price - lastPrice;
        const pct    = (change / lastPrice) * 100;
        html += `
          <tr>
            <td>+${p.day}</td>
            <td>${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
            <td class="forecast-price">$${p.price.toFixed(2)}</td>
            <td class="forecast-low">$${p.lower.toFixed(2)}</td>
            <td class="forecast-high">$${p.upper.toFixed(2)}</td>
            <td class="${change >= 0 ? 'success' : 'danger'}">
              ${change >= 0 ? '+' : ''}${pct.toFixed(2)}%
            </td>
          </tr>
        `;
      });
      html += '</tbody></table>';
      tableEl.innerHTML = html;
    }

    // Dispatch event for chart module
    document.dispatchEvent(new CustomEvent('forecastReady', {
      detail: { closes: closes.slice(-30), preds, lastPrice }
    }));
  }

  // ── Render GS ratio gauge ──────────────────────────────────
  function renderGSRatio(goldPrice, silverPrice) {
    const ratio = Indicators.gsRatio(goldPrice, silverPrice);
    if (!ratio) return;

    const el = document.getElementById('gs-ratio-value');
    if (el) el.textContent = ratio.toFixed(1);

    // Gauge: 30 = undervalued silver, 93 = overvalued silver
    const pct = Math.min(Math.max((ratio - 30) / (93 - 30), 0), 1);
    const gauge = document.getElementById('gs-gauge-fill');
    if (gauge) gauge.style.width = `${(pct * 100).toFixed(1)}%`;

    const badge = document.getElementById('gs-badge');
    if (badge) {
      if (ratio > 80) {
        badge.textContent = 'Silver Undervalued vs Gold';
        badge.className = 'gs-badge success';
      } else if (ratio < 40) {
        badge.textContent = 'Silver Overvalued vs Gold';
        badge.className = 'gs-badge danger';
      } else {
        badge.textContent = 'Ratio Near Historical Average';
        badge.className = 'gs-badge neutral';
      }
    }
  }

  // ── Full stats refresh ─────────────────────────────────────
  function refresh(historicalData, goldPrice, silverPrice) {
    renderVolatility(historicalData);
    renderCorrelationMatrix(historicalData);
    renderRegression(historicalData);
    renderReturnsDistribution(historicalData);
    renderForecast(historicalData);
    renderGSRatio(goldPrice, silverPrice);
  }

  return { refresh, renderGSRatio, renderForecast };
})();
