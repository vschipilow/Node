"use strict";

export function isSet (x) {
    switch(typeof x) {
        case 'number':
            return true;
        case 'string':
            return (x.trim() != '');
        default:
            return false;
    }
}

export function isNotSet (x) {
    return (isSet(x) == false);
}

export function isOdd(x) {
    return ((toNumber(x) % 2) == 1);
}

function toNumber(x) {
    switch(typeof x) {
        case 'number':
            return Math.floor(x);
        case 'string':
            return parseInt(x);
        default:
            return -1;
    }
}

export function isTrue (x) {
    switch(typeof x) {
        case 'boolean':
            return x;
        case 'string':
            return ['TRUE', 'T', 'Y'].includes(x.toUpperCase());
        case 'number':
            return x != 0;
        default:
            return false;
    }
}

export function coalesce (x, y) {
    if (isSet(x)) {
        return x;
    } else {
        return y;
    }
}

export function formatAmount (amt) {
    const dec = { minimumFractionDigits: "2", maximumFractionDigits: "2" };
    return parseFloat(amt).toLocaleString("en-AU", dec);
}

export function formatDate (date) {
    const d = (new Date(date)).toDateString().split(' ');
    return [d[2], d[1], d[3], d[0]].join('&nbsp;');
}
