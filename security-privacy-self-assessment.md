# Security and Privacy Questionnaire

[Security and Privacy questionnaire](https://www.w3.org/TR/security-privacy-questionnaire/)
responses for the Compute Pressure API

### 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

This API exposes a high-level pressure state, consisting of four levels,
used to indicate whether the system is under pressure and how serious that
pressure is. This allows websites to react to increases in pressure to
reduce it before it results in throttling or applications fighting over
compute resources. Though generally having a nice smooth system is preferred
from a user point of view, such throttling can be detrimental  to certain
application types such as e-sports, games and video conferencing.

In e-sports and games, throttling can result in input lag making you lose the
game, and in video conferencing systems, throttling can result in connection
breakage - important words not coming across, or even making it impossible
to type up minutes while listening to others talk.

Earlier approach
---

An earlier revision of this feature exposed CPU utilization and frequency (clock
ticks) with certain modifications as the values being averaged across cores and
normalized to a value between 0 and 1 (ignoring certain kinds of boost modes).

The website could then configure a certain set of thresholds they were interested
in, but the amount of thresholds would depend on the user agent. This resulted in
lots of uncertainties and issues. Like some early adopters were uncertain why
certain thresholds were never crossed due to having created one too
many thresholds.

Also, utilization and frequency are not the best metrics available. For instance,
thermal conditions can easily affect throttling. Utilization might also be
artificially high because certain processes are stalled on I/O.

Additionally, CPU design is becoming heterogeneous with different kind of cores
(e.g. performance core vs efficient core). There are even systems today with more
than 3 different core types, where all cores are never active at the same time.
This makes it very hard to look at aggregates and normalized utilization and frequency
and base programming decisions upon that in a way that they make sense across a
wide range of current and future devices.

The new design allows the user agent or underlying system to provide much better
pressure levels depending on the host system without the user needing to know
what system the code is running on.

### 2.2. Is this specification exposing the minimum amount of information necessary to power the feature?

The API design aggressively limits the amount of information exposed.

The information is exposed as a series of change events, which makes it easy for
user agents to rate-limit the amount of information revealed over time. The
specification encourages user agents to rate-limit background windows more
aggressively than the window the user is interacting with.

### 2.3. How does this specification deal with personal information or personally-identifiable information or information derived thereof?

The information exposed by this API is not personal information or
personally-identifiable information.

### 2.4. How does this specification deal with sensitive information?

The information exposed by this API is not sensitive information.

### 2.5. Does this specification introduce new state for an origin that persists across browsing sessions?

This API does not introduce any new persistent state. It exposes device data
that is likely to change every second.

### 2.6. What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin?

Aside from the data detailed in question 1, which is data about an instanteneous
state of the device, no additional data is exposed.

### 2.7. Does this specification allow an origin access to sensors on a user’s device

This specification does not allow direct access to sensors. However, the CPU
clock speed may be used to make broad inferences about the device's
temperature.

### 2.8. What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts.

See answer to question 1.

Some information about CPU utilization can be inferred from the timing of
[requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)'s
callbacks.

### 2.9. Does this specification enable new script execution/loading mechanisms?

No.

### 2.10. Does this specification allow an origin to access other devices?

No.

### 2.11. Does this specification allow an origin some measure of control over a user agent’s native UI?

No.

### 2.12. What temporary identifiers might this specification create or expose to the web?

The data obtained in step 1 could pose a cross-origin identification issue,
however, we think our mitigations would prevent this risk.

### 2.13. How does this specification distinguish between behavior in first-party and third-party contexts?

The specified API will be available in third-part contexts via iframe
guarded by permission policy and focus requirements.

### 2.14. How does this specification work in the context of a user agent’s Private Browsing or "incognito" mode?

The API works the same way in Private Browsing / "incognito". We think that the
cross-origin identification mitigations also prevent identification across
normal and Private Browsing modes.

### 2.15. Does this specification have a "Security Considerations" and "Privacy Considerations" section?

Yes.

### 2.16. Does this specification allow downgrading default security characteristics?

No.

### 2.17. What should this questionnaire have asked?

We think that the questions here accurately capture the API's security and privacy implications.
