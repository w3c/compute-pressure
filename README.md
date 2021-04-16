# Compute Pressure


## Authors:

* Olivier Yiptong
* Victor Costan


## Participate

* [Issue tracker](https://github.com/oyiptong/compute-pressure/issues)


## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Introduction](#introduction)
- [Goals / Motivating Use Cases](#goals--motivating-use-cases)
- [Non-goals](#non-goals)
- [Concept - CPU utilization](#concept---cpu-utilization)
- [Concept - CPU Clock Speed](#concept---cpu-clock-speed)
- [Compute Pressure Observer](#compute-pressure-observer)
- [Key scenarios](#key-scenarios)
  - [Adjusting the number of video feeds based on CPU usage](#adjusting-the-number-of-video-feeds-based-on-cpu-usage)
- [Detailed design discussion](#detailed-design-discussion)
  - [Prevent instead of mitigating bad user experiences](#prevent-instead-of-mitigating-bad-user-experiences)
  - [Minimizing information exposure](#minimizing-information-exposure)
    - [Normalizing CPU utilization](#normalizing-cpu-utilization)
    - [Aggregating CPU utilization](#aggregating-cpu-utilization)
    - [Normalizing CPU clock speed](#normalizing-cpu-clock-speed)
    - [Aggregating CPU clock speed](#aggregating-cpu-clock-speed)
    - [Quantization](#quantization)
- [Considered alternatives](#considered-alternatives)
  - [Named buckets for CPU utilization](#named-buckets-for-cpu-utilization)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References & acknowledgements](#references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Introduction

We propose a new API that conveys the utilization of CPU resources on the
user's device. This API targets applications that can trade off CPU resources
for an improved user experience. For example, many applications can render
video effects with varying degrees of sophistication. These applications aim
to provide the best user experience, while avoiding driving the user's device
in a high CPU utilization regime.

High CPU utilization is undesirable because it strongly degrades the user
experience. Many smartphones, tablets and laptops become uncomfortably hot to
the touch. The fans in laptops and desktops become so loud that they disrupt
conversations or the users’ ability to focus. In many cases, a device under
high CPU utilization appears to be unresponsive, as the operating system may
fail to schedule the threads advancing the task that the user is waiting for.


## Goals / Motivating Use Cases

The primary use case is informing CPU consumption decisions in video
conferencing and video games, which are highly popular
[soft real-time applications](https://en.wikipedia.org/wiki/Real-time_computing#Criteria_for_real-time_computing).
We aim to support the following decisions.

* Video conferencing
  * Adjust the number of video feeds shown simultaneously during calls with
    many participants
  * Reduce the quality of video processing (video resolution, frames per second)
  * Skip non-essential video processing, such as some
    [camera filters](https://snapcamera.snapchat.com/)
  * Disable non-essential audio processing, such as
    [WebRTC noise suppression](https://w3c.github.io/mediacapture-main/#dom-mediatrackconstraintset-noisesuppression)
  * Turn quality-vs-speed and size-vs-speed knobs towards “speed” in video and
    audio encoding (in [WebRTC](https://webrtc.org/),
    [WebCodecs](https://wicg.github.io/web-codecs/), or software encoding)
* Video games
  * Use lower-quality assets to compose the game’s video (3D models, textures,
    shaders) and audio (voices, sound effects)
  * Disable effects that result in less realistic non-essential details (water
    / cloth / fire animations, skin luminance, glare effects, physical
    simulations that don’t impact gameplay)
  * Tweak quality-vs-speed knobs in the game’s rendering engine (shadows
    quality, texture filtering, view distance)

The secondary use case is measuring the CPU resource consumption of a
feature. This ultimately supports the main goal of avoiding driving user
devices into high CPU utilization. We aim to support the following decision
processes.

* Compare the CPU consumption of alternative implementations of the same
  feature, for the purpose of determining the most efficient implementation. We
  aim to support measuring CPU utilization in the field via A/B tests, because
  an implementation’s CPU utilization depends on the hardware it’s running on,
  and most developers cannot afford performance measurement labs covering all
  the devices owned by their users.
* Estimate the impact of enabling a feature on CPU consumption. This cost
  estimate feeds into the decisions outlined in the primary use case.


## Non-goals

This proposal is focused on exposing CPU utilization and thermal throttling.
This limitation leaves out some resource consumption decisions that Web
applications could make to avoid the bad user experiences mentioned in the
introduction. The following decisions will not be supported by this proposal.

* Routing video processing, such as
  [background replacement](https://support.google.com/meet/answer/10058482), to
  the CPU (via [WebAssembly](https://webassembly.org/)) or to the GPU (via
  [WebGL](https://www.khronos.org/webgl/) /
  [WebGPU](https://gpuweb.github.io/gpuweb/)).
* Routing video encoding or decoding to an accelerated hardware implementation
  (via [WebCodecs](https://wicg.github.io/web-codecs/)) or
  software (via WebAssembly).

Video conferencing applications and games use the following information to
make the unsupported decisions above.

*   GPU utilization
*   CPU capabilities, such as number of cores, core speed, cache size
*   CPU vendor and model


## Concept - CPU utilization

The **CPU utilization** of the user's device is the average of the
utilization of all the device's CPU cores.

A CPU core's utilization is the fraction of time that the core has been
executing code belonging to a thread, as opposed to being in an idle state.

A CPU utilization close to 1.0 is very likely to lead to a bad user
experience. The device is likely overheating, and CPU cooling fans are making
loud noises. Applications can help avoid bad user experiences by reducing
their compute demands when the CPU utilization is high.


## Concept - CPU Clock Speed

Modern CPU cores support a set of clock speeds. The device's firmware or
operating system can set the core clock speed, in order to trade off the
available CPU computational resources with power consumption.

From a user experience standpoint, the following are the most interesting
clock speeds.

* The minimum clock speed results in the lowest power consumption.
* The **base clock speed** results in the power consumption that the CPU is
  rated for. Marketing materials emphasize this speed.
* The maximum clock speed (marketed as "Turbo boost" on Intel CPUs) causes
  unsustainable amounts of heating. It can only be used for short periods of
  time, to satisfy bursts in demand for CPU compute.

When a device's CPU utilization gets high, the device increases clock speeds
across its CPU cores, in an attempt to meet the CPU compute demand. As the
speeds exceed the base clock speed, the elevated power consumption increases the
CPU's temperature. At some point, the device enters a **thermal throttling**
regime, where the CPU clock speed is reduced, in order to bring the temperature
down.

By the time thermal throttling kicks in, the user is having a bad experience.
Applications can help avoid thermal throttling by reducing their demands for CPU
compute right as the CPU clock speeds approaches / exceeds the base speed.


## Compute Pressure Observer

We propose a design similar to
[Intersection Observer](https://w3c.github.io/IntersectionObserver/) to let
applications be notified when the system's CPU utilization and clock speed
change.

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
    console.log(`Utilization Thresholds: ${JSON.stringify(update.options.cpuUtilizationThresholds)}`);
    console.log(`Speed Thresholds: ${JSON.stringify(update.options.cpuSpeedThresholds)}`);
  }
}
```


## Key scenarios


### Adjusting the number of video feeds based on CPU usage

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
  if (update.cpuSpeed >= 0.5) {
    // Dramatically cut down compute requirements to avoid overheating.
    limitVideoStreams(2);
    return;
  }

  if (update.cpuUtilization >= 0.9) {
    limitVideoStreams(2);
  } else if (update.cpuUtilization >= 0.75) {
    limitVideoStreams(4);
  } else if (update.cpuUtilization >= 0.5) {
    limitVideoStreams(8);
  } else {
    // The system is in great shape. Show all meeting participants.
    showAllVideoStreams();
  }

  // Options applied are returned with every update.
  if (update.options.testMode) {
    // The options applied may be different than those requested.
    // e.g. the user agent may have reduced the number of thresholds observed.
    console.log(`Utilization Thresholds: ${JSON.stringify(update.options.cpuUtilizationThresholds)}`);
    console.log(`Speed Thresholds: ${JSON.stringify(update.options.cpuSpeedThresholds)}`);
  }
}
```


## Detailed design discussion

### Prevent instead of mitigating bad user experiences

A key goal for our proposal is preventing, rather than mitigating, bad
user experience. On mobile devices such as laptops, smartphones and tablets,
pushing the user’s device into high CPU or GPU utilization causes the device
to become uncomfortably hot, causes the device’s fans to get disturbingly
loud, and drains the battery at an unacceptable rate.

The key goal above disqualifies solutions such as
[requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame),
which lead towards a feedback system where **bad user experience is
mitigated, but not completely avoided**. Feedback systems have been
successful on desktop computers, where the user is insulated from the
device's temperature changes, the fan noise variation is not as significant,
and there is no battery.


### Minimizing information exposure

This proposal exposes information about the user's device, which
[increases the risk of harming the user's privacy](https://w3ctag.github.io/design-principles/#device-ids).
To minimize this risk, this proposal aims to only expose the absolute minimal
amount of information needed to make the decisions we set out to support.

The subsections below describe the processing model. At a high level, the
information exposed is reduced by the following steps.

1. **Normalization** - Per-core information reported by the operating system is
   normalized to a number between 0.0 and 1.0. This removes variability across
   CPU models and operating systems.

2. **Aggregation** - Normalized per-core information is aggregated into one
   overall number.

3. **Quantization** - Each application (origin) must declare a few buckets
   (ranges of values between 0.0 and 1.0) that it is interested in. The
   application only gets to learn which bucket contains each aggregated number.

4. **Rate-limiting** - The user agent notifies the application of changes in
   the information it can learn (buckets that each aggregated number). Change
   notifications are rate-limited.

#### Normalizing CPU utilization

The user agent will normalize CPU core utilization information reported by the
operating system to a number between 0.0 and 1.0.

0.0 maps to 0% utilization, meaning the CPU core was always idle during the
observed time window. 1.0 maps to 100% utilization, meaning the CPU core
was never idle during the observed time window.

#### Aggregating CPU utilization

CPU utilization is averaged over all enabled CPU cores.

Under normal circumstances, all of a system's cores are enabled. However,
mitigating some recent micro-architectural attacks on some devices may require
completely disabling some CPU cores. For example, some Intel systems require
disabling hyperthreading.

We recommend that user agents aggregate CPU utilization over a time window of 1
second. Smaller windows increase the risk of facilitating a side-channel attack.
Larger windows reduce the application's ability to make timely decisions that
avoid bad user experiences.

#### Normalizing CPU clock speed

This API normalizes each CPU core's clock speed to a number between 0.0 and 1.0.
The proposal intends to enable the decisions we set out to support, without
exposing the clock speeds.

We propose the following principles for normalizing a CPU core's clock speed.

1. The minimum clock speed is always reported as 0.0.
2. The base clock speed is always reported as 0.5.
3. The maximum clock speed is always reported as 1.0.
4. Speeds outside these values are clamped (to 0.0 or 1.0).
5. Speeds between these values are linearly interpolated.

#### Aggregating CPU clock speed

TODO: Aggregating is an average of the current speed across all cores. No
aggregation over a time window.

TODO: Proposal for aggregating clock speeds across systems with heterogeneous
CPU cores, such as [big.LITTLE](https://en.wikipedia.org/wiki/ARM_big.LITTLE).

#### Quantizing values

Quantizing the aggregated CPU utilization and clock speed reduces the amount of
information exposed by the API.

Having applications designate the quantization buckets minimizes the number
of buckets that user agents need to allow in order to enable the decisions used
in a multitude of applications.

Applications determine the quantization scheme by passing in a list of
thresholds. For example, the thresholds list `[0.5, 0.75, 0.9]` defines a
4-bucket scheme, where the buckets cover the ranges 0-0.5, 0.5-0.75, 0.75-0.9,
and 0.9-1.0. We propose representing a bucket using the middleof its range.

For example, suppose an application used the threshold list above, and the user
agent measured a CPU utilization of 0.87. This would fall under the 0.75-0.9
bucket, and would be reported as 0.825 (the average of 0.75 and 0.9).

We will recommend that user agents allow at most 5 buckets (4 thresholds) for
CPU utilization, and 2 buckets (1 threshold) for CPU speed.


#### Rate-limiting change notifications

We propose exposing the quantized CPU utilization and clock speed via
rate-limited change notifications. This aims to remove the ability to observe
the precise time when a value transitions between two buckets.

More precisely, once the compute pressure observer is installed, it will be
called once with initial quantized values, and then be called when the quantized
values change. The subsequent calls will be rate-limited. When the callback is
called, the most recent quantized value is reported.

The specification will recommend a rate limit of at most one call per second
for the active window, and one call per 10 seconds for all other windows. We
will also recommend that the call timings are jittered across origins.

These measures benefit the user's privacy, by reducing the risk of
identifying a device across multiple origins. The rate-limiting also benefits
the user's security, by making it difficult to use this API for timing attacks.
Last, rate-limiting change callbacks places an upper bound on the performance
overhead of this API.

### Third-party contexts

This API will only be available in first-party contexts. This is necessary for
preserving the privacy benefits of the API's quantizing scheme.


## Considered alternatives

### Fixed quantization scheme

Instead of having applications specify the thresholds they are interested in, we
considered proposing a fixed quantization scheme. For example, we could round
reported values to the closest 0.10 (10% of the range), which defines a
10-bucket scheme.

This alternative would result in a simpler mental model that may reduce the
burden of using and implementing the API. However, a fixed quantization scheme
would require more buckets to power the same decisions, resulting in higher
risks to the user's privacy. Therefore, the
[priority of constituents](https://www.w3.org/TR/html-design-principles/#priority-of-constituencies)
requires that we discard this alternative, as it would favor authors and
implementers over users.

As a concrete example, let's assume two popular video conferencing
applications that use different CPU clock speed thresholds (50% and 75%) to
reduce the number of video feeds they display. A fixed bucketing scheme
requires at least 3 buckets (0 - 50%, 50% - 75%, 75% - 100%) to optimally
support both applications. By comparison, the current proposal supports both
applications with two buckets.

### Fine-grained quantization gated on permissions

We considered adding an option to switch to a more fine-grained quantization
schemes, such as 0.01 precision (100 equally-sized buckets) or 0.001 precision
(1,000 equally-sized buckets). We considered gating the quantization switch on a
user permission.

We separately considered automatically switching to a finer-grained quantization
scheme for applications that can access a device camera that is turned on. The
privacy argument would have been that the user shared a very high amount of
entropy with the application, so the privacy risks are much smaller in this
case.

This option would be very helpful for use cases such as benchmarking and A/B
testing. As a concrete example, we have been made aware that A/B tests for
optimizations in a popular video conferencing application sometimes rely on
0.001 precision in CPU utilization values.

We discarded this option in the interest of keeping the proposal more focused.
The fine-grained quantization schemes discussed here can be added to the
currently proposed API shape in a backwards-compatible manner.

### Expose a thermal throttling indicator

On some operating systems and devices, applications can detect when thermal
throttling occurs. Thermal throttling is a strong indicator of a bad user
experience (high temperature, CPU cooling fans maxed out).

This option was discarded because of concerns that the need to mitigate
[some recent attacks](https://platypusattack.com/) may lead to significant
changes in the APIs that this proposal was envisioning using.

Theoretically, Chrome
[can detect thermal throttling](https://source.chromium.org/chromium/chromium/src/+/master:base/power_monitor/)
on Android, Chrome OS, and macOS. However, developer experience suggests that
the macOS API is not reliable.

### Combine CPU utilization and clock speed

We considered reporting one number that accounts for both CPU utilization and
CPU clock speed.

A somewhat common practice is to multiply utilization by the ratio of the
current and maximum CPU clock speed. For example, a CPU core that is 50% idle
and runs at 50% of its maximum CPU speed (1.6 Ghz out of 3.2 Ghz) would be
considered to be 25% utilized. This metric is
[not always intuitive](https://docs.microsoft.com/sv-SE/troubleshoot/windows-client/performance/cpu-usage-exceeds-100).

We discarded this option because we got developer feedback that mitigating bad
user experiences requires being able to react differently to high CPU
utilization and high CPU clock speeds. The latter needs to be addressed more
urgently than the former.


### Named buckets for CPU utilization

## Stakeholder Feedback / Opposition

* Chrome : Positive, authoring this explainer
* Gecko : TODO
* WebKit : TODO
* Web developers : TODO

## References & acknowledgements

Many thanks for valuable feedback and advice from:

* Chen Xing
* Evan Shrubsole
* Jesse Barnes
* Kamila Hasanbega
* Jan Gora
* Joshua Bell
* Matt Menke
* Nicolás Peña Moreno
* Opal Voravootivat
* Paul Jensen
* Peter Djeu
* Reilly Grant
* Ulan Degenbaev
* Victor Miura
* Zhenyao Mo

Exposing CPU utilization information has been explored in the following places.

* [WebPerf June 2019 discussion notes](https://docs.google.com/document/d/1uQ7pXwuBv-1jitYou7TALJxV0tllXLxTyEjA2n1mSzY/)
* [Chrome extensions API for CPU metadata](https://developer.chrome.com/docs/extensions/reference/system_cpu/)
* [Chrome extensions API for per-process CPU utilization](https://developer.chrome.com/docs/extensions/reference/processes/)
* [IOPMCopyCPUPowerStatus](https://developer.apple.com/documentation/iokit/1557079-iopmcopycpupowerstatus?language=objc) in IOKit/[IOPMLib.h](https://opensource.apple.com/source/IOKitUser/IOKitUser-647.6/pwr_mgt.subproj/IOPMLib.h)
* [user-land source](https://opensource.apple.com/source/IOKitUser/IOKitUser-388/pwr_mgt.subproj/IOPMPowerNotifications.c.auto.html)
* [Windows 10 Task Manager screenshot](https://answers.microsoft.com/en-us/windows/forum/windows_10-other_settings-winpc/windows-10-only-use-half-of-max-cpu-speed/d97b219f-10ee-4a42-a0fc-d517c1b60be8)
* [CPU usage exceeds 100% in Task Manager and Performance Monitor if Intel Turbo Boost is active](https://docs.microsoft.com/sv-SE/troubleshoot/windows-client/performance/cpu-usage-exceeds-100)

This explainer is based on
[the W3C TAG's template](https://w3ctag.github.io/explainers).
