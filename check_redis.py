import redis
from redis.cluster import RedisCluster, ClusterNode

def check_elections_in_redis():
    try:
        # Use ClusterNode objects, not dicts
        r = RedisCluster(startup_nodes=[
            ClusterNode(host="localhost", port=7000),
            ClusterNode(host="localhost", port=7001),
            ClusterNode(host="localhost", port=7002)
        ], decode_responses=True)
        
        # Check for election keys
        print("--- ELECTION DATA IN REDIS ---")
        election_set = r.smembers("{elections}.all")
        print(f"Elections set contains: {election_set}")
        
        # Check individual elections
        for eid in election_set:
            election_data = r.get(f"{{elections}}.{eid}")
            print(f"\nElection {eid}:")
            print(election_data)
            
    except Exception as e:
        print(f"Error connecting to Redis: {str(e)}")
        
if __name__ == "__main__":
    check_elections_in_redis()
