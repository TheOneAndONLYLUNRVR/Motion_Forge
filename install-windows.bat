@echo off
setlocal

set "SRC=%~dp0"
set "DEST=%APPDATA%\Adobe\CEP\extensions\MOTION FORGE"

echo Installing Motion Forge...
if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"

xcopy "%SRC%*" "%DEST%\" /E /I /Y /EXCLUDE:%SRC%installer-exclude.txt >nul

echo Enabling unsigned-extension debug mode...
reg add "HKCU\Software\Adobe\CSXS.8"  /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
reg add "HKCU\Software\Adobe\CSXS.9"  /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul

echo.
echo Done. Installed to:
echo   %DEST%
echo.
echo Next steps:
echo   1. Quit and reopen After Effects (fully quit, not just close the project).
echo   2. Go to Window ^> Extensions ^> MOTION FORGE
echo.
pause
