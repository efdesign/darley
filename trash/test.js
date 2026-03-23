/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

// // general api info:
// // https://developers.binance.com/docs/binance-spot-api-docs/websocket-api/general-api-information

// // https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/Mark-Price
// // OK
// const optionMarkPrice = new WebSocket(
//   "wss://fstream.binance.com/market/stream?streams=btcusdt@optionMarkPrice",
// );

// // https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/Open-Interest
// // NOK
// const openInterest = new WebSocket(
//   "wss://fstream.binance.com/market/stream?streams=ethusdt@openInterest@032226",
// );

// // https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/Kline-Candlestick-Streams
// // OK
// const clineCandlestick = new WebSocket(
//   "wss://fstream.binance.com/market/stream?streams=btcusdt@kline_1m",
// );

// // https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/24-hour-TICKER
// // NOK
// const twentyFourHourTicker = new WebSocket(
//   "wss://fstream.binance.com/market/stream?streams=btcusdt@optionTicker@251230",
// );

// // https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/Trade-Streams
// // NOK
// const btcUsdtTradeStreams = new WebSocket(
//   "wss://fstream.binance.com/public/stream?streams=btcusdt@optionTrade",
// );

// const ws = btcUsdtTradeStreams;

// ws.onopen = () => {
//   console.log("Connected to Binance WS");
// };

// ws.onmessage = (event) => {
//   const msg = JSON.parse(event.data);
//   console.log("Received message:", msg);
// };

// ws.onerror = (error) => {
//   console.error("WebSocket Error:", error);
// };

// ws.onclose = () => {
//   console.log("Connection closed");
// };

// REST

// https://developers.binance.com/docs/derivatives/options-trading/general-info

// 0 NOK
// https://developers.binance.com/docs/derivatives/options-trading/market-data/Exchange-Information
// const exchangeInfoUrl = "https://eapi.binance.com/eapi/v1/exchangeInfo";
// fetch(exchangeInfoUrl, {
//   headers: {
//     "Content-Type": "application/json",
//   },
// })
//   .then((response) => response.json())
//   .then((data) => {
//     console.log("Exchange Info:", data);
//   })
//   .catch((error) => console.error("Error fetching exchange info:", error));

// 1 NOK (CORS issue)
// https://developers.binance.com/docs/derivatives/options-trading/market-data/Symbol-Price-Ticker

// async function getIndexPrice(underlying = "BTCUSDT") {
//   const url = `https://eapi.binance.com/eapi/v1/index?underlying=${underlying}`;

//   try {
//     const response = await fetch(url);
//     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

//     const data = await response.json();

//     console.log(
//       `%c ${underlying} Index Price Data:`,
//       "color: #f3ba2f; font-weight: bold;",
//     );
//     console.table(data);

//     // Example: access specific fields
//     console.log(`Current Index Price: $${data.indexPrice}`);
//     console.log(`Time: ${new Date(data.time).toLocaleString()}`);
//   } catch (error) {
//     console.error("Could not fetch index price:", error);
//   }
// }

// Execute the call
// getIndexPrice("BTCUSDT");
// note: still getting cors issue, can get aways with proxy or other bypass
// const myHeaders = new Headers();
// myHeaders.append("X-MBX-APIKEY", "");
// myHeaders.append("Accept", "application/json");

// const requestOptions = {
//   method: "GET",
//   headers: myHeaders,
//   redirect: "follow",
// };

// NOK (CORS issue)
// const restUrl = "https://eapi.binance.com";
// fetch(`${restUrl}/eapi/v1/exchangeInfo`, requestOptions)
//   .then((response) => response.text())
//   .then((result) => console.log(result))
//   .catch((error) => console.error(error));

// https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md
// https://api.binance.com/api/v3/exchangeInfo?symbol=BNBBTC"
// NOL (CORS issue)
// fetch("https://api.binance.com/api/v3/exchangeInfo?symbol=BNBBTC")
//   .then((response) => response.json())
//   .then((data) => {
//     console.log("Exchange Info for BNBBTC:", data);
//   })
//   .catch((error) => console.error("Error fetching exchange info:", error));

// info on keys and api in general
// info https://testnet.binance.vision/

