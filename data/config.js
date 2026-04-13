// ─────────────────────────────────────────────
//  PRECIOUS METALS TERMINAL — Configuration
// ─────────────────────────────────────────────
const CONFIG = {
  // ── Primary: GoldAPI.io ──────────────────────
  GOLDAPI_KEY:  'goldapi-2azikssmnw8rg1x-io',
  GOLDAPI_BASE: 'https://www.goldapi.io/api',

  // ── Secondary: Metals.dev ────────────────────
  METALSDEV_KEY:  '9TVJOTMXOISXAJMXR25B315MXR25B',
  METALSDEV_BASE: 'https://api.metals.dev/v1/metal/spot',

  // ── fawazahmed0 currency-api (free, no key, CORS-enabled) ───
  // Returns inverse rates: usd.xau = oz-per-USD → invert for USD/oz
  // Covers XAU + XAG; updated daily from ECB reference data.
  CURRENCY_API_PRIMARY:  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  CURRENCY_API_FALLBACK: 'https://latest.currency-api.pages.dev/v1/currencies/usd.json',

  // ── Frankfurter (free, no key needed) ────────
  FRANKFURTER_BASE: 'https://api.frankfurter.app',

  // Lebanese Pound parallel rate (update periodically)
  LBP_RATE: 89500,

  // Refresh interval — GoldAPI free tier = 100 req/month; 5 min saves quota
  REFRESH_INTERVAL: 300000,

  // Troy oz → gram conversion
  TROY_OZ_TO_GRAM: 31.1035,

  // Metals to track
  METALS: ['XAU', 'XAG', 'XPT'],

  // Metal display names
  METAL_NAMES: {
    XAU: 'Gold',
    XAG: 'Silver',
    XPT: 'Platinum'
  },

  // Metal icons
  METAL_ICONS: {
    XAU: '🥇',
    XAG: '🥈',
    XPT: '🥉'
  },

  // Fallback prices (used when API is unavailable) — updated 2026-04-13
  FALLBACK_PRICES: {
    XAU: { price: 4749.00, prev_close: 4712.00, open: 4712.00, high: 4782.00, low: 4698.00 },
    XAG: { price: 75.40,   prev_close: 74.85,   open: 74.85,   high: 75.90,   low: 74.60  },
    XPT: { price: 2027.00, prev_close: 2009.00, open: 2009.00, high: 2045.00, low: 2001.00 }
  }
};
