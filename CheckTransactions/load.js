"use strict";

import { readFile, readFileSync, readdir } from 'node:fs';
import { splitCSV } from '../Common/splitCSV.js';
import { isSet } from './common.js';
import { openDB } from '../Common/databaseManager.js';
import config from './package.json' with { type: 'json' };
const lineBreak = `
                    `;

export function load (res) {
    const lastTrans = [];
    const htmlReport = [];
    let errorFound = false;
    let rowsChecked = 0;
    let rowsNeedingUpdate;
    let transactionsLoaded = false;
    getLastTransByAccount();
    
    function getLastTransByAccount() {
        const db = openDB(config.db);
        db.each(`SELECT Account,
                        AccountName,
                        Date,
                        Amount,
                        Description,
                        Balance,
                        SortDate,
                        Count
                   FROM LastTransView`, 
            (err, row) => {
                if (errTest(err)) return;
                lastTrans.push( { accountNo: row.Account, accountName: row.AccountName, date: row.Date, 
                    amount: row.Amount, description: row.Description, balance: row.Balance, 
                    sortDate: row.SortDate, count: row.Count, first: true } );
            }
        );
        db.close((err) => {
            if (errTest(err)) return;
            readdir(config.downloadFolder, checkForDownloads);
        });
    }

    function checkForDownloads(err, files) {
        if (errTest(err)) return;
        const db = openDB(config.db);
        db.serialize(() => {
            for (const file of files) {
                if (/^CSVData.*\.csv$/.test(file)) {
                    const filename = config.downloadFolder.concat('/', file);
                    processFile(db, filename); 
                }
            }
            if (errorFound == false) {
                performChecks(db);
            }
        });
        db.close((err) => {
            errTest(err);
            if (errorFound) {
                report('ERROR ERROR ERROR ERROR ERROR ERROR ERROR ERROR ERROR ERROR');
            } else {
                report(`${rowsChecked} ledger entries checked, no errors found`);
                if (rowsNeedingUpdate > 0) {
                    report(`${rowsNeedingUpdate} rows need updating`);
                }
            }
            readFile('./header.html', view);
        });
    }

    function processFile(db, filename) {
        let lines = [];
        const data = readFileSync(filename);
        if (data) {
            // cleanse the file data
            for (const line of data.toString().replace(/\r/g, '').split('\n')) {
                if (isSet(line)) {
                    const columns = splitCSV(line);
                    if (columns.length == 4) {
                        lines.push(columns);
                    }
                }
            }
        }
        if (lines.length == 0) {
            report(`can't read file ${filename}`);
            return;
        }
        for (let i = 0; i < lines.length; i++) {
            const [testDate, testAmount, testDescription, testBalance] = lines[i];
            for (const x of lastTrans) {
                if (x.date == testDate && x.amount == testAmount && x.description == testDescription
                &&  x.balance == testBalance) {
                    if (i == 0) {
                        report(`skipping ${filename}, already loaded into ${x.accountNo} (${x.accountName})`);
                        return;
                    }
                    transactionsLoaded = true;
                    for (let j = i - 1; j >= 0; j--) {
                        const [date, amount, description, balance] = lines[j];
                        const sortDate = valueDate(date, description);
                        db.run(`INSERT INTO Ledger 
                                (      Account, 
                                       Date, 
                                       Amount, 
                                       Description, 
                                       Balance, 
                                       SortDate
                                )
                                VALUES 
                                (      '${x.accountNo}', 
                                       '${date}', 
                                       '${amount}', 
                                       "${description}", 
                                       '${balance}', 
                                       '${sortDate}'
                                )`,
                            (err) => {
                                errTest(err);
                            }
                        );
                    }
                    report(`loaded ${i} transactions into ${x.accountNo} (${x.accountName}) from ${filename}`);
                    return;
                }
            }
        }
        report(`No matches found on file ${filename}`);

        function valueDate(date, description) {
            return (    (/ Value Date: \d\d\/\d\d\/\d\d\d\d$/.test(description)) 
                        ? description.match(/\d\d\/\d\d\/\d\d\d\d$/)
                        : date
            ).toString().split('/').reverse().join('-');
        }
    }

    function performChecks(db) {
        db.each(`SELECT rowid, 
                        Account, 
                        Amount, 
                        Balance
                   FROM Ledger
                  ORDER BY rowid`,
            (err, row) => {
                if (errorFound) {
                    return;
                }
                if (errTest(err)) return;
                rowsChecked++;
                const account = lastTrans.find((x) => x.accountNo == row.Account);
                if (account.first) {
                    account.tempBalance = parseFloat(row.Balance).toFixed(2);  
                    account.first = false;
                } else {
                    account.tempBalance = (parseFloat(account.tempBalance) + parseFloat(row.Amount)).toFixed(2);
                    if (parseFloat(row.Balance) != parseFloat(account.tempBalance)) {
                        report(`reconciliation error at rowid ${row.rowid}, `.concat
                              (`calculated balance ${account.tempBalance}, row balance ${row.Balance}`)
                        );
                        errorFound = true;
                    }
                }
            }
        );
        db.run(`UPDATE Ledger
                SET Reason = 'INTEREST',
                    Merchant = (
                        SELECT upper(Description) 
                            FROM Code
                            WHERE [Table] = 'Account' AND 
                                Code = Ledger.Account
                    )
                WHERE Description = 'Credit Interest' AND 
                      Reason IS NULL AND 
                      Merchant IS NULL;`,
            (err) => {
                if (errTest(err)) return ;
            }
        );
        db.each(`SELECT count( * ) AS Count,
                        changes() AS Changes
                   FROM Ledger
                  WHERE Account = 'xx7457'
                    AND ( Merchant IS NULL OR 
                          Reason   IS NULL )`,
            (err, row) => {
                if (errTest(err)) return;
                report('' + row.Changes + ' record(s) had NULL Reason and Merchant updated to "INTEREST"');
                rowsNeedingUpdate = row.Count;
            }
        );
    }

    function view(err, data) {
        if (errTest(err)) return;
        res.write(data);
        res.write(`
            </head>
            <body>
            <table>
            <tr>
                <th>A/C No.</th>
                <th>A/C Name</th>
                <th>Max Date</th>
                <th>Trans Count</th>
            </tr>`
        );
        let odd = true;
        for (const x of lastTrans) {
            const left = odd ? 'oddResult' : 'outtd';
            const right = odd ? 'outnum oddResult' : 'outnum';
            odd = !odd;
            res.write(`
                <tr>
                    <td class="${left}">${x.accountNo}</td>
                    <td class="${left}">${x.accountName}</td>
                    <td class="${left}">${x.sortDate}</td>
                    <td class="${right}">${x.count}</td> 
                </tr>`
            );
        }
        const endOfData = '<br><br>' + lineBreak;
        res.write(lineBreak + '<table>' + endOfData + htmlReport.join(endOfData) + endOfData);
        switch (true) {
            case errorFound:
                break;
            case rowsNeedingUpdate > 0:
                res.write('<a href="update.html">Update Ledger</a>');
                break;
            case transactionsLoaded:
                res.write('<a href="backup.html">Backup Ledger</a>');
                break;
            default:
                res.write('<a href="home.html">continue</a>');
        }
        res.end(`
            </body>
            </html>`
        );
    }

    function errTest(err) {
        if (isSet(err)) {
            errorFound = true;
            report(err.toString());
        }
    }

    function report(text) {
        console.log(text);
        htmlReport.push(text);
    }
}