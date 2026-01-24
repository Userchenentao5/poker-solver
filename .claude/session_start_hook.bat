@echo off
chcp 65001 >NUL
cd /d "%~dp0.."
"C:\Users\30952\AppData\Local\Programs\Python\Python310\python.exe" .claude\session_start_hook.py
