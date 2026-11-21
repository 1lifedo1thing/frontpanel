---
'@frontpanel/vue': patch
---

`FpRadioGroup` latches the key an arrow moves to every time. Reka latched it only if the arrow was still held when a timer ran, so a quick tap, or a page busy with the last change, could move focus and leave the latch behind. The group now takes the arrows itself and presses the key it moves to, still wrapping at the ends and skipping disabled keys.
