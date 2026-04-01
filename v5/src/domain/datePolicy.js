/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function getNextFridayDate(nowTimestamp = Date.now()) {
    const current = new Date(nowTimestamp);
    const friday = 5;
    const expiryHourUtc = 8;
    const target = new Date(Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate(),
        expiryHourUtc,
        0,
        0,
        0,
    ));

    const diff = (friday - current.getUTCDay() + 7) % 7;
    target.setUTCDate(target.getUTCDate() + diff);

    if (target.getTime() <= nowTimestamp) {
        target.setUTCDate(target.getUTCDate() + 7);
    }

    return target;
}

export function toExpiryKey(date) {
    const year = date.getUTCFullYear().toString().slice(-2);
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}${month}${day}`;
}
