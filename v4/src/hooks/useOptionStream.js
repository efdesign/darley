/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { useEffect, useEffectEvent } from "react";
import { createOptionStreamClient } from "../services/optionStreamClient.js";

export function useOptionStream({
    mode,
    symbols,
    fixtureUrl,
    refreshMs,
    snapshotClient,
    simulateLive,
    onBatch,
    onStateChange,
    onError,
}) {
    const handleBatch = useEffectEvent(onBatch);
    const handleStateChange = useEffectEvent(onStateChange);
    const handleError = useEffectEvent(onError);

    useEffect(() => {
        if (!symbols.length) {
            handleStateChange("idle");
            return;
        }

        let isActive = true;

        const streamClient = createOptionStreamClient({
            mode,
            symbols,
            fixtureUrl,
            refreshMs,
            simulateLive,
        });

        if (snapshotClient && mode !== "mock") {
            snapshotClient
                .fetchQuotes(symbols)
                .then((quotes) => {
                    if (!isActive) return;
                    handleBatch(quotes);
                })
                .catch(() => { });
        }

        handleStateChange("connecting");

        streamClient.connect({
            onBatch(quotes) {
                if (!isActive) return;
                handleBatch(quotes);
            },
            onStateChange(connectionState) {
                if (!isActive) return;
                handleStateChange(connectionState);
            },
            onError(error) {
                if (!isActive) return;
                handleError(error);
            },
        });

        return () => {
            isActive = false;
            streamClient.disconnect();
        };
    }, [
        mode,
        fixtureUrl,
        refreshMs,
        snapshotClient,
        simulateLive,
        symbols.join("|"),
    ]);
}

