# Pullover hoodie ghost mockup

Open `/mockup-lab?product=pullover-hoodie-white`.

The transparent ghost reference follows the supplied ImageKit hoodie photo:
cross-over neckline, no drawstrings, kangaroo pocket, ribbed cuffs and hem.
The original chest lettering is removed for customer logo placement.

The recolour mask retains the largest opaque garment component, removes loose
edge artifacts, uses a 3 px inset and 0.8 px feathering. The intentional inset
means about 2% of reference coverage is outside the mask. The white reference
uses the standard multiply/soft-light shader to preserve folds on dark colours.
Left, right and centre chest logo zones sit above the pocket.

Only a front view is available. Logo sizing assumes a 52 cm flat chest width and
needs real garment measurements before use for production sizing.

Validate with `npm run check-template -- hoodie`.
