import json
import time
import logging
from typing import Dict, List, Optional, Set, Tuple
from redis.cluster import RedisCluster

logger = logging.getLogger("vote.storage")

class VoteStorage:
    """Handles vote storage in Redis Cluster using hash slot aware keys"""
    
    def __init__(self, redis_client: RedisCluster):
        self.redis = redis_client
        logger.info("Vote storage initialized")
        
    def store_vote(self, vote_data: Dict, election_id: str, voter_id: str) -> bool:
        """Store a vote in Redis Cluster"""
        try:
            # Generate hash slot aware keys to ensure proper distribution
            vote_id = f"{election_id}:{voter_id}"
            
            # Use a hash to store vote details - vote_id is already unique by combining election and voter IDs
            vote_key = f"{{votes}}.{vote_id}"
            
            # Add storage timestamp for auditing
            vote_data["stored_at"] = time.time()
            
            # Store the vote as a hash
            self.redis.hset(vote_key, mapping=vote_data)
            
            # Add vote to the election result set (maintains unique votes per election)
            election_votes_key = f"{{election}}.{election_id}.votes"
            self.redis.sadd(election_votes_key, vote_id)
            
            # Add to voter set for this election to prevent duplicate votes
            election_voters_key = f"{{election}}.{election_id}.voters"
            self.redis.sadd(election_voters_key, voter_id)
            
            # Increment vote counter for the candidate
            candidate_vote_count_key = f"{{election}}.{election_id}.candidate.{vote_data['candidate_id']}"
            self.redis.incr(candidate_vote_count_key)
            
            logger.info(f"Vote stored successfully: {vote_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store vote: {e}", exc_info=True)
            return False
    
    def check_voter_voted(self, election_id: str, voter_id: str) -> bool:
        """Check if a voter has already voted in an election"""
        try:
            election_voters_key = f"{{election}}.{election_id}.voters"
            return self.redis.sismember(election_voters_key, voter_id)
        except Exception as e:
            logger.error(f"Error checking if voter already voted: {e}", exc_info=True)
            return False
    
    def get_vote_counts(self, election_id: str) -> Dict[str, int]:
        """Get current vote counts for all candidates in an election"""
        try:
            # Get all candidate vote count keys for this election
            candidate_pattern = f"{{election}}.{election_id}.candidate.*"
            candidate_keys = self.redis.scan_iter(match=candidate_pattern)
            
            result = {}
            for key in candidate_keys:
                # Extract candidate ID from key
                candidate_id = key.split('.')[-1]  # Last part after the last dot
                count = int(self.redis.get(key) or 0)
                result[candidate_id] = count
                
            return result
        except Exception as e:
            logger.error(f"Error getting vote counts: {e}", exc_info=True)
            return {}
    
    def propose_vote_for_consensus(self, vote_id: str, vote_data: Dict) -> str:
        """Store a vote as a proposal pending consensus"""
        try:
            # Generate a unique proposal ID
            proposal_id = f"proposal:{int(time.time() * 1000)}:{vote_id}"
            
            # Store proposal
            proposal_key = f"{{consensus}}.{proposal_id}"
            self.redis.hset(proposal_key, mapping={
                "vote_id": vote_id,
                "vote_data": json.dumps(vote_data),
                "proposed_at": time.time(),
                "status": "pending",
                "approvals": "0",
                "rejections": "0"
            })
            
            # Set expiry in case the consensus is never reached (24 hours)
            self.redis.expire(proposal_key, 60*60*24)
            
            logger.info(f"Vote proposal created: {proposal_id}")
            return proposal_id
            
        except Exception as e:
            logger.error(f"Error creating vote proposal: {e}", exc_info=True)
            return ""