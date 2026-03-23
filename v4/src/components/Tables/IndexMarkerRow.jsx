/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function IndexMarkerRow({ indexPrice, formatters }) {
  return (
    <tr className="index-marker-row">
      <td className="index-marker-cell" colSpan={6}>
        Index Price {formatters.formatCurrency(indexPrice)}
      </td>
    </tr>
  );
}

