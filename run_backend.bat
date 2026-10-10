@echo off
title CivicLens AI - Backend Server (FastAPI)
cd /d "%~dp0\apps\api"
echo ===================================================
echo Starting CivicLens AI FastAPI Backend on port 8000
echo ===================================================
.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
pause
