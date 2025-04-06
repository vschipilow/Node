"use strict";

import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import config from './package.json' with { type: 'json' };
console.log('http://localhost:' + config.port + '/sudoku.html');

createServer((req, res) => {
    const url = '.' + ((req.url == '/') ? '/sudoku.html' : req.url);
    console.log('reading ' + url);
    readFile(url, (err, data) => {
        if (err) {
            const url2 = '../Common' + url;
            console.log('reading ' + url2);
            readFile(url2, (err, data) => {
                if (err) return console.log(err);
                res.end(data);
            });
            return;
        }
        res.end(data);
    });
}).listen(config.port);
