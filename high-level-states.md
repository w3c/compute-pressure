High-level states
===

What is compute pressure?
---

In a perfect world, a computing device is able to perform all the tasks assigned to it with guaranteed and consistent quality of service. In practice, the system is constantly balancing the needs of multiple tasks that compete for shared system resources. The underlying system software tries to minimize both the overall wait time and response time (time to interactive) and maximize throughput and fairness across multiple tasks running concurrently.

This scheduling action is handled by an operating system module called scheduler whose work may also be assisted by hardware in modern systems. Notably, all this is transparent to web applications, and as a consequence, the user is only made aware the system is too busy when there's already a perceived degradation in quality of service. For example, a video conferencing application starts dropping video frames, or worse, the audio cuts out.

Compute Pressure specification defines a set of compute pressure states delivered to a web application to signal when adaptation of the workload is appropriate to ensure consistent quality of service. The signal is proactively delivered when the compute pressure trend is rising to allow timely adaptation. And conversely, when the pressure eases, a signal is provided to allow the web application to adapt accordingly.

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

What buckets are useful for users
---
In order to enable web applications to react to changes in compute pressure with minimal degration in quality or service, or user experience, it is important to be notified while you can still adjust your workloads, and not when the system is already being throttled.
 
We suggest the following buckets:

⚪ **Nominal**: Work is minimal and the system is running on lower clock speed to preserve power.

🟢 **Fair**: The system is doing fine, everything is smooth and it can take on additional work without issues.

🟡 **Serious**: There is some serious pressure on the system, but it is sustainable and the system is doing well, but it is getting close to its limits:
  * Clock speed (depending on AC or DC power) is consistently high
  * Thermals are high but system can handle it

At this point, if you add more work the system may move into critical.

🔴 **Critical**: The system is now about to reach its limits, but it hasn’t reached _the_ limit yet. Critical doesn’t mean that the system is being actively throttled, but this state is not sustainable for the long run and might result in throttling if the workload remains the same. This signal is the last call for the web application to lighten its workload.

Advantages
---
There are a lot of advantages to using the above buckets/states. For once, it is easier for web developers to understand. What web developers care about is delivering the best user experience to their users given the available resources that vary depending on the system. This may mean taking the system to its limits as long as it provides a better experience, but avoiding taxing the system so much that it starts throttling work.

As an example, a video conferencing app might have the following dialogue with the API:

> **Developer**: *How is pressure?*

> **System**:  *It's fair*

> **Developer**: *OK, I'll use a better, more compute intensive audio codec*

> **System**: *Pressure is still fair*

> **Developer**: *Show video stream for 8 instead of 4 people*

> **System**: *OK, pressure is now serious*

> **Developer**: *Great, we are doing good and the user experience is optimal!*

> **System**: *The user turned on background blur, pressure is now critical. If you stay in this state for extended time, the system might start throttling*

> **Developer**: *OK, let’s only show video stream for 4 people (instead of 8) and tell the users to turn off background blur for a better experience*

> **System**: *User still wants to keep background blur on, but pressure is now back to serious, so we are doing good*

Other advantage
---
 
Another advantage is that this high-level abstraction allows for considering multiple signals and adapts to constant innovation in software and hardware below the API layer. For instance, a CPU can consider memory pressure, thermal conditions and map them to these states. As the industry strives to make the fastest silicon that offers the best user experience, it is important that the API abstraction that developers will depend on is future-proof and stands the test of time.

If we'd expose low-level raw values such as clock speed, a developer might hardcode in the application logic that everything above 90% the base clock is considered critical, which could be the case on some systems today, but wouldn't generalize well. For example, on a desktop form factor or on a properly cooled laptop with an advanced CPU, you might go way beyond the base clock with frequency boosting without negative impacting user experience, while a passively-cooled mobile device would likely behave differently. 
 
 




