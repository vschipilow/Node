"use strict";

/*

 -- add brew to PATH in ~/.zshrc
 export PATH="$PATH:/opt/homebrew/bin" 
 
 -- how to update brew
 brew update

 -- how to use brew to install app
 brew install db-browser-for-sqlite

 -- how to load node.js
 brew install node

 -- how to update node
 brew upgrade node

*/

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { home } from './home.js';
import { update } from './update.js';
import { load } from './load.js';
import { backup } from './backup.js';
import { browse } from './browse.js';
import { details } from './details.js';
import { autocompleteData } from './autocompleteData.js';
import { parse } from 'node:querystring';
import config from './package.json' with { type: 'json' };
console.log('http://localhost:' + config.port + '/home.html');

createServer((req, res) => {
    const url = req.url.replace(/\//, '');
    switch(req.method) {
        case 'GET':
            switch(url) {
                case '':
                case 'home.html':
                    home(res);
                    break;
                case 'update.html':
                    update(res);
                    break;
                case 'load.html':
                    load(res);
                    break;
                case 'backup.html':
                    backup(res);
                    break;
                case 'getAutocompleteData':
                    autocompleteData(res);
                    break;
                case 'stylesheet.css':
                    res.end(readFileSync('../Common/stylesheet.css'));
                    break;
                case 'autocomplete.css':
                case 'autocomplete.js':
                    res.end(readFileSync('../Common/' + url));
                    break;
                case 'apple-touch-icon-precomposed.png':
                    res.end(readFileSync('../Common/' + url));
                    break;
                default:
                    console.log('unknown GET url: ' + url);
            }
            break;
        case 'POST':
            let body = '';
            req.on('data', 
                function (data) {
                    body = '' + body + data;
                }
            ).on('end', () => {
                const parms = parse(body);
                switch(url) {
                    case 'home.html':
                        browse(res, parms);
                        break;
                    case 'update.html':
                        update(res, parms);
                        break;
                    case 'browse.html':
                        browse(res, parms);
                        break;
                    case 'details.html':
                        details(res, parms);
                        break;
                    default:
                        console.log('unknown POST url: ' + url);
                }
            });
            break;
    }
}).listen(config.port);
