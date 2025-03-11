"use strict";

import { readFile } from 'node:fs';
import { formatAmount } from './common.js';
import { update } from './update.js';
import { openDB } from '../Common/databaseManager.js';
import config from './package.json' with { type: 'json' };

export function home (res) {
    const transData = [];
    const selectionData = [];
    let rowsNeedingUpdate = 0;
    const db = openDB(config.db);
    db.each(`SELECT Account,
                    AccountName,
                    SortDate,
                    Count
               FROM LastTransView`,
        (err, row) => {
            if (err) return console.log(err);
            transData.push(row);
        }
    );
    db.each(`SELECT substr(SortDate, 1, 7) AS Month,
                    round(SUM(DecimalAmount), 2) AS SubTotal
               FROM NoTransferView
              WHERE SortDate >= '2022-07-01'
              GROUP BY Month
              ORDER BY Month DESC`,
        (err, row) => {
            if (err) return console.log(err);
            selectionData.push( row );
        }
    );
    db.each(`SELECT count( * ) AS Count
               FROM Ledger
              WHERE Account = 'xx7457'
                AND ( Merchant IS NULL OR 
                      Reason   IS NULL )`,
        (err, row) => {
            if (err) return console.log(err);
            rowsNeedingUpdate = row.Count;
        }
    );
    db.close((err) => {
        if (err) return console.log(err);
        if (rowsNeedingUpdate > 0) {
            setTimeout(update, 10, res);
        } else {
            readFile('./header.html', view);
        }
    });

    function view(err, data) {
        if (err) return console.log(err);
        res.write(data);
        res.write(`
            <script>
                function isBoxChecked() {
                    for (let i = 1; i <= ${selectionData.length}; i++) {
                        if (document.getElementById('id' + i).checked) {
                            return true;
                        }
                    }
                    alert('select something');
                    return false;
                }
            </script>
            </head>
            <body>
            <table>
            <tr>
                <th>A/C Name</th>
                <th>Max Date</th>
                <th>Transactions</th>
            </tr>`
        );
        let odd = true;
        for (const x of transData) {
            const extraClass = (odd) ? ' oddResult' : '';
            odd = !odd;
            res.write(`
                <tr>
                    <td class="outtd${extraClass}">${x.AccountName}</td>
                    <td class="outtd${extraClass}">${x.SortDate}</td>
                    <td class="outnum${extraClass}">${x.Count}</td> 
                </tr>`
            );
        }
        res.write(`
            </table>
            <a href="load.html">Check Downloads</a>
            <br><br>
            <form action="home.html" method="POST" onsubmit="return isBoxChecked();">
            <table>
            <tr>
                <th>Month</th>
                <th class="outnum">Balance</th>
                <th>select</th>
                <th>&nbsp;</th>
                <th><input type="submit" value="Browse"></th>
            </tr>`
        );
        let i = 0;
        for (const x of selectionData) {
            i++;
            res.write(`
                <tr>
                    <td class="outtd">${displayMonth(x.Month)}</td>
                    <td class="outnum ${class2(x.SubTotal)}">${formatAmount(x.SubTotal)}</td>
                    <td class="outtd"><input type="checkbox" id="id${i}" name="id${i}" value="${x.Month}"></td>
                    <td class="outtd">&nbsp;</td>
                    <td class="outtd">&nbsp;</td>
                </tr>`
            );
        }
        res.end(`
            </table>
            </form>
            </body>
            </html>`
        );
    }
}

function displayMonth (month) {
    const date = new Date(`${month}-01`);
    const d = date.toDateString().split(' ');
    return ''.concat(d[3], ' ', d[1]);
}

function class2 (amt) {
    return (parseFloat(amt) < 0) ? 'loss' : 'profit';
}