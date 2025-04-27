@echo off
echo ===== Docker Container Cleanup Script =====
echo.

echo Stopping all running containers...
docker stop $(docker ps -q)
echo.

echo Removing stopped containers...
docker container prune -f
echo.

echo Container status:
docker ps -a
echo.

echo ===== Cleanup complete =====
