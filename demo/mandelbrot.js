// Mandelbrot using Workers
// Author: Peter Jensen, Intel Corporation
//         Kenneth Christiansen, Intel Corporation

const MAX_ITERATIONS = 100;

export class Mandelbrot {
  #context;
  #canvas;
  #imageData;

  width;
  height;
  scale = 1;

  constructor(canvasEl, scale = 1) {
    this.#canvas = canvasEl;
    this.#context = this.#canvas.getContext("2d");
    this.width = this.#canvas.width * scale;
    this.height = this.#canvas.height * scale;
    this.#imageData = this.#context.createImageData(this.width, this.height);
  }

  setScale(scale = 1) {
    this.scale = scale;
    this.width = this.#canvas.width * scale;
    this.height = this.#canvas.height * scale;
    this.#imageData = this.#context.createImageData(this.width, this.height);
  }

  async drawImageFrame(data) {
    if (data) {
      this.#imageData.data.set(data);
    } else {
      this.#context.rect(0, 0, this.#canvas.width, this.#canvas.height);
      this.#context.fillStyle = "black";
      this.#context.fill();
      return;
    }
    const image = await createImageBitmap(this.#imageData);

    let x = (this.#canvas.width - this.width) / 2;
    let y = (this.#canvas.height - this.height) / 2;
    this.#context.drawImage(image, x, y);
  }
};

class MandelbrotWorker extends Worker {
  constructor(bufferSize) {
    super("mandelbrot-worker-asm.js");
    this.buffer = new ArrayBuffer(bufferSize);
  }
};

const mandelbrotWorkers = new class {
  #workers = [];
  bufferByteLength = 0;

  addWorker(handler) {
    const worker = new MandelbrotWorker(this.bufferByteLength);
    this.#workers.push(worker);

    worker.addEventListener('message', handler, false);

    return this.#workers.length - 1;
  }

  sendRequest(index, message) {
    const worker = this.#workers[index];
    const buffer = this.#workers[index].buffer;

    worker.postMessage ({ message, worker_index: index, buffer }, [buffer]);
  }

  restoreBuffer(index, buffer) {
    if (buffer.byteLength != this.bufferByteLength) {
      buffer = new ArrayBuffer(this.bufferByteLength);
    }
    this.#workers[index].buffer = buffer;
  }

  terminateLastWorker() {
    const lastWorker = this.#workers.pop();
    lastWorker?.postMessage({ terminate: true });
  }

  terminateAllWorkers() {
    while (this.#workers.length) {
      this.terminateLastWorker();
    }
  }

  workerCount() {
    return this.#workers.length;
  }

  bufferOf(index) {
    return this.#workers[index]?.buffer;
  }

  workerIsActive(index) {
    return index < this.#workers.length;
  }
};

export class Animator {
  scale_start = 1.0;
  scale_end   = 0.0005;
  xc_start    = -0.5;
  yc_start    = 0.0;
  xc_end      = 0.0;
  yc_end      = 0.75;
  steps       = 200.0;

  frame_count   = 0;  // number of frames painted to the canvas
  request_count = 0;  // number of frames requested from workers
  pending_frames = [];

  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.drawImageFrame(null);

    mandelbrotWorkers.bufferByteLength = canvas.width * canvas.height * 4;

    this.scale_step  = (this.scale_end - this.scale_start) / this.steps;
    this.xc_step     = (this.xc_end - this.xc_start) / this.steps;
    this.yc_step     = (this.yc_end - this.yc_start) / this.steps;
    this.scale       = this.scale_start;
    this.xc          = this.xc_start;
    this.yc          = this.yc_start;
  }

  // Look for a frame with 'frame_index' in the pending frames
  findFrame(frame_index) {
    for (var i = 0, n = this.pending_frames.length; i < n; ++i) {
      if (this.pending_frames[i].frame_index === frame_index) {
        return i;
      }
    }
    return false;
  }

  advanceFrame() {
    if (this.scale < this.scale_end || this.scale > this.scale_start) {
      this.scale_step = -this.scale_step;
      this.xc_step = -this.xc_step;
      this.yc_step = -this.yc_step;
    }
    this.scale += this.scale_step;
    this.xc += this.xc_step;
    this.yc += this.yc_step;
  }

  // Send a request to a worker to compute a frame
  requestFrame(worker_index) {
    mandelbrotWorkers.sendRequest(worker_index, {
      request_count:  this.request_count,
      width:          this.canvas.width,
      height:         this.canvas.height,
      xc:             this.xc,
      yc:             this.yc,
      scale:          this.scale,
      max_iterations: MAX_ITERATIONS
    });
    this.request_count++;
    this.advanceFrame();
  }

  paintFrame(buffer) {
    this.canvas.drawImageFrame(buffer);
  }

  workerCount() {
    return mandelbrotWorkers.workerCount();
  }

  setWorkerCount(count) {
    while (mandelbrotWorkers.workerCount() < count) {
      this.addWorker();
    }

    while (mandelbrotWorkers.workerCount() > count) {
      this.removeWorker();
    }
  }

  setScale(scale = 1) {
    this.canvas.drawImageFrame(null);
    this.canvas.setScale(scale);
    mandelbrotWorkers.bufferByteLength = this.canvas.width * this.canvas.height * 4;
  }

  currentScale() {
    return this.canvas.scale;
  }

  addWorker() {
    // Called when a worker has computed a frame
    const updateFrame = e => {
      const worker_index  = e.data.worker_index;
      const request_count = e.data.message.request_count;

      // If not terminated in the meanwhile.
      if (worker_index < mandelbrotWorkers.workerCount()) {
        mandelbrotWorkers.restoreBuffer(worker_index, e.data.buffer);
      }

      if (request_count !== this.frame_count) {
        // frame came early, save it for later and do nothing now
        this.pending_frames.push({worker_index: worker_index, frame_index: request_count});
        return;
      }

      // We might have rescaled.
      if (e.data.buffer.byteLength === mandelbrotWorkers.bufferByteLength) {
        this.paintFrame(new Uint8ClampedArray(e.data.buffer));
      }
      this.frame_count++

      if (this.pending_frames.length > 0) {
        // there are delayed frames queued up.  Process them
        let frame;
        while ((frame = this.findFrame(this.frame_count)) !== false) {
          var windex = this.pending_frames[frame].worker_index;
          this.pending_frames.splice(frame, 1); // remove the frame from the pending_frames
          var buffer = mandelbrotWorkers.bufferOf(windex);
          if (buffer && buffer.byteLength) { // detached buffers have zero length
            this.paintFrame(new Uint8ClampedArray(buffer));
          }
          this.frame_count++;
          if (mandelbrotWorkers.workerIsActive(windex)) {
            this.requestFrame(windex);
            this.advanceFrame();
          }
        }
      }

      if (mandelbrotWorkers.workerIsActive(e.data.worker_index)) {
        this.requestFrame(e.data.worker_index);
        this.advanceFrame();
      }
    }

    const workerIndex = mandelbrotWorkers.addWorker(updateFrame);
    this.requestFrame(workerIndex);
    this.advanceFrame();
  }

  removeWorker() {
    mandelbrotWorkers.terminateLastWorker();
  }
}