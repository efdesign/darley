/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { selectNearestOptions } from "../../domain/selectNearestOptions.js";

export async function loadInitialOverview({ marketDataClient, underlying, nowTimestamp, forceExpiryKey = null }) {
    const { indexData, exchangeInfoData } = await marketDataClient.fetchOverview(underlying);

    const overview = selectNearestOptions({
        indexPrice: indexData.indexPrice,
        optionSymbols: exchangeInfoData?.optionSymbols ?? [],
        underlying,
        nowTimestamp,
        forceExpiryKey,
    });

    return { ...overview, rawExchangeInfoData: exchangeInfoData };
}
