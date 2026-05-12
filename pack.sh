#!/bin/bash
# Упаковывает сайт в ZIP для скачивания
# Использование: bash pack.sh

OUTPUT="itis-lab-site.zip"

zip -r "$OUTPUT" \
  index.html .nojekyll CNAME \
  about/ tasks/ industries/ industry/ subindustry/ \
  contacts/ privacy/ consent/ cookies/ \
  blog/ cases/ css/ js/ assets/ \
  --exclude "*.DS_Store" --exclude "__MACOSX/*"

echo "Готово: $OUTPUT"
echo "Размер: $(du -sh $OUTPUT | cut -f1)"
