"""Re-masks seated poses so the chair/stool/table the model rests on stays in the photo.
Person mask (from the existing model-photo.png) is unioned with a rembg salient-object mask,
then the original photo is re-composited onto the flat studio backdrop. garment-layer.png is untouched.
  python scripts/remask-furniture.py [slug:pose ...]
"""
import sys, json, re, os
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACK = np.array([0xba, 0xc1, 0xc5], dtype=np.float32)
manifest = {p["slug"]: p["source"] for p in json.load(open(f"{ROOT}/scripts/import-manifest.json"))["products"]}
sessions = [new_session(m) for m in ("isnet-general-use", "birefnet-general-lite")]

def src_file(slug, i):
    d, pre = manifest[slug]["dir"], manifest[slug]["prefix"]
    fs = [n for n in os.listdir(f"{ROOT}/.import-src/{d}") if n.startswith(pre)]
    fs.sort(key=lambda n: int(re.match(r"\d+", n[len(pre):]).group()))
    return f"{ROOT}/.import-src/{d}/{fs[i]}"

# hand-traced furniture outlines (full-res px) for poses where the shaded side of a pale stool is
# indistinguishable from the backdrop; the see-through window of the stool is left out on purpose
POLYS = {
    ("formal-shirt-skyblue", 0): [(300, 1400), (360, 1330), (520, 1250), (700, 1215), (900, 1175), (975, 1162), (1022, 1195), (1044, 1300), (1046, 1440), (300, 1440)],
    ("relaxed-polo-black", 4): [(745, 790), (914, 790), (914, 1190), (898, 1242), (852, 1272), (800, 1287), (700, 1294), (600, 1300), (556, 1285), (600, 1190), (745, 1190)],
}

def run(slug, i, pale=False, flags=()):
    orig = Image.open(src_file(slug, i)).convert("RGB")
    out = f"{ROOT}/public/products/{slug}/photos/{i}/model-photo.png"
    cur = np.asarray(Image.open(out).convert("RGB")).astype(np.float32)
    person = (np.abs(cur - BACK).max(axis=2) > 6)
    person = ndi.binary_closing(person, iterations=3)
    sal = np.any([np.asarray(remove(orig, session=ss, only_mask=True)).astype(np.float32) / 255 > 0.5 for ss in sessions], axis=0)  # union: each model misses different furniture
    sal = ndi.binary_opening(sal, iterations=2)
    # keep only salient blobs that touch the person (drops stray shadows / backdrop noise)
    lab, n = ndi.label(sal | ndi.binary_dilation(person, iterations=6))
    keep = np.isin(lab, np.unique(lab[person]))
    furn = sal & keep
    # Backdrop is a smooth gradient: fit a quadratic to pixels clearly outside person+furniture,
    # then drop furniture-mask pixels that match it (gaps between chair legs, soft rembg edges).
    o = np.asarray(orig).astype(np.float32)
    H, W = person.shape
    yy, xx = np.mgrid[0:H, 0:W]
    X = np.stack([np.ones_like(xx), xx / W, yy / H, (xx / W) ** 2, (yy / H) ** 2, xx * yy / (W * H)], -1).reshape(-1, 6).astype(np.float32)
    far = ~ndi.binary_dilation(person | furn, iterations=15)
    idx = np.flatnonzero(far.ravel())[::7]
    fit = np.stack([X @ np.linalg.lstsq(X[idx], o.reshape(-1, 3)[idx, ch], rcond=None)[0] for ch in range(3)], -1).reshape(H, W, 3)
    dev = np.abs(o - fit).max(axis=2)
    if pale:  # white furniture is too close to the backdrop to carve by colour
        furn = ndi.binary_fill_holes(furn)
    if (slug, i) in POLYS:
        from PIL import ImageDraw
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).polygon(POLYS[(slug, i)], fill=255)
        furn = furn | (np.asarray(m) > 127)
    if "bright" in flags:  # models cut off part of a white stool: add everything much lighter than the backdrop
        gain = (o - fit).mean(axis=2)
        near = ndi.binary_dilation(person | furn, iterations=45) & (xx > 0.25 * W) & (yy > 0.45 * H)  # stool region only: keeps wall/floor shadows out
        core = (gain > 25) & near  # the lit stool body; shaded edges are then grown from it (wall shadows are not)
        lit = ndi.binary_dilation(core, iterations=50) & (gain > 6) & near
        lit = ndi.binary_closing(ndi.binary_opening(lit, iterations=2), iterations=6)
        furn = ndi.binary_fill_holes(furn | lit)
        reg = (xx > 0.25 * W) & (yy > 0.45 * H)
        furn = furn | (ndi.binary_closing(furn & reg & ~person, iterations=45) & reg & ~person)  # bridge shaded edge notches
        pale = True
    if "dev" in flags:  # rembg misses very pale furniture: take it from backdrop deviation near the person
        near = ndi.binary_dilation(person, iterations=140)
        bright = (o - fit).mean(axis=2) > 11  # stools are lighter than the backdrop; wall shadows are darker
        d = ndi.binary_closing(ndi.binary_opening(bright & near & ~person, iterations=2), iterations=10)
        lab2, n2 = ndi.label(d | ndi.binary_dilation(person, iterations=3))
        furn = ndi.binary_fill_holes(d & np.isin(lab2, np.unique(lab2[person])))
        pale = True
    carved = furn & (dev > 8)
    # pale furniture (white stools) sits close to the backdrop colour: re-fill small carved-out
    # holes inside it, keeping only the large see-through gaps (between chair legs etc.)
    holes, hn = ndi.label(furn & ~carved)
    sizes = ndi.sum(np.ones_like(holes), holes, range(1, hn + 1))
    small = np.isin(holes, 1 + np.flatnonzero(np.asarray(sizes) < 6000))
    furn = furn if pale else carved | small
    furn = ndi.binary_opening(furn, iterations=1)
    furn = ndi.binary_closing(furn, iterations=2)
    union = person | furn
    a = Image.fromarray((union * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))
    a = np.asarray(a).astype(np.float32)[..., None] / 255
    comp = np.asarray(orig).astype(np.float32) * a + BACK * (1 - a)
    res = Image.fromarray(comp.round().astype(np.uint8))
    return res, out

if __name__ == "__main__":
    for t in sys.argv[1:]:
        slug, i, *flags = t.split(":"); i = int(i)
        res, out = run(slug, i, pale="pale" in flags, flags=flags)
        dest = os.environ.get("REMASK_OUT")
        if dest:
            res.save(f"{dest}/{slug}_{i}.png")
        else:
            res.save(out)
            if i == 0:
                res.save(f"{ROOT}/public/products/{slug}/model-photo.png")
                res.save(f"{ROOT}/public/products/{slug}/photo.jpg", quality=90)
        print("done", t)
