/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function getNextFridayDate(nowTimestamp = Date.now()) {
    const date = new Date(nowTimestamp);
    const day = date.getDay();
    const friday = 5;
    const diff = (friday - day + 7) % 7;
    date.setDate(date.getDate() + diff);
    return date;
}

export function toExpiryKey(date) {
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
}
