#!/bin/sh
# Wraps each dashboard .jsx into a standalone HTML preview (React + Tailwind via CDN, no install).
cd "$(dirname "$0")"

build() { # $1 = jsx file, $2 = component name, $3 = output html, $4 = page title
{
cat <<HEAD
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>$4</title>
  <script src="https://cdn.tailwindcss.com/3.4.16"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <script>tailwind.config = { darkMode: "class", theme: { extend: { fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] } } } };</script>
  <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script>
  <style>body{background:#fff}html.dark body{background:#09090b}</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
const { useState, useMemo, useEffect, useRef } = React;
HEAD
sed -e '/^import .* from "react";$/d' -e 's/^export default function/function/' "$1"
cat <<TAIL

ReactDOM.createRoot(document.getElementById("root")).render(<$2 />);
  </script>
</body>
</html>
TAIL
} > "$3"
echo "Wrote $(pwd)/$3"
}

build AdminDashboard.jsx AdminDashboard preview.html "CommunityCare Admin"
build SaaSDashboard.jsx SaaSDashboard preview-saas.html "CommunityCare Console"
