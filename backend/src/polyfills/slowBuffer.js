const buffer = require('buffer');

if (!buffer.SlowBuffer) {
  function SlowBuffer(sizeOrData, encoding) {
    if (typeof sizeOrData === 'number') {
      return Buffer.alloc(sizeOrData);
    }
    return Buffer.from(sizeOrData, encoding);
  }
  SlowBuffer.prototype = Buffer.prototype;
  buffer.SlowBuffer = SlowBuffer;
}
