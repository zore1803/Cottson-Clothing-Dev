COTTSON polo full-mannequin templates (all layers 1200x1600 RGBA PNG, aligned)

Folders: polo-front (buttons) | polo-front-zip | polo-back | polo-side | polo-side-noarm
Draw order: background -> mannequin.png -> garment regions -> trims -> details

mannequin.png   neck + arms only (shirt cut out). Drawn FIRST. Not recoloured.
base.png        grayscale shading of the white shirt (200 = flat fabric), alpha = fabric.
                colour = pickedColour * (base/200), plus a fold lift for dark colours.
base-pocket.png same shading with the pocket included (front + zip only).
mask-*.png      alpha masks. body = whole shirt; others are parts drawn over the body.
mask-trim-single.png     one stripe on collar flaps + cuffs
mask-trim-double-a.png   outer stripe   \ double line; set a and b to the same colour for
mask-trim-double-b.png   inner stripe   / double line, different colours for multi colour
mask-pocket.png pocket (recolourable separately)
details-zipper.png (zip only) original zipper pixels, drawn on top, never recoloured

Notes
- Trim masks overlap collar/cuff masks by design (drawn on top).
- Trim masks (single / double-a / double-b) now exist for polo-front, polo-front-zip, polo-back, polo-side and
  polo-side-noarm, all cut from real single-line and double-line images (no warped or drawn stripes).
- polo-side is a first draft (collar band and arm outline are hand-traced).
- Buttons default to white in the studio; the mask is mask-buttons.png (front only).
- polo-side-noarm: same side view with the mannequin arm removed (shading behind the arm is synthesised).
  Use this one if you don't want the arm in the side view; polo-side keeps the arm.
- polo-back and polo-side trims: collar stripe + cuff stripes. Same rules: single = trim-single only; double = a (outer) + b (inner).
