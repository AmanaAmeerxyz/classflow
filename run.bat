@echo off
title CLASSFLOW — Real-time Classroom Intelligence
echo ========================================================
echo   Launching CLASSFLOW Web Platform...
echo ========================================================

REM Try launching with Python / uv
if exist "%USERPROFILE%\.local\bin\uv.exe" (
    echo Starting local web server using uv...
    "%USERPROFILE%\.local\bin\uv.exe" run python server.py
) else (
    echo Opening index.html directly in your default browser...
    start index.html
)

pause
