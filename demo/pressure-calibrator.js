const MEASURE_TIME = 10_000;
const DELAY = 4_000;

export class PressureCalibrator {
  #pressureGeneratorFn;
  #pressureLevel = 0;

  measurement = [];

  constructor(pressureGeneratorFn) {
    this.#pressureGeneratorFn = pressureGeneratorFn;
  }

  #computeBestLevels() {
    const nominal = { percentage: 0 };
    const fair = { percentage: 0 };
    const serious = { percentage: 0 };
    const critical = { percentage: 0 };

    for (let level in this.measurement) {
      let percentage = this.measurement[level].nominal;
      if (percentage > nominal.percentage) {
        nominal.level = +level;
        nominal.percentage = percentage;
      }
      percentage = this.measurement[level].fair;
      if (percentage > fair.percentage) {
        fair.level = +level;
        fair.percentage = percentage;
      }
      percentage = this.measurement[level].serious;
      if (percentage > serious.percentage) {
        serious.level = +level;
        serious.percentage = percentage;
      }
      percentage = this.measurement[level].critical;
      if (percentage > critical.percentage) {
        critical.level = +level;
        critical.percentage = percentage;
      }
    }
    console.log("Calculated:")
    console.table({ nominal, fair, serious, critical });
    return {
      zero: 0,
      reset: serious.level,
      one: critical.level,
      delay: DELAY
    };
  }

  async calibrate() {
    let timerId = 0;
    let measure = [];
    let lastState;
    let countDown = 2;

    let now = performance.now();

    const report = state => {
      let prevState = lastState;
      lastState = state;
      if (prevState) {
        let lastTime = now;
        now = performance.now();

        if (!this.measurement[this.#pressureLevel]) {
          this.measurement[this.#pressureLevel] = {
            "nominal": 0,
            "fair": 0,
            "serious": 0,
            "critical": 0
          };
        }
        this.measurement[this.#pressureLevel][prevState] += ((now - lastTime) / MEASURE_TIME);
      }
    }

    const calibrator = new PressureObserver(changes => report(changes[0].state));
    let done = false;

    const incrPressure = () => {
      if (lastState) {
        // Always inherit the latest state as you might see no changes
        // with a change to a pressure level
        report(lastState);
        console.table(this.measurement[this.#pressureLevel]);
        done = this.measurement[this.#pressureLevel]["critical"] > 0.99;
        this.#pressureLevel += 1;
      }

      this.#pressureGeneratorFn(this.#pressureLevel);

      console.log(`Calibrating for ${MEASURE_TIME/1000} sec at pressure level ${this.#pressureLevel}`);
      return done;
    }

    incrPressure();

    return new Promise(resolve => {
      timerId = setInterval(() => {
        const done = incrPressure();
        if (done) {
          clearInterval(timerId);
          calibrator.disconnect();
          resolve(this.#computeBestLevels());
        }
      }, MEASURE_TIME);

      calibrator.observe("cpu");
    });
  }
};