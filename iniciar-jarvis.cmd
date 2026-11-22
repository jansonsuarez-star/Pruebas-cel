@echo off
rem Lanzador para Windows: doble clic aqui, o desde una terminal con las mismas
rem opciones que iniciar-jarvis.mjs (por ejemplo: iniciar-jarvis.cmd --pruebas).
node "%~dp0iniciar-jarvis.mjs" %*
if errorlevel 1 pause