// below works
/*
$headers = New-Object "System.Collections.Generic.Dictionary[[String],[String]]"
$headers.Add("X-MBX-APIKEY", "")
$headers.Add("Accept", "application/json")

$response = Invoke-RestMethod 'https://eapi.binance.com/eapi/v1/exchangeInfo' -Method 'GET' -Headers $headers
$response | ConvertTo-Json
*/

// https://dev.binance.vision/t/enable-cors-on-spot-apis-please/15122/4
// https://developers.binance.com/docs/binance-spot-api-docs

// proxy works
// const myProxy = "https://noisy-snow-cb60.enrico-furlan.workers.dev/";
// const binanceApi = "https://eapi.binance.com/eapi/v1/exchangeInfo";

// fetch(`${myProxy}?url=${encodeURIComponent(binanceApi)}`)
//   .then((res) => res.json())
//   .then((data) => console.log("Success through proxy!", data))
//   .catch((err) => console.error("CORS still hates us:", err));

// async function getIndexPrice(underlying = "BTCUSDT") {
//   const url = `https://eapi.binance.com/eapi/v1/index?underlying=${underlying}`;

//   try {
//     const response = await fetch(`${myProxy}?url=${encodeURIComponent(url)}`);
//     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

//     const data = await response.json();

//     console.log(
//       `%c ${underlying} Index Price Data:`,
//       "color: #f3ba2f; font-weight: bold;",
//     );
//     console.table(data);

//     // Example: access specific fields
//     console.log(`Current Index Price: $${data.indexPrice}`);
//     console.log(`Time: ${new Date(data.time).toLocaleString()}`);
//   } catch (error) {
//     console.error("Could not fetch index price:", error);
//   }
// }

// // Execute the call
// getIndexPrice("BTCUSDT");

// TODO: this can be further optimized to memoize the elements so they are not queried every update
const updateDom = (id, text) => {
  document.getElementById(id).textContent = text;
};

// I've hit an issue with cors an local host hosting, so I will proxy the failing calls for the sake of getting the data
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
      console.error("Proxy fetch error:", error);
      throw error;
    }
  }
}

// Example usage:
const proxy = new BinanceProxy(
  "https://noisy-snow-cb60.enrico-furlan.workers.dev/",
);

// 0
// proxy
//   .fetch("https://eapi.binance.com/eapi/v1/index?underlying=BTCUSDT")
//   .then((data) => console.log("Data through proxy:", data))
//   .catch((err) => console.error("Error fetching through proxy:", err));

// 1;
// proxy
//   .fetch("https://eapi.binance.com/eapi/v1/exchangeInfo")
//   .then((data) => console.log("Exchange Info through proxy:", data))
//   .catch((err) =>
//     console.error("Error fetching exchange info through proxy:", err),
//   );

// fetch the data form json file for both 1 and 0 calls
// fetch("call0.json")
//   .then((response) => response.json())
//   .then((data) => console.log("Data from call0.json:", data))
//   .catch((err) => console.error("Error fetching call0.json:", err));

// fetch("call1.json")
//   .then((response) => response.json())
//   .then((data) => console.log("Data from call1.json:", data))
//   .catch((err) => console.error("Error fetching call1.json:", err));

// function displayPhase2Selection(indexData, exchangeInfoData, base = "BTC") {
//   const index = Number(indexData?.indexPrice);
//   const now = Number(indexData?.time) || Date.now();
//   const symbols = exchangeInfoData?.optionSymbols || [];
//   if (!Number.isFinite(index) || !symbols.length) return null;

//   const d = new Date(now);
//   const daysToFriday = (5 - d.getUTCDay() + 7) % 7 || 7;
//   const nextFridayTs = Date.UTC(
//     d.getUTCFullYear(),
//     d.getUTCMonth(),
//     d.getUTCDate() + daysToFriday,
//   );
//   const targetStrike = index * 1.25;

//   let chosenExpiry = null;
//   let expiryDiff = Infinity;
//   const nearestByExpiry = new Map();

//   for (const s of symbols) {
//     if (
//       s.status !== "TRADING" ||
//       s.baseAsset !== base ||
//       (s.side !== "CALL" && s.side !== "PUT")
//     )
//       continue;
//     const expiry = Number(s.expiryDate);
//     const strike = Number(s.strikePrice);
//     if (!Number.isFinite(expiry) || !Number.isFinite(strike)) continue;

