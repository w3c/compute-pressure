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
- [Overview](#overview)
  - [[API 1]](#api-1)
  - [Key scenarios](#key-scenarios)
    - [Adjusting the number of video feeds based on CPU usage](#adjusting-the-number-of-video-feeds-based-on-cpu-usage)
  - [Detailed design discussion](#detailed-design-discussion)
    - [Prevent instead of mitigating bad user experiences](#prevent-instead-of-mitigating-bad-user-experiences)
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


# Overview

We propose enabling web applications to modulate their resource consumption
in order to avoid bad user experience, by exposing the following information.

* **CPU utilization** - As the CPU utilization gets close to capacity, the
  application can reduce the amount of computation it does per unit of time.
* **CPU clock speed** - When the CPU clock speed approaches thermal throttling,
  the application can reduce the amount of computation it does. Ideally, this
  avoids a cycle where increased clock speed causes high CPU core temperatures,
  then the CPU clock is reduced allowing the CPU core to cool down, then the
  situation repeats itself.

## [API 1]

[For each related element of the proposed solution - be it an additional JS
method, a new object, a new element, a new concept etc., create a section
which briefly describes it.]

## Key scenarios


### Adjusting the number of video feeds based on CPU usage


## Detailed design discussion

### Prevent instead of mitigating bad user experiences

A key requirement for our proposal is preventing, rather than mitigating, bad
user experience. On mobile devices such as laptops, smartphones and tablets,
pushing the user’s device into high CPU or GPU utilization causes the device
to become uncomfortably hot, causes the device’s fans to get disturbingly
loud, and drains the battery at an unacceptable rate.

The key requirement above disqualifies solutions such as
[requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame),
which lead towards a feedback system where **bad user experience is
mitigated, but not completely avoided**. Feedback systems have been
successful on desktop computers, where the user is insulated from the
device's temperature changes, the fan noise variation is not as significant,
and there is no battery.


## Considered alternatives

### Named buckets for CPU utilization

## Stakeholder Feedback / Opposition

* Chrome : Positive, authoring this explainer
* Gecko : TODO
* WebKit : TODO
* Web developers : TODO

## References & acknowledgements

Many thanks for valuable feedback and advice from:

* Joshua Bell
* Nicolás Peña Moreno
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
