# API Surface Changes

This file describes API surface changes made during experimentation.
A first Origin Trial was carried out between [M92–M94](https://chromestatus.com/feature/5597608644968448).
No real feedback was shared by Google with other parties, incl. Intel.
At the beginning of 2022, the ownership of the Compute Pressure API was transferred to Intel.

## Changes since last Origin Trial

After research and discussions with interested parties (e.g., Google, Zoom and others), we
decided to make the following major changes to the API shape:

- For better ergonomics, and due to security and fingerprinting [concerns](https://github.com/w3c/compute-pressure/issues/24), the API [interfaces](https://www.w3.org/TR/compute-pressure/#the-pressurerecord-interface) has been redesigned.

- Alignment with existing APIs: The Observer pattern used by the specification now more closely [follows](https://github.com/w3c/compute-pressure/issues/21) existing Observer based APIs on the web platform.

- Partner requests: The APIs now work in iframes as well as [workers](https://github.com/w3c/compute-pressure/issues/15) (shared and dedicated) with proper security and privacy mitigations in place.

In a few words, the Compute Pressure API proposed for the new OT is more mature, stable and has been re-designed to address security and fingerprinting concerns.

## Examples of PressureObserver API basic usage

### Before (1st Origin Trial, Chrome M92–M94)

[This explainer snapshot](https://github.com/w3c/compute-pressure/blob/aabc7dbd5d52a2c24c47edd7848a0fcb717a4a73/README.md)
captures the older Compute Pressure API implemented in early experimentation.
```js
const observer = new ComputePressureObserver(
    computePressureCallback,
    {
      // Thresholds divide the interval [0.0 .. 1.0] into ranges.
      cpuUtilizationThresholds: [0.75, 0.9, 0.5],
      // The minimum clock speed is 0, and the maximum speed is 1. 0.5 maps to
      // the base clock speed.
      cpuSpeedThresholds: [0.5],
      // Setting testMode to `true` will result in `computePressureCallback` to
      // be invoked regularly even if no thresholds have been crossed. The
      // computational data returned will not be informative, but this is useful
      // for testing if the requested options have been accepted.
      testMode: false,
    });

observer.start();

function computePressureCallback(update) {
  // The CPU base clock speed is represented as 0.5.
  if (update.cpuSpeed >= 0.5 && update.cpuUtilization >= 0.9) {
    // Dramatically cut down compute requirements to avoid overheating.
    return;
  }

  // Options applied are returned with every update.
  if (update.options.testMode) {
    // The options applied may be different than those requested.
    // e.g. the user agent may have reduced the number of thresholds observed.
    console.log(
    `Utilization Thresholds: ${JSON.stringify(update.options.cpuUtilizationThresholds)}`);
    console.log(
    `Speed Thresholds: ${JSON.stringify(update.options.cpuSpeedThresholds)}`);
  }
}
```
### After (Proposal for 2nd Origin Trial, Chrome M11x)

[The explainer](https://github.com/w3c/compute-pressure/blob/main/README.md) and
[specifications](https://www.w3.org/TR/compute-pressure/) capture the latest vision for the API,
implemented in later experimentation.
```js
const observer = new PressureObserver(pressureCallback, { sampleRate : 1 });

observer.observer("cpu");

function pressureCallback(update) {
  if (update.status == "critical") {
    // Dramatically cut down compute requirements to avoid overheating.
    return;
  }
}
```
