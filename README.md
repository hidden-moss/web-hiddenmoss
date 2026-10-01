# Hidden Moss

[hiddenmoss.com](https://hiddenmoss.com)

A dependency-free static homepage on pure black. The 1,750-point logo grows once, then breathes continuously over a full-screen tiny-dot background aligned to the same original lattice. Background dots use the approved 3.3× size, shrink to zero at the contraction low point, and gently return as the logo expands. Hover gently attracts nearby points; clicking adds a fading ripple. The footer includes a pause/resume control and the original GitHub link.

## Selected motion

The owner selected these motion studies on 2026-09-30:

| Study | Speed | Intensity | Role |
| --- | --- | --- | --- |
| 02 Germinate | 0.5× | 100% | One 6.4-second entrance |
| 03 Breathe | 1× | 180% | Continuous, with a 1.6-second blend after entrance |
| 06 Magnet | 0.25× | 30% | Gentle attraction and subtle radius pulse |
| 08 Echo | 1× | 85% | Click/tap ripple |

The component freezes while offscreen or in a background tab. Pause/resume retains its position. Reduced-motion users receive the completed static logo and may explicitly play it. A static SVG remains available if JavaScript or the source request fails. Page and canvas backgrounds are `#000000`; dots are `#efefe6`.

## Local development

```sh
python3 -m http.server 4174 --bind 127.0.0.1
node --test tests/*.test.mjs
```

There is no build step. Keep `motion/` beside `hidden_moss_circles_animated.svg`; the component resolves that file relative to its own module URL. `logo-static.svg` uses the same source circles with y −192 and radius ×0.9.

## Deployment

GitHub Pages serves the root of `gh-pages`, with `hiddenmoss.com` configured by `CNAME`. Merge reviewed release changes into `gh-pages`, wait for Pages deployment, then verify the live HTML and modules match the merged commit. The repository's default `main` branch is not the configured publishing source.

The original Google Analytics ID and GitHub destination are retained. No third-party fonts or animation libraries are required.

Motion source: `org-logo` commit `c74cb81c07685e1c135b82409e34a811b949b45a`. The four files under `motion/` are copied unchanged from that version; matching regression tests are included here.

Full-screen field source: `org-logo` commit `602dcf1`. `field/geometry.mjs` and `field/profile.mjs` are copied unchanged; `field/field.mjs` uses the same component with English accessibility/error text and no study-page controls. Both layers share one canvas, clock and pointer interaction. Background size is fixed at 3.3× in `field-page.mjs`. The original motion files remain unchanged.
