"use strict";

import { openSync, readSync, fstatSync } from 'node:fs';
import { Buffer } from 'node:buffer';

export function open (filename) {
    return (new LineReader(filename));
}

class LineReader {
    constructor (filename) {
        this.fd = openSync(filename);
        const stats = fstatSync(this.fd);
        this.length = stats.blksize;
        this.fileSize = stats.size;
        this.buff = Buffer.alloc(this.length);
        this.lastPartialLineOfBlock = [];
        this.offset = 0;
        this.position = 0;
        this.getNextBlock();
        if (this.bytesRead == 0) {
            this.linesIndex = this.lastIndex;
        }
    }

    readline () {
        this.linesIndex++;
        switch (true) {
            case 0 < this.linesIndex && this.linesIndex < this.lastIndex: {
                return this.lines[this.linesIndex];
            }
            case this.linesIndex == this.lastIndex && this.bytesRead == this.length: {
                this.lastPartialLineOfBlock.push(this.lines[this.linesIndex]);
                this.getNextBlock();
                return this.readline();
            }
            case this.linesIndex == this.lastIndex: {
                this.lastPartialLineOfBlock.push(this.lines[this.linesIndex]);
                let line = this.lastPartialLineOfBlock.join('');
                return (line == '') ? null : line;
            }
            case this.linesIndex == 0: {
                this.lastPartialLineOfBlock.push(this.lines[0]);
                let line = this.lastPartialLineOfBlock.join('');
                this.lastPartialLineOfBlock = [];
                return line;
            }
            default: {
                return null;
            }
        }
    }

    getNextBlock() {
        this.bytesRead = readSync(this.fd, this.buff, this.offset, this.length, this.position);
        this.position += this.bytesRead;
        this.lines = this.buff.toString().substring(0, this.bytesRead).replace(/\r/g, '').split('\n');
        this.linesIndex = -1;
        this.lastIndex = this.lines.length - 1;
    }

    startFromPosition(pos) {
        this.position = pos;
        this.lastPartialLineOfBlock = [];
        this.getNextBlock();
        this.linesIndex = 0;
    }
}