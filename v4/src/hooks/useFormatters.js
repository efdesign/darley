/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

import { useMemo } from "react";
import { createFormatters } from "../formatters.js";

export function useFormatters(locale) {
    return useMemo(() => createFormatters(locale), [locale]);
}

