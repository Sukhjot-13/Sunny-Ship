"""Compose labelled reference/model evidence plates without altering the sources."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import sys

ROOT = Path(__file__).resolve().parents[1]
PHASE = sys.argv[1] if len(sys.argv) > 1 else 'after'
OUT = ROOT / 'docs/review'
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 25)
SMALL = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 21)


def panel(canvas, path, rect, crop=None):
    """Fit an unmodified reference or screenshot into a labelled comparison panel."""
    im = Image.open(path).convert('RGB')
    if crop:
        im = im.crop(crop)
    im = ImageOps.contain(im, (rect[2]-rect[0], rect[3]-rect[1]))
    canvas.paste(im, (rect[0]+(rect[2]-rect[0]-im.width)//2, rect[1]+(rect[3]-rect[1]-im.height)//2))


def plate(kind, source, lines, crop=None):
    """Create an annotated top, side or front plate with explicit evidence limits."""
    im = Image.new('RGB', (1800, 1280), '#f0eee6')
    d = ImageDraw.Draw(im)
    d.text((32, 24), 'THOUSAND SUNNY / '+PHASE.upper()+' / '+kind.upper(), font=FONT, fill='#171c23')
    d.text((32, 70), 'Supplied Oda / anime evidence', font=SMALL, fill='#304253')
    d.text((670, 70), 'Actual exported model in the running preview', font=SMALL, fill='#304253')
    panel(im, ROOT/'stuff/images'/source, (24, 112, 620, 1080), crop)
    panel(im, OUT/(PHASE+'-'+kind+'.png'), (645, 112, 1780, 1080))
    for i, line in enumerate(lines):
        d.text((32, 1100+i*35), str(i+1)+'. '+line, font=SMALL, fill='#171c23')
    im.save(OUT/(PHASE+'-comparison-'+kind+'.png'))


plate('top', 'Thousand_Sunny_pg.46.webp', [
    'Bow is up: port is drawing-left (Blender -Y), starboard drawing-right (+Y).',
    'Compare paired fore flights, centre upper flight, aft flights and garden perimeter separately from usability.',
    'Rigging/canvas hidden in model top view. The requested lawn expansion is retained as a user exception.',
    'Exact measured stations/counts/support: '+PHASE+'-exterior-inventory.csv; intended placements: exterior-feature-ledger.md.',
])
plate('port', 'Thousand_Sunny_Infobox.webp', [
    'Anime A is the colour anchor: pale/dark small ports, black dock rim, timber Burst barrel, red/yellow roof.',
    'Side image is perspective artwork, not a metric orthographic survey; hidden port counts remain unresolved.',
    'Inspect pictures establish appearance only. Continuous WASD/E ascent/return logs establish access.',
    'Configured 85.8 m length / 123.2 m height; eyes 1.7 m and body 1.75 m are preserved.',
])
plate('front', 'Thousand_Sunny%27s_Figurehead%2C_Helm%2C_and_Anchors.webp', [
    'H establishes seven swept mane petals and the mouth cannon; both source lateral petals are preserved.',
    'Compare tip sweep, eye/muzzle/nose spacing and disk/bone attachment in both bow-quarter captures too.',
    'A frontal symmetry check alone is insufficient to establish the whole figurehead as accurate.',
    'Baseline origin-cylinder defect is recorded by exact mesh ID, not inferred from an old screenshot.',
], crop=(10, 440, 360, 820))
