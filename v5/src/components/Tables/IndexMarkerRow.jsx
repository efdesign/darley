/*
 * Proprietary Evaluation Notice
 * Author: enrico.furlan
 * Email: enrico.furlan@gmail.com
 * License: Proprietary Evaluation License (see LICENSE-EVALUATION.md)
 */

export function IndexMarkerRow({ indexPrice, formatters, colSpan = 6 }) {
  return (
    <tr className="index-marker-row">
      <td className="index-marker-cell" colSpan={colSpan}>
        Index Price {formatters.formatCurrency(indexPrice)}
      </td>
    </tr>
  );
}

