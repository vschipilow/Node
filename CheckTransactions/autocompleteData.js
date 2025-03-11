"use strict";

import { openDB } from '../Common/databaseManager.js';
import config from './package.json' with { type: 'json' };

export function autocompleteData (res) {
    const db = openDB(config.db);
    const reasons = [];
    const merchants = [];
    db.each(`SELECT Reason
               FROM Ledger
              WHERE Reason IS NOT NULL
              GROUP BY Reason
              ORDER BY Reason`,
        (err, row) => {
            if (err) return console.log(err);
            reasons.push(row.Reason);
        }
    );
    db.each(`SELECT Merchant
               FROM Ledger
              WHERE Merchant IS NOT NULL
              GROUP BY Merchant
              ORDER BY Merchant`,
        (err, row) => {
            if (err) return console.log(err);
            merchants.push(row.Merchant);
        }
    );
    db.close((err) => {
        if (err) return console.log(err);
        res.end(JSON.stringify({ reasons, merchants }));
    });
}