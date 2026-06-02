param(
  [Parameter(Position = 0)]
  [string]$Action = "install"
)

$ErrorActionPreference = "Stop"

$AppName = "MoonCode"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDataDir = Join-Path $env:LOCALAPPDATA "MoonAgent"
$InstallDir = Join-Path $AppDataDir "app\MoonCode"
$BinDir = Join-Path $AppDataDir "bin"
$Launcher = Join-Path $BinDir "mooncode.cmd"

function Write-Usage {
  Write-Host ""
  Write-Host "$AppName setup.ps1"
  Write-Host ""
  Write-Host "Usage:"
  Write-Host "  .\setup.ps1 install   Install $AppName and add it to PATH"
  Write-Host "  .\setup.ps1 repair    Rebuild the launcher and repair PATH"
  Write-Host "  .\setup.ps1 update    Reinstall using the current source or release folder"
  Write-Host "  .\setup.ps1 remove    Remove the local install and PATH entry"
  Write-Host ""
  Write-Host "Layout:"
  Write-Host "  MoonAgent\setup.bat"
  Write-Host "  MoonAgent\setup.sh"
  Write-Host "  MoonAgent\setup.ps1"
  Write-Host "  MoonAgent\MoonCode\..."
  Write-Host ""
  Write-Host "Notes:"
  Write-Host "  - Run this from an extracted MoonAgent release folder or the repo root."
  Write-Host "  - Install places a launcher in $env:LOCALAPPDATA\MoonAgent\bin."
}

function Test-SourceMode {
  return (Test-Path (Join-Path $Root "packages/cli/package.json"))
}

function Test-ReleaseMode {
  $releaseRoot = Join-Path $Root "MoonCode"
  return (
    (Test-Path (Join-Path $releaseRoot "package.json")) -or
    (Test-Path (Join-Path $releaseRoot "MoonCode.exe")) -or
    (Test-Path (Join-Path $releaseRoot "MoonCode")) -or
    (Test-Path (Join-Path $releaseRoot "dist/cli.js"))
  )
}

function Ensure-Dirs {
  New-Item -ItemType Directory -Force -Path (Join-Path $AppDataDir "app") | Out-Null
  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
}

function Ensure-Path {
  $target = $BinDir
  $path = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not $path) {
    $path = ""
  }
  $segments = @($path -split ';' | Where-Object { $_ -and $_.Trim() })
  if ($segments -notcontains $target) {
    $newPath = ($segments + $target) -join ';'
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = "$env:Path;$target"
    Write-Host "PATH updated for current user."
  }
}

function Cleanup-Path {
  $target = $BinDir
  $path = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($path) {
    $segments = @($path -split ';' | Where-Object { $_ -and $_.Trim() -and $_.Trim() -ne $target })
    [Environment]::SetEnvironmentVariable("Path", ($segments -join ';'), "User")
  }
  Write-Host "PATH cleaned."
}

function Copy-Tree {
  param(
    [string]$Source,
    [string]$Destination
  )
  if (Test-Path $Source) {
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    Copy-Item -Path (Join-Path $Source '*') -Destination $Destination -Recurse -Force
  }
}

function Copy-SourcePayload {
  Copy-Item -Force (Join-Path $Root "packages/cli/package.json") $InstallDir -ErrorAction SilentlyContinue
  Copy-Item -Force (Join-Path $Root "packages/cli/README.md") $InstallDir -ErrorAction SilentlyContinue
  Copy-Item -Force (Join-Path $Root "packages/cli/CHANGELOG.md") $InstallDir -ErrorAction SilentlyContinue
  Copy-Tree -Source (Join-Path $Root "packages/cli/dist") -Destination (Join-Path $InstallDir "dist")
  Copy-Tree -Source (Join-Path $Root "packages/cli/dist/theme") -Destination (Join-Path $InstallDir "theme")
  Copy-Tree -Source (Join-Path $Root "packages/cli/dist/assets") -Destination (Join-Path $InstallDir "assets")
  Copy-Tree -Source (Join-Path $Root "packages/cli/dist/export-html") -Destination (Join-Path $InstallDir "export-html")
  Copy-Tree -Source (Join-Path $Root "packages/cli/docs") -Destination (Join-Path $InstallDir "docs")
  Copy-Tree -Source (Join-Path $Root "packages/cli/examples") -Destination (Join-Path $InstallDir "examples")
  Copy-Tree -Source (Join-Path $Root "packages/cli/browser-extension") -Destination (Join-Path $InstallDir "browser-extension")
}

