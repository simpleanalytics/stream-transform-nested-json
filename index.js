const { Transform } = require("stream");

const HEX = {
  quote: 0x22,
  backslash: 0x5c,
  brace: {
    open: 0x7b,
    close: 0x7d,
  },
};

class TransformNestedJSON extends Transform {
  constructor(options = {}) {
    super({
      readableObjectMode: false,
      writableObjectMode: true,
    });

    this.nestingLevel = (options.nestingLevel || 0) + 1;
    this.maxObjectSize = options.maxObjectSize || 8 * 1024;

    this.openBraces = 0;
    this.inString = false;
    this.escaping = false;
    this.buf;
    this.writePos;

    this.newBuffer();
  }

  _transform(chunk, encoding, next) {
    if (!chunk) {
      if (this.openBraces >= this.nestingLevel) {
        // We've ended with an object still open, so the stream
        // must contain a JSON syntax error.
        next(new Error("stream ended inside JSON object"));
      }
      return next(null);
    }

    let openPos = 0;
    const len = chunk.length;

    for (let pos = 0; pos < len; pos++) {
      const octet = chunk[pos];

      if (octet == HEX.quote) {
        if (this.inString && !this.escaping) {
          this.inString = false;
        } else {
          this.inString = true;
        }
      }
      this.escaping = false;

      if (this.inString) {
        if (octet == HEX.backslash) {
          this.escaping = true;
        }

        continue;
      }

      if (octet == HEX.brace.open) {
        this.openBraces++;

        if (this.openBraces == this.nestingLevel) {
          // Beginning of an interesting object
          openPos = pos;
        }
      } else if (octet == HEX.brace.close) {
        this.openBraces--;

        if (this.openBraces == this.nestingLevel - 1) {
          // End of an interesting object

          // Copy everything up to this point into our result this.buffer
          this.writePos += chunk.copy(
            this.buf,
            this.writePos,
            openPos,
            pos + 1
          );
          if (this.writePos === this.buf.length) {
            return next(new Error("JSON object too large"));
          } else {
            var slice = this.buf.slice(0, this.writePos);
            this.push(slice);
          }
          this.newBuffer();
        }
      }
    }

    if (this.openBraces >= this.nestingLevel) {
      // We're ending this chunk an object, so copy everything we found
      // so far into the result this.buffer so we can resume the object
      // when the next chunk shows up.
      this.writePos += chunk.copy(this.buf, this.writePos, openPos);
    }

    next();
  }

  newBuffer() {
    this.buf = Buffer.alloc(this.maxObjectSize);
    this.writePos = 0;
  }
}

module.exports = TransformNestedJSON;
