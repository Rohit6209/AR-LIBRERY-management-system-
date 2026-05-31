@echo off
:: ═══════════════════════════════════════════════════════════════
::   A.R. Library — MongoDB Atlas Setup (Ek Baar Chalao)
::   MySQL se MongoDB mein migrate ho gaya hai!
:: ═══════════════════════════════════════════════════════════════

title A.R. Library — MongoDB Setup

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   A.R. Library — MongoDB Atlas Setup             ║
echo  ║   Pehli baar chalao — sab set ho jayega!         ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: ── Step 1: Node check ────────────────────────────────────────
echo  [1/4] Node.js check kar raha hoon...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ❌ Node.js nahi mila!
    echo  👉 Yahan se install karo: https://nodejs.org
    echo  Phir ye script dobara chalao.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  ✅ Node.js mila: %NODE_VER%

:: ── Step 2: .env check ────────────────────────────────────────
echo.
echo  [2/4] MongoDB Atlas connection check...
echo.
echo  ════════════════════════════════════════════════
echo   ZARURI: .env file mein MongoDB URI daalna hai!
echo.
echo   Steps:
echo   1. https://cloud.mongodb.com pe jaao
echo   2. Free account banao (Atlas Free Tier)
echo   3. New Cluster banao (M0 Free)
echo   4. Database Access → User banao (username + password)
echo   5. Network Access → 0.0.0.0/0 allow karo
echo   6. Connect → Drivers → Connection String copy karo
echo   7. .env file mein MONGODB_URI= mein paste karo
echo  ════════════════════════════════════════════════
echo.
set /p CONFIRM="Kya .env file edit kar li aur MongoDB URI daal di? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo.
    echo  👉 Pehle .env file edit karo, phir dobara chalao!
    echo  📁 .env file is folder mein hai.
    start notepad .env
    pause
    exit /b 1
)

:: ── Step 3: npm install ───────────────────────────────────────
echo.
echo  [3/4] Packages install ho rahi hain...
echo  (mongoose, express, etc. — internet chahiye)
echo.
npm install
if %errorlevel% neq 0 (
    echo  ❌ npm install fail hua. Internet check karo.
    pause
    exit /b 1
)
echo  ✅ Packages ready!

:: ── Step 4: PM2 setup ─────────────────────────────────────────
echo.
echo  [4/4] Server setup ho raha hai...
npm install -g pm2 >nul 2>&1
npm install -g pm2-windows-startup >nul 2>&1
pm2 start server.js --name "ar-library"
pm2-startup install
pm2 save
echo  ✅ Server chalu ho gaya!

:: ── Done ──────────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   🎉 SETUP COMPLETE!                              ║
echo  ║                                                   ║
echo  ║   App: http://localhost:5000                      ║
echo  ║   Database: MongoDB Atlas (Cloud)                 ║
echo  ║                                                   ║
echo  ║   Commands:                                       ║
echo  ║     pm2 status      → server ki status           ║
echo  ║     pm2 logs        → logs dekho                 ║
echo  ║     pm2 restart all → restart karo               ║
echo  ╚══════════════════════════════════════════════════╝
echo.

timeout /t 3 /nobreak >nul
start http://localhost:5000
pause
