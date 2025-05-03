import requests
import time
import redis
import json
import os
from logger_config import setup_logger
from clock_sync import MAX_DRIFT

# Setup logger
logger = setup_logger("test_setup", log_dir="../logs")

def test_node_health(node_id, port):
    """Test if a node is healthy by calling its health endpoint"""
    logger.info(f"Testing health of node {node_id} at port {port}")
    
    try:
        response = requests.get(f"http://localhost:{port}/health", timeout=5)
        logger.info(f"Node {node_id} health status: {response.status_code}")
        
        if response.status_code == 200:
            health_data = response.json()
            logger.info(json.dumps(health_data, indent=2))
            
            # Log any issues detected
            if health_data.get("status") != "healthy":
                logger.warning(f"Node {node_id} reports unhealthy status")
                
            return health_data
        else:
            logger.error(f"Node {node_id} returned non-200 status: {response.status_code}")
            return None
            
    except requests.exceptions.Timeout:
        logger.error(f"Timeout connecting to node {node_id}")
        return None
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error to node {node_id} - service may not be running")
        return None
    except Exception as e:
        logger.error(f"Error checking node {node_id}: {e}", exc_info=True)
        return None

def test_redis_connection():
    """Test if Redis is accessible and working"""
    logger.info("Testing Redis connection")
    
    try:
        r = redis.Redis(host="localhost", port=6379, decode_responses=True)
        ping_result = r.ping()
        logger.info(f"Redis ping result: {ping_result}")
        
        # List all nodes registered in Redis
        nodes = []
        for key in r.scan_iter("nodes:*"):
            node_data = r.hgetall(key)
            nodes.append(node_data)
            
        logger.info(f"Found {len(nodes)} registered nodes in Redis")
        for node in nodes:
            logger.info(f"Node data: {json.dumps(node, indent=2)}")
            
        return True
    except redis.exceptions.ConnectionError:
        logger.error("Redis connection error - service may not be running")
        return False
    except Exception as e:
        logger.error(f"Error connecting to Redis: {e}", exc_info=True)
        return False

def main():
    logger.info("Starting distributed voting system setup test")
    
    # Test Redis connection
    redis_ok = test_redis_connection()
    
    if redis_ok:
        logger.info("Redis test successful, proceeding to test nodes")
        
        # Test each node
        nodes_status = []
        nodes_status.append(test_node_health("node1", 5001))
        nodes_status.append(test_node_health("node2", 5002))
        nodes_status.append(test_node_health("node3", 5003))
        
        # Summary
        healthy_nodes = sum(1 for status in nodes_status if status and status.get("status") == "healthy")
        logger.info(f"Test complete: {healthy_nodes}/3 nodes are healthy")
        
        if healthy_nodes < 3:
            logger.warning("Some nodes are not healthy, check the logs for details")
        else:
            logger.info("All nodes are healthy! System is ready for testing.")
    else:
        logger.error("Redis test failed, skipping node tests")
        
if __name__ == "__main__":
    main()