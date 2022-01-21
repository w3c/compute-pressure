High-level states
===

What is compute pressure?
---

In the perfect world, a computing device would be able to handle all the work thrown at it. But that is of course not the case in the real world and most devices can only handle a set of instructions at a given time (clock speed).

You might think that the utilization of the processor might represent how much additional work can be accomplished, but it is much more complex than that, and the complexity is only increasing over time.

For instance, a processor might have additional cores that work can be distributed to in certain cases, and it might be able to adjust clock speed. The faster clock speed a processor runs at, the more power it consumes which can affect battery and the temperature of the processor. A processor that runs hot becomes unstable and may crash or even burn.

For this reason processors adjust clock speed all the time, given the amount of work and whether it's on battery power or not (AC vs DC power) and whether the cooling system can keep the processor cool. Work often comes in bursts, like when the user is performing a certain operation, and in order to keep the system fast and responsive, modern processors use multiple boost modes, where it temporarily runs at an extremely high clock rate in order to get work out of the way and return to normal operations. As this happens in short bursts that is possible without heating up the processor too much. This is even more complex as boost frequencies depend on how many cores are utilized etc.

Throttling
---
A processor might be throttled, run slower than usual, resulting in a poorer user experience. This can happen for a number of reasons, like because

The temperature of the processor is hotter than that can be sustained
Other bottlenecks in the system, like work blocking on memory access
System is AC (battery) powered so longer battery life is preferred instead of high clock speed
To keep system more quiet (less fans) as a user preference

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

Stalled means that the processor is not making forward progress with instructions, and usually happens because it is waiting on memory I/O. Chances are, you're mostly stalled.
This is even more complicated as a processor might have multiple cores, but the cores you are using are busy but your work cannot simply be distributed to other cores.

If you look at the overall system processor utilization it might be quite low, but your core can be running slower than usual as it is waiting on memory I/O, or it might even be actually busy but be throttled due to thermals.

In some modern systems we even have different kinds of cores, like performance and efficient cores, or even multiple levels of such. You can imagine a system with just an ultra efficient core running when workload is nominal (background check of notifications etc) but other cores taking over when actually in use. That can mean that such a system will never reach 100% overall utilizations as the ultra efficient core will never run when other cores are in use.
 
Clock frequency is likewise a bad measurement as the frequency can differ per core, whether the system is on battery power or due to complex boost modes.
 
How to properly calculate pressure
---
Properly calculating computing pressure is architecture dependent and requires a mixture of signals like

* AC or DC power
* Thermals
* Some weighted values of “utilization” including information about memory I/O

A better metric than utilization could be CPI (clock ticks per instruction, retained) as it gives the amount of clock ticks it is taking in average to accomplish an instruction. In case the processor is waiting on memory I/O, the CPI is rising sharply. A CPI of around and below 1 is always doing well, but this can be architecture dependent as some complex instructions always take up multiple instructions.
 
What buckets are useful for users
---
In order for users to react to changes in compute pressure, it is important to be notified while you can still adjust your workloads, and not when the system is already being throttled.
 
We suggest the following buckets:

**Nominal**: Work is minimal and system is running on lower clock speed to preserve power

**Fair**: System is doing fine, everything is smooth and it can take on additional work without issues

**Serious**: There is some serious pressure on the system, but it is sustainable and the system is doing well, but it is getting close to its limits:
  * Clock speed (depending on AC or DC power) is consistently high
  * Thermals are high but system can handle it

At this point, if you add more work system may move into critical

**Critical**: System is now reaching its limits. It hasn’t reached them though as critical doesn’t mean that the system is being actively throttled, but that the state is not sustainable for the long run and might result in throttling, say after a few minutes.
 
Advantages
---
There are a lot of advantages to using the above buckets/states. For once, it is easy for developers to understand. What developers care about is delivering the best user experience to their users. That means taking the system to its limits as long as it provides a better experience, but avoiding tasking the system so much that it might start throttling work.

As an example, a video conferencing app might work like the following

> **Developer**: *How is pressure?*

> **System**:  *It's fair*

> **Developer**: *OK, use a better, more compute intensive audio codec*

> **System**: *Pressure is still fair*

> **Developer**: *Show video stream for 8 instead of 4 people*

> **System**: *OK, pressure is now serious*

> **Developer**: *Great, we are doing good and the user experience is optimal!*

> **System**: *The user turned on background blurring, pressure is now critical. If you stay in this state for extended time, the system might start throttling*

> **Developer**: *OK, let’s only show video stream for 4 people (not 8) and tell the users to turn off background blurring for a better experience*

> **System**: *User still wants background blurring on, but pressure is now back to serious, so we are doing good*

Other advantage
---
 
Another advantage is that this approach allows for considering multiple signals and innovation in software and hardware. For instance a CPU can consider memory pressure, thermal conditions etc and map this to these states. As silicon makers strive in making the fastest silicon that offers the best user experience, it is very important that a system wouldn’t be considered in critical state when it is in fact not.

If we exposed raw values like clock speed, a developer might hardcode that everything about 90% of base clock is considered critical, which could be the case on some systems, but when in fact on a well cooled system with an advanced CPU, you might go way beyond base clock (frequency boosting) without it negatively affecting the system. It is also very hard to know what silicon advantages will exist in the future, but if software is coding in such a way that it ignores these advantages, then software performance might be stuck in the past.
 
 
 




