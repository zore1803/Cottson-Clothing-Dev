# Pinstriped shirt ghost template

Open `/mockup-lab?product=pinstripe-shirt-blue` to recolour this shirt and upload
a logo for its left or right chest zone. The product uses this dedicated template
instead of the generic formal-shirt template.

`ghost-reference.png` is the generated transparent reference. `mask-body.png`
uses its exact alpha channel, keeping all colour previews aligned. The canvas
renderer uses `referenceColour: #242424` to recolour original pixels while
preserving the relative shadows, highlights and pinstripe texture. Selecting the
reference colour reproduces the source pixels exactly. Button areas keep their
original pixels. `shadingScale: 65` supplies the shading used for logo overlays.
The shirt fabric currently shares one colour region.

Logo placement is approximate: `pxPerCm` assumes a 52 cm flat chest width.
Measure the actual garment before relying on this preview for production sizing.
Only the front view is available; the unseen collar interior and hem were reconstructed.

Validate with `npm run check-template -- pinstriped-shirt` from `frontend`.
