#!/bin/bash
# Упаковывает сайт в ZIP для скачивания
# Использование: bash pack.sh

OUTPUT="itis-lab-site.zip"

zip -r "$OUTPUT" \
  index.html about.html tasks.html industries.html industry.html subindustry.html \
  cases.html blog.html contacts.html privacy.html \
  blog/ cases/ css/ js/ assets/ \
  --exclude "*.DS_Store" --exclude "__MACOSX/*"

echo "Готово: $OUTPUT"
echo "Размер: $(du -sh $OUTPUT | cut -f1)"
