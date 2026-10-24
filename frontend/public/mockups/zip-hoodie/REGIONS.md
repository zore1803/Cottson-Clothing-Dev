# zip-hoodie — regions

Source: Gemini render of a white full-zip hoodie on a headless mannequin, delivered at 2400x2800
(base.png, details.png, mask-body.png, template.json). Downscaled 2x (Lanczos) to 1200x1400 to match
the other templates; zone coordinates and pxPerCm were halved to match.

| File | Contents |
|---|---|
| `base.png` | Hoodie fabric + shading, transparent background. |
| `mask-body.png` | The hoodie fabric: hood, body, sleeves, cuffs, hem, pocket AND the zipper (so the zip tints with the fabric). Excludes the mannequin neck, hand-ends and the background. |
| `details.png` | Mannequin neck stump + hand-ends, original colours, drawn on top, never tinted. |
| `template.json` | One `body` region, `pxPerCm` 9.8 (assumption), zones left-chest, center-chest, right-chest. |

## Zones
The delivered file also had left-sleeve / right-sleeve zones; they were removed because check-template
requires a sleeve mask for sleeve zones.

## Eyeball these
- A thin bright line sits between each cuff and the mannequin hand-end (small leftover edge).
- The lower outline of the neck stump near the top of the zipper is slightly ragged.
- The hand-ends fade out into a soft blur (the source frame cuts them off).
- pxPerCm 9.8 is an assumption (a roughly 56 cm chest).
