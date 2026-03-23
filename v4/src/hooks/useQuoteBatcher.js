/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { useCallback, useEffect, useRef } from "react";

export function useQuoteBatcher(onFlush) {
    const quotesRef = useRef([]);
    const frameRef = useRef(null);

    const flush = useCallback(() => {
        frameRef.current = null;
        if (!quotesRef.current.length) {
            return;
        }

        const batched = quotesRef.current;
        quotesRef.current = [];
        onFlush(batched);
    }, [onFlush]);

    const queue = useCallback(
        (quotes) => {
            if (!quotes || !quotes.length) {
                return;
            }

            quotesRef.current.push(...quotes);

            if (frameRef.current) {
                return;
            }

            frameRef.current = window.requestAnimationFrame(flush);
        },
        [flush],
    );

    useEffect(() => {
        return () => {
            if (frameRef.current) {
                window.cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    return queue;
}

