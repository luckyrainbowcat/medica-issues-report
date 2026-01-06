@echo off
echo Installing dependencies for main project...
call npm install

echo.
echo Installing dependencies for project1 backend...
cd project1
call npm install

echo.
echo Installing dependencies for project1 web frontend...
cd web
call npm install

echo.
echo All dependencies installed successfully!
echo.
echo You can now run: npm run dev:all

