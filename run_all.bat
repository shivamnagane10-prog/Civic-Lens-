@echo off
title CivicLens AI - Launcher
cd /d "%~dp0"
echo ===================================================
echo Launching CivicLens AI Backend & Frontend
echo ===================================================
start "CivicLens Backend (FastAPI)" run_backend.bat
start "CivicLens Frontend (Next.js)" run_frontend.bat
echo Both servers started in separate windows!
echo Local PC: http://localhost:3000
echo Mobile / Network: Check ipconfig (e.g. http://10.172.186.26:3000)
timeout /t 3 >nul
exit
