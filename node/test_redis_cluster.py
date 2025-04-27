import os
import sys
import time
import logging
from redis.cluster import RedisCluster, ClusterNode

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("redis-cluster-test")

def test_redis_cluster():
    """Test connection to Redis Cluster"""
    # Get Redis nodes from environment variable or use default
    redis_nodes_str = os.environ.get("REDIS_NODES", "localhost:7000,localhost:7001,localhost:7002")
    logger.info(f"Testing connection to Redis Cluster nodes: {redis_nodes_str}")
    
    # Try multiple times (Docker might still be initializing)
    max_attempts = 5
    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(f"Connection attempt {attempt}/{max_attempts}...")
            
            # Parse Redis Cluster nodes
            startup_nodes = []
            for node in redis_nodes_str.split(','):
                host, port = node.split(':')
                startup_nodes.append(ClusterNode(host=host, port=int(port)))
            
            # Use longer timeouts for Windows Docker
            redis_cluster = RedisCluster(
                startup_nodes=startup_nodes,
                decode_responses=True,
                socket_timeout=10.0,
                socket_connect_timeout=10.0
            )
            
            # Test the connection
            result = redis_cluster.ping()
            logger.info(f"Ping result: {result}")
            
            # Get cluster info
            nodes = redis_cluster.cluster_nodes()
            logger.info(f"Cluster has {len(nodes)} nodes")
            
            cluster_info = redis_cluster.cluster_info()
            logger.info(f"Cluster state: {cluster_info.get('cluster_state', 'unknown')}")
            
            logger.info("Redis Cluster connection test SUCCESSFUL!")
            return True
        except Exception as e:
            logger.error(f"Connection attempt {attempt} failed: {e}")
            if attempt < max_attempts:
                delay = 3
                logger.info(f"Retrying in {delay} seconds...")
                time.sleep(delay)
    
    logger.error(f"All {max_attempts} connection attempts failed")
    return False

if __name__ == "__main__":
    success = test_redis_cluster()
    sys.exit(0 if success else 1)