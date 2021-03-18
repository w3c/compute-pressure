# Security and Privacy Questionnaire

[Security and Privacy questionnaire](https://www.w3.org/TR/security-privacy-questionnaire/)
responses for the Compute Pressure API

### 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

This API exposes the following information in first-party contexts.

* CPU utilization
  * Approximates the average utilization across all the CPU cores on the user's
    device.
  * Conceptually, a number between 0 and 1. Exposed as a quantized value.

* CPU clock speed - we have less certainty here
  * Approximates the average per-core CPU clock speed, relative to the baseline
    speed and to the maximum speed.
  * Conceptually, a number between 0 and 1. Exposed as a quantized value.

### 2.2. Is this specification exposing the minimum amount of information necessary to power the feature?

The API design aggressively limits the amount of information exposed.

Applications must convey the thresholds / ranges they use to
make decisions before receiving data, so user agents don't reveal more
information than is absolutely necessary. The specification gives latitude to
user agents to expose fewer / broader ranges than the application requested.

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


### 2.13. How does this specification distinguish between behavior in first-party and third-party contexts?

The specified API will not be available in third-party contexts.

### 2.14. How does this specification work in the context of a user agent’s Private Browsing or "incognito" mode?

The API works the same way in Private Browsing / "incognito". We think that the
cross-origin identification mitigations also prevent identification across
normal and Private Browsing modes.

### 2.15. Does this specification have a "Security Considerations" and "Privacy Considerations" section?

### 2.16. Does this specification allow downgrading default security characteristics?

No.

### 2.17. What should this questionnaire have asked?

We think that the questions here accurately capture the API's security and privacy implications.