//     const diffExpiry = Math.abs(expiry - nextFridayTs);
//     if (diffExpiry < expiryDiff) {
//       expiryDiff = diffExpiry;
//       chosenExpiry = expiry;
//     }

//     let bucket = nearestByExpiry.get(expiry);
//     if (!bucket) {
//       bucket = { CALL: null, PUT: null };
//       nearestByExpiry.set(expiry, bucket);
//     }

//     const prev = bucket[s.side];
//     if (
//       !prev ||
//       Math.abs(strike - targetStrike) <
//         Math.abs(Number(prev.strikePrice) - targetStrike)
//     ) {
//       bucket[s.side] = s;
//     }
//   }

//   const selected = nearestByExpiry.get(chosenExpiry) || {};
//   const out = {
//     expiryTimestamp: chosenExpiry,
//     callStrike: selected.CALL ? Number(selected.CALL.strikePrice) : null,
//     putStrike: selected.PUT ? Number(selected.PUT.strikePrice) : null,
//   };
//   console.log("Phase 2 selection:", out);
//   return out;
// }

// do both calls , await them all then call the display function with the data
async function fetchDataAndDisplay(simulate = false) {
  if (simulate) {
    const indexData = await fetch("call0.json").then((res) => res.json());
    const exchangeInfoData = await fetch("call1.json").then((res) =>
      res.json(),
    );

    findNearestOptions(indexData.indexPrice, exchangeInfoData);
    // drawRawOptionsData(indexData, exchangeInfoData);
    return;
  }

  // try {
  //   const [indexData, exchangeInfoData] = await Promise.all([
  //     proxy.fetch("https://eapi.binance.com/eapi/v1/index?underlying=BTCUSDT"),
  //     proxy.fetch("https://eapi.binance.com/eapi/v1/exchangeInfo"),
  //   ]);

  //   drawRawOptionsData(indexData, exchangeInfoData);

  //   // displayPhase2Selection(indexData, exchangeInfoData);
  // } catch (err) {
  //   console.error("Error fetching data for display:", err);
  // }
}

fetchDataAndDisplay(true);

// loop over

/* create a class for this json data:
  {
"expiryDate":  1774339200000,
"filters":  " ",
"symbol":  "SOL-260324-100-C",
"side":  "CALL",
"strikePrice":  "100.0000",
"underlying":  "SOLUSDT",
"unit":  1,
"liquidationFeeRate":  "0.001900",
"minQty":  "0.01",
"maxQty":  "3000",
"initialMargin":  "0.15000000",
"maintenanceMargin":  "0.07500000",
"minInitialMargin":  "0.10000000",
"minMaintenanceMargin":  "0.05000000",
"priceScale":  4,
"quantityScale":  2,
"quoteAsset":  "USDT",
"status":  "TRADING"},
*/

// class OptionData {
//   constructor({
//     expiryDate,
//     filters,
//     symbol,
//     side,
//     strikePrice,
//     underlying,
//     unit,
//     liquidationFeeRate,
//     minQty,
//     maxQty,
//     initialMargin,
//     maintenanceMargin,
//     minInitialMargin,
//     minMaintenanceMargin,
//     priceScale,
//     quantityScale,
//     quoteAsset,
//     status,
//   }) {
//     this.expiryDate = expiryDate;
//     this.filters = filters;
//     this.symbol = symbol;
//     this.side = side;
//     this.strikePrice = strikePrice;
//     this.underlying = underlying;
//     this.unit = unit;
//     this.liquidationFeeRate = liquidationFeeRate;
//     this.minQty = minQty;
//     this.maxQty = maxQty;
//     this.initialMargin = initialMargin;
//     this.maintenanceMargin = maintenanceMargin;
//     this.minInitialMargin = minInitialMargin;
//     this.minMaintenanceMargin = minMaintenanceMargin;
//     this.priceScale = priceScale;
//     this.quantityScale = quantityScale;
//     this.quoteAsset = quoteAsset;
//     this.status = status;
//   }
// }

