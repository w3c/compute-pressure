# Compute Pressure

## Authors:

* Kenneth Rohde Christiansen (Intel)
* Anssi Kostiainen (Intel)
* Victor Costan (Google)
* Olivier Yiptong (formerly Google)


## Participate

* [Issue tracker](https://github.com/wicg/compute-pressure/issues)


## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Introduction](#introduction)
- [Goals / Motivating Use Cases](#goals--motivating-use-cases)
  - [Future Goals](#future-goals)
- [Non-goals](#non-goals)
- [Current approach - high-level states](#current-approach---high-level-states)
- [Throttling](#throttling)
- [Measuring compute pressure is quite complicated](#measuring-compute-pressure-is-quite-complicated)
- [How to properly calculate pressure](#how-to-properly-calculate-pressure)
- [Design considerations](#design-considerations)
- [API flow illustrated](#api-flow-illustrated)
- [Other considerations](#other-considerations)
- [Compute Pressure Observer](#compute-pressure-observer)
- [Key scenarios](#key-scenarios)
  - [Adjusting the number of video feeds based on CPU usage](#adjusting-the-number-of-video-feeds-based-on-cpu-usage)
- [Detailed design discussion](#detailed-design-discussion)
  - [Prevent instead of mitigating bad user experiences](#prevent-instead-of-mitigating-bad-user-experiences)
  - [Third-party contexts](#third-party-contexts)
- [Considered alternatives](#considered-alternatives)
  - [Expose a thermal throttling indicator](#expose-a-thermal-throttling-indicator)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References & acknowledgments](#references--acknowledgments)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Introduction

We propose a new API that conveys the utilization of system resources, initially
focusing on CPU resources (v1) with the plan to add other resources such as GPU
resources in the future (post v1). 

In a perfect world, a computing device is able to perform all the tasks assigned to it with guaranteed and consistent quality of service. In practice, the system is constantly balancing the needs of multiple tasks that compete for shared system resources. The underlying system software tries to minimize both the overall wait time and response time (time to interactive) and maximize throughput and fairness across multiple tasks running concurrently.

This scheduling action is handled by an operating system module called scheduler whose work may also be assisted by hardware in modern systems. Notably, all this is transparent to web applications, and as a consequence, the user is only made aware the system is too busy when there's already a perceived degradation in quality of service. For example, a video conferencing application starts dropping video frames, or worse, the audio cuts out.

As this is undesirable for the end-user, software developers would like ways to avoid
such cases, by balancing the set of enabled features and their quality level against
resource pressure happening on the end-user device.

## Goals / Motivating Use Cases

The primary use case for v1 is informing CPU consumption decisions in video
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

### Future Goals

Post v1 we plan on looking into supporting other resource types, like GPU
resources.

Additionally, we would like to investigate whether we can enabling measurement
of hardware resource consumption of different code paths in front end code.

We aim to support the following decision processes.

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

## Current approach - high-level states

Compute Pressure defines a set of compute pressure states delivered to a web application to signal when adaptation of the workload is appropriate to ensure consistent quality of service. The signal is proactively delivered when the compute pressure trend is rising to allow timely adaptation. And conversely, when the pressure eases, a signal is provided to allow the web application to adapt accordingly.

Human-readable compute pressure states with semantics attached to them improve ergonomics for web developers and provide future-proofing against diversity of hardware. Furthermore, the high-level states abstract away complexities of system bottlenecks that cannot be adequately explained with low-level metrics such as processor clock speed and utilization.

For instance, a processor might have additional cores that work can be distributed to in certain cases, and it might be able to adjust clock speed. The faster clock speed a processor runs at, the more power it consumes which can affect battery and the temperature of the processor. A processor that runs hot becomes unstable and may crash or even burn.

For this reason processors adjust clock speed all the time, given the amount of work and whether it's on battery power or not (AC vs DC power) and whether the cooling system can keep the processor cool. Work often comes in bursts, like when the user is performing a certain operation, and in order to keep the system fast and responsive, modern processors use multiple boost modes, where it temporarily runs at an extremely high clock rate in order to get work out of the way and return to normal operations. As this happens in short bursts that is possible without heating up the processor too much. This is even more complex as boost frequencies depend on how many cores are utilized etc.

Throttling
---
A processor might be throttled, run slower than usual, resulting in a poorer user experience. This can happen for a number of reasons, for example:

- The temperature of the processor is hotter than that can be sustained
- Other bottlenecks in the system, like work blocking on memory access
- System is DC (battery) powered so longer battery life is preferred instead of high clock speed
- To keep system more quiet (less fans) as a user preference

Measuring compute pressure is quite complicated
---
Using utilization as a measurement for compute pressure is suboptimal. What you may think 90% CPU utilization means:

```
 _____________________________________________________________________
|                                                         |           |
|                          Busy                           |  Waiting  |
|                                                         |  (idle)   |
|_________________________________________________________|___________|

```

What it might really mean is:

```
 _____________________________________________________________________
|          |                                              |           |
|   Busy   |                   Waiting                    |  Waiting  |
|          |                  (Stalled)                   |  (idle)   |
|__________|______________________________________________|___________|

```

Stalled means that the processor is not making forward progress with instructions, and this usually happens because it is waiting on memory I/O. Chances are, you're mostly stalled.
This is even more complicated when the processor has multiple cores and the cores you are using are busy but your work cannot simply be distributed to other cores.

If you look at the overall system processor utilization it might be quite low, but your core can be running slower than usual as it is waiting on memory I/O, or it might even be actually busy but be throttled due to thermals.

Furthermore, some modern systems have different kinds of cores, such as performance cores and efficiency cores, or even multiple levels of such. You can imagine a system with just an efficiency core running when workload is nominal (background check of notifications etc.) and performance cores taking over to prioritize UX when an application is in active use. In this scenario, system will never reach 100% overall utilizations as the efficiency core will never run when other cores are in use.
 
Clock frequency is likewise a misleading measurement as the frequency is impacted by factors such as which core is active, whether the system is on battery power or plugged in, boost mode being active or not, or other factors.
 
How to properly calculate pressure
---
Properly calculating compute pressure is architecture dependent and as such an implementation must consider multiple input signals that may vary by architecure, form factor, or other system characteristics. Possible signals could be, for example:

* AC or DC power state
* Thermals
* Some weighted values of “utilization” including information about memory I/O

A better metric than utilization could be CPI (clock ticks per instruction, retained) that reports the amount of clock ticks it takes on average to execute an instruction. If the processor is waiting on memory I/O, CPI is rising sharply. If CPI is around or below 1, the system is usually doing well. This is also architecture dependent as some complex instructions take up multiple instructions. A competent implementation will take this into consideration.

Design considerations
---
In order to enable web applications to react to changes in compute pressure with minimal degration in quality or service, or user experience, it is important to be notified while you can still adjust your workloads (temporal relevance), and not when the system is already being throttled. It is equally important to not notify too often for both privacy (data minimization) and developer ergonomics (conceptual weight minimization) reasons.

In order to expose the minimum data necessary at the highest level of abstraction that satisfy the use cases, we suggest the following buckets:

⚪ **Nominal**: Work is minimal and the system is running on lower clock speed to preserve power.

🟢 **Fair**: The system is doing fine, everything is smooth and it can take on additional work without issues.

🟡 **Serious**: There is some serious pressure on the system, but it is sustainable and the system is doing well, but it is getting close to its limits:
  * Clock speed (depending on AC or DC power) is consistently high
  * Thermals are high but system can handle it

At this point, if you add more work the system may move into critical.

🔴 **Critical**: The system is now about to reach its limits, but it hasn’t reached _the_ limit yet. Critical doesn’t mean that the system is being actively throttled, but this state is not sustainable for the long run and might result in throttling if the workload remains the same. This signal is the last call for the web application to lighten its workload.

API flow illustrated
---

As an example, a video conferencing app might have the following dialogue with the API:

> **Developer**: *How is pressure?*

> **System**: 🟢 *It's fair*

> **Developer**: *OK, I'll use a better, more compute intensive audio codec*

> **System**: 🟢 *Pressure is still fair*

> **Developer**: *Show video stream for 8 instead of 4 people*

> **System**: 🟡 *OK, pressure is now serious*

> **Developer**: *Great, we are doing good and the user experience is optimal!*

> **System**: 🔴 *The user turned on background blur, pressure is now critical. If you stay in this state for extended time, the system might start throttling*

> **Developer**: *OK, let’s only show video stream for 4 people (instead of 8) and tell the users to turn off background blur for a better experience*

> **System**: 🟡 *User still wants to keep background blur on, but pressure is now back to serious, so we are doing good*

Other considerations
---
There are a lot of advantages to using the above states. For once, it is easier for web developers to understand. What web developers care about is delivering the best user experience to their users given the available resources that vary depending on the system. This may mean taking the system to its limits as long as it provides a better experience, but avoiding taxing the system so much that it starts throttling work.
 
Another advantage is that this high-level abstraction allows for considering multiple signals and adapts to constant innovation in software and hardware below the API layer. For instance, a CPU can consider memory pressure, thermal conditions and map them to these states. As the industry strives to make the fastest silicon that offers the best user experience, it is important that the API abstraction that developers will depend on is future-proof and stands the test of time.

If we'd expose low-level raw values such as clock speed, a developer might hardcode in the application logic that everything above 90% the base clock is considered critical, which could be the case on some systems today, but wouldn't generalize well. For example, on a desktop form factor or on a properly cooled laptop with an advanced CPU, you might go way beyond the base clock with frequency boosting without negative impacting user experience, while a passively-cooled mobile device would likely behave differently.

## Compute Pressure Observer

We propose a design similar to
[Intersection Observer](https://w3c.github.io/IntersectionObserver/) to let
applications be notified when the system's pressure changes.

```js
function callback(entries) {
  const lastEntry = entries[entries.length - 1];
  console.log(`Current pressure ${lastEntry.state}`);
}

const observer = new ComputePressureObserver(callback);
observer.observe();
```

## Key scenarios

### Adjusting the number of video feeds based on CPU usage

A more advanced example where we lower the value of concurrent video streams
if pressure becomes critical. As lowering the amount of streams might not result
in exiting the critical state, or at least not immediately, we use a strategy
where we lower one stream at the time every 30 seconds while still in the
critical state.

The example accomplishes this by creating an async iterable that will end
iterating as soon as the pressure exists critical state, or every 30 seconds
until then.

```js
// Utility: A Promise that is also an Iterable that will iterate
// at a given interval until the promise resolves.

class IteratablePromise extends Promise {
  #interval;
  #fallback;

  constructor(fn, interval, fallbackValue) {
    super(fn);
    this.#interval = interval;
    this.#fallback = fallback;
  }

  async* [Symbol.asyncIterator]() {
    let proceed = true;
    this.then(() => proceed = false);

    yield this.#fallback;

    while (proceed) {
      let value = await Promise.any([
        this,
        new Promise(resolve => setTimeout(resolve, this.#interval))
      ]);
          
      yield value || this.#fallback;
    }
  }
};
```

```js
// Allow to resolve a promise externally by calling resolveFn
let resolveFn = null;
function executor(resolve) {
  resolveFn = value => resolve(value)
}

async function lowerStreamCountWhileCritical() {
  let streamsCount = getStreamsCount();
  let iter = new IteratablePromise(executor, 30_000, "critical");

  for await (const state of iter) {
    if (state !== "critical" || streamsCount == 1) {
      break;
    }
    setStreamsCount(streamsCount--);
  }
}

function pressureChange(entries) {
  for (const entry of entries) {
    if (resolveFn) {
      resolveFn(entry.state);
      resolveFn = null;
      continue;
    }

    if (entry.state == "critical") {
      lowerStreamCountWhileCritical();
    }
  }
}

const observer = new ComputePressureObserver(pressureChange);
observer.observe();
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

### Third-party contexts

This API will only be available in frames served from the same origin as the
top-level frame. This requirement is necessary for preserving the privacy
benefits of the API's quantizing scheme.

The same-origin requirement above implies that the API is only available in
first-party contexts.


## Considered alternatives

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


## Stakeholder Feedback / Opposition

* Chrome: Positive
* Gecko: Negative
* WebKit: TODO
* Web developers: Positive

## References & acknowledgments

Many thanks for valuable feedback and advice from:

* Asaf Yaffe
* Chen Xing
* Evan Shrubsole
* Jesse Barnes
* Kamila Hasanbega
* Jan Gora
* Joshua Bell
* Matt Menke
* Moh Haghighat
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