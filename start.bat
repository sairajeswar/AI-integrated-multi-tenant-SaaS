@echo off
title AuraSilver Multi-Tenant SaaS Platform
echo ================================================================
echo ✨ AuraSilver AI Multi-Tenant SaaS Platform ✨
echo 🎨 Theme: Total Silver and White Metallic Aesthetics
echo 🏢 Multi-Tenant SMB Cloud Architecture with RBAC & Auth
echo ================================================================
echo.
echo Installing dependencies if needed...
call npm install --prefer-offline --no-audit
echo.
echo Running Automated Test Suite...
call npm test
echo.
echo Launching Server on http://localhost:4000 ...
echo Press Ctrl+C to terminate.
echo.
start http://localhost:4000
node server/index.js
pause
