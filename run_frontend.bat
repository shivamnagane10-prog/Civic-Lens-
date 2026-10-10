@echo off
title CivicLens AI - Frontend Web (Next.js)
cd /d "%~dp0\apps\web"
echo ===================================================
echo Starting CivicLens AI Next.js Frontend on port 3000
echo ===================================================
npm run dev -- -H 0.0.0.0 -p 3000
pause
