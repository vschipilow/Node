"use strict";

import { readFile } from 'node:fs';
import { coalesce, formatAmount, formatDate } from './common.js';
import { openDB } from '../Common/databaseManager.js';
import config from './package.json' with { type: 'json' };

export function browse(res, parms) {
    const monthArray = [];
    for (const p in parms) {
        if (/^id\d+$/.test(p)) {
            monthArray.push(parms[p]);
        }
    }
    const pivotField = coalesce(parms.pivotField, 'Reason'); 
    const min = '' + monthArray[monthArray.length - 1] + '-00';
    const max = '' + monthArray[0] + '-99';
    const db = openDB(config.db);
    const model = { total: 0.00, profit: 0.00, loss: 0.00, minDate: '9999-99-99', maxDate: '0000-00-00',
        rows: [] };
    db.each(`SELECT CASE WHEN ${pivotField} IS NULL 
                         THEN Description 
                         ELSE ${pivotField}
                    END  AS Pivot,
                    sum(DecimalAmount) AS SubTotal,
                    Sign,
                    CASE Sign WHEN '+' 
                              THEN 0 - sum(DecimalAmount) 
                              ELSE sum(DecimalAmount) 
                    END  AS SortValue,
                    min(SortDate) AS MinDate,
                    max(SortDate) AS MaxDate
               FROM NoTransferView
              WHERE SortDate BETWEEN '${min}' AND '${max}' 
              GROUP BY Sign, Pivot
              ORDER BY SortValue`,
        (err, row) => {  
            if (err) return console.log(err);
            model.total += row.SubTotal;
            if (row.Sign == '+') {
                model.profit += row.SubTotal;
            } else {
                model.loss += row.SubTotal;
            }
            if (model.minDate > row.MinDate) {
                model.minDate = row.MinDate;
            }
            if (model.maxDate < row.MaxDate) {
                model.maxDate = row.MaxDate;
            }
            model.rows.push(row);
        }
    );
    db.close((err) => {
        if (err) return console.log(err);
        readFile('./header.html', view);
    });

    function view (err, data) {
        if (err) return console.log(err);
        const { total, profit, loss, rows } = model;
        const isReason = (pivotField == 'Reason');
        res.write(data);
        res.write(`
            <script>
                function showDetails(pivotValue, amountSign) {
                    document.getElementById('pivotValue').value = pivotValue;
                    document.getElementById('amountSign').value = amountSign;
                    document.getElementById('form').action = 'details.html';
                    document.getElementById('form').submit();
                }
            </script>
            </head>
            <body>
            <form id="form" method="POST" action="browse.html">
            <select name="pivotField" onchange="document.getElementById('form').submit();">
            <option value="Reason"${isReason ? ' selected' : ''}>Reason</option>
            <option value="Merchant"${isReason ? '' : ' selected'}>Merchant</option>
            </select><br>
            <br>
            <table>
            <tr>
                <td colspan="4" style="text-align: center">
                    ${formatDate(model.minDate)}&nbsp;-&nbsp;${formatDate(model.maxDate)}
                </td>
            <tr><td colspan="4"><br></td></tr>
            <tr>
                <td class="outtd">Total</td>
                <td></td>
                <td></td>
                <td class="outnum ${total >= 0.00 ? 'profit' : 'loss'}">${formatAmount(total)}</td>
            </tr>
            <tr><td colspan="4"><br></td></tr>
            <tr>
                <td class="outtd">Profit</td>
                <td></td>
                <td></td>
                <td class="outnum profit">${formatAmount(profit)}</td>
            </tr>
            <tr><td colspan="4"><br></td></tr>`
        );
        let odd = true;
        for (const row of rows) {
            if (row.Sign == '+') {
                odd = !odd;
                res.write(`
                    <tr>
                        <td></td>
                        <td class="${odd ? 'oddResult' : 'outtd'}">
                            <a href="javascript:showDetails('${row.Pivot}', '+');">
                                ${row.Pivot}
                            </a>
                        </td>
                        <td class="outnum profit${odd ? ' oddResult' : ''}">${formatAmount(row.SubTotal)}</td>
                        <td></td>
                    </tr>`
                );
            }
        }
        res.write(`
            <tr><td colspan="4"><br></td></tr>
            <tr>
                <td class="outtd">Loss</td>
                <td></td>
                <td></td>
                <td class="outnum loss">${formatAmount(loss)}</td>
            </tr>
            <tr><td colspan="4"><br></td></tr>`
        );
        odd = true;
        for (const row of rows) {
            if (row.Sign == '-') {
                odd = !odd;
                res.write(`
                    <tr>
                        <td></td>
                        <td class="${odd ? 'oddResult' : 'outtd'}">
                            <a href="javascript:showDetails('${row.Pivot}', '-', '${pivotField}');">
                                ${row.Pivot}
                            </a>
                        </td>
                        <td class="outnum loss${odd ? ' oddResult' : ''}">${formatAmount(row.SubTotal)}</td>
                        <td></td>
                    </tr>`
                );
            }
        }
        res.end(`
            </table>
            <input type="hidden" id="pivotValue" name="pivotValue" value="">
            <input type="hidden" id="amountSign" name="amountSign" value="">
            <input type="hidden" name="id1" value="${monthArray[0]}">
            <input type="hidden" name="id2" value="${monthArray[monthArray.length - 1]}">
            <input type="hidden" name="minDate" value="${model.minDate}">
            <input type="hidden" name="maxDate" value="${model.maxDate}">
            </form><br>
            <a href="home.html">Back</a>
            </body>
            </html>`
        );
    }
}
