# hoodie-vest (sleeveless zip hoodie)

Source: Gemini render, white sleeveless zip hoodie on a headless mannequin, 825x1024, upscaled x1.4 to 1200x1400 (garment + arms centred, 40 px top/bottom margin).

| File | Contents |
|---|---|
| base.png | Fabric only, neutral grey, median 233, no pure 255. Pocket seams boosted so they read on dark colours. |
| mask-body.png | Same fabric silhouette, ~1 px soft edge. Excludes neck stump, arms, background. |
| details.png | Mannequin neck + arms, original colours, drawn on top, never tinted. |
| template.json | One `body` region, `pxPerCm` 10.7, two zones. |

Built with the same blueness + watershed method as the pullover (build script included in the zip's parent chat message).

## Eyeball these
- pxPerCm 10.7 is an assumption: chest width just below the armholes (~558 px) / 52 cm (fitted vest).
- Zipper tape AND teeth are inside the mask (white plastic, can't be separated cleanly), so the zip tints with the fabric.
- No sleeve zones (no sleeves) and no centre-chest zone (the zipper runs straight down the middle). Left/right chest sit 50 px either side of the zip, y 420..506, clear of hood and pockets. "Left" = image right.
- The gap between each arm and the torso is real background (transparent), as in the source.
