@echo off
echo ======================================
echo   Iniciando proceso de despliegue...
echo ======================================

:: Paso 1: Build del proyecto (asegúrate de estar en la carpeta del frontend)
echo ======================================
echo   Ejecutando build del proyecto... 
echo ======================================
call npm run build

:: Paso 2: Borrar carpeta html en Nginx y copiar los nuevos archivos
echo ======================================
echo   Reemplazando archivos en .\nginx\html\tickets... 
echo ======================================
rmdir /s /q .\nginx\html\tickets
xcopy /s /e /y /i .\dist .\nginx\html\tickets

:: Paso 3: Detener Nginx
echo ======================================
echo   Deteniendo Nginx... 
echo ======================================
cd /d .\nginx
nssm stop TicketsNginxApp

:: Paso 4: Iniciar Nginx
echo ======================================
echo   Iniciando Nginx... 
echo ======================================
nssm start TicketsNginxApp

echo ======================================
echo  Despliegue completado correctamente
echo ======================================
pause
