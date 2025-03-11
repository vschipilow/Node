"use strict";

import { openSync, writeSync } from 'node:fs';
import { home } from './home.js';
import { openDB } from '../Common/databaseManager.js';
import config from './package.json' with { type: 'json' };

const doubleQuote = '"';
const comma = ',';
const emptyString = '';
const crlf = '\r\n';

export function backup(res) {
    const fd = openSync(config.backupFile, 'w');
    const columnNames = 'Account,Date,Amount,Description,Balance,Merchant,Reason,SortDate'.split(comma);
    writeSync(fd, convertToCSVLine(columnNames));
    const db = openDB(config.db);
    let i = 0;
    db.each(`SELECT Account,
                    Date,
                    Amount,
                    Description,
                    Balance,
                    Merchant,
                    Reason,
                    SortDate
               FROM Ledger
              ORDER BY rowid`, 
        (err, row) => {
            if (err) return console.log(err);
            writeSync(fd, 
                convertToCSVLine([ row.Account, row.Date,     row.Amount, row.Description, 
                                   row.Balance, row.Merchant, row.Reason, row.SortDate   
                                 ] 
                )
            );
            i++;
        }
    );
    db.close((err) => {
        if (err) return console.log(err);
        console.log(emptyString + i + ' transactions written to backup file');
        setTimeout(home, 10, res);
    });
}

function convertToCSVLine(row) {
    const newArray = [];
    for (const x of row) {
        switch (typeof x) {
            case 'number':
                newArray.push(x.toFixed(2));
                break;
            case 'string':
                if (x.includes(comma)) {
                    newArray.push(doubleQuote + x + doubleQuote);
                } else {
                    newArray.push(x);
                }
                break;
            default:
                newArray.push(emptyString);
        }
    }
    return emptyString + newArray.join(comma) + crlf;
}