// write a currency formatting function for the strike price
function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// write a formatting function for expiry date
function formatExpiryDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// helpers
const formatOptionText = (s) => {
  const strike = formatCurrency(Number(s.strikePrice));
  const expiry = formatExpiryDate(Number(s.expiryDate));
  //return `${s.symbol} | ${s.side} | Strike: ${strike} | Expiry: ${expiry} | Status: ${s.status}`;
  return `${s.symbol} | ${strike} | ${expiry}`;
};

const drawRawOptionsData = (indexData, exchangeInfoData) => {
  const contractsDiv = document.getElementById("contracts");
  console.log(contractsDiv);
  if (contractsDiv) {
    const symbols = exchangeInfoData?.optionSymbols || [];

    symbols.forEach((s) => {
      const el = document.createElement("div");
      el.className = "option-item option_item--" + s.side.toLowerCase();

      el.style.color =
        s.status === "TRADING" ? (s.side === "CALL" ? "green" : "red") : "gray";

      el.textContent = formatOptionText(s);

      contractsDiv.appendChild(el);
    });
  }
};

/**
 *  core function is highlightInstruments
 *  it  takes the index price and exchange info data,
 *  finds the nearest expiry to next friday and the strikes closest to 25% out of the money, then highlights those in the UI
 *
 *  needs to be fast and efficient
 *
 */

const highlightInstruments = (exchangeInfoData) => {};

