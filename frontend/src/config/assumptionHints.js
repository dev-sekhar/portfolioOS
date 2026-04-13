export const ASSUMPTION_HINTS = {
  inflation: {
    ariaId: "inflation-hint",
    text:
      "Inflation is the annual rise in prices that reduces purchasing power. Historical India CPI inflation has averaged around 5-6% across the last decade.",
  },
  smartCagr: {
    text:
      "This estimates expected CAGR from your chosen instrument mix using historical sector return trends across recent 5-year and 10-year periods.",
  },
  manualCagr: {
    ariaId: "cagr-hint",
    text:
      "CAGR is the compounded annual growth rate. Broad market returns over 10 years are often in the high-single-digit to low-double-digit range depending on geography and sector composition.",
  },
  mildStress: {
    ariaId: "mild-hint",
    text:
      "Mild stress models shallow corrections. Historically, routine pullbacks often land in the 5-15% range.",
  },
  recessionStress: {
    ariaId: "recession-hint",
    text:
      "Recession stress simulates deeper contractions. During recessionary periods, drawdowns commonly span roughly 15-35% depending on sector sensitivity.",
  },
  crashStress: {
    ariaId: "crash-hint",
    text:
      "Crash stress reflects severe market dislocation. Historical crises (for example 2008) have shown potential drawdowns of 40%+ before recovery.",
  },
};
