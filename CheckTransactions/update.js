"use strict";

import { readFile } from 'node:fs';
import { backup } from './backup.js';
import { openDB } from '../Common/databaseManager.js';
import config from './package.json' with { type: 'json' };

export function update (res, p) {
    let numUpdatesLeft;
    const rows = [];
    const db = openDB(config.db);
    db.serialize(() => {
        if (p != undefined) {
            db.run(`UPDATE Ledger
                       SET Reason   = "${p.reason}",
                           Merchant = "${p.merchant}"
                     WHERE rowid    =  ${p.rowid}`, 
                (err) => {
                    if (err) return console.log(err);
                }
            );
        }
        db.each(`SELECT Type, 
                        rowid, 
                        Date, 
                        Amount, 
                        Description, 
                        Balance, 
                        Merchant, 
                        Reason, 
                        SortDate 
                   FROM BeforeAfterNullView`, 
            (err, row) => {
                if (err) return log('error', err);
                rows.push(row);
            }
        );
        db.each(`SELECT count( * ) AS Count
                   FROM Ledger
                  WHERE Account = 'xx7457' AND
                        ( Reason IS NULL OR
                          Merchant IS NULL )`,
            (err, row) => {
                if (err) return console.log(err);
                numUpdatesLeft = row.Count;
            }
        );
    });
    db.close((err) => {
        if (err) return console.log(err);
        if (numUpdatesLeft == 0) {
            setTimeout(backup, 10, res);
        } else {
            readFile('./header.html', view);
        }
    });

    function view (err, data) {
        if (err) return console.log(err);
        res.write(data);
        res.write(`
            <link rel="stylesheet" href="autocomplete.css">
            <script>
                function onload() {
                    fetch('getAutocompleteData')
                    .then(x => x.json())
                    .then(j => {
                        autocomplete("reason", j.reasons);
                        autocomplete("merchant", j.merchants);
                    });
                }
                function isInputValid() {
                    const merchant = document.getElementById("merchant").value.trim();
                    const reason = document.getElementById("reason").value.trim();
                    const pattern = /^[A-Z0-9][A-Z0-9\\ \\-\\']*$/;
                    if (pattern.test(merchant) && pattern.test(reason)) {
                        return true;
                    } else {
                        alert(merchant + '\\n' + reason + '\\nis invalid');
                        return false;
                    }
                }
                function copySelection(i) {
                    document.getElementById("merchant").value = document.getElementById("m".concat(i)).innerHTML;
                    document.getElementById("reason").value = document.getElementById("r".concat(i)).innerHTML;
                }
            </script>
            <script src="autocomplete.js"></script>
            </head>
            <body onload="onload();">
            <form method="POST" action="update.html" onsubmit="return isInputValid();">
            <table>`
        );
        let odd = true;
        let i = 0;
        for (const row of rows) {
            odd = !odd;
            const tdClass = (odd) ? 'oddResult' : 'outtd';
            i++;
            if (row.Type == 0) {
                res.write(`
                    <tr>
                        <td class="${tdClass}">${displayDate(row.Date)}</td>
                        <td class="${tdClass}">${row.Amount.replace(/\-/, '')}</td>
                        <td class="${tdClass}">${row.Description}</td>
                        <td class="${tdClass}" id="m${i}">${row.Merchant}</td>
                        <td class="${tdClass}" id="r${i}">${row.Reason}</td>
                        <td class="${tdClass}">
                            <input type="radio" name="radioGroup" onchange="copySelection(${i})">
                        </td>
                    </tr>`
                );
            } else {
                res.write(`
                    <tr>
                        <td class="${tdClass}">${displayDate(row.Date)}</td>
                        <td class="${tdClass}">${row.Amount.replace(/\-/, '')}</td>
                        <td class="${tdClass}">${row.Description}</td>
                        <td class="${tdClass}">
                            <div class="autocomplete">
                                <input type="text" id="merchant" name="merchant" placeholder="Merchant" autofocus="">
                            </div>
                        </td>
                        <td class="${tdClass}">
                            <div class="autocomplete">
                                <input type="text" id="reason" name="reason" placeholder="Reason" autofocus="">
                            </div>
                        </td>
                        <td class="${tdClass}">
                            <input type="submit" value="Update">
                            <input type="hidden" value="${row.rowid}" name="rowid">
                        </td>
                    </tr>`
                );
            }
        }
        res.end(`
            </table>
            <br>${numUpdatesLeft}
            </form>
            </body>
            </html>`
        );
    }
}

function displayDate (date) {
    const d = (new Date(date.split('/').reverse().join('-'))).toDateString().split(' ');
    return [d[2], d[1], d[3], d[0]].join('&nbsp;');
}
