/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

/**
 * Cloudflare worker code to proxy requests to Binance's REST API and inject CORS headers
 * 
 * this is the proxy code for bypassing CORS issues when calling Binance's REST API from the browser
  I have setup a free tier cloudflare worker to run this code
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);

    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(
        "Usage: https://your-worker.dev/?url=https://eapi.binance.com/eapi/v1/index?underlying=BTCUSDT",
        {
          status: 400,
          headers: { "Content-Type": "text/plain" },
        },
      );
    }

    // this makes the cors header work
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Allows any website (localhost or GitHub Pages) to call this
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-MBX-APIKEY",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const binanceResponse = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        body:
          request.method !== "GET" && request.method !== "HEAD"
            ? request.body
            : null,
      });

      const proxyResponse = new Response(binanceResponse.body, binanceResponse);

      // Inject the missing CORS headers into the response from Binance
      Object.keys(corsHeaders).forEach((key) => {
        proxyResponse.headers.set(key, corsHeaders[key]);
      });

      return proxyResponse;
    } catch (e) {
      return new Response("Proxy Error: " + e.message, {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};

