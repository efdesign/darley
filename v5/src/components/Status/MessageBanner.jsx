/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function MessageBanner({ message }) {
  if (!message) {
    return null;
  }

  return <section className="message-bar">{message}</section>;
}

