import { MessageEncoder, BitDataView, toBinaryString } from "./binutils.js";

export class BitChannelBroadcaster extends EventTarget {
  #pressureGeneratorFn;

  constructor(pressureGeneratorFn) {
    super();
    this.#pressureGeneratorFn = pressureGeneratorFn;
  }

  async sendMessage(msg, calibration) {
    const enc = new MessageEncoder();
    const bits = new BitDataView(enc.encode(msg).buffer);

    const timeout = delay => new Promise(resolve => setTimeout(resolve, delay));

    while (true) {
      let i = 0;
      let lastDwordIndex = 0;
      for (let bit of bits) {
        let byteIndex = Math.floor(i++ / 8);
        let dwordIndex = byteIndex % 4;

        this.dispatchEvent(new CustomEvent("bitsent", { detail: { value: bit } }));

        let byte = bits.getUint8(byteIndex);
        let chkByte = bits.getUint8(byteIndex + 1);

        if (dwordIndex !== lastDwordIndex) {
          if (dwordIndex === 0) {
            let pos = byte - 128;
            this.dispatchEvent(new CustomEvent("datachange", {
              detail: {
                type: "position",
                value: pos,
                data: new Uint8Array([byte, chkByte])
              }
            }));
          } else if (dwordIndex === 2) {
            const dec = new TextDecoder("utf-8");
            const ch = dec.decode(bits.buffer.slice(byteIndex, byteIndex + 1));
            this.dispatchEvent(new CustomEvent("datachange", {
              detail: {
                type: "character",
                value: ch,
                data: new Uint8Array([byte, chkByte])
              }
            }));
          }
        }
        lastDwordIndex = dwordIndex;

        this.#pressureGeneratorFn(bit ? calibration.one : calibration.zero);
        await timeout(calibration.delay);

        console.log("Sending 'reset'");
        this.#pressureGeneratorFn(calibration.reset);
        await timeout(2 * calibration.delay);
      }
    }
  }
};