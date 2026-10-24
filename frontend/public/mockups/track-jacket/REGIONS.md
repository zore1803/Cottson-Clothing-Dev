# track-jacket (stand-collar full-zip, long sleeves, ribbed cuffs and hem)

Source: Gemini render (second, more shaded version), white track jacket on a headless mannequin (878x1024), upscaled x1.36 to 1200x1400. The two Gemini sparkle watermarks were inpainted out first.

| File | Contents |
|---|---|
| base.png | Fabric only, neutral grey. Median 236, natural shading exactly as in the photo (no deepening), highlights capped at 249. |
| mask-body.png | Same fabric silhouette, soft ~1.5 px edge. Excludes the neck stump, hand-ends and background. |
| details.png | Mannequin neck stump + hand-ends, original colours, drawn on top, never tinted. |
| template.json | One `body` region, `pxPerCm` 9.5, `foldStrength` 0.55, two chest zones (the two sleeve zones were removed: check-template needs a sleeve mask for them). |

Same method as the vest (blueness cue + seeded watershed). The neck stump inside the stand collar is a hand-placed outline refined by the watershed, so the collar's inner lining tints with the fabric and only the stump stays untinted. `CONTRAST` in the build script (default 3.0, but this version was built with CONTRAST=1.0 HIGHLIGHT=1.0 = natural).

## Eyeball these
- pxPerCm 9.5 is an assumption: body width between the armpits (530 px) / 56 cm (roomy jacket).
- Zipper tape AND teeth are in the mask (white plastic, can't be separated), so the zip tints with the fabric.
- No centre-chest zone: the zipper runs straight down the middle. Left/right chest are 10x8 cm, 45 px either side of the zip, y 430..506, clear of the collar and pockets. "Left" = image right.
- Sleeve zones 8x6 cm on the upper sleeves, rotated +-5 deg to follow the arm. Left = image right.
- Hand-ends are short (the source shows little of them). The right-hand cuff edge near the removed watermark was straightened by hand.
- This version: mannequin pixels are only allowed in the neck box and the two hand-ends; a bright low-contrast patch on the wearer's right chest/shoulder had been mistaken for mannequin and is now fabric.
- A tiny light speck may remain at the right cuff edge (watermark remnant): check it at full size.
