"use strict";

import { readFile } from 'node:fs';
import { formatDate, formatAmount } from './common.js';
import { openDB } from '../Common/databaseManager.js';
import config from './package.json' with { type: 'json' };

export function details(res, parms) {
    const db = openDB(config.db);
    const rows = [];
    const positive = (parms.amountSign == '+');
    const nonPivotField = (parms.pivotField == 'Reason') ? 'Merchant' : 'Reason';
    db.each(`SELECT Date,
                    SortDate,
                    DecimalAmount,
                    Description,
                    ${nonPivotField} as NonPivotValue
               FROM NoTransferView
              WHERE ${parms.pivotField} = '${parms.pivotValue}' AND
                    SortDate BETWEEN '${parms.id2}-00' AND '${parms.id1}-99' AND
                    Sign = '${parms.amountSign}'
              ORDER BY DecimalAmount ${positive ? 'DESC' : ''}`,
        (err, row) => {
            if (err) return console.log(err);
            rows.push(row);
        }
    );
    db.close((err) => {
        if (err) return console.log(err);
        readFile('./header.html', view);
    })

    function view(err, data) {
        if (err) return console.log(err);
        res.write(data);
        res.write(`
            </head>
            <body>
            <table>
            <tr>
                <td>${formatDate(parms.minDate)}&nbsp;-&nbsp;${formatDate(parms.maxDate)}</td>
            </tr>
            <tr><td><br></td></tr>
            <tr>
                <td>
                    <table>
                        <tr>
                            <td class="outtd subheader">${parms.pivotField}</td>
                            <td>${parms.pivotValue}</td>
                        </tr>
                    </table>
                </td>
            </tr>
            </table>
            <br>
            <table>
            <tr>
                <th class="outtd">Transaction Date</th><th class="outtd">Value Date</th><th class="outnum">Amount</th>
                <th class="outtd">${nonPivotField}</th><th class="outtd">Description</th>
            <tr>`
        );
        let sum = 0.00;
        let odd = true;
        for (const row of rows) {
            let transactionDate = row.Date.split('/').reverse().join('-');
            transactionDate = (transactionDate == row.SortDate) ? '' : formatDate(transactionDate);
            const textClass = odd ? 'oddResult' : 'outtd';
            const amountClass = 'outnum ' + (positive ? 'profit' : 'loss') + (odd ? ' oddResult' : '');
            odd = !odd
            res.write(`
                <tr>
                    <td class="${textClass}">${transactionDate}</td>
                    <td class="${textClass}">${formatDate(row.SortDate)}</td>
                    <td class="${amountClass}">${formatAmount(row.DecimalAmount)}</td>
                    <td class="${textClass}">${row.NonPivotValue}</td>
                    <td class="${textClass}">${row.Description}</td>
                <tr>`
            );
            sum += row.DecimalAmount;
        }
        res.end(`
            <tr>
                <td></td>
                <td></td>
                <td class="outnum">${formatAmount(sum)}</td>
                <td colspan="2"></td>
            </tr>
            </table>
            <form id="form" method="POST" action="browse.html">
            <input type="hidden" name="pivotField" value="${parms.pivotField}">
            <input type="hidden" name="id1" value="${parms.id1}">
            <input type="hidden" name="id2" value="${parms.id2}">
            </form>
            <br>
            <a href="javascript:document.getElementById('form').submit()">back</a>
            </body>
            </html>`
        );
    }
}
