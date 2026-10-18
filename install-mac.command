#!/bin/bash
# Motion Forge installer for macOS
cd "$(dirname "$0")"
EXT_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
DEST="$EXT_DIR/MOTION FORGE"

echo "Installing Motion Forge..."
mkdir -p "$EXT_DIR"
rm -rf "$DEST"
mkdir -p "$DEST"
# Copy everything except this installer itself
for item in *; do
  case "$item" in
    install-mac.command|install-windows.bat) ;;
    *) cp -R "$item" "$DEST/" ;;
  esac
done

echo "Enabling unsigned-extension debug mode..."
for v in 8 9 10 11 12; do
  defaults write com.adobe.CSXS.$v PlayerDebugMode 1 2>/dev/null
done

echo ""
echo "Done. Installed to:"
echo "  $DEST"
echo ""
echo "Next steps:"
echo "  1. Quit and reopen After Effects (fully quit, not just close the project)."
echo "  2. Go to Window > Extensions > MOTION FORGE"
echo ""
read -p "Press Return to close..." _
