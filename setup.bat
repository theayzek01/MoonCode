@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "APP_NAME=MoonCode"
set "ROOT=%~dp0"
set "APPDATA_DIR=%LOCALAPPDATA%\MoonAgent"
set "INSTALL_DIR=%APPDATA_DIR%\app\MoonCode"
set "BIN_DIR=%APPDATA_DIR%\bin"
set "LAUNCHER=%BIN_DIR%\mooncode.cmd"

if "%~1"=="" goto menu
if /I "%~1"=="install" goto install
if /I "%~1"=="setup" goto install
if /I "%~1"=="repair" goto repair
if /I "%~1"=="update" goto update
if /I "%~1"=="remove" goto remove
if /I "%~1"=="uninstall" goto remove
if /I "%~1"=="help" goto help
goto help

:menu
cls
echo.
echo   %APP_NAME% setup
echo.
echo   [1] Install
echo   [2] Repair
echo   [3] Update
echo   [4] Remove
echo   [5] Help
echo.
choice /c 12345 /n /m "Choose an action: "
if errorlevel 5 goto help
if errorlevel 4 goto remove
if errorlevel 3 goto update
if errorlevel 2 goto repair
if errorlevel 1 goto install
goto end

:help
echo.
echo %APP_NAME% setup.bat
echo.
echo Usage:
echo   setup.bat install   Install %APP_NAME% and add it to PATH
echo   setup.bat repair    Rebuild the launcher and repair PATH
echo   setup.bat update    Reinstall using the current source or release folder
echo   setup.bat remove    Remove the local install and PATH entry
echo.
echo Quick start:
echo   setup.bat install ^&^& mooncode
echo.
echo Layout:
echo   MoonAgent\setup.bat
echo   MoonAgent\setup.sh
echo   MoonAgent\setup.ps1
echo   MoonAgent\MoonCode\...
echo.
echo Notes:
echo   - Run this from an extracted MoonAgent release folder or the repo root.
echo   - Install places a launcher in %%LOCALAPPDATA%%\MoonAgent\bin.
echo   - The launcher adds mooncode, moon, and mooncli to PATH for the current user.
goto end

:ensure_source
if exist "%ROOT%packages\cli\package.json" (
  set "SOURCE_MODE=source"
  goto :eof
)
if exist "%ROOT%MoonCode\package.json" (
  set "SOURCE_MODE=release"
  goto :eof
)
if exist "%ROOT%MoonCode\MoonCode.exe" (
  set "SOURCE_MODE=release"
  goto :eof
)
if exist "%ROOT%MoonCode\dist\cli.js" (
  set "SOURCE_MODE=release"
  goto :eof
)
set "SOURCE_MODE=unknown"
goto :eof

:ensure_app_dirs
if not exist "%APPDATA_DIR%" mkdir "%APPDATA_DIR%" >nul 2>&1
if not exist "%APPDATA_DIR%\app" mkdir "%APPDATA_DIR%\app" >nul 2>&1
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%" >nul 2>&1
goto :eof

:ensure_path
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$target = $env:LOCALAPPDATA + '\MoonAgent\bin';" ^
  "$path = [Environment]::GetEnvironmentVariable('Path','User');" ^
  "if (-not $path) { $path = '' }" ^
  "$segments = $path -split ';' | Where-Object { $_ -and $_.Trim() };" ^
  "if ($segments -notcontains $target) {" ^
  "  $newPath = ($segments + $target) -join ';';" ^
  "  [Environment]::SetEnvironmentVariable('Path', $newPath, 'User');" ^
  "  $env:Path = $env:Path + ';' + $target;" ^
  "  Write-Host 'PATH updated for current user.'" ^
  "} else { Write-Host 'PATH already contains MoonAgent.' }"
goto :eof

:write_launcher
(
  echo @echo off
  echo setlocal
  echo set "MOONCODE_HOME=%INSTALL_DIR%"
  echo if exist "%%MOONCODE_HOME%%\MoonCode.exe" ^(
  echo   "%%MOONCODE_HOME%%\MoonCode.exe" %%*
  echo   exit /b %%errorlevel%%
  echo ^)
  echo if exist "%%MOONCODE_HOME%%\dist\cli.js" ^(
  echo   node "%%MOONCODE_HOME%%\dist\cli.js" %%*
  echo   exit /b %%errorlevel%%
  echo ^)
  echo echo MoonCode is not installed.
  echo echo Run setup.bat repair or setup.bat install.
  echo exit /b 1
) > "%LAUNCHER%"
copy /y "%LAUNCHER%" "%BIN_DIR%\moon.cmd" >nul
copy /y "%LAUNCHER%" "%BIN_DIR%\mooncli.cmd" >nul
goto :eof

:copy_tree
set "SRC=%~1"
set "DST=%~2"
if exist "%SRC%" (
  if not exist "%DST%" mkdir "%DST%" >nul 2>&1
  xcopy "%SRC%\*" "%DST%\" /E /I /Y /Q >nul
)
goto :eof

