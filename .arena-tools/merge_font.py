"""Merge all @fontsource/noto-sans-sc woff2 subsets of one weight into a single font
that fontconfig/Chromium can use as a normal system font (sandbox screenshot tooling only)."""
import sys, glob, os
from fontTools.ttLib import TTFont
from fontTools.merge import Merger

weight = sys.argv[1] if len(sys.argv) > 1 else '400'
base = '/tmp/pw/node_modules/@fontsource/noto-sans-sc/files'
src = sorted(glob.glob(os.path.join(base, '*-%s-normal.woff2' % weight)))
if not src:
    print('no subsets found'); sys.exit(1)
print('subsets:', len(src))
tmpdir = '/tmp/fontmerge_%s' % weight
os.makedirs(tmpdir, exist_ok=True)
tmpfiles = []
for i, p in enumerate(src):
    f = TTFont(p)
    f.flavor = None
    t = os.path.join(tmpdir, '%03d.ttf' % i)
    f.save(t)
    tmpfiles.append(t)

merged = Merger().merge(tmpfiles)
merged['name'].setName('Noto Sans SC', 1, 3, 1, 0x409)
merged['name'].setName('Regular' if weight == '400' else 'Bold', 2, 3, 1, 0x409)
merged['name'].setName('NotoSansSC-Merged-%s' % weight, 4, 3, 1, 0x409)
merged['name'].setName('NotoSansSC-Merged-%s' % weight, 6, 3, 1, 0x409)
merged['OS/2'].usWeightClass = int(weight)
os.makedirs(os.path.expanduser('~/.fonts/notosanssc'), exist_ok=True)
out = os.path.expanduser('~/.fonts/notosanssc/Merged-%s.otf' % weight)
merged.flavor = None
merged.save(out)
print('saved', out, os.path.getsize(out) // 1024, 'KB')
