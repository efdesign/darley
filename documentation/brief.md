# Options Expiry Visualization

Build a tiny web app that shows a 'live' options overview for one expiry of one coin.

## Simplified Glossary

• Spot market: Where coins (BTC, ETH, …) are bought/sold for cash (USDT).
• Derivatives: Instruments whose value is derived from the spot price.
• Base: The underlying coin on which a derivative is based , e.g. BTC.
• Options: Calls (↑) and Puts (↓) that expire on a fixed date. Calls have/gain value the further the spot is above its strike price. Puts the further below the strike price. Example: If strike = 100'000 and index = 102'000, then the CALL is worth ≈ 2000 USD.  
• Expiry: Expiration date of an option.  
• Strike: The reference price of the option.
• Index price: Index over spot prices for the same coin from different exchanges.

## General

• Explain your thoughts and decisions for each step
• Code is judged on cleanliness, maintainability, simplicity, and performance
• Design is judged on info density vs. usefulness, visual appeal, and originality
• Supply chain attacks are a thing in the crypto world. Minimize the usage of dependencies where possible and reasonable. Explain your decisions.  
• If LLMs are being used, clarify in what way. Do not use LLMs for Part 2. If we notice LLM usage on Part 2, then the results will be rejected without further comments.  
• If you get stuck on some part, try to shortcut it, explain the shortcut you did and what you would do if you had more time.

## Part 1: Self-Evaluation / DONE

On a scale from 1 to 10, rate your experience with the technologies you've chosen for this task and explain your rating.

## Part 2: Preparation / Algorithm / IN PROGRESS

There are lots of options **instruments** for a **base coin**.
In the **next step**, we'll want to visualize an **overview** of them,
and we'll want to **highlight two** instruments (1 CALL and 1 PUT).

So we'll need an algorithm that is **efficient and fast** to **determine the highlighted instruments**. It should pick them so that:

1. Their **expiry is on the next Friday**.
   If there is no instrument with such an expiry, pick the ones that are **closest to** it.
2. They are marked as being **live**, e.g., they **can be traded**
3. Have a **strike price that is closest to the current index price**
4. We care only about one base coin, e.g., BTC or ETH. Feel free to hardcode the base coin or let the user pick it.

   We'll be using the Binance API for these tasks.
   The following endpoints will probably be needed (note to self: is it there a better endpoint ?):
   - REST endpoint for the **current index price** [1]
   - REST endpoint for all **available options instruments** [0]

   Do not use LLMs for this part.  
   Output
   - Expiry timestamp
   - Strike of instruments to highlight
     [0] Instruments:  
     https://developers.binance.com/docs/derivatives/options-trading/market-data/Exchange-Information
     [1] Index:  
     https://developers.binance.com/docs/derivatives/options-trading/market-data/Symbol-Price-Ticker

## Part 3: Subscribe and visualize

Let's visualize one expiry (note to self: date).

• We'll be subscribing to a websocket (see [2]) and **filtering out all instruments that are not of the wanted expiry** (determined in the previous sep)

- The **UI should update** according to the websocket messages
- The minimum that needs to be displayed is:
  - best buy price
  - best buy quantity
  - strike price
  - best sell price
  - best sell quantity

- The in the previous task determined strike should be highlighted
- Optional: Feel free to add more data from other websockets ([3]), where it makes sense.

Visualize it however you see fit: raw data, graphs, or something else.

Output:

- Web application
- Bonus points for it being hosted somewhere (e.g., GitHub Pages, Netlify, ...)
- Bonus points for it being mobile friendly

[2] Overview websocket:  
 https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/Mark-Price

[3] Open interest:  
 https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/Open-Interest
Kline/Candlestick:  
 https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/Kline-Candlestick-Streams 24-hour ticker:  
 https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/24-hour-TICKER
Trades:  
 https://developers.binance.com/docs/derivatives/options-trading/websocket-market-streams/Trade-Streams

## Part 4: Retrospective

If you'd had a) 1 week, b) 1 month, and c) 6 months available for this task, what would you do differently?
