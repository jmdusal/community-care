#!/bin/sh
# Builds the PDF from the Markdown source. Usage: ./build-pdf.sh
set -e
cd "$(dirname "$0")"
SRC="CommunityCare_AI_Technical_Documentation_v1.1.md"
OUT="CommunityCare_AI_Technical_Documentation_v1.1.pdf"
TMP="$(mktemp -d)"
npx --yes marked@15.0.12 --gfm -i "$SRC" -o "$TMP/body.html"
{
cat <<'HEAD'
<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>CommunityCare AI — Technical Documentation v1.1</title>
<style>
@page { size: A4; margin: 18mm 16mm 20mm 16mm;
  @bottom-left { content: "CommunityCare AI | Technical Documentation v1.1"; font: 8pt Helvetica, Arial, sans-serif; color: #64748b; }
  @bottom-right { content: "Page " counter(page); font: 8pt Helvetica, Arial, sans-serif; color: #64748b; } }
@page :first { @bottom-left { content: none; } @bottom-right { content: none; } }
* { box-sizing: border-box; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1f2937; margin: 0; }
h1, h2 { color: #1a3350; }
h2 { font-size: 20pt; margin: 22pt 0 8pt; padding-bottom: 4pt; border-bottom: 2px solid #2a8a8a; page-break-after: avoid; }
h3 { color: #2563a8; font-size: 13pt; margin: 16pt 0 6pt; page-break-after: avoid; }
p { margin: 0 0 7pt; }
ul, ol { margin: 0 0 8pt; padding-left: 18pt; }
li { margin: 2pt 0; }
ul li::marker { color: #2a8a8a; }
ol li::marker { color: #2563a8; }
li input[type=checkbox] { margin-right: 6pt; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0 12pt; font-size: 8.8pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #1a3350; color: #fff; text-align: left; font-weight: 600; padding: 5pt 7pt; }
td { border: 1px solid #dbe1e8; padding: 4.5pt 7pt; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f4f6f8; }
code { font-family: Menlo, Consolas, monospace; font-size: 8.4pt; background: #eef2f6; padding: 0.5pt 3pt; border-radius: 3px; }
pre { background: #f4f6f8; border: 1px solid #dbe1e8; border-radius: 4px; padding: 8pt 10pt; font-size: 8pt; line-height: 1.4; overflow: hidden; white-space: pre-wrap; page-break-inside: avoid; margin: 6pt 0 12pt; }
pre code { background: none; padding: 0; font-size: 8pt; }
.callout { background: #e8f0f8; border: 1px solid #c8d8ea; border-left: 4px solid #2563a8; color: #1a3350; font-weight: 600; padding: 9pt 12pt; margin: 10pt 0 14pt; page-break-inside: avoid; }
.page-break { page-break-after: always; }
.cover { text-align: center; padding-top: 70mm; }
.cover h1 { font-size: 34pt; margin: 0 0 8pt; border: none; }
.cover .subtitle { font-size: 14pt; color: #64748b; margin: 0; }
.cover .rule { width: 90mm; height: 3px; background: #2a8a8a; margin: 22pt auto; border-radius: 2px; }
.cover .tagline { font-size: 12.5pt; color: #64748b; margin-bottom: 26pt; }
.cover table { width: 125mm; margin: 0 auto; font-size: 9.5pt; text-align: left; }
.cover thead { display: none; }
.cover td { background: #f4f6f8 !important; padding: 7pt 10pt; }
.cover td:first-child { width: 42mm; }
.cover .purpose { text-align: left; font-size: 8pt; color: #64748b; margin-top: 40mm; }
.end { color: #64748b; font-size: 8.5pt; margin-top: 14pt; }
</style></head><body>
HEAD
cat "$TMP/body.html"
echo '</body></html>'
} > "$TMP/doc.html"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-pdf-header-footer --print-to-pdf="$PWD/$OUT" "file://$TMP/doc.html" 2>/dev/null
rm -rf "$TMP"
echo "Wrote $PWD/$OUT"
