import { html, css } from "./wc-utils.js";

const template = document.createElement('template');
template.innerHTML = html`
  <div id="emoji-display">
    <span id="emoji">😴</span>
    <div id="emoji-controls">
      <div id="switch">▶️</div>
      <span id="label">Not observing</span>
    </div>
  </div>
`;

const sheet = css`
  #emoji-display {
    width: 220px;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: center;
    border: 2px solid #ccc;
    padding: 16px;
    position: relative;
  }

  #switch {
    position: absolute;
    left: 3px;
    bottom: 6px;
    font-size: xx-large;
    user-select: none;
  }

  #emoji-controls {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
  }

  #emoji {
    font-size: 8em;
    margin-bottom: 16px;
  }
`;

class PressureEmoji extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ 'mode': 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.adoptedStyleSheets = [sheet];
  }

  connectedCallback() {
    const emoji = this.shadowRoot.getElementById("emoji");
    const label = this.shadowRoot.getElementById("label");

    const observer = new PressureObserver(changes => {
      switch(changes[0].state) {
        case "nominal":
          emoji.innerText = "😌";
          label.innerText = "Nominal pressure";
          break;
        case "fair":
          emoji.innerText = "😄";
          label.innerText = "Fair pressure";
          break;
        case "serious":
          emoji.innerText = "😖";
          label.innerText = "Serious pressure";
          break;
        case "critical":
          emoji.innerText = "🥵";
          label.innerText = "Critical pressure";
          break;
        default:
          emoji.innerText = "😴";
          label.innerText = "Not observing";
      }
    });

    const btn = this.shadowRoot.getElementById("switch");
    btn.active = false;
    btn.disabled = false;
    btn.onclick = async ev => {
      if (ev.target.disabled) {
        return;
      }
      if (btn.active == false) {
        btn.disabled = true;
        await observer.observe("cpu");
        btn.active = true;
        btn.innerText = "⏹️";
        btn.disabled = false;
      } else {
        observer.unobserve("cpu");
        btn.active = false;
        btn.innerText = "▶️";
        emoji.innerText = "😴";
        label.innerText = "Not observing";
      }
    };
  }
}
customElements.define("pressure-emoji", PressureEmoji);