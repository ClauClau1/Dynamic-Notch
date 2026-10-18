# DynamicNotch website

The website for DynamicNotch, the Dynamic Island for your Mac's notch:
**https://clauclau1.github.io/Dynamic-Notch/**

It's plain HTML, CSS and JavaScript with no build step. Visitors pick their Mac (MacBook Pro or
Air, MacBook Neo, or an iMac or other Mac with a display) and every picture switches to it, and
"Try it" has a live island that springs between the app's real states.

To preview it locally:

```bash
python3 -m http.server 8642
```

then open http://localhost:8642. The live island needs a web server; it won't load from a
`file://` page.

The download button's address is the `dynamicnotch:download` meta tag in `index.html`.

Mac, MacBook, MacBook Air, MacBook Pro, iMac, AirPods and Dynamic Island are trademarks of
Apple Inc. DynamicNotch is not affiliated with Apple.
