# pullover-hoodie — regions

Source: Gemini render of a white pullover hoodie on a headless mannequin, light-grey background,
1920×2240. The grey strip and the watermark on the right edge were cropped away (x ≥ 1790).
Garment scaled ×0.6355 into 1200×1400, centred, 40 px top/bottom margin (117 px left/right).

| File | Contents |
|---|---|
| `base.png` | **Fabric only**: hoodie, neutral grey (blue cast removed, median 235, folds ~195-215, no pure 255), transparent elsewhere, same silhouette as the mask. |
| `mask-body.png` | Same fabric silhouette, white, ~1 px anti-aliased edge. Excludes the neck stump and hands. |
| `details.png` | **Mannequin neck + hand-ends**, original colours, drawn on top of the recoloured fabric and never tinted. The fabric runs about 3 px under it at the seams, so there is no gap. The hands fade out below the cuffs (they leave the source frame). |
| `template.json` | One `body` region (default `#1c1c1c`), `pxPerCm` 10.0, five zones. |

## How it was built
1. Fabric vs background vs mannequin: the fabric has a faint blue cast, while the background and the mannequin are neutral. That blueness, an ISNet cut-out (only to seed the background) and luminance edges feed a seeded watershed, so every boundary sits on a real edge. The regions are then smoothed for a clean anti-aliased outline.
2. Neck stump: a traced contour. Guide points were placed by hand and each one snapped to the strongest edge within ±6 px. The lapel edges crossing the neck are found per column from the blueness step, which is reliable there because the neck's own shading distracts a luminance edge. The contour is rasterised with 4× supersampling.
3. Hands: the side edges are traced the same way. The cuff/hand boundary comes from the watershed.
4. Pocket: its seams and edge shadows were too faint to read on dark colours, so the fine shading around the pocket was amplified ×4 (strong lines only, so the knit texture stays calm). This affects only `base.png`. Set `POCKET_K` in the build script to tune it, or 0 to turn it off.

## pxPerCm and zones
- **pxPerCm = 10.0 is an assumption**: the visible body width just below the armholes (561 px at y≈790) ÷ 56 cm, an assumed oversized size-M hoodie. As a sanity check, the cuffs come out at about 9.5 cm flat. Confirm against the real product's chest measurement.
- Chest zones start at y 390, about 7 cm below the hood seam. The pocket top is at y≈865. Left/right chest zones are 10×8 cm, centred 10.5 cm either side of the centre line (x 603). Centre chest is 27×21 cm.
- Sleeve zones are 8×6 cm on the upper sleeve, just below the drop-shoulder seam, rotated ±9° to follow the sleeve. "Left" = wearer's left = image right.

## Eyeball these
- **Mannequin in `details.png`**: the README only mentions details for labels. The renderer draws it last, so the neck and hands show and stay untinted. If `check-template` complains about details, that is why.
- Inside of the hood, right of the neck (wearer's left): a narrow, deeply shadowed strip of lining. It is classed as fabric and tints dark. That is correct, but it's the least certain bit of the mask.
- The hand-ends are short, with a soft fade. The source simply doesn't show more.
