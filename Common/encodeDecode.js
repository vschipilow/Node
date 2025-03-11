"use strict";

export function decode (x) {
    let min = 'A'.charCodeAt(0);
    let result = [];
    let valid1 = -1;
    for (let i = 0; i < x.length; i++) {
        let c = x.charCodeAt(i) - min;
        if (0 <= c && c <= 15) {
            if (valid1 < 0) {
                valid1 = c;
            } else {
                result.push(String.fromCharCode((valid1 << 4) | c));
                valid1 = -1;
            }
        }
    }
    return result.join('');
}

export function encode (x, maxLen) {
    let a = 'A'.charCodeAt(0);
    let result = [];
    let tempResult = [];
    let tempMaxLen = maxLen >> 1;
    for (let i = 0; i < x.length; i++) {
        if (tempMaxLen == 0) {
            tempMaxLen = maxLen >> 1;
            result.push(tempResult.join(''));
            tempResult = [];
        }
        let t = x.charCodeAt(i);
        tempResult.push(String.fromCharCode(((t & 240) >> 4) + a));
        tempResult.push(String.fromCharCode((t & 15) + a));
        tempMaxLen--;
    }
    result.push(tempResult.join(''));
    return result;
}
