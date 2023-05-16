import { MessageEncoder, MessageDecoder, BitDataView, reverseByte } from "./binutils.js";

export class BitChannelObserver extends EventTarget {
  #lastTimestamp;
  #lastState = 1;
  #millis = [0, 0, 0]; // zero, reset, one
  #observer;

  #bitIndex = 0;
  #align = 0;
  #decoder = new MessageDecoder;
  #view = new BitDataView(new ArrayBuffer(2, { maxByteLength: 256 }));

  constructor() {
    super();
    let lastValue = -1;

    const map = state => {
      switch(state) {
        case "nominal":
        case "fair":
          return 0;
        case "serious":
          return 1;
        case "critical":
          return 2;
      }
    }

    this.#observer = new PressureObserver(changes => {
      let value = map(changes[0].state);
      if (value !== lastValue) {
        this.#processRawState(value);
      }
      lastValue = value;
    });
  }

  async observe(runTest = false) {
    if (!runTest) {
      this.#lastTimestamp = performance.now();
      return await this.#observer.observe("cpu");
    }

    const enc = new MessageEncoder();
    const data = [...enc.encode("hello world")];
    // Add some disalignment
    const brokenData = [23, 19,
      ...data.slice(0, 8),
      15, 101,
      ...data.slice(8)];

    const bits = new BitDataView(new Uint8Array(brokenData).buffer);
    console.log(bits)
    for (let bit of bits) {
      this.#processData(bit);
    }
  }

  #processRawState(state) {
    let start = this.#lastTimestamp;
    this.#lastTimestamp = performance.now();
    let time = (this.#lastTimestamp - start);

    this.#millis[this.#lastState] += time;
    this.#lastState = state;

    if (this.#millis[1] > 6_000) {
      const toDispatch = this.#millis[0] > this.#millis[2] ? 0 : 1;
      this.#processData(toDispatch);
      this.#millis = [0, 0, 0];
    }
  }

  #processData(bit) {
    this.#view.setBit(this.#bitIndex, bit);

    this.dispatchEvent(new CustomEvent("bitreceived", { detail: { value: bit } }));

    if (++this.#bitIndex % 16 !== 0) {
      return;
    }

    // We have one word (two bytes) now!

    const byteIndex = this.#view.buffer.byteLength - 2;

    const value = this.#view.getUint8(byteIndex);
    const checksum = this.#view.getUint8(byteIndex + 1);

    if (value !== reverseByte(~checksum)) {
      // Checksum for byte doesn't match.
      // We might have gotten a wrong value, or a value too much or too little.
      // In most cases this requires around two new bytes to find alignment.
      console.log(`Misaligned or corrupt data, shifting to find new alignment (${++this.#align})...`);
      //console.log(toBinaryString(view.getUint8(byteIndex)), toBinaryString(view.getUint8(byteIndex + 1)));
      this.#bitIndex--;
      this.#view.shift16Left(1, byteIndex);
      return;
    }

    // We have a valid word (two bytes) now!

    const message = this.#decoder.decode(new Uint8Array(this.#view.buffer));
    this.#view.buffer.resize(this.#view.buffer.byteLength + 2);
    this.#align = 0;

    this.dispatchEvent(new CustomEvent("messagechange", { detail: { value: message } }));
  }
}