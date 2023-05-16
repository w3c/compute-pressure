import { Mandelbrot, Animator } from "./mandelbrot.js";
import { html, css } from "./wc-utils.js";

const template = document.createElement('template');
template.innerHTML = html`
  <div id="wrapper" width="600" height="400">
    <canvas id="mandel" width="600" height="400"></canvas>
    <div id="counter">0</div>
    <div id="controls">
      <div id="switch">▶️</div>
      <div>
        <input id="scale" type="range" min="0.1" max="1" value="1" step="0.1">&nbsp;
        <span id="scale-value">1.0</span>
      </div>
      <div>
        <div id="plus">➕</div>
        <div id="minus">➖</div>
      </div>
    </div>
  </div>
`;

const sheet = css`
  #wrapper {
    width: 600px;
    height: 400px;
    position: relative;
    display: flex;

    align-items: center;
    justify-content: center;
    flex-direction: column;
    flex-wrap: nowrap;

    border: 2px solid #ccc;
    padding: 1px;
    position: relative;
  }

  #wrapper > div {
    position: absolute;
    color: white;
    font-size: 8em;
  }

  #controls > * {
    display: flex;
    font-size: xx-large;
    user-select: none;
  }

  #controls {
    display: flex;
    bottom: 6px;
    left: 6px;
    width: calc(100% - 12px);
    height: 44px;
    flex-flow: row;
    justify-content: flex-start;
    justify-content: space-between;
    align-items: center;
  }
`;

class MandelbrotPlayer extends HTMLElement {
  #canvas;
  #animator;

  constructor() {
    super();
    this.attachShadow({ 'mode': 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.adoptedStyleSheets = [sheet];

    const toggle = this.shadowRoot.getElementById("switch");
    const updateToggle = () => {
      let toSet = (this.workerCount() === 0) ? "▶️" : "⏹️";
      if (toggle.innerText !== toSet) {
        toggle.innerText = toSet;
      }
    }

    toggle.onclick = () => {
      if (this.workerCount() > 0) {
        this.setWorkerCount(0);
      } else {
        this.setWorkerCount(1);
      }
      updateToggle();
    }

    this.shadowRoot.getElementById("plus").onclick = () => {
      this.setWorkerCount(this.workerCount() + 1);
      updateToggle();
    }
    this.shadowRoot.getElementById("minus").onclick = () => {
      this.setWorkerCount(Math.max(0, this.workerCount() - 1));
      updateToggle();
    }

    this.shadowRoot.getElementById("scale").onchange = e => this.setScale(e.target.value);
  }

  connectedCallback() {
    this.#canvas = new Mandelbrot(this.shadowRoot.getElementById("mandel"));
    this.#animator = new Animator(this.#canvas);

    const input = this.shadowRoot.querySelector("#scale");
    input.value = Number(sessionStorage.getItem(`${input.tagName}@scale`) ?? '');
    this.setScale(input.value);
  }

  scale() {
    return this.#animator.currentScale();
  }

  setScale(scale) {
    this.shadowRoot.getElementById("scale-value").innerText = Number(scale).toFixed(1);
    this.#animator.setScale(scale);
    const input = this.shadowRoot.querySelector("#scale");
    sessionStorage.setItem(`${input.tagName}@scale`, scale);
  }

  workerCount() {
    return this.#animator.workerCount();
  }

  setWorkerCount(count) {
    this.#animator.setWorkerCount(count);

    const canvas = this.shadowRoot.getElementById("mandel");
    const counter = this.shadowRoot.getElementById("counter");

    const el = document.createElement("div");
    counter.innerText = this.workerCount();
    el.innerText = this.workerCount();
    canvas.insertAdjacentElement("afterend", el);

    const animation = [
      { opacity: 1, transform: 'translateY(0px) translateX(0px) scale(1)' },
      { opacity: 0, transform: `translateY(-200px) translateX(${Math.random() * 300 -150}px) scale(0.4)` }
    ];

    const timing = {
      duration: 600,
      iterations: 1,
    }
    el.animate(animation, timing).finished.then(() => el.remove());
  }
}

customElements.define("mandelbrot-player", MandelbrotPlayer);