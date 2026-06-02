#!/usr/bin/env bash
set -euo pipefail

APP_NAME="MoonCode"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${OSTYPE:-}" == darwin* ]]; then
  APPDATA_DIR="$HOME/Library/Application Support/MoonAgent"
else
  APPDATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/MoonAgent"
fi

INSTALL_DIR="$APPDATA_DIR/app/MoonCode"
BIN_DIR="$HOME/.local/bin"
LAUNCHER="$BIN_DIR/mooncode"
PROFILE_FILES=("$HOME/.profile" "$HOME/.bashrc" "$HOME/.zprofile" "$HOME/.zshrc")
PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'
PATH_MARKER="# MoonAgent PATH"

action="${1:-install}"

usage() {
  cat <<EOF

$APP_NAME setup.sh

Usage:
  ./setup.sh install   Install $APP_NAME and add it to PATH
  ./setup.sh repair    Rebuild the launcher and repair PATH
  ./setup.sh update    Reinstall using the current source or release folder
  ./setup.sh remove    Remove the local install and PATH entry

Layout:
  MoonAgent/setup.bat
  MoonAgent/setup.sh
  MoonAgent/setup.ps1
  MoonAgent/MoonCode/...

Notes:
  - Run this from an extracted MoonAgent release folder or the repo root.
  - Install places a launcher in $HOME/.local/bin.
  - The launcher adds mooncode, moon, and mooncli to PATH for the current user.
EOF
}

ensure_dirs() {
  mkdir -p "$APPDATA_DIR/app" "$BIN_DIR"
}

detect_source() {
  if [[ -f "$ROOT/packages/cli/package.json" ]]; then
    SOURCE_MODE="source"
    return
  fi
  if [[ -f "$ROOT/MoonCode/package.json" || -f "$ROOT/MoonCode/MoonCode" || -f "$ROOT/MoonCode/MoonCode.exe" || -f "$ROOT/MoonCode/dist/cli.js" ]]; then
    SOURCE_MODE="release"
    return
  fi
  SOURCE_MODE="unknown"
}

append_profile_line() {
  local file="$1"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  if ! grep -Fq "$PATH_MARKER" "$file"; then
    {
      printf '\n%s\n%s\n' "$PATH_MARKER" "$PATH_LINE"
    } >> "$file"
  fi
}

ensure_path() {
  local current_path=":${PATH:-}:"
  if [[ "$current_path" == *":$BIN_DIR:"* ]]; then
    return
  fi
  for file in "${PROFILE_FILES[@]}"; do
    append_profile_line "$file"
  done
  echo "PATH updated for current user."
}

remove_profile_path() {
  local file="$1"
  [[ -f "$file" ]] || return
  local tmp
  tmp="$(mktemp)"
  grep -vF "$PATH_MARKER" "$file" | grep -vF "$PATH_LINE" > "$tmp" || true
  mv "$tmp" "$file"
}

cleanup_path() {
  for file in "${PROFILE_FILES[@]}"; do
    remove_profile_path "$file"
  done
  echo "PATH cleaned."
}

copy_tree() {
  local src="$1"
  local dst="$2"
  if [[ -d "$src" ]]; then
    mkdir -p "$dst"
    cp -R "$src"/. "$dst"/
  fi
}

copy_source_payload() {
  [[ -f "$ROOT/packages/cli/package.json" ]] && cp "$ROOT/packages/cli/package.json" "$INSTALL_DIR/"
  [[ -f "$ROOT/packages/cli/README.md" ]] && cp "$ROOT/packages/cli/README.md" "$INSTALL_DIR/"
  [[ -f "$ROOT/packages/cli/CHANGELOG.md" ]] && cp "$ROOT/packages/cli/CHANGELOG.md" "$INSTALL_DIR/"
  copy_tree "$ROOT/packages/cli/dist" "$INSTALL_DIR/dist"
  copy_tree "$ROOT/packages/cli/dist/theme" "$INSTALL_DIR/theme"
  copy_tree "$ROOT/packages/cli/dist/assets" "$INSTALL_DIR/assets"
  copy_tree "$ROOT/packages/cli/dist/export-html" "$INSTALL_DIR/export-html"
  copy_tree "$ROOT/packages/cli/docs" "$INSTALL_DIR/docs"
  copy_tree "$ROOT/packages/cli/examples" "$INSTALL_DIR/examples"
  copy_tree "$ROOT/packages/cli/browser-extension" "$INSTALL_DIR/browser-extension"
}

