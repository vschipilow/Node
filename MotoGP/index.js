"use strict";

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { openDb } from "../Common/databaseManager.js";
import config from "./package.json" with { type: "json" };

createServer((req, res) => {
    if (req.method == 'GET')
});
