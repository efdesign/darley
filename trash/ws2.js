/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

const symbol = "BTC-260322-70000-C"; // Example: BTC, June 26 2026, 70k Call
const streamNames = [
  `${symbol.toLowerCase()}@ticker`,
  `${symbol.toLowerCase()}@markPrice`,
];


const baseUrl = "wss://fstream.binance.com/market/stream?streams=";
const fullUrl = baseUrl + streamNames.join("/");

console.log(
  "%c Connecting to Binance Options WS...",
  "color: #f3ba2f; font-weight: bold;",
);


const socket = new WebSocket(fullUrl);

// Handle incoming messages
socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  const stream = msg.stream;
  const data = msg.data;

  if (stream.includes("ticker")) {
    console.log(`[Ticker] Price: ${data.c} | High: ${data.h} | Low: ${data.l}`);
  } else if (stream.includes("markPrice")) {
    console.log(
      `[MarkPrice] Price: ${data.p} | IV: ${data.iv}% | Delta: ${data.d}`,
    );
  }
};

// Handle connection open
socket.onopen = () => {
  console.log("%c Connected!", "color: green;");
};

// Handle errors
socket.onerror = (error) => {
  console.error("WebSocket Error:", error);
};

// Handle closure
socket.onclose = () => {
  console.log("%c Connection Closed", "color: red;");
};



