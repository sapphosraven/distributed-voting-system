@echo off
echo ===== Distributed Voting System Setup =====
echo.

echo Step 1: Creating log directories...
mkdir logs 2>nul
mkdir logs\node1 2>nul
mkdir logs\node2 2>nul
mkdir logs\node3 2>nul
echo Log directories created.
echo.

echo Step 2: Stopping any existing containers...
docker-compose down -v 2>nul
echo.

echo Step 3: Building Docker images...
docker-compose build --no-cache
echo.

echo Step 4: Starting the Redis cluster...
docker-compose up -d redis-node-1 redis-node-2 redis-node-3 redis-node-4 redis-node-5 redis-node-6 redis-cluster-init
echo.

echo Waiting for cluster initialization (15 seconds)...
timeout /t 15 /nobreak >nul
echo.

echo Step 5: Testing Redis Cluster connection...
docker-compose run --rm -e REDIS_NODES=redis-node-1:7000,redis-node-2:7001,redis-node-3:7002 voting-node-1 python test_redis_cluster.py
echo.

echo Step 6: Starting the voting nodes...
docker-compose up -d voting-node-1 voting-node-2 voting-node-3
echo.

echo ===== Setup complete! =====
echo.
echo The system should now be running at:
echo - Node 1: http://localhost:5001/health
echo - Node 2: http://localhost:5002/health
echo - Node 3: http://localhost:5003/health
echo.
echo To view logs:  docker-compose logs -f
echo To stop all:   docker-compose down
echo.
