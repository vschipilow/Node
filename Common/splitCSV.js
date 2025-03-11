
"use strict";

const doubleQuote = "\"";
const comma = ",";
const emptyString = "";
const firstDoubleQuote = /^"/;
const lastDoubleQuote = /"$/;

export function splitCSV (line) {
    const cols = line.split(comma);
    if (line.includes(doubleQuote) == false) {
        return cols;
    }
    let inQuotes = false;
    let colParts = [];
    const newCols = [];
    for (let col of cols) {
        let repeat = true;
        while (repeat) {
            repeat = false;
            switch (true) {
                case inQuotes && col.endsWith(doubleQuote): 
                    colParts.push(col.replace(lastDoubleQuote, emptyString));
                    newCols.push(colParts.join(''));
                    colParts = [];
                    inQuotes = false;
                    break;
                case inQuotes:
                    colParts.push(col, comma);
                    break;
                case col.startsWith(doubleQuote):
                    col = col.replace(firstDoubleQuote, emptyString);
                    inQuotes = true;
                    repeat = true;
                    break;
                default:
                    newCols.push(col);
            }
        }
    }
    return newCols;
}
