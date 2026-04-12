// ─────────────────────────────────────────────
//  PRECIOUS METALS TERMINAL — Configuration
// ─────────────────────────────────────────────
const CONFIG = {
  // GoldAPI.io — replace with your actual key
  GOLDAPI_KEY: 'YOUR_GOLDAPI_KEY',
  GOLDAPI_BASE: 'https://www.goldapi.io/api',

  // Frankfurter (free, no key needed)
  FRANKFURTER_BASE: 'https://api.frankfurter.app',

  // Lebanese Pound parallel rate (update periodically)
  LBP_RATE: 89500,

  // Refresh interval in milliseconds
  REFRESH_INTERVAL: 60000,

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

  // Fallback prices (used when API is unavailable)
  FALLBACK_PRICES: {
    XAU: { price: 6773.00, prev_close: 6678.00, open: 6678.00, high: 6825.00, low: 6645.00 },
    XAG: { price: 295.25,  prev_close: 282.65,  open: 282.65,  high: 296.85,  low: 282.35 },
    XPT: { price: 10958.00, prev_close: 10585.00, open: 10585.00, high: 10985.00, low: 10562.00 }
  }
};