function Copy-ReleasePayload {
  $payload = Join-Path $Root "MoonCode"
  Copy-Item -Force (Join-Path $payload "package.json") $InstallDir -ErrorAction SilentlyContinue
  Copy-Item -Force (Join-Path $payload "README.md") $InstallDir -ErrorAction SilentlyContinue
  Copy-Item -Force (Join-Path $payload "CHANGELOG.md") $InstallDir -ErrorAction SilentlyContinue
  Copy-Item -Force (Join-Path $payload "MoonCode.exe") $InstallDir -ErrorAction SilentlyContinue
  Copy-Item -Force (Join-Path $payload "MoonCode") $InstallDir -ErrorAction SilentlyContinue
  Copy-Tree -Source (Join-Path $payload "dist") -Destination (Join-Path $InstallDir "dist")
  Copy-Tree -Source (Join-Path $payload "theme") -Destination (Join-Path $InstallDir "theme")
  Copy-Tree -Source (Join-Path $payload "assets") -Destination (Join-Path $InstallDir "assets")
  Copy-Tree -Source (Join-Path $payload "export-html") -Destination (Join-Path $InstallDir "export-html")
  Copy-Tree -Source (Join-Path $payload "docs") -Destination (Join-Path $InstallDir "docs")
  Copy-Tree -Source (Join-Path $payload "examples") -Destination (Join-Path $InstallDir "examples")
  Copy-Tree -Source (Join-Path $payload "browser-extension") -Destination (Join-Path $InstallDir "browser-extension")
}

function Write-Launcher {
  @"
@echo off
setlocal
set "MOONCODE_HOME=$InstallDir"
if exist "%MOONCODE_HOME%\MoonCode.exe" (
  "%MOONCODE_HOME%\MoonCode.exe" %*
  exit /b %errorlevel%
)
if exist "%MOONCODE_HOME%\dist\cli.js" (
  node "%MOONCODE_HOME%\dist\cli.js" %*
  exit /b %errorlevel%
)
echo MoonCode is not installed.
echo Run setup.ps1 repair or setup.ps1 install.
exit /b 1
"@ | Set-Content -Path $Launcher -Encoding ASCII
  Copy-Item -Force $Launcher (Join-Path $BinDir "moon.cmd")
  Copy-Item -Force $Launcher (Join-Path $BinDir "mooncli.cmd")
}

function Install-Local {
  Ensure-Dirs
  Ensure-Path
  if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force $InstallDir
  }
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

  if (Test-SourceMode) {
    Write-Host ""
    Write-Host "Installing from repository source..."
    if (-not (Test-Path (Join-Path $Root "node_modules"))) {
      npm install
    }
    npm run build
    Copy-SourcePayload
  }
  elseif (Test-ReleaseMode) {
    Write-Host ""
    Write-Host "Installing from release files..."
    Copy-ReleasePayload
  }
  else {
    throw "Could not detect a MoonCode release folder or repository checkout."
  }

  Write-Launcher
  Write-Host ""
  Write-Host "$AppName is ready."
  Write-Host "Try: mooncode --version"
  Write-Host "     mooncode"
}

function Repair-Local {
  Ensure-Dirs
  Ensure-Path
  Write-Launcher
  Write-Host ""
  Write-Host "Repair complete."
  Write-Host "If MoonCode was missing, the launcher has been recreated."
  Write-Host "Try: mooncode doctor"
}

function Update-Local {
  if (Test-SourceMode) {
    Write-Host ""
    Write-Host "Updating from repository source..."
    if (-not (Test-Path (Join-Path $Root "node_modules"))) {
      npm install
    }
    npm run build
    Ensure-Dirs
    Ensure-Path
    if (Test-Path $InstallDir) {
      Remove-Item -Recurse -Force $InstallDir
    }
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    Copy-SourcePayload
    Write-Launcher
    return
  }

  if (Test-ReleaseMode) {
    Write-Host ""
    Write-Host "Refreshing release install..."
    Ensure-Dirs
    Ensure-Path
    if (Test-Path $InstallDir) {
      Remove-Item -Recurse -Force $InstallDir
    }
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    Copy-ReleasePayload
    Write-Launcher
    return
  }

  throw "Update requires the extracted release folder or repo root."
}

function Remove-Local {
  Write-Host ""
  Write-Host "Removing MoonCode..."
  Cleanup-Path
  if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force $InstallDir
  }
  if (Test-Path $BinDir) {
    Remove-Item -Recurse -Force $BinDir
  }
  Write-Host ""
  Write-Host "Removed. Restart your terminal for PATH changes."
}

switch ($Action.ToLowerInvariant()) {
  { $_ -in @("install", "setup") } { Install-Local }
  "repair" { Repair-Local }
  "update" { Update-Local }
  { $_ -in @("remove", "uninstall") } { Remove-Local }
  { $_ -in @("help", "-h", "--help") } { Write-Usage }
  default {
    Write-Usage
    exit 1
  }
}
