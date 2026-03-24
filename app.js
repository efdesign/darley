/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */


// FOREWORDS ---------------------------------------------------------------------
// I chose to stick to single file for the first version, for easier iteration
// and deployment, no build step etc, i've subdivided "modules" with comments
// app code is at the end of this file

// PROXY ---------------------------------------------------------------------

/**
 * When testing REST I've hit an issue with CORS an local host,
 * so I will proxy the failing calls for the sake of getting the data
 * the proxy code is in worker.js it's running on a free tier cloudflare worker.
 * using classes to demonstrate I could. but will use const style react definitions
 * for the rest of the file
 */
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

// LOGGING ---------------------------------------------------------------------


const utils = {

  /**
   * console.log replacement that avoids output if debug is off,
   * I could redefine console methods or use libraries
   * but for this demo it's ok like this
   **/
  log: (...args) => {
    if (config.DEBUG) {
      console.log(...args);
    }
  },
  /**
   * console.error replacement that avoids output if debug is off
   **/
  error: (...args) => {
    if (config.DEBUG) {
      console.error(...args);
    }
  },
  /**
   * specific utility to log instrument data returned from binance's web socket
   * could be moved in the "component" once I have proper framework (eg. react)
   **/
  logInstrumentData: (instrument) => {
    utils.log("Mark Price Update:", {
      symbol: instrument.s,
      markPrice: instrument.mp,
      indexPrice: instrument.i,
      bestBuyPrice: instrument.bo,
      bestBuyQuantity: instrument.bq,
      bestSellPrice: instrument.ao,
      bestSellQuantity: instrument.aq,
      // the following data is available but I will not use it
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


// DOM MANIPULATION -------------------------------------------------------------------

/**
 * A tiny function to update dom via id's
 * with caching to avoid multiple calls to getElementById
 */


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
const getInstrumentFields = (id) => {
  let fields = instrumentFieldsCache.get(id);
  if (fields) return fields;

  const container = getElementByIdCached(id);
  if (!container) return null;

  // this can be optimized by defining ids,
  // caching and so on or use direct indexes but it's fast enough here.
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


/**
 * animate with js to avoid layout thrashing if possible (still possible that data thrashes layout)
 * this is quite fast and has no perf issues, altough it could use requestAnimationFrame and batch animations
 * but pretty much every row updates so I've removed it as it's just distracting
 * I would needd to only update the fields that change not the entire row for this to be nicer
 * this is not being used, as it's confusing as all rows flash on update, need to target only
 * the changing cells...will do in a future version
 */
const animateInstrumentRow = (containerEl) => {
    containerEl.animate(
        [
          // Keyframes
          { opacity: "0.5" },
          { opacity: "1" },
        ],
        {
          // Timing options
          duration: 500,
          easing: "ease-out",
          iterations: 1,
        },
      );
};

const updateInstrumentDom = (id, data) => {
  utils.log("Updating DOM for", id, data);

  const fields = getInstrumentFields(id);
  if (!fields) return;

  // update the fields
  if (fields.bestBuyPrice)
    fields.bestBuyPrice.textContent = formatCurrency(data.bestBuyPrice);
  if (fields.bestBuyQuantity)
    fields.bestBuyQuantity.textContent = String(data.bestBuyQuantity);
  if (fields.strikePrice)
    fields.strikePrice.textContent = formatCurrency(data.strikePrice);
  if (fields.bestSellPrice)
    fields.bestSellPrice.textContent = formatCurrency(data.bestSellPrice);
  if (fields.bestSellQuantity)
    fields.bestSellQuantity.textContent = String(data.bestSellQuantity);

  const container = document.getElementById(id);
  if (!container) {
    console.warn("Container not found for id:", id);
  } else {
    // see function to see why i commented it
    // animateInstrumentRow(container);
  }
};

const sortByStrikePriceFilter = (a, b) => {
  return Number(a.strikePrice) - Number(b.strikePrice);
};

const parseExpiryKeyFromSymbol = (symbol) => {
  if (typeof symbol !== "string") return null;
  const parts = symbol.split("-");
  return parts.length >= 2 ? parts[1] : null;
};



const buildSymbolFilterContext = (result) => {
  const targetUnderlying = result?.underlying ?? null;
  const resultExpiryTs = Number(result?.expiry);
  const selectedCallExpiryTs = Number(result?.selectedCall?.expiryDate);
  const selectedPutExpiryTs = Number(result?.selectedPut?.expiryDate);

  const selectedCallExpiryKey = parseExpiryKeyFromSymbol(result?.selectedCall?.symbol);
  const selectedPutExpiryKey = parseExpiryKeyFromSymbol(result?.selectedPut?.symbol);

  const targetExpiryKey =
    result?.expiryKey ?? selectedCallExpiryKey ?? selectedPutExpiryKey ?? null;

  const targetExpiryTs = Number.isFinite(resultExpiryTs)
    ? resultExpiryTs
    : Number.isFinite(selectedCallExpiryTs)
      ? selectedCallExpiryTs
      : Number.isFinite(selectedPutExpiryTs)
        ? selectedPutExpiryTs
        : NaN;

  return {
    targetUnderlying,
    targetExpiryKey,
    targetExpiryTs,
    resultExpiryTs,
    selectedCallExpiryTs,
    selectedPutExpiryTs,
    selectedCallExpiryKey,
    selectedPutExpiryKey,
  };
};

const symbolFilter = (result) => {
  const context = buildSymbolFilterContext(result);

  return (symbol) => {
    if (!symbol) return false;
    if (symbol.status !== "TRADING") return false;
    if (symbol.underlying !== context.targetUnderlying) return false;

    // Prefer key-based expiry filtering when available (YYMMDD from symbol).
    if (context.targetExpiryKey) {
      const symbolExpiryKey = parseExpiryKeyFromSymbol(symbol.symbol);
      return symbolExpiryKey === context.targetExpiryKey;
    }

    const expiryTs = Number(symbol.expiryDate);
    return (
      Number.isFinite(expiryTs) &&
      Number.isFinite(context.targetExpiryTs) &&
      expiryTs === context.targetExpiryTs
    );
  };
};

/**
 * fetch data using json then apply fast phase 2 algorithm
 * at the moment this updates DOM and it should not, dom updates should be outside of this function
 */
const fetchMockAndDisplayData = async () => {
  utils.log("Using mock data for index and exchange info");
  const indexData = await fetch("./mocks/call0.json").then((res) =>
    res.json(),
  );
  const exchangeInfoData = await fetch("./mocks/call1.json").then((res) =>
    res.json(),
  );

  // phase 2 algorithm + some more data in return
  const result = findNearestOptions(indexData.indexPrice, exchangeInfoData);
  updateWsSelectionState(result);
  

  updateDom("expiry-date", formatExpiryDate(result.expiry));
  updateDom("index-price", formatCurrency(result.indexPrice));
  updateDom("underlying", result.underlying);
  updateDom("selected-call", formatOptionText(result.selectedCall));
  updateDom("selected-put", formatOptionText(result.selectedPut));

  utils.log("All symbols:", result.symbols);
  
  result.symbols
    .filter(symbolFilter(result))
    .sort(sortByStrikePriceFilter) // sort by strike price to have a better visual representation in the table, this is not strictly necessary but it makes it easier to read
    .forEach((s) =>
      addInstrumentRow(s)
    );

  highlightInstrument(result.selectedCall);
  highlightInstrument(result.selectedPut);
}

/** fetch data from the real api, via proxy and wait */
const fetchAndDisplayData = async () => {
  try {
    // "service" call
    const [indexData, exchangeInfoData] = await Promise.all([
      proxy.fetch(config.INDEX_URL),
      proxy.fetch(config.EXCHANGE_INFO_URL),
    ]);

    // phase 2 algorithm + some more data in return, this is like a mapping step
    const result = findNearestOptions(indexData.indexPrice, exchangeInfoData);
    // ideally I would not update data for ws here 
    updateWsSelectionState(result);
    
    updateDom("expiry-date", formatExpiryDate(result.expiry));
    updateDom("index-price", formatCurrency(result.indexPrice));  
    updateDom("underlying", result.underlying);
    updateDom("selected-call", formatOptionText(result.selectedCall));
    updateDom("selected-put", formatOptionText(result.selectedPut));
    
    result.symbols
    .filter(symbolFilter(result))
    .sort(sortByStrikePriceFilter)
    .forEach((s) => 
      addInstrumentRow(s)
    );

    highlightInstrument(result.selectedCall);
    highlightInstrument(result.selectedPut);

  } catch (err) {
    utils.error("Error fetching data for display:", err);
  }
};
/**
 * fetch the data (cached during development),
 * await them all then call the display function with the data
 * then find the options
 */
async function loadAndRender(simulate) {
  if (simulate === true) {
    await fetchMockAndDisplayData();
  } else {
    console.time("fetchAndDisplayData");
    await fetchAndDisplayData();
  }  

}

/** part of phase 3, draw the overview*/
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



// FORMATTERS  ---------------------------------------------------------------------

function formatCurrency(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";

  return new Intl.NumberFormat(config.LOCALE, {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function formatExpiryDate(timestamp) {
  utils.log("timestamp:", timestamp);
  const date = new Date(timestamp);  

  return date.toLocaleDateString(config.LOCALE, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const formatExpiryKeyForTableCell = (expiryKey) => {
  if (typeof expiryKey !== "string" || expiryKey.length !== 6) return expiryKey;
  const month = expiryKey.slice(2, 4);
  const day = expiryKey.slice(4, 6);
  return `${day}.${month}`;
};


const formatQuantity = (quantity) => {
  const numericQuantity = Number(quantity);
  if (!Number.isFinite(numericQuantity)) return "-";

  return numericQuantity.toLocaleString(config.LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
};



const formatOptionText = (s) => {
  if (!s) return "-";
  const strike = formatCurrency(Number(s.strikePrice));
  const expiry = formatExpiryDate(Number(s.expiryDate));
  //return `${s.symbol} | ${s.side} | Strike: ${strike} | Expiry: ${expiry} | Status: ${s.status}`;
  return `${s.symbol} | ${strike} | ${expiry}`;
};

const getOptionColor = (symbolData) => {
  return symbolData.status === "TRADING"
    ? symbolData.side === "CALL"
      ? "green"
      : "red"
    : "gray";
};




// DATE HELPERS ---------------------------------------------------------------------


// as I discovered late options there might be an issue with binance expiring options at a certain time
// I'm not covering this case
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

/**
 * extracts yymd from a given date
 * so it's formatted like the expiry in the symbol
 * and can be compared
 **/
const extractYYMMDD = (d) => {
  const year = d.getFullYear().toString().slice(-2);
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
};

/**
 * PHASE 2 algoritm:
 * output is expiry and strike of instruments (PUT and CALL) to highlight
 * I've also added additional data as I might need it
 * 
 * relevant from exchangeInfoData.optionSymbols
 * ```
 * {
 *     "expiryDate": 1798185600000,
 *     "symbol": "BTC-261225-105000-C",
 *     "side": "CALL",
 *     "strikePrice": "105000.000",
 *     "underlying": "BTCUSDT",
 *     "quoteAsset": "USDT",
 *     "status": "TRADING"
 *   },
 * ```
 * 
 * other info:
 * - find index price from call 1
 * - filter efficiently (linearly ?) through the data by:
 *   - expiry date
 *   - strike price
 *   - being live
 *   - base coin (TODO bonus for user pick)
 * - learning https://www.investopedia.com/terms/s/strikeprice.asp (information about strike price)
 */
const findNearestOptions = (
  indexPrice,
  exchangeInfoData,
  underlying = BTCUSDT,
) => {
  // relevant fields available in symbols: underlying, side, strikePrice, expiryDate, status,quoteAsset
  // TODO create object/class for mantainability and readability / use typescript

  const symbols = exchangeInfoData?.optionSymbols || [];
  const nextFriday = getNextFriday().getTime();

  // utils.log(symbols, nextFriday);

  // I want to do a single pass over the data so that I can be efficient.
  // Similar to some hacker rank optimization problems.
  // I need to track the best put and best call separately, so I will have separate variables for them

  // what to track
  // 0 distance is ideal
  let callExpiryDifference = Infinity;
  let putExpiryDifference = Infinity;
  // 0 distance is ideal
  let callPriceDifference = Infinity;
  let putPriceDifference = Infinity;

  let selectedCall = null;
  let selectedPut = null;


  for (const s of symbols) {
    // short circuit the underlying and status to discard irrelevant options asap
    if (s.underlying !== underlying || s.status !== TRADING) continue;

    // now track the best instrument in one pass
    const currentExpiryDifference = Math.abs(Number(s.expiryDate) - nextFriday);
    const currentPriceDifference = Math.abs(Number(s.strikePrice) - indexPrice);
    // if we have a closer expiry or closer expiry with better strike price then update the selection

    if (s.side === "CALL") {
      if (
        currentExpiryDifference < callExpiryDifference ||
        (currentExpiryDifference === callExpiryDifference &&
          currentPriceDifference < callPriceDifference)
      ) {
        callExpiryDifference = currentExpiryDifference;
        callPriceDifference = currentPriceDifference;
        selectedCall = s;
      }
    } else if (s.side === "PUT") {
      if (
        currentExpiryDifference < putExpiryDifference ||
        (currentExpiryDifference === putExpiryDifference &&
          currentPriceDifference < putPriceDifference)
      ) {
        putExpiryDifference = currentExpiryDifference;
        putPriceDifference = currentPriceDifference;
        selectedPut = s;
      }
    }
  }



  return {
    // data from requirement
    // please note in this version i favor the call timestamp, this might not be accurate
    // as i discovered tuestay EOD, v2 of this algorithm will address this issue.
    expiry:
      Number(selectedCall?.expiryDate) ||
      Number(selectedPut?.expiryDate) ||
      nextFriday,
    expiryKey:
      parseExpiryKeyFromSymbol(selectedCall?.symbol) ||
      parseExpiryKeyFromSymbol(selectedPut?.symbol) ||
      extractYYMMDD(new Date(nextFriday)),
    callStrike: selectedCall?.strikePrice,
    putStrike: selectedPut?.strikePrice,
    // additional data (the whole symbol data) that might be useful for display or future features:
    selectedCall,
    selectedPut,
    indexPrice: indexPrice,
    exchangeInfoData: exchangeInfoData,
    underlying:underlying,
    symbols:symbols,
  };
};

/**
 * phase2 algorithm v2
 *
 * Compliance points:
 * - choose one expiry for both CALL and PUT
 * - use next Friday if available, otherwise nearest expiry
 * - filter by underlying + TRADING
 * - choose strike nearest to index within chosen expiry
 * - return the actual chosen expiry timestamp (not always next Friday)
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

    const parts = typeof s.symbol === "string" ? s.symbol.split("-") : [];
    if (parts.length < 4) continue;

    const expiryKey = parts[1];
    const expiryTs = Number(s.expiryDate);
    if (!Number.isFinite(expiryTs)) continue;

    const expiryDiff = Math.abs(expiryTs - nextFridayTs);
    if (
      expiryDiff < chosenExpiryDiff ||
      (expiryDiff === chosenExpiryDiff && expiryKey === targetExpiryKey)
    ) {
      chosenExpiryDiff = expiryDiff;
      chosenExpiryKey = expiryKey;
      chosenExpiryTs = expiryTs;
    }

    candidateSymbols.push({ symbol: s, expiryKey });
  }

  let selectedCall = null;
  let selectedPut = null;
  let bestCallPriceDiff = Infinity;
  let bestPutPriceDiff = Infinity;

  for (const item of candidateSymbols) {
    if (chosenExpiryKey && item.expiryKey !== chosenExpiryKey) continue;
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

// -------------------------------------------------------------------


/** services */

/**
 * map/reducer like function for the incoming data.
 * actually it also do dom manipulation which is not ideal 
 * in this version the put and call are still hardcoded
 * 
 * websocket data shape for 
 * https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/Mark-Price
 *  ```{
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
    }```
 
    required data from brief:
    - The minimum that needs to be displayed is:
    - best buy price
    - best buy quantity
    - strike price
    - best sell price
    - best sell quantity
 
    sample event data is in ./mocks/optionMarkPriceMessage.json
 */
const getMarkData = (wsMessage) => {
  const response = JSON.parse(wsMessage.data);
  const { targetExpiryKey, selectedCallSymbol, selectedPutSymbol } = wsSelectionState;

  utils.log("WS Message received:", response);

  response.data.forEach((instrument) => {
    const instrumentSymbol = instrument?.s;
    if (!instrumentSymbol) return;

    const instrumentExpiryKey = parseExpiryKeyFromSymbol(instrumentSymbol);
    if (targetExpiryKey && instrumentExpiryKey !== targetExpiryKey) return;

    // we will update the instrument based on symbol, it will just fail if it's not there.
    updateInstrumentDom(instrumentSymbol, {
      bestBuyPrice: instrument.bo,
      bestBuyQuantity: instrument.bq,
      strikePrice: instrumentSymbol.split("-")[2], // extract strike price from symbol
      bestSellPrice: instrument.ao,
      bestSellQuantity: instrument.aq,
    });
  });
};

// DOM ---------------------------------------------------------------------

/**
 *  a function that is similar to a an object mapper + instance builder
 *  i could move the mapping part (...format) outside
 *  If we don't use react templating manipulating dom becomes tedious
 *  and we don't get free data binding and reactivity but...
 *  also doing query selector is slow, probably might need ids or direct access as well, update data in batch would also be better
 *  as well as checking layout shift
 *  also...this should be done in batch with fragments if optimized or handled by the framework (react, to batch uptates)
 */
const addInstrumentRow = (instrument) => {
  // add a row with cell
  let template = instrument.side === "CALL" ? callRowTemplate : putRowTemplate;
  let table = instrument.side === "CALL" ? callTable : putTable;
  template.cloneNode(true);
  const expiryString = instrument.symbol.split("-")[1];
  const expiryText = formatExpiryKeyForTableCell(expiryString);
  const row = template.content.querySelector("tr").cloneNode(true);
  //
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

  expiry.textContent = expiryText;
  // add symbol as data attribute for later use, this is needed to update the row when we receive ws updates, we can use the symbol to identify the row to update
  row.dataset.expiry = expiryString; 
  row.id = `${instrument.symbol}`;
  table.appendChild(row);

};

/** bit of a junk solution probably, temporary */
const hideByExpiryDate = (nextFridayDateStr) => {
  // they will be there but not contribute to render 
  const rows = document.querySelectorAll(`[data-expiry]:not([data-expiry="${nextFridayDateStr}"])`);
  utils.log("Hiding rows with expiry:", nextFridayDateStr, rows);
  rows.forEach(row => {
    row.style.display = "none";
  });
}



const highlightInstrument = (instrument) => {
  if (!instrument) return;
  const id = instrument.symbol;
  const row = document.getElementById(id);
  if (row) {
    row.classList.add("special-instrument");
  }
};

// -------------------------------------------------------------------
// APP CODE

// define some config
const config = {
  DEBUG: false,
  USE_MOCKS: false,
  BINANCE_PROXY_URL: "https://noisy-snow-cb60.enrico-furlan.workers.dev/",
  INDEX_URL: "https://eapi.binance.com/eapi/v1/index?underlying=BTCUSDT",
  EXCHANGE_INFO_URL: "https://eapi.binance.com/eapi/v1/exchangeInfo",
  LOCALE: "de-CH",
};


// more hardcoded constants (will provide a selector for the underlying and the expiry in another version)
const TRADING = "TRADING";
const BTCUSDT = "BTCUSDT";

// some globals, those would be moved to state/components in a differerent version
const domByIdCache = new Map();
const instrumentFieldsCache = new Map();

// Shared runtime selection used by WS updates; refreshed after each REST pass.
const wsSelectionState = {
  targetExpiryKey: null,
  selectedCallSymbol: null,
  selectedPutSymbol: null,
};

const updateWsSelectionState = (result) => {
  wsSelectionState.targetExpiryKey =
    result?.expiryKey ??
    parseExpiryKeyFromSymbol(result?.selectedCall?.symbol) ??
    parseExpiryKeyFromSymbol(result?.selectedPut?.symbol) ??
    null;
  wsSelectionState.selectedCallSymbol = result?.selectedCall?.symbol ?? null;
  wsSelectionState.selectedPutSymbol = result?.selectedPut?.symbol ?? null;
};

// dom references, these are used in the functions
const callTable = document.getElementById("table-call");
const putTable = document.getElementById("table-put");
const callRowTemplate = document.getElementById('call-row-template');
const putRowTemplate = document.getElementById('put-row-template');
const proxy = new BinanceProxy(config.BINANCE_PROXY_URL);

// these globals are initialized before loadAndRender and websocket handlers run,
// so they are available when used.
const nf = getNextFriday();
const nextFridayDateStr = extractYYMMDD(nf);  // once

// phase2 and phase3 entry point (load REST data and reder dom tables), could await here
loadAndRender(config.USE_MOCKS);

/**
 * NOTE: symbol needs to be lowercase,
 * register to the stream to update the data 
 */
const optionMarkPriceWs = new WebSocket(
  `wss://fstream.binance.com/market/stream?streams=${BTCUSDT.toLowerCase()}@optionMarkPrice`,
);

optionMarkPriceWs.onopen = () => {
  utils.log("Connected to Binance WS");
};

optionMarkPriceWs.onmessage = (event) => {
  // console.log("Received message:", msg);
  getMarkData(event);
};

optionMarkPriceWs.onerror = (error) => {
  utils.log("WebSocket Error:", error);
};

optionMarkPriceWs.onclose = () => {
  utils.log("Connection closed");
};




// update footer
updateDom(
  "config-debug",
  config.DEBUG ? "Debug mode: ON" : "Debug mode: OFF",
);
updateDom(
  "config-use-mocks",
  config.USE_MOCKS ? "Using: mock data" : "Using: live data",
);



