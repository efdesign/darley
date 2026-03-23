/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

let config = {
  DEBUG: false,
  USE_MOCKS: false,
  BINANCE_PROXY_URL: "https://noisy-snow-cb60.enrico-furlan.workers.dev/",
  INDEX_URL: "https://eapi.binance.com/eapi/v1/index?underlying=BTCUSDT",
  EXCHANGE_INFO_URL: "https://eapi.binance.com/eapi/v1/exchangeInfo",
  LOCALE: "de-CH",
};

const decimal2Formatter = new Intl.NumberFormat(config.LOCALE, {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat(config.LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const dateFormatter = new Intl.DateTimeFormat(config.LOCALE, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const appState = {
  targetExpiryKey: null,
  selectedCallSymbol: null,
  selectedPutSymbol: null,
  renderedExpiryKey: null,
  skeletonRowCount: 14,
};

const parsedSymbolCache = new Map();

const parseOptionSymbol = (symbol) => {
  if (!symbol) return null;
  let parsed = parsedSymbolCache.get(symbol);
  if (parsed) return parsed;

  const parts = symbol.split("-");
  if (parts.length < 4) return null;

  parsed = {
    base: parts[0],
    expiry: parts[1],
    strike: parts[2],
    side: parts[3],
  };

  parsedSymbolCache.set(symbol, parsed);
  return parsed;
};

const pendingInstrumentUpdates = new Map();
let wsFlushScheduled = false;

const flushWsUpdates = () => {
  wsFlushScheduled = false;
  pendingInstrumentUpdates.forEach((data, symbol) => {
    updateInstrumentDom(symbol, data);
  });
  pendingInstrumentUpdates.clear();
};

const queueInstrumentDomUpdate = (symbol, data) => {
  pendingInstrumentUpdates.set(symbol, data);
  if (wsFlushScheduled) return;
  wsFlushScheduled = true;
  requestAnimationFrame(flushWsUpdates);
};

/** small utitities , loggin, formatting, etc, this might come from external libraries if needed  */
const utils = {

  /** console.log replacement that avoids output if debug is off */
  log: (...args) => {
    if (config.DEBUG) {
      console.log(...args);
    }
  },
  /** console.error replacement that avoids output if debug is off */
  error: (...args) => {
    if (config.DEBUG) {
      console.error(...args);
    }
  },
  /** specific utility to log instrument data returned from binance's web socket */
  logInstrumentData: (instrument) => {
    utils.log("Mark Price Update:", {
      symbol: instrument.s,
      markPrice: instrument.mp,
      indexPrice: instrument.i,
      bestBuyPrice: instrument.bo,
      bestBuyQuantity: instrument.bq,
      bestSellPrice: instrument.ao,
      bestSellQuantity: instrument.aq,
      // buyImpliedVolatility: instrument.b,
      // sellImpliedVolatility: instrument.a,
      // delta: instrument.d,
      // theta: instrument.t,
      // gamma: instrument.g,
      // vega: instrument.v,
    });
  },
  logBestOptionFound: (
    s,
    expiryDifference,
    priceDifference,
    indexPrice,
    nextFriday,
  ) => {
    const strike = Number(s.strikePrice);
    const expiryTs = Number(s.expiryDate);
    const index = Number(indexPrice);
    const expiryDifferenceDays = expiryDifference / (1000 * 60 * 60 * 24);

    const safePrice = (value) =>
      Number.isFinite(value) ? formatCurrency(value) : "-";
    const safeDate = (value) =>
      Number.isFinite(value) ? formatExpiryDate(value) : "-";

    utils.log(
      `New best ${s.side} found: ${s.symbol} | expiry diff: ${expiryDifferenceDays.toFixed(2)} days | strike diff: ${safePrice(priceDifference)} | strike: ${safePrice(strike)} | expiry: ${safeDate(expiryTs)} | index: ${safePrice(index)} | next Friday: ${safeDate(nextFriday)}`,
    );
  },
};

/**
 * A tiny function to update dom via id's
 * with caching to avoid multiple calls to getElementById
 */
const domByIdCache = new Map();

const getElementByIdCached = (id) => {
  let el = domByIdCache.get(id);
  if (!el) {
    el = document.getElementById(id);
    if (!el) return null;
    domByIdCache.set(id, el);
  }
  return el;
};

const updateDom = (id, text) => {
  const el = getElementByIdCached(id);
  if (!el) return;
  el.textContent = text;
};

/**
 * fields to update:
 *- best buy price
 *- best buy quantity
 *- strike price
 *- best sell price
 *- best sell quantity
 */

const instrumentFieldsCache = new Map();

const getInstrumentFields = (id) => {
  let fields = instrumentFieldsCache.get(id);
  if (fields) return fields;

  const container = getElementByIdCached(id);
  if (!container) return null;

  fields = {
    bestBuyPrice: container.querySelector(".best-buy-price"),
    bestBuyQuantity: container.querySelector(".best-buy-quantity"),
    strikePrice: container.querySelector(".strike-price"),
    bestSellPrice: container.querySelector(".best-sell-price"),
    bestSellQuantity: container.querySelector(".best-sell-quantity"),
  };

  instrumentFieldsCache.set(id, fields);
  return fields;
};

const updateInstrumentDom = (id, data) => {
  utils.log("Updating DOM for", id, data);

  const fields = getInstrumentFields(id);
  if (!fields) return;

  // update the fields
  if (fields.bestBuyPrice)
    fields.bestBuyPrice.textContent = formatCurrency(data.bestBuyPrice);
  if (fields.bestBuyQuantity)
    fields.bestBuyQuantity.textContent = formatQuantity(data.bestBuyQuantity);
  if (fields.strikePrice)
    fields.strikePrice.textContent = formatCurrency(data.strikePrice);
  if (fields.bestSellPrice)
    fields.bestSellPrice.textContent = formatCurrency(data.bestSellPrice);
  if (fields.bestSellQuantity)
    fields.bestSellQuantity.textContent = formatQuantity(data.bestSellQuantity);

  const container = document.getElementById(id);
  if (!container) {
    console.warn("Container not found for id:", id);
  } else {
    // js animation removed
  }
};

class BinanceProxy {
  constructor(workerUrl) {
    this.workerUrl = workerUrl;
  }

  async fetch(targetUrl, options = {}) {
    try {
      const response = await fetch(
        `${this.workerUrl}?url=${encodeURIComponent(targetUrl)}`,
        options,
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      utils.error("Proxy fetch error:", error);
      throw error;
    }
  }
}

const proxy = new BinanceProxy(config.BINANCE_PROXY_URL);

/** fetch data using json then apply fast phase 2 algorythm */
const mockedPopulateData = async () => {
  utils.log("Using mock data for index and exchange info");
  const indexData = await fetch("./mocks/call0.json").then((res) =>
    res.json(),
  );
  const exchangeInfoData = await fetch("./mocks/call1.json").then((res) =>
    res.json(),
  );

  // PHASE 2 algorithm
  const result = findNearestOptions(indexData.indexPrice, exchangeInfoData);

  appState.targetExpiryKey = result.expiryKey;
  appState.selectedCallSymbol = result.selectedCall?.symbol || null;
  appState.selectedPutSymbol = result.selectedPut?.symbol || null;

  updateDom("index-price", formatCurrency(indexData.indexPrice));
  updateDom("underlying", BTCUSDT);
  updateDom("expiry-date", formatExpiryDate(result.expiry));
  buildAndRenderExpiryInstruments(exchangeInfoData, result.expiryKey, BTCUSDT);

  updateDom(
    "selected-call",
    result.selectedCall ? formatOptionText(result.selectedCall) : "-",
  );
  updateDom(
    "selected-put",
    result.selectedPut ? formatOptionText(result.selectedPut) : "-",
  );
  highlightInstrument(result.selectedCall);
  highlightInstrument(result.selectedPut);
}

/** fetch data from the real api, via proxy and wait */
const populateData = async () => {
  try {
    const [indexData, exchangeInfoData] = await Promise.all([
      proxy.fetch(config.INDEX_URL),
      proxy.fetch(config.EXCHANGE_INFO_URL),
    ]);

    // PHASE 2 algorithm
    const result = findNearestOptions(indexData.indexPrice, exchangeInfoData);

    appState.targetExpiryKey = result.expiryKey;
    appState.selectedCallSymbol = result.selectedCall?.symbol || null;
    appState.selectedPutSymbol = result.selectedPut?.symbol || null;

    updateDom("index-price", formatCurrency(indexData.indexPrice));
    updateDom("underlying", BTCUSDT);
    updateDom("expiry-date", formatExpiryDate(result.expiry));
    buildAndRenderExpiryInstruments(exchangeInfoData, result.expiryKey, BTCUSDT);

    updateDom(
      "selected-call",
      result.selectedCall ? formatOptionText(result.selectedCall) : "-",
    );
    updateDom(
      "selected-put",
      result.selectedPut ? formatOptionText(result.selectedPut) : "-",
    );
    highlightInstrument(result.selectedCall);
    highlightInstrument(result.selectedPut);

  } catch (err) {
    utils.error("Error fetching data for display:", err);
  }
};
/**
 * fetch the data (cached during development), await them all then call the display function with the data
 * then find the options
 */
async function fetchDataAndDisplay(simulate = config.USE_MOCKS) {
  if (simulate) {
    await mockedPopulateData();
  } else {
    await populateData();
  }
}

fetchDataAndDisplay();

function formatCurrency(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  return decimal2Formatter.format(numericValue);
}

// write a formatting function for expiry date
function formatExpiryDate(timestamp) {
  utils.log("timestamp:", timestamp);
  const date = new Date(timestamp);

  // format to swiss style date
  utils.log(
    "Formatted date:",

  );
  return dateFormatter.format(date);
}

// helpers

const getOptionColor = (symbolData) => {
  return symbolData.status === "TRADING"
    ? symbolData.side === "CALL"
      ? "green"
      : "red"
    : "gray";
};

const formatOptionText = (s) => {
  const strike = formatCurrency(Number(s.strikePrice));
  const expiry = formatExpiryDate(Number(s.expiryDate));
  //return `${s.symbol} | ${s.side} | Strike: ${strike} | Expiry: ${expiry} | Status: ${s.status}`;
  return `${s.symbol} | ${strike} | ${expiry}`;
};

/** phase three - draw overview, subscribe to ws , update data using options symbol (id) */
const drawRawOptionsData = (indexData, exchangeInfoData) => {
  const contractsDiv = document.getElementById("contracts");
  utils.log(contractsDiv);
  if (contractsDiv) {
    const symbols = exchangeInfoData?.optionSymbols || [];

    symbols.forEach((s) => {
      const el = document.createElement("div");
      el.className = "option-item option_item--" + s.side.toLowerCase();

      el.style.color = getOptionColor(s);

      el.textContent = formatOptionText(s);

      contractsDiv.appendChild(el);
    });
  }
};

/** helpers */

const getNextFriday = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  // returns the day of the week as a number (0-6) where 0 is Sunday and 6 is Saturday
  const day = date.getDay();
  const FRIDAY = 5;
  // we want to find the number of days until the next Friday
  // if today is Friday (day = 5), then we want to return the same day, so we add 0 days
  // if today is Saturday (day = 6), we want to add 6 days to get to the next Friday
  // if today is Sunday (day = 0), we want to add 5 days to get to the next Friday
  // if today is Monday (day = 1), we want to add 4 days to get to the next Friday
  // if today is Tuesday (day = 2), we want to add 3 days to get to the next Friday
  // if today is Wednesday (day = 3), we want to add 2 days to get to the next Friday
  // if today is Thursday (day = 4), we want to add 1 day to get to the next Friday
  const diff = (FRIDAY - day + 7) % 7;
  date.setDate(date.getDate() + diff);

  utils.log(
    "Next Friday:",
    date.toLocaleDateString(config.LOCALE, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
  );


  return date;
};

const nf = getNextFriday();

/** extracts yymd from a given date so it's formatted like the expiry in the symbol and can be compared */
const extractYYMMDD = (d) => {
  const year = d.getFullYear().toString().slice(-2);
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
};


const nextFridayDateStr = extractYYMMDD(nf);  // once



const formatQuantity = (quantity) => {
  const numericQuantity = Number(quantity);
  if (!Number.isFinite(numericQuantity)) return "-";
  return quantityFormatter.format(numericQuantity);
};




/**
 * extract of relevant data from exchangeInfoData.optionSymbols
 
  {
      "expiryDate": 1798185600000,
      "symbol": "BTC-261225-105000-C",
      "side": "CALL",
      "strikePrice": "105000.000",
      "underlying": "BTCUSDT",
      "quoteAsset": "USDT",
      "status": "TRADING"
    },
*/

// TODO evaluate performance of function (google chrome dev tools) or coded

// find index price from call 1
// filter efficiently (linearly ?) through the data by: expiry date, strike price, being live, base coin (TODO bonus for user pick)

// learning https://www.investopedia.com/terms/s/strikeprice.asp (information about strike price)

// define some consts for later use
const TRADING = "TRADING";
const BTCUSDT = "BTCUSDT";

/**
 * output is expiry and strike of instruments (PUT and CALL) to highlight
 * i have added additional data
 */
const findNearestOptions = (
  indexPrice,
  exchangeInfoData,
  underlying = BTCUSDT,
) => {
  // relevant fields available in symbols: underlying, side, strikePrice, expiryDate, status,quoteAsset
  // TODO create object/class for mantainability and readability / use typescript

  const symbols = exchangeInfoData?.optionSymbols || [];
  const nextFridayDate = getNextFriday();
  const nextFriday = nextFridayDate.getTime();
  const targetExpiry = extractYYMMDD(nextFridayDate);

  utils.log(symbols, nextFriday);

  // I want to do a single pass over the data so that I can be efficient. Similar to some hacker rank optimization problems.
  // I need to track the best put and best call separately, so I will have separate variables for them

  let selectedCall = null;
  let selectedPut = null;
  let bestCallPriceDiff = Infinity;
  let bestPutPriceDiff = Infinity;

  const candidateSymbols = [];
  let chosenExpiryKey = null;
  let chosenExpiryDiff = Infinity;

  for (const s of symbols) {
    if (s.underlying !== underlying || s.status !== TRADING) continue;
    const parsed = parseOptionSymbol(s.symbol);
    if (!parsed) continue;

    const expiryTs = Number(s.expiryDate);
    if (!Number.isFinite(expiryTs)) continue;

    const expiryDiff = Math.abs(expiryTs - nextFriday);
    if (
      expiryDiff < chosenExpiryDiff ||
      (expiryDiff === chosenExpiryDiff && parsed.expiry === targetExpiry)
    ) {
      chosenExpiryDiff = expiryDiff;
      chosenExpiryKey = parsed.expiry;
    }

    candidateSymbols.push({ symbol: s, parsed });
  }

  for (const item of candidateSymbols) {
    if (chosenExpiryKey && item.parsed.expiry !== chosenExpiryKey) continue;
    const s = item.symbol;
    const currentPriceDifference = Math.abs(Number(s.strikePrice) - indexPrice);

    if (s.side === "CALL") {
      if (currentPriceDifference < bestCallPriceDiff) {
        bestCallPriceDiff = currentPriceDifference;
        selectedCall = s;
        utils.logBestOptionFound(
          s,
          chosenExpiryDiff,
          bestCallPriceDiff,
          indexPrice,
          nextFriday,
        );
      }
    } else if (s.side === "PUT") {
      if (currentPriceDifference < bestPutPriceDiff) {
        bestPutPriceDiff = currentPriceDifference;
        selectedPut = s;

        utils.logBestOptionFound(
          s,
          chosenExpiryDiff,
          bestPutPriceDiff,
          indexPrice,
          nextFriday,
        );
      }
    }
  }

  return {
    // data from requirement
    expiry: nextFriday,
    expiryKey: chosenExpiryKey,
    callStrike: selectedCall?.strikePrice,
    putStrike: selectedPut?.strikePrice,
    // additional data (the whole symbol data) that might be useful for display or future features:
    selectedCall,
    selectedPut,
  };
};

/**
 * v2 - brief compliant variant
 *
 * Compliance points:
 * 1) choose one expiry for both CALL and PUT
 * 2) use next Friday if available, otherwise nearest expiry
 * 3) filter by underlying + TRADING
 * 4) choose strike nearest to index within chosen expiry
 * 5) return the actual chosen expiry timestamp (not always next Friday)
 */
const findNearestOptionsV2 = (
  indexPrice,
  exchangeInfoData,
  underlying = BTCUSDT,
) => {
  const symbols = exchangeInfoData?.optionSymbols || [];
  const nextFridayDate = getNextFriday();
  const nextFridayTs = nextFridayDate.getTime();
  const targetExpiryKey = extractYYMMDD(nextFridayDate);

  const candidateSymbols = [];
  let chosenExpiryKey = null;
  let chosenExpiryDiff = Infinity;
  let chosenExpiryTs = null;

  for (const s of symbols) {
    if (s.underlying !== underlying || s.status !== TRADING) continue;

    const parsed = parseOptionSymbol(s.symbol);
    if (!parsed) continue;

    const expiryTs = Number(s.expiryDate);
    if (!Number.isFinite(expiryTs)) continue;

    const expiryDiff = Math.abs(expiryTs - nextFridayTs);
    if (
      expiryDiff < chosenExpiryDiff ||
      (expiryDiff === chosenExpiryDiff && parsed.expiry === targetExpiryKey)
    ) {
      chosenExpiryDiff = expiryDiff;
      chosenExpiryKey = parsed.expiry;
      chosenExpiryTs = expiryTs;
    }

    candidateSymbols.push({ symbol: s, parsed });
  }

  let selectedCall = null;
  let selectedPut = null;
  let bestCallPriceDiff = Infinity;
  let bestPutPriceDiff = Infinity;

  for (const item of candidateSymbols) {
    if (chosenExpiryKey && item.parsed.expiry !== chosenExpiryKey) continue;
    const s = item.symbol;
    const strikeDiff = Math.abs(Number(s.strikePrice) - Number(indexPrice));

    if (s.side === "CALL" && strikeDiff < bestCallPriceDiff) {
      bestCallPriceDiff = strikeDiff;
      selectedCall = s;
    } else if (s.side === "PUT" && strikeDiff < bestPutPriceDiff) {
      bestPutPriceDiff = strikeDiff;
      selectedPut = s;
    }
  }

  return {
    expiry: chosenExpiryTs,
    expiryKey: chosenExpiryKey,
    callStrike: selectedCall?.strikePrice,
    putStrike: selectedPut?.strikePrice,
    selectedCall,
    selectedPut,
  };
};

const buildAndRenderExpiryInstruments = (
  exchangeInfoData,
  expiryKey,
  underlying = BTCUSDT,
) => {
  ensureSkeletonRows(callTableBody, "CALL");
  ensureSkeletonRows(putTableBody, "PUT");

  if (appState.renderedExpiryKey === expiryKey) return;

  clearGeneratedRows();
  if (!expiryKey) {
    appState.renderedExpiryKey = null;
    return;
  }

  const symbols = exchangeInfoData?.optionSymbols || [];
  const filteredSymbols = [];

  for (const s of symbols) {
    if (s.underlying !== underlying || s.status !== TRADING) continue;
    const parsed = parseOptionSymbol(s.symbol);
    if (!parsed || parsed.expiry !== expiryKey) continue;
    filteredSymbols.push(s);
  }

  filteredSymbols.sort((a, b) => Number(a.strikePrice) - Number(b.strikePrice));

  for (const s of filteredSymbols) {
    const row = addInstrumentRow(s);
    if (!row) continue;
    if (s.side === "CALL") replaceSkeletonWithRow(callTableBody, row);
    if (s.side === "PUT") replaceSkeletonWithRow(putTableBody, row);
  }

  appState.renderedExpiryKey = expiryKey;
};

/**
 * ws sub data shape for 
 * https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/Mark-Price
 *  {
        "s": "BTC-251120-126000-C",    // Symbol
        "mp": "770.543",               // Mark price
        "E": 1762867543321,            // Event time
        "e": "markPrice",              // Event type
        "i": "104334.60217391",        // Index price
        "P": "0.000",                  // Estimated Settle Price, only useful in the 0.5 hour before the settlement starts
        "bo": "0.000",                 // The best buy price
        "ao": "900.000",               // The best sell price
        "bq": "0.0000",                // The best buy quantity
        "aq": "0.2000",                // The best sell quantity
        "b": "-1.0",                   // BuyImplied volatility
        "a": "0.98161161",             // SellImplied volatility 
        "hl": "924.652",               // Buy Maximum price 
        "ll": "616.435",               // Sell Minimum price
        "vo": "0.9408058",             // volatility
        "rf": "0.0",                   // risk free rate
        "d": "0.11111964",             // delta
        "t": "-164.26702615",          // theta
        "g": "0.00001245",             // gamma
        "v": "30.63855919"             // vega
    }
 
    required data:
    - The minimum that needs to be displayed is:
    - best buy price
    - best buy quantity
    - strike price
    - best sell price
    - best sell quantity
 
    sample event data is in ./mocks/optionMarkPriceMessage.json
 */

const getMarkData = (
  wsMessage,
  targetExpiryKey,
) => {
  if (!targetExpiryKey) return;
  const response = JSON.parse(wsMessage.data);

  utils.log("WS Message received:", response);

  response.data.forEach((instrument) => {
    const parsed = parseOptionSymbol(instrument.s);
    if (!parsed) return;
    if (targetExpiryKey && parsed.expiry !== targetExpiryKey) return;

    queueInstrumentDomUpdate(instrument.s, {
      bestBuyPrice: instrument.bo,
      bestBuyQuantity: instrument.bq,
      strikePrice: parsed.strike,
      bestSellPrice: instrument.ao,
      bestSellQuantity: instrument.aq,
    });
  });
};

// NOTE: symbol needs to be lowercase
const optionMarkPrice = new WebSocket(
  `wss://fstream.binance.com/market/stream?streams=${BTCUSDT.toLowerCase()}@optionMarkPrice`,
);

const ws = optionMarkPrice;

ws.onopen = () => {
  utils.log("Connected to Binance WS");
};

ws.onmessage = (event) => {
  // console.log("Received message:", msg);
  getMarkData(event, appState.targetExpiryKey);
};

ws.onerror = (error) => {
  utils.log("WebSocket Error:", error);
};

ws.onclose = () => {
  utils.log("Connection closed");
};

// table dom helpers
const callTable = document.getElementById("table-call");
const strikeTable = document.getElementById("table-strike");
const putTable = document.getElementById("table-put");
const callTableBody = document.getElementById("table-call-body");
const putTableBody = document.getElementById("table-put-body");
const callRowTemplate = document.getElementById('call-row-template');
const putRowTemplate = document.getElementById('put-row-template');

const createSkeletonRow = (side) => {
  const row = document.createElement("tr");
  row.className = `highlighted-instruments__instrument highlighted-instruments__instrument--${side.toLowerCase()} skeleton-row`;
  row.dataset.skeleton = "true";

  const cellClasses =
    side === "CALL"
      ? [
        "best-buy-price",
        "best-buy-quantity",
        "best-sell-price",
        "best-sell-quantity",
        "strike-price",
        "expiry",
      ]
      : [
        "strike-price",
        "best-buy-price",
        "best-buy-quantity",
        "best-sell-price",
        "best-sell-quantity",
        "expiry",
      ];

  for (const cls of cellClasses) {
    const td = document.createElement("td");
    td.className = `instrument__field ${cls}`;
    td.textContent = "-";
    row.appendChild(td);
  }

  return row;
};

const ensureSkeletonRows = (tbody, side) => {
  if (!tbody) return;
  const current = tbody.querySelectorAll("tr[data-skeleton='true']").length;
  const toAdd = Math.max(0, appState.skeletonRowCount - current);
  for (let i = 0; i < toAdd; i += 1) {
    tbody.appendChild(createSkeletonRow(side));
  }
};

const replaceSkeletonWithRow = (tbody, row) => {
  if (!tbody || !row) return;
  const skeleton = tbody.querySelector("tr[data-skeleton='true']");
  if (skeleton) {
    skeleton.replaceWith(row);
    return;
  }
  tbody.appendChild(row);
};


// this is hard, if we don't use react templating becomes tedious...
// and we don't get free data binding and reactivity but...
// also dowin qwery selector is slow, probably might need ids as well
const addInstrumentRow = (instrument) => {
  let template = instrument.side === "CALL" ? callRowTemplate : putRowTemplate;
  template.cloneNode(true);
  const parsed = parseOptionSymbol(instrument.symbol);
  const expiryString = parsed ? parsed.expiry : "-";
  const row = template.content.querySelector("tr").cloneNode(true);
  const strikePrice = row.querySelector(".strike-price");
  const bestBuyPrice = row.querySelector(".best-buy-price");
  const bestBuyQuantity = row.querySelector(".best-buy-quantity");
  const bestSellPrice = row.querySelector(".best-sell-price");
  const bestSellQuantity = row.querySelector(".best-sell-quantity");
  const expiry = row.querySelector(".expiry");

  strikePrice.textContent = formatCurrency(instrument.strikePrice);
  bestBuyPrice.textContent = formatCurrency(instrument.bestBuyPrice);
  bestBuyQuantity.textContent = formatQuantity(instrument.bestBuyQuantity);
  bestSellPrice.textContent = formatCurrency(instrument.bestSellPrice);
  bestSellQuantity.textContent = formatQuantity(instrument.bestSellQuantity);
  expiry.textContent = expiryString;
  row.dataset.expiry = expiryString;
  row.dataset.generated = "true";
  row.id = `${instrument.symbol}`;
  return row;

};

const clearGeneratedRows = () => {
  const rows = document.querySelectorAll("tr[data-generated='true']");
  rows.forEach((row) => {
    domByIdCache.delete(row.id);
    instrumentFieldsCache.delete(row.id);
    row.remove();
  });
};

const addStrikeToTable = (strikePrice) => {
  // add a row with cell
  const row = strikeTable.insertRow(-1); // add to the end of the table
  const cell = row.insertCell(0);
  cell.className = "instrument__field strike-price";
  cell.textContent = formatCurrency(strikePrice);
};

// add strike price to the table header

//addStrikeToTable("69000");
//addCallRowToTable({ s: "BTC-260327-69000-C" });

// FOOTER
updateDom(
  "config-debug",
  config.DEBUG ? "Debug mode: ON" : "Debug mode: OFF",
);
updateDom(
  "config-use-mocks",
  config.USE_MOCKS ? "Using: mock data" : "Using: live data",
);


const highlightInstrument = (instrument) => {
  if (!instrument) return;
  const id = instrument.symbol;
  const row = document.getElementById(id);
  if (row) {
    row.classList.add("special-instrument");
  }
};