function getNextFriday(timestamp = Date.now()) {
  const date = new Date(timestamp);
  // returns the day of the week as a number (0-6) where 0 is Sunday and 6 is Saturday
  const day = date.getDay();

  // we want to find the number of days until the next Friday
  // if today is Friday (day = 5), then we want to return the same day, so we add 0 days
  // if today is Saturday (day = 6), we want to add 6 days to get to the next Friday
  // if today is Sunday (day = 0), we want to add 5 days to get to the next Friday
  // if today is Monday (day = 1), we want to add 4 days to get to the next Friday
  // if today is Tuesday (day = 2), we want to add 3 days to get to the next Friday
  // if today is Wednesday (day = 3), we want to add 2 days to get to the next Friday
  // if today is Thursday (day = 4), we want to add 1 day to get to the next Friday
  const diff = (5 - day + 7) % 7; // 5 represents Friday
  date.setDate(date.getDate() + diff);

  // console log the date in swiss format
  console.log(
    "Next Friday:",
    date.toLocaleDateString("en-CH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
  );
  return date;
}

getNextFriday();

// {
//       "expiryDate": 1798185600000,
//       "symbol": "BTC-261225-105000-C",
//       "side": "CALL",
//       "strikePrice": "105000.000",
//       "underlying": "BTCUSDT",
//       "quoteAsset": "USDT",
//       "status": "TRADING"
//     },

// performance of function (google chrome dev tools) or coded

// find index price from call 1
// filter efficiently (linearly ?) through the data by: expiry date, strike price, being live, base coin (bonus for user pick)

// learning https://www.investopedia.com/terms/s/strikeprice.asp (information about strike price)

const TRADING = "TRADING";
const BTCUSDT = "BTCUSDT";

function logBestOptionFound(
  s,
  expiryDifference,
  priceDifference,
  indexPrice,
  nextFriday,
) {
  const strike = Number(s.strikePrice);
  const expiryTs = Number(s.expiryDate);
  const index = Number(indexPrice);
  const expiryDifferenceDays = expiryDifference / (1000 * 60 * 60 * 24);

  const safePrice = (value) =>
    Number.isFinite(value) ? formatCurrency(value) : "n/a";
  const safeDate = (value) =>
    Number.isFinite(value) ? formatExpiryDate(value) : "n/a";

  console.log(
    `New best option found: ${s.symbol} | expiry diff: ${expiryDifferenceDays.toFixed(2)} days | strike diff: ${safePrice(priceDifference)} | strike: ${safePrice(strike)} | expiry: ${safeDate(expiryTs)} | index: ${safePrice(index)} | next Friday: ${safeDate(nextFriday)}`,
  );
}

// output is expiry and strike of instruments (PUT and CALL) to highlight
const findNearestOptions = (
  indexPrice,
  exchangeInfoData,
  underlying = BTCUSDT,
) => {
  // relevant fields available in symbols: underlying, side, strikePrice, expiryDate, status,quoteAsset
  // TODO create object/class for mantainability and readability
  const symbols = exchangeInfoData?.optionSymbols || [];
  const nextFriday = getNextFriday().getTime();
  console.log(symbols, nextFriday);

  // I want to do a single pass over the data so that I can be efficient.
  // what to track

  // 0 is the best shot
  let expiryDifference = Infinity;
  // 0 is the best shot
  let priceDifference = Infinity;
  let selectedCall = null;
  let selectedPut = null;

  for (const s of symbols) {
    // short cirucuit the underlying and status to discard irrelevant options asap
    if (s.underlying !== underlying || s.status !== TRADING) continue;

    // now track the best instrument in one pass
    const currentExpiryDifference = Math.abs(Number(s.expiryDate) - nextFriday);
    const currentPriceDifference = Math.abs(Number(s.strikePrice) - indexPrice);
    // if we have a closer expiry or closer expiry with better strike price then update the selection
    if (
      currentExpiryDifference < expiryDifference ||
      (currentExpiryDifference === expiryDifference &&
        currentPriceDifference < priceDifference)
    ) {
      expiryDifference = currentExpiryDifference;
      priceDifference = currentPriceDifference;

      // todo, it's quite stupid to re-query the dom every time, as these are fixed updates, but will do for now
      updateDom("index-price", formatCurrency(indexPrice));
      updateDom("underlying", underlying);
      updateDom("expiry-date", formatExpiryDate(nextFriday));
      logBestOptionFound(
        s,
        expiryDifference,
        priceDifference,
        indexPrice,
        nextFriday,
      );
    }
  }

  // thus would be inefficient (part2 requirement)
  // const filtered = symbols.filter((s) => {
  //   // status checking (probably all of them are trading),
  //   // TODO: sort the short circuits to improve performance
  //   s[_priceDifference] = Math.abs(Number(s.strikePrice) - indexPrice);
  //   s[_expiryDifference] = Math.abs(Number(s.expiryDate) - nextFriday);

  //   console.log(s._priceDifference, s._expiryDifference);
  //   return (
  //     s.status === "TRADING" &&
  //     // match both the base and quoteAsset in one go
  //     s.underlying === underlying &&
  //     // null checks here or other issues
  //     s.expiryDate === nextFriday
  //   );
  // });

  // console.log(filtered, symbols);

  // debugger;
  // const targetStrike = indexPrice * 1.25;
  // const now = Date.now();
  // const nextFriday = getNextFriday(now).getTime();

  // let chosenExpiry = null;
  // let expiryDiff = Infinity;
  // const nearestByExpiry = new Map();
  // for (const s of symbols) {
  //   if (
  //     s.status !== "TRADING" ||
  //     s.baseAsset !== base ||
  //     (s.side !== "CALL" && s.side !== "PUT")
  //   )
  //     continue;
  //   const expiry = Number(s.expiryDate);
  //   const strike = Number(s.strikePrice);
  //   if (!Number.isFinite(expiry) || !Number.isFinite(strike)) continue;
  //   const diffExpiry = Math.abs(expiry - nextFriday);
  //   if (diffExpiry < expiryDiff) {
  //     expiryDiff = diffExpiry;
  //     chosenExpiry = expiry;
  //   }
  //   let bucket = nearestByExpiry.get(expiry);
  //   if (!bucket) {
  //     bucket = { CALL: null, PUT: null };
  //     nearestByExpiry.set(expiry, bucket);
  //   }
  //   const prev = bucket[s.side];
  //   if (
  //     !prev ||
  //     Math.abs(strike - targetStrike) <
  //       Math.abs(Number(prev.strikePrice) - targetStrike)
  //   ) {
  //     bucket[s.side] = s;
  //   }
  // }
  // const selected = nearestByExpiry.get(chosenExpiry) || {};
  // return {
  //   expiryTimestamp: chosenExpiry,
  //   callStrike: selected.CALL ? Number(selected.CALL.strikePrice) : null,
  //   putStrike: selected.PUT ? Number(selected.PUT.strikePrice) : null,
  // };
};

