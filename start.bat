@echo off
echo Starting TrailerGPS Development Environment...
echo.

echo Installing dependencies...
call npm run install:all

echo.
echo Starting development servers...
echo Backend will be available at: http://localhost:3000
echo Frontend will be available at: http://localhost:5173
echo.

call npm run dev 