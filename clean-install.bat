@echo off
echo Cleaning old dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo Installing dependencies with --legacy-peer-deps...
call npm install --legacy-peer-deps

echo.
echo Installation completed!

