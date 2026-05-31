@echo off
:: ═══════════════════════════════════════════════
::   A.R. Library — Server Start Karo
::   MongoDB Atlas Version
:: ═══════════════════════════════════════════════

title A.R. Library Server

echo.
echo  ╔══════════════════════════════════════╗
echo  ║    A.R. Library (MongoDB)            ║
echo  ║    Starting up...                    ║
echo  ╚══════════════════════════════════════╝
echo.

set SERVER_PATH=%~dp0
cd /d "%SERVER_PATH%"

where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] PM2 install ho raha hai...
    npm install -g pm2 >nul 2>&1
    npm install -g pm2-windows-startup >nul 2>&1
)

echo  [1/3] Server start ho raha hai...
pm2 describe ar-library >nul 2>&1
if %errorlevel% equ 0 (
    pm2 restart ar-library >nul 2>&1
    echo  ✅ Server restart hua!
) else (
    pm2 start server.js --name "ar-library" >nul 2>&1
    echo  ✅ Server chalu hua!
)

echo  [2/3] Ready ho raha hai...
timeout /t 4 /nobreak >nul

echo  [3/3] Browser mein khul raha hai...
start "" "http://localhost:5000"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║  ✅ A.R. Library chalu hai!          ║
echo  ║  🌐 http://localhost:5000            ║
echo  ║  🗄️  Database: MongoDB Atlas         ║
echo  ╚══════════════════════════════════════╝
echo.

timeout /t 5 /nobreak >nul
exit
