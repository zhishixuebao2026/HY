#!/bin/bash
# 重建本地截图环境（沙箱重启后一次性恢复）
# 用法：bash .arena-tools/setup.sh
set -e
mkdir -p /tmp/nssstub/lib /tmp/shots

# 1) NSS 桩库（Chromium 131 只缺 NSS 符号）
cp /home/user/HY/.arena-tools/stub.c /tmp/nssstub/stub.c 2>/dev/null || true
if [ -f /tmp/nssstub/stub.c ]; then
  cd /tmp/nssstub
  gcc -shared -fPIC -o lib/libnss3.so stub.c
  for n in libnssutil3 libnspr4 libsmime3 libnssckbi; do cp lib/libnss3.so lib/$n.so; done
  echo "nss stub ok"
fi

# 2) Node 侧 puppeteer-core / Chromium / 字体子集（/tmp 不持久，需重装）
if [ ! -d /tmp/pw/node_modules/puppeteer-core ]; then
  npm i puppeteer-core@23.11.1 @sparticuz/chromium@131.0.1 @fontsource/noto-sans-sc@5.1.0 \
    --no-save --prefix /tmp/pw >/dev/null 2>&1 && echo "npm deps ok"
fi
node -e "require('/tmp/pw/node_modules/@sparticuz/chromium').executablePath().then(p=>console.log('chromium', p))" 2>/dev/null || echo "chromium path failed"

# 3) 中文字体：合并 Noto Sans SC 子集（缺 fontTools 时自动安装）
if [ ! -f ~/.fonts/notosanssc/Merged-400.otf ]; then
  python3 -c "import fontTools" 2>/dev/null || pip install --break-system-packages fonttools brotli >/dev/null 2>&1
  mkdir -p ~/.fonts/notosanssc
  python3 /home/user/HY/.arena-tools/merge_font.py 400 | tail -1
  python3 /home/user/HY/.arena-tools/merge_font.py 700 | tail -1
fi
echo done