:copy_source_payload
if exist "%ROOT%packages\cli\package.json" (
  copy /y "%ROOT%packages\cli\package.json" "%INSTALL_DIR%\" >nul
)
if exist "%ROOT%packages\cli\README.md" (
  copy /y "%ROOT%packages\cli\README.md" "%INSTALL_DIR%\" >nul
)
if exist "%ROOT%packages\cli\CHANGELOG.md" (
  copy /y "%ROOT%packages\cli\CHANGELOG.md" "%INSTALL_DIR%\" >nul
)
call :copy_tree "%ROOT%packages\cli\dist" "%INSTALL_DIR%\dist"
call :copy_tree "%ROOT%packages\cli\dist\theme" "%INSTALL_DIR%\theme"
call :copy_tree "%ROOT%packages\cli\dist\assets" "%INSTALL_DIR%\assets"
call :copy_tree "%ROOT%packages\cli\dist\export-html" "%INSTALL_DIR%\export-html"
call :copy_tree "%ROOT%packages\cli\docs" "%INSTALL_DIR%\docs"
call :copy_tree "%ROOT%packages\cli\examples" "%INSTALL_DIR%\examples"
call :copy_tree "%ROOT%packages\cli\browser-extension" "%INSTALL_DIR%\browser-extension"
goto :eof

:copy_release_payload
if exist "%ROOT%MoonCode\package.json" (
  copy /y "%ROOT%MoonCode\package.json" "%INSTALL_DIR%\" >nul
)
if exist "%ROOT%MoonCode\README.md" (
  copy /y "%ROOT%MoonCode\README.md" "%INSTALL_DIR%\" >nul
)
if exist "%ROOT%MoonCode\CHANGELOG.md" (
  copy /y "%ROOT%MoonCode\CHANGELOG.md" "%INSTALL_DIR%\" >nul
)
if exist "%ROOT%MoonCode\MoonCode.exe" (
  copy /y "%ROOT%MoonCode\MoonCode.exe" "%INSTALL_DIR%\" >nul
)
call :copy_tree "%ROOT%MoonCode\dist" "%INSTALL_DIR%\dist"
call :copy_tree "%ROOT%MoonCode\theme" "%INSTALL_DIR%\theme"
call :copy_tree "%ROOT%MoonCode\assets" "%INSTALL_DIR%\assets"
call :copy_tree "%ROOT%MoonCode\export-html" "%INSTALL_DIR%\export-html"
call :copy_tree "%ROOT%MoonCode\docs" "%INSTALL_DIR%\docs"
call :copy_tree "%ROOT%MoonCode\examples" "%INSTALL_DIR%\examples"
call :copy_tree "%ROOT%MoonCode\browser-extension" "%INSTALL_DIR%\browser-extension"
goto :eof

:install
call :ensure_source
if /I "%SOURCE_MODE%"=="unknown" (
  echo.
  echo Could not detect a MoonCode release folder or repository checkout.
  echo Run this from the extracted MoonAgent release files or the repo root.
  exit /b 1
)

call :ensure_app_dirs
call :ensure_path

if /I "%SOURCE_MODE%"=="source" (
  echo.
  echo Installing from repository source...
  if not exist "%ROOT%node_modules" (
    call npm install
    if errorlevel 1 exit /b 1
  )
  call npm run build
  if errorlevel 1 exit /b 1
  if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
  mkdir "%INSTALL_DIR%" >nul 2>&1
  call :copy_source_payload
) else (
  echo.
  echo Installing from release files...
  if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
  mkdir "%INSTALL_DIR%" >nul 2>&1
  call :copy_release_payload
)

call :write_launcher
echo.
echo %APP_NAME% is ready.
echo Try: mooncode --version
echo      mooncode
goto end

:repair
call :ensure_app_dirs
call :ensure_path
call :write_launcher
echo.
echo Repair complete.
echo If MoonCode was missing, the launcher has been recreated.
echo Try: mooncode doctor
goto end

:update
call :ensure_source
if /I "%SOURCE_MODE%"=="unknown" (
  echo.
  echo Update requires the extracted release folder or repo root.
  exit /b 1
)
if /I "%SOURCE_MODE%"=="source" (
  echo.
  echo Updating from repository source...
  call npm install
  if errorlevel 1 exit /b 1
  call npm run build
  if errorlevel 1 exit /b 1
  if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
  mkdir "%INSTALL_DIR%" >nul 2>&1
  call :copy_source_payload
) else (
  echo.
  echo Refreshing release install...
  if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
  mkdir "%INSTALL_DIR%" >nul 2>&1
  call :copy_release_payload
)
call :repair
goto end

:remove
echo.
echo Removing MoonCode...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$target = $env:LOCALAPPDATA + '\MoonAgent\bin';" ^
  "$path = [Environment]::GetEnvironmentVariable('Path','User');" ^
  "if ($path) {" ^
  "  $segments = $path -split ';' | Where-Object { $_ -and $_.Trim() -and $_.Trim() -ne $target };" ^
  "  [Environment]::SetEnvironmentVariable('Path', ($segments -join ';'), 'User');" ^
  "}" ^
  "Write-Host 'PATH cleaned.'"
if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
if exist "%BIN_DIR%" rmdir /s /q "%BIN_DIR%" >nul 2>&1
echo.
echo Removed. Close and reopen terminals for PATH changes.
goto end

:end
endlocal
