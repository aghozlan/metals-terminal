// ─────────────────────────────────────────────
//  CONVERTER.JS — Currency conversion calculator
// ─────────────────────────────────────────────

const Converter = (() => {

  function update() {
    const amtEl    = document.getElementById('conv-amount');
    const metalEl  = document.getElementById('conv-metal');
    const modeEl   = document.getElementById('conv-mode');
    if (!amtEl || !metalEl || !modeEl) return;

    const amount = parseFloat(amtEl.value) || 0;
    const symbol = metalEl.value;
    const mode   = modeEl.value;   // 'oz' | 'gram' | 'usd'
    const data   = PriceManager.getPrice(symbol);
    if (!data) return;

    const eurRate = PriceManager.getEurRate();
    const lbpRate = CONFIG.LBP_RATE;
    const pricePerOz   = data.price;
    const pricePerGram = pricePerOz / CONFIG.TROY_OZ_TO_GRAM;

    let usdValue = 0;
    let ozValue  = 0;

    if (mode === 'oz') {
      ozValue  = amount;
      usdValue = amount * pricePerOz;
    } else if (mode === 'gram') {
      ozValue  = amount / CONFIG.TROY_OZ_TO_GRAM;
      usdValue = amount * pricePerGram;
    } else if (mode === 'usd') {
      usdValue = amount;
      ozValue  = amount / pricePerOz;
    }

    const eurValue = usdValue * eurRate;
    const lbpValue = usdValue * lbpRate;
    const gramValue = ozValue * CONFIG.TROY_OZ_TO_GRAM;

    // Output cells
    set('conv-out-usd',   `$${fmt(usdValue)}`);
    set('conv-out-eur',   `€${fmt(eurValue)}`);
    set('conv-out-lbp',   `${fmtLbp(lbpValue)} LBP`);
    set('conv-out-oz',    `${ozValue.toFixed(4)} troy oz`);
    set('conv-out-gram',  `${gramValue.toFixed(2)} g`);

    // Gram equivalent for "how much gold"
    const gramQuestion = document.getElementById('gram-question');
    if (gramQuestion && mode === 'usd') {
      gramQuestion.textContent =
        `With $${fmt(amount)} you can buy ≈ ${gramValue.toFixed(2)} g of ${CONFIG.METAL_NAMES[symbol]}`;
    }
  }

  function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function fmt(v) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  }

  function fmtLbp(v) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);
  }

  function init() {
    ['conv-amount', 'conv-metal', 'conv-mode'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', update);
    });
    document.addEventListener('pricesUpdated', update);
    update();
  }

  return { init, update };
})();
