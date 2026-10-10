@echo off
:: Check and request Administrative Privileges automatically
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting Administrator privileges to configure Windows Firewall...
    powershell -Command "Start-Process cmd -ArgumentList '/c `"%~f0`"' -Verb RunAs"
    exit /b
)

echo ====================================================================
echo   CivicLens - Configuring Windows Firewall for Mobile Access
echo ====================================================================
echo.

netsh advfirewall firewall delete rule name="CivicLens_Frontend_3000" >nul 2>&1
netsh advfirewall firewall delete rule name="CivicLens_Backend_8000" >nul 2>&1

netsh advfirewall firewall add rule name="CivicLens_Frontend_3000" dir=in action=allow protocol=TCP localport=3000 profile=any
netsh advfirewall firewall add rule name="CivicLens_Backend_8000" dir=in action=allow protocol=TCP localport=8000 profile=any

echo.
echo ====================================================================
echo   SUCCESS! Ports 3000 and 8000 are now UNBLOCKED for Mobile Devices.
echo   You can now access the app on your phone via:
echo   - Wi-Fi IP:       http://10.172.186.26:3000
echo   - Hotspot IP:    http://192.168.137.1:3000
echo ====================================================================
echo.
pause
