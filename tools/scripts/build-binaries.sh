#!/usr/bin/env bash
#
# Build MoonCode binaries for all platforms locally.
# Mirrors .github/workflows/build-binaries.yml
#
# Usage:
#   ./tools/scripts/build-binaries.sh [--skip-deps] [--platform <platform>]
#
# Options:
#   --skip-deps         Skip installing cross-platform dependencies
#   --skip-install      Skip npm install/ci and reuse the current node_modules tree
#   --skip-build        Skip the monorepo build step and reuse the current dist outputs
#   --platform <name>   Build only for specified platform (darwin-arm64, darwin-x64, linux-x64, linux-arm64, windows-x64)
#
# Output:
#   packages/cli/binaries/
#     MoonCode-darwin-arm64.tar.gz
#     MoonCode-darwin-x64.tar.gz
#     MoonCode-linux-x64.tar.gz
#     MoonCode-linux-arm64.tar.gz
#     MoonCode-windows-x64.zip

set -euo pipefail

cd "$(dirname "$0")/../.."

SKIP_DEPS=false
SKIP_INSTALL=false
SKIP_BUILD=false
PLATFORM=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [[ -n "$PLATFORM" ]]; then
    case "$PLATFORM" in
        darwin-arm64|darwin-x64|linux-x64|linux-arm64|windows-x64)
            ;;
        *)
            echo "Invalid platform: $PLATFORM"
            echo "Valid platforms: darwin-arm64, darwin-x64, linux-x64, linux-arm64, windows-x64"
            exit 1
            ;;
    esac
fi

echo "==> Installing dependencies..."
if [[ "$SKIP_INSTALL" == "true" ]]; then
    echo "==> Skipping dependency install (--skip-install)"
elif [[ -d node_modules ]]; then
    echo "==> Existing node_modules detected; using npm install for a local refresh."
    npm install
else
    npm ci
fi

if [[ "$SKIP_DEPS" == "false" ]]; then
    echo "==> Installing cross-platform native bindings..."
    npm install --no-save --force \
        @mariozechner/clipboard-darwin-arm64@0.3.0 \
        @mariozechner/clipboard-darwin-x64@0.3.0 \
        @mariozechner/clipboard-linux-x64-gnu@0.3.0 \
        @mariozechner/clipboard-linux-arm64-gnu@0.3.0 \
        @mariozechner/clipboard-win32-x64-msvc@0.3.0 \
        @img/sharp-darwin-arm64@0.34.5 \
        @img/sharp-darwin-x64@0.34.5 \
        @img/sharp-linux-x64@0.34.5 \
        @img/sharp-linux-arm64@0.34.5 \
        @img/sharp-win32-x64@0.34.5 \
        @img/sharp-libvips-darwin-arm64@1.2.4 \
        @img/sharp-libvips-darwin-x64@1.2.4 \
        @img/sharp-libvips-linux-x64@1.2.4 \
        @img/sharp-libvips-linux-arm64@1.2.4
else
    echo "==> Skipping cross-platform native bindings (--skip-deps)"
fi

if [[ "$SKIP_BUILD" == "true" ]]; then
    echo "==> Skipping monorepo build (--skip-build)"
else
    echo "==> Building all packages..."
    npm run build
fi

echo "==> Building binaries..."
if ! command -v bun >/dev/null 2>&1; then
    echo "ERROR: Bun is required to compile release binaries."
    echo "Install Bun or run this script in the GitHub Actions release environment."
    exit 1
fi
cd packages/cli

rm -rf binaries
mkdir -p binaries/{darwin-arm64,darwin-x64,linux-x64,linux-arm64,windows-x64}/MoonAgent/MoonCode

if [[ -n "$PLATFORM" ]]; then
    PLATFORMS=("$PLATFORM")
else
    PLATFORMS=(darwin-arm64 darwin-x64 linux-x64 linux-arm64 windows-x64)
fi

