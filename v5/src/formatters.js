/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function createFormatters(locale) {
    const currencyFormatter = new Intl.NumberFormat(locale, {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const quantityFormatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
    });

    const dateFormatter = new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    function isMissing(value) {
        return value === null || value === undefined || value === "";
    }

    return {
        formatCurrency(value) {
            if (isMissing(value)) return "-";
            const numeric = Number(value);
            return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : "-";
        },
        formatQuantity(value) {
            if (isMissing(value)) return "-";
            const numeric = Number(value);
            return Number.isFinite(numeric) ? quantityFormatter.format(numeric) : "-";
        },
        formatDate(timestamp) {
            if (isMissing(timestamp)) return "-";
            const numeric = Number(timestamp);
            return Number.isFinite(numeric) ? dateFormatter.format(new Date(numeric)) : "-";
        },
    };
}
