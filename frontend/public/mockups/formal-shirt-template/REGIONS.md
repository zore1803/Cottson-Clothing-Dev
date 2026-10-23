# Formal shirt v3: layers and regions (single colour)

Rebuilt from image-removebg-preview_2_.png at the user's request: the FIRST formal-shirt
photo again, but smaller (896x1114, exactly half-scale of the original 1792x2228) and
without the rainbow glitch artifact that photo originally had. This REPLACES the
black-background (825x1024) build from the previous round -- not a patch on it.

Folder: formal-shirt (canvas 1200x1400)

Layers, in draw order:
1. mannequin.png   neck stump only. NEVER recoloured. Drawn first.
2. base.png        grey shading of the shirt only, with the shirt alpha.
3. mask-body.png   ONE region covering the whole shirt -- body, sleeves, collar and cuffs
                    together. There is no separate sleeve/collar/cuff colour.

Compositing: draw the mannequin, then draw the single recoloured body layer over it with
source-over.

_ref-mask-sleeve.png, _ref-mask-collar.png, _ref-mask-cuff.png are kept for reference only
(used to position the sleeve/chest logo zones) -- do NOT load these as colour regions.

HOW THIS WAS BUILT: confirmed this image is the same pose as the original 1792x2228 photo at
exactly 0.5x scale (bbox ratio checked to 4 decimal places), then reused all the geometry
already traced on that photo -- neck boundary trace, collar polygon, sleeve/cuff bands, and
both fold-crease softening patches -- scaled by 0.5, rather than re-tracing from scratch.
This source has no glitch artifact, so that whole cleanup step was skipped.

Checked at full resolution on white, navy, sky blue, black and red: no neck/collar smudge,
clean cuffs, clean canvas corners, and both fold-crease patches (same two collar points,
coordinates scaled) still read as soft natural shading, not a hard line.

LOWER CONFIDENCE THAN THE CREW TEE -- please verify visually before relying on these:
- Source image is 896x1114, upscaled about 1.5x onto the canvas -- more than the
  black-background build needed (1.3x), so check sharpness at large preview sizes.
- No size tag visible, so the 52cm/size-M scale assumption is unconfirmed.
- Sleeve/collar/cuff boundaries are estimated (silhouette-offset band for sleeves,
  hand-traced polygon for collar), not algorithmically detected -- inherited from the
  original full-size photo's trace, just rescaled.
- Chest and sleeve zones passed placement checks without a manual nudge this time (the
  different px/cm scale happened to clear the pocket on its own) -- still worth a visual
  check since that was good luck, not a guarantee.
