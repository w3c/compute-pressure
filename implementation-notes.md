A collection of Implementation notes

Terminology
===

Utilization
---

Processing Unit utilization refers to a device’s usage of the processing resources,
or the amount of work handled by a processing unit. Not every task requires heavy
utilization time as the task might depend on other resources, such as reading data from memory.

Processing units often contain multiple execution units/cores, so utilization MAY refers to the
average percentage of the total working time of all execution units.

As an example, for a CPU, the utilization is the fraction of time that each core has been
executing code belonging to a thread, as opposed to being in an idle state.

Processing Units are designed to run safely at 100% utilization. However, it means they have reached
their limit and cannot take on additional work and maybe not even handle the current work at
hand, resulting in perceptible slowness.

Load
---
For CPUs, it is common to consider load in addition to utilization. Load is the number
of processes (queue length) being executed or waiting to be by the CPU. When a system is
heavily loaded, its CPU utilization is likely close to 100%, though a system with
2 processes in the queue and one with 10 are not comparable. For this reason it is common
to look at load average (average system load over a period of time) as a set of three
numbers, which represent the load during the last one-, five-, and fifteen-minute periods.

Frequency
---

Processing units run at a certain frequency, also known as clock rate, expressed in
cycles per second (e.g. gigahertz). The base frequency is a measure that the CPU manufacturer
guarantees the processing unit can run at with reasonable cooling.

To avoid processing units running at 100% utilization for long, some processing units can use dynamic frequency scaling to temporarily boost the
frequency of a certain execution unit and then assign the largest task to it, alleviating
the poor user experience in many situations.

The processing unit will try to increase the operating frequency in regular increments (steps)
as required to meet demand. The increased frequency is limited by the processing unit's power,
current, and thermal limits, the number of execution units currently in use, and the maximum
frequency of the active ones.

Dynamic Frequency Scaling can also be used to throttle the execution,
by slowing down the frequency to use less energy and conserve battery, especially in laptops.

Throttling can also happen as a result of an processing unit reaching its thermal limits. This
thermal throttling helps cool the processing unit down when it gets too hot by lowering the frequency.


Concepts
===

CPU frequency
---
CPU cores may support a variety of complex dynamic frequency scaling technologies to raise the
clock frequency beyond the base frequency (max frequency without boosting).

The boosting max frequency can depend on the type of core in heterogeneous systems, but even
the same cores can have different max frequency. In modern Intel CPUs, one or two P-cores (performance
cores) are considered <em>favored cores</em> with even higher max frequency.

Beyond this, Intel CPUs might support <em>Thermal Velocity Boost</em> (TVB), which allows an even higher
frequency, going beyond the max frequency if the CPU's within temperature limits and turbo power budget is
available.

Overclocked CPUs can similarly go beyond the boosting max frequency.

Frequencies beyond boosting max frequency are ignored by this specification and frequencies are
clamped to the boosting max frequency.

More information about Intel based boosting technologies <a
href="https://www.intel.com/content/www/us/en/gaming/resources/how-intel-technologies-boost-cpu-performance.html">
here</a>.

Aggregating CPU utilization
---

CPU utilization can averaged over all enabled CPU cores.

Under normal circumstances, all of a system's cores are enabled. However,
mitigating some recent micro-architectural attacks on some devices may require
completely disabling some CPU cores. For example, some Intel systems require
disabling hyperthreading.

We recommend that user agents aggregate CPU utilization over a time window of 1
second. Smaller windows increase the risk of facilitating a side-channel attack.
Larger windows reduce the application's ability to make timely decisions that
avoid bad user experiences.

