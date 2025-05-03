@echo off
echo Testing Redis Cluster from inside Docker network...
echo.

echo Ensuring Redis cluster is running...
docker-compose up -d redis-node-1 redis-node-2 redis-node-3 redis-node-4 redis-node-5 redis-node-6 redis-cluster-init
echo Waiting for cluster initialization (10 seconds)...
timeout /t 10 /nobreak >nul
echo.

echo Running test script inside container...
docker-compose run --rm -e REDIS_NODES=redis-node-1:7000,redis-node-2:7001,redis-node-3:7002 voting-node-1 python test_redis_cluster.py
echo.

echo Test complete