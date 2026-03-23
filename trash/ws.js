/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

// The base endpoint for Binance Options WebSockets
const WS_URL = "wss://eoptions.binance.com/ws";

function initializeLiveStream(baseCoin, targetExpiryDate) {
  const ws = new WebSocket(WS_URL);

  
  ws.onopen = () => {
    console.log("WebSocket Connected");

    // Subscribing to the ticker for ALL options of the base asset
    // e.g., "BTC@ticker"
    const subscribeMessage = {
      method: "SUBSCRIBE",
      params: [`${baseCoin}@ticker`],
      id: 1,
    };
    ws.send(JSON.stringify(subscribeMessage));
  };

    ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // Ignore generic responses (like the subscription confirmation)
    if (!data.e || data.e !== "24hrTicker") return;

    const symbol = data.s; // e.g., "BTC-260327-80000-C"

  // Symbol format is BASE-YYMMDD-STRIKE-SIDE.
    // We can extract the date part or rely on an array of valid symbols we saved earlier.
    const symbolParts = symbol.split("-");
    const instrumentDate = symbolParts[1];

    // (Assuming you formatted your targetExpiryDate to 'YYMMDD' earlier)
    if (instrumentDate !== targetExpiryDate) {
      return; // Exit immediately, saving CPU cycles
    }

    // 4. Update the DOM directly
    // b = best bid price, B = best bid qty, a = best ask price, A = best ask qty
    updateDOM(`bid-price-${symbol}`, data.b);
    updateDOM(`bid-qty-${symbol}`, data.B);
    updateDOM(`ask-price-${symbol}`, data.a);
    updateDOM(`ask-qty-${symbol}`, data.A);
  };

  
  ws.onclose = () => {
    console.log("WebSocket Disconnected. Reconnecting in 3s...");
    setTimeout(() => initializeLiveStream(baseCoin, targetExpiryDate), 3000);
  };

  ws.onerror = (error) => {
    console.error("WebSocket Error:", error);
  };
}


function updateDOM(elementId, newValue) {
  const el = document.getElementById(elementId);
  if (!el) return; // Element doesn't exist on screen, ignore

  // Only update the DOM if the value actually changed to prevent layout thrashing
  if (el.textContent !== newValue) {
    el.textContent = newValue;

    // Optional Bonus: Flash green/red for visual feedback
    // flashElement(el);
  }
}

