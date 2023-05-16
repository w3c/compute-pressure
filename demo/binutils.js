export function toBinaryString(value) {
  let str = (value >>> 0).toString(2);
  return '0b' + str.padStart(Math.ceil(str.length / 8) * 8, '0');
}

export function reverseByte(b) {
  b = (b & 0b11110000) >> 4 | (b & 0b00001111) << 4;
  b = (b & 0b11001100) >> 2 | (b & 0b00110011) << 2;
  b = (b & 0b10101010) >> 1 | (b & 0b01010101) << 1;
  return b;
}

export class BitDataView extends DataView {
  #u8;

  constructor(buffer) {
    super(buffer);
    this.#u8 = new Uint8Array(buffer);
    this.length = 0;
  }

  getBit(index) {
    const v = this.#u8[index >> 3];
    const offset = index & 0x7;
    return (v >> (7-offset)) & 1;
  };

  setBit(index, value) {
    this.length = Math.max(this.length, index + 1);
    const offset = index & 0x7;
    if (value) {
      this.#u8[index >> 3] |= (0x80 >> offset);
    } else {
      this.#u8[index >> 3] &= ~(0x80 >> offset);
    }
  };

  shift16Left(amount, index = 0) {
    let view = new DataView(this.buffer);
    let value = view.getUint16(index, false);
    view.setInt16(index, value << amount, false);
  }

  [Symbol.iterator]() {
    return {
      current: 0,
      last: this.buffer.byteLength * 8,
      view: this,

      next() {
        if (this.current <= this.last) {
          return { done: false, value: this.view.getBit(this.current++) };
        } else {
          return { done: true };
        }
      }
    };
  }
}

export class MessageEncoder {
  encode(message) {
    const enc = new TextEncoder("utf-8");

    // We send 32 bits per ASCII character:
    //   |position| with the first bit set to 1 indicating a position
    //   |checksum| and alignment byte for the position
    //   |value| Non extended ASCII character
    //   |checksum| and alignment byte for the value
    //
    // A checksum is the reversed complement, e.g for 0110 1000
    // the complement will be 10010111 and reversed it will be 11101001
    const letters = [...enc.encode(message)].flatMap((value, position) => {
      const pos = position | 0b10000000;
      const vPos = reverseByte(~pos);
      const vValue = reverseByte(~value);
      return [ pos, vPos, value, vValue ]
    });

    return new Uint8Array([...letters]);
  }
}

export class MessageDecoder {
  decode(uInt8Array) {
    const dec = new TextDecoder("utf-8");
    const view = new BitDataView(uInt8Array.buffer);
    const output = [];

    const POSITION_BIT = 0b10000000;
    let position = 0;

    for (let i = 0; i < uInt8Array.length; i += 2) {
      const byte = uInt8Array[i];
      const checksum = uInt8Array[i + 1];

      const isPosition = (byte & POSITION_BIT) === POSITION_BIT;
      const lastPosition = position;
      if (isPosition) {
        position = byte & 0b01111111;
      }

      if (byte !== reverseByte(~checksum)) {
        console.warn(`Checksum ${toBinaryString(checksum)} test failed for byte ${toBinaryString(byte)}`);
        if (isPosition && lastPosition + 1 === position) {
          console.warm(`Position ${position} appears to be correct, so we trust it.`)
        } else {
          continue;
        }
      }

      if (position > uInt8Array.length / 4) {
        console.warn(`Decoded position '${position}', but value seems corrupt.`)
        console.log(uInt8Array.length);
        position = -1;
      }

      if (!isPosition) {
        let char = dec.decode(new Uint8Array([byte]));
        if (position < 0) {
          console.warn(`Decoded '${char}', but character position is unknown.`);
          continue;
        }
        output[position] = char;
        position = -1;
      }
    }

    return [...output.values()].map(v => v ? v : '\ufffd').join('');
  }
}

//let enc = new MessageEncoder();
//let dec = new MessageDecoder();

//let encoded = enc.encode("hello world");
//console.log(encoded);

// h 0 1 2 3
// e 4 5 6 7
// l 8 9 10 11
// l 12 13 14 15
// o 16 17 18 19
// _ 20 21 22 23
// w 24 25 26 27

// encoded[5] = 0b01001111; // break position checksum
// encoded[8] = 0b01001111; // break position 2 (l)
// encoded[27] = 0b01001111; // break char 'w'

// console.log(encoded);
// console.log(dec.decode(encoded));