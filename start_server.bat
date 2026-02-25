@echo off
echo ==========================================
echo   HOPS - HOMESI Operating System Launcher
echo ==========================================
echo.

:: Add Node.js to PATH temporarily for this session
set "PATH=%PATH%;C:\Program Files\nodejs"

echo [1/2] Verificando dependencias...
if not exist "node_modules" (
    echo     Instalando librerias... esto puede tardar unos minutos.
    call npm install
) else (
    echo     Dependencias ya instaladas.
)

echo.
echo [2/2] Iniciando servidor de desarrollo...
echo.
echo     Cuando veas "Ready in...", abre http://localhost:3000 en tu navegador.
echo     Para detenerlo, presiona CTRL + C.
echo.

call npm run dev
pause