copy_release_payload() {
  local payload="$ROOT/MoonCode"
  [[ -f "$payload/package.json" ]] && cp "$payload/package.json" "$INSTALL_DIR/"
  [[ -f "$payload/README.md" ]] && cp "$payload/README.md" "$INSTALL_DIR/"
  [[ -f "$payload/CHANGELOG.md" ]] && cp "$payload/CHANGELOG.md" "$INSTALL_DIR/"
  [[ -f "$payload/MoonCode" ]] && cp "$payload/MoonCode" "$INSTALL_DIR/"
  [[ -f "$payload/MoonCode.exe" ]] && cp "$payload/MoonCode.exe" "$INSTALL_DIR/"
  copy_tree "$payload/dist" "$INSTALL_DIR/dist"
  copy_tree "$payload/theme" "$INSTALL_DIR/theme"
  copy_tree "$payload/assets" "$INSTALL_DIR/assets"
  copy_tree "$payload/export-html" "$INSTALL_DIR/export-html"
  copy_tree "$payload/docs" "$INSTALL_DIR/docs"
  copy_tree "$payload/examples" "$INSTALL_DIR/examples"
  copy_tree "$payload/browser-extension" "$INSTALL_DIR/browser-extension"
}

write_launcher() {
  cat > "$LAUNCHER" <<EOF
#!/usr/bin/env sh
MOONCODE_HOME="$INSTALL_DIR"
if [ -x "\$MOONCODE_HOME/MoonCode" ]; then
  exec "\$MOONCODE_HOME/MoonCode" "\$@"
fi
if [ -f "\$MOONCODE_HOME/dist/cli.js" ]; then
  exec node "\$MOONCODE_HOME/dist/cli.js" "\$@"
fi
echo "MoonCode is not installed."
echo "Run setup.sh repair or setup.sh install."
exit 1
EOF
  chmod +x "$LAUNCHER"
  ln -sf "$LAUNCHER" "$BIN_DIR/moon" || cp "$LAUNCHER" "$BIN_DIR/moon"
  ln -sf "$LAUNCHER" "$BIN_DIR/mooncli" || cp "$LAUNCHER" "$BIN_DIR/mooncli"
}

install_local() {
  ensure_dirs
  ensure_path
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"
  if [[ "$SOURCE_MODE" == "source" ]]; then
    echo
    echo "Installing from repository source..."
    if [[ ! -d "$ROOT/node_modules" ]]; then
      npm install
    fi
    npm run build
    copy_source_payload
  else
    echo
    echo "Installing from release files..."
    copy_release_payload
  fi
  write_launcher
  echo
  echo "$APP_NAME is ready."
  echo "Try: mooncode --version"
  echo "     mooncode"
}

repair_local() {
  ensure_dirs
  ensure_path
  write_launcher
  echo
  echo "Repair complete."
  echo "If MoonCode was missing, the launcher has been recreated."
  echo "Try: mooncode doctor"
}

update_local() {
  detect_source
  if [[ "$SOURCE_MODE" == "unknown" ]]; then
    echo
    echo "Update requires the extracted release folder or repo root."
    exit 1
  fi
  ensure_dirs
  ensure_path
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"
  if [[ "$SOURCE_MODE" == "source" ]]; then
    echo
    echo "Updating from repository source..."
    if [[ ! -d "$ROOT/node_modules" ]]; then
      npm install
    fi
    npm run build
    copy_source_payload
  else
    echo
    echo "Refreshing release install..."
    copy_release_payload
  fi
  write_launcher
  echo
  echo "Update complete."
}

remove_local() {
  echo
  echo "Removing MoonCode..."
  cleanup_path
  rm -rf "$INSTALL_DIR"
  rm -f "$LAUNCHER" "$BIN_DIR/moon" "$BIN_DIR/mooncli"
  echo
  echo "Removed. Restart your terminal for PATH changes."
}

detect_source

case "$action" in
  install|setup)
    install_local
    ;;
  repair)
    repair_local
    ;;
  update)
    update_local
    ;;
  remove|uninstall)
    remove_local
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
