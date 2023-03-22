# API Surface Changes

This file describes API surface changes made during experimentation.
A first Origin Trial was carried out between [M92-M94](https://chromestatus.com/feature/5597608644968448).
No real feedback was shared by Google with other parties, incl. Intel.
At the beginning of 2022, the ownership of the Compute Pressure API was transferred to Intel.

## Changes since last Origin Trial
After research and discussions with interested parties (e.g., Google, Zoom and others), we
decided to make the following major changes to the API shape:

- For better ergonomic, security and fingerprinting [concerns](https://github.com/w3c/compute-pressure/issues/24), the API [interfaces](https://www.w3.org/TR/compute-pressure/#the-pressurerecord-interface) has been redesigned

- Alignment with existing APIs: The Observer pattern used by the specification now more closely [follows](https://github.com/w3c/compute-pressure/issues/21) existing Observer based APIs on the web platform.

- Partner requests: The APIs now works in iframes as well as [workers](https://github.com/w3c/compute-pressure/issues/15) (shared and dedicated) with proper security and privacy mitigations in place.

In a few words, the Compute Pressure API proposed for the new OT is more mature, stable and has been re-designed to address security and fingerprinting concerns.

