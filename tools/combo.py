import sys
from PIL import Image
names = sys.argv[2:]
ims = [Image.open(f'shots/{n}.png') for n in names]
w = sum(i.width for i in ims); h = max(i.height for i in ims)
o = Image.new('RGB', (w, h), 'white'); x = 0
for i in ims:
    o.paste(i, (x, 0)); x += i.width
o.save(f'shots/{sys.argv[1]}.png')
