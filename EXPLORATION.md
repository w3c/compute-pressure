Support for Power Pressure
===

This is what we need to do in order to create a Power Pressure Observer POC.

The high level states map well to power pressure, though the contributing factors don’t. We could initially leave the factors array empty until we find some factors that would be useful to developers.

Add another object or not?
---
Power pressure could be supported by adding a new “power” value to the current PressureObserver and there is no real reason to create a PowerPressureObserver unless we would need different behavior or different API surface. So far that doesn’t look like the case, and adding new objects grows the size of the web engine, e.g., Chromium runtime.

Also the string value allows us to specify more detailed sources in the future like e.g. power-package, power-memory etc if needed. Whether these need to be dash or dot separated is unclear, we need to check for prior art on the web platform and potentially consult with the W3C TAG

By using the same object, there is also the advantage that all events of different sources will be handled by the same callback, and it is easy to split that out into multiple callbacks if needed by the developer, by just filtering the records array.

CPU pressure per thread
===

Adding CPU pressure per thread, from an API standpoint boils down to the syntax for the enums.

```"cpu"``` today means global pressure.

The bare minimum would be supporting the pressure for the app/tab/JS context itself, something like ```"cpu.self"```. We often call this the main thread but that name is not exposed in Web APIs.

```"cpu.self"``` could also work well for workers, but it’s a question whether we would allow a worker to get access to the telemetry for its owner/parent. We could add something like ```"cpu.owner"``` or ```"cpu.parent"```, but we would need to handle the owner being a worker itself.

There are specific threads outside of the main thread and worker thread that developers are interested in, especially for video conferencing / game streaming. Web RTC is often used and though it uses two threads, we could probably expose this as ```"cpu.rtc"```.

WebRTC and Chrome have separate threads for ```"cpu.camera"``` and ```"cpu.microphone"``` capture and it might make sense to expose compute pressure for these.

Average pressure
===

Though polling frequently allows getting the most recent state, you can also be unlucky and get data at exactly the point when the system is under pressure, though that is the odd case and might not represent the state over time.

Users can average values manually, though it costs JavaScript cycles and can be made more efficient lower down the stack. As averaging costs cycles it makes sense to make this an opt-in, by an option flag to the ```observe()``` method, e.g., ```observe(“cpu” { summarize: true })```.

Looking at existing APIs it seems that a summarized average over the last 10 seconds, 30 seconds (half a minute) and 300 seconds (5 minutes) makes sense.

This could be exposed as:

```webidl
readonly attribute FrozenArray<PressureState> averages;
```

Or as individual attributes:

```webidl
readonly attribute PressureState? average10s;
readonly attribute PressureState? average30s;
readonly attribute PressureState? average300s;
```