for platform in "${PLATFORMS[@]}"; do
    echo "Building for $platform..."
    if [[ "$platform" == "windows-x64" ]]; then
        bun build --compile --external koffi --target=bun-$platform ./dist/bun/cli.js --outfile binaries/$platform/MoonAgent/MoonCode/MoonCode.exe
    else
        bun build --compile --external koffi --target=bun-$platform ./dist/bun/cli.js --outfile binaries/$platform/MoonAgent/MoonCode/MoonCode
    fi
done

echo "==> Creating release archives..."

copy_if_exists() {
    local src="$1"
    local dst="$2"
    if [[ -e "$src" ]]; then
        cp -r "$src" "$dst"
    else
        echo "WARN: missing optional asset: $src"
    fi
}

for platform in "${PLATFORMS[@]}"; do
    mkdir -p binaries/$platform/MoonAgent/MoonCode
    cp ../../setup.bat binaries/$platform/MoonAgent/
    cp ../../setup.sh binaries/$platform/MoonAgent/
    cp ../../setup.ps1 binaries/$platform/MoonAgent/

    cp package.json binaries/$platform/MoonAgent/MoonCode/
    cp README.md binaries/$platform/MoonAgent/MoonCode/
    cp CHANGELOG.md binaries/$platform/MoonAgent/MoonCode/

    copy_if_exists "../../node_modules/@silvia-odwyer/photon-node/photon_rs_bg.wasm" "binaries/$platform/MoonAgent/MoonCode/"
    mkdir -p binaries/$platform/MoonAgent/MoonCode/theme
    cp dist/modes/interactive/theme/*.json binaries/$platform/MoonAgent/MoonCode/theme/
    mkdir -p binaries/$platform/MoonAgent/MoonCode/assets
    cp dist/modes/interactive/assets/* binaries/$platform/MoonAgent/MoonCode/assets/
    copy_if_exists "dist/core/export-html" "binaries/$platform/MoonAgent/MoonCode/"
    copy_if_exists "docs" "binaries/$platform/MoonAgent/MoonCode/"
    copy_if_exists "examples" "binaries/$platform/MoonAgent/MoonCode/"
    copy_if_exists "browser-extension" "binaries/$platform/MoonAgent/MoonCode/"

    if [[ "$platform" == "windows-x64" ]]; then
        mkdir -p binaries/$platform/MoonAgent/MoonCode/node_modules/koffi/build/koffi/win32_x64
        copy_if_exists "../../node_modules/koffi/index.js" "binaries/$platform/MoonAgent/MoonCode/node_modules/koffi/"
        copy_if_exists "../../node_modules/koffi/package.json" "binaries/$platform/MoonAgent/MoonCode/node_modules/koffi/"
        copy_if_exists "../../node_modules/koffi/build/koffi/win32_x64/koffi.node" "binaries/$platform/MoonAgent/MoonCode/node_modules/koffi/build/koffi/win32_x64/"
    fi
done

chmod +x ../../setup.sh || true

cd binaries

for platform in "${PLATFORMS[@]}"; do
    if [[ "$platform" == "windows-x64" ]]; then
        echo "Creating MoonCode-$platform.zip..."
        (cd "$platform" && zip -r "../MoonCode-$platform.zip" MoonAgent)
    else
        echo "Creating MoonCode-$platform.tar.gz..."
        (cd "$platform" && tar -czf "../MoonCode-$platform.tar.gz" MoonAgent)
    fi
done

echo "==> Extracting archives for testing..."
for platform in "${PLATFORMS[@]}"; do
    rm -rf "$platform/MoonAgent"
    if [[ "$platform" == "windows-x64" ]]; then
        mkdir -p "$platform"
        (cd "$platform" && unzip -q "../MoonCode-$platform.zip")
    else
        mkdir -p "$platform"
        tar -xzf "MoonCode-$platform.tar.gz" -C "$platform"
    fi
done

echo ""
echo "==> Build complete!"
echo "Archives available in packages/cli/binaries/"
ls -lh *.tar.gz *.zip 2>/dev/null || true
echo ""
echo "Extracted directories for testing:"
for platform in "${PLATFORMS[@]}"; do
    echo "  binaries/$platform/MoonAgent/MoonCode"
done
