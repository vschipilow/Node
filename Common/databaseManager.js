"use strict";

import sqlite3 from '/opt/homebrew/Cellar/node/23.5.0/lib/node_modules/sqlite3/lib/sqlite3.js';

export function openDB(dbPath) {
    return new sqlite3.Database(dbPath);
}