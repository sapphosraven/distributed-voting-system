import json
import time
import logging
import asyncio
from typing import Dict, List, Set, Any
from redis.cluster import RedisCluster

logger = logging.getLogger("node.consensus")

class ConsensusProtocol:
    """Simple consensus protocol for distributed voting system"""
    
    def __init__(self, redis_client: RedisCluster, node_id: str, is_leader: bool):
        self.redis = redis_client
        self.node_id = node_id
        self.is_leader = is_leader
        self.running = False
        logger.info(f"Consensus protocol initialized for {node_id}")
    
    async def start(self):
        """Start the consensus tasks"""
        self.running = True
        if self.is_leader:
            asyncio.create_task(self._leader_proposal_task())
        else:
            asyncio.create_task(self._follower_validation_task())
        
        logger.info(f"Consensus protocol started for node {self.node_id}")
    
    async def stop(self):
        """Stop the consensus tasks"""
        self.running = False
        logger.info(f"Consensus protocol stopped for node {self.node_id}")
    
    async def _leader_proposal_task(self):
        """Leader task for proposing votes for consensus"""
        logger.info("Starting leader proposal task")
        
        while self.running:
            try:
                # Check for pending votes
                pending_key = "{votes}.pending"
                pending_votes = self.redis.lrange(pending_key, 0, 9)  # Get up to 10 pending votes at a time
                
                for vote_data_json in pending_votes:
                    # Process each pending vote
                    try:
                        vote_data = json.loads(vote_data_json)
                        
                        # Create a proposal
                        proposal_id = f"proposal:{int(time.time() * 1000)}:{vote_data['voter_id']}"
                        proposal_key = f"{{consensus}}.{proposal_id}"
                        
                        # Store proposal
                        self.redis.hset(proposal_key, mapping={
                            "vote_data": vote_data_json,
                            "proposed_by": self.node_id,
                            "proposed_at": time.time(),
                            "status": "proposed",
                            "approvals": "1",  # Leader automatically approves
                            "rejections": "0"
                        })
                        
                        # Set expiry for proposal (1 hour)
                        self.redis.expire(proposal_key, 60*60)
                        
                        # Publish proposal for other nodes to validate
                        self.redis.publish("vote_proposal", json.dumps({
                            "sender": self.node_id,
                            "proposal_id": proposal_id,
                            "vote_data": vote_data
                        }))
                        
                        # Remove from pending list
                        self.redis.lrem(pending_key, 1, vote_data_json)
                        
                        logger.info(f"Proposed vote for consensus: {proposal_id}")
                        
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON in pending vote: {vote_data_json}")
                        self.redis.lrem(pending_key, 1, vote_data_json)  # Remove invalid entry
                    except Exception as e:
                        logger.error(f"Error processing pending vote: {e}")
                        # Keep the vote in the queue for retry
                
                # Check proposals with sufficient approvals
                for proposal_key in self.redis.scan_iter(match="{consensus}.proposal:*"):
                    proposal = self.redis.hgetall(proposal_key)
                    
                    if proposal.get("status") == "proposed":
                        approvals = int(proposal.get("approvals", "0"))
                        total_nodes = len(self.redis.scan_iter(match="{nodes}.*"))
                        
                        # If majority of nodes approved, commit the vote
                        if approvals > total_nodes / 2:
                            try:
                                vote_data = json.loads(proposal.get("vote_data", "{}"))
                                
                                # Mark proposal as committed
                                self.redis.hset(proposal_key, "status", "committed")
                                
                                # Store the vote as finalized
                                vote_id = f"{vote_data['election_id']}:{vote_data['voter_id']}"
                                vote_key = f"{{votes}}.{vote_id}"
                                
                                # Add storage timestamp for auditing
                                vote_data["stored_at"] = time.time()
                                
                                # Store the vote
                                self.redis.hset(vote_key, mapping=vote_data)
                                
                                # Add to voter set for this election to prevent duplicate votes
                                election_voters_key = f"{{election}}.{vote_data['election_id']}.voters"
                                self.redis.sadd(election_voters_key, vote_data['voter_id'])
                                
                                # Increment vote counter for the candidate
                                candidate_vote_count_key = f"{{election}}.{vote_data['election_id']}.candidate.{vote_data['candidate_id']}"
                                self.redis.incr(candidate_vote_count_key)
                                
                                logger.info(f"Consensus achieved for vote: {vote_id}")
                                
                            except Exception as e:
                                logger.error(f"Error committing vote with consensus: {e}")
                                self.redis.hset(proposal_key, "status", "error")
                
                await asyncio.sleep(0.5)  # Check every half second
                
            except Exception as e:
                logger.error(f"Error in leader proposal task: {e}")
                await asyncio.sleep(1)  # Longer delay on error
    
    async def _follower_validation_task(self):
        """Follower task for validating vote proposals"""
        logger.info("Starting follower validation task")
        
        while self.running:
            try:
                # Scan for proposals that need validation
                for proposal_key in self.redis.scan_iter(match="{consensus}.proposal:*"):
                    proposal = self.redis.hgetall(proposal_key)
                    
                    # Skip if not in proposed status or if we've already voted
                    if proposal.get("status") != "proposed":
                        continue
                        
                    validators = proposal.get("validators", "")
                    if self.node_id in validators:
                        continue
                    
                    # Validate the proposal
                    try:
                        vote_data = json.loads(proposal.get("vote_data", "{}"))
                        
                        # Simple validation: Check if voter already voted in this election
                        election_voters_key = f"{{election}}.{vote_data['election_id']}.voters"
                        already_voted = self.redis.sismember(election_voters_key, vote_data['voter_id'])
                        
                        if already_voted:
                            # Reject the proposal - duplicate vote
                            self.redis.hincrby(proposal_key, "rejections", 1)
                            logger.warning(f"Rejected proposal {proposal_key} - voter already voted")
                        else:
                            # Approve the proposal
                            self.redis.hincrby(proposal_key, "approvals", 1)
                            logger.info(f"Approved proposal {proposal_key}")
                        
                        # Record that we've voted on this proposal
                        validators = validators + f",{self.node_id}" if validators else self.node_id
                        self.redis.hset(proposal_key, "validators", validators)
                        
                    except Exception as e:
                        logger.error(f"Error validating proposal {proposal_key}: {e}")
                
                await asyncio.sleep(1)  # Check every second
                
            except Exception as e:
                logger.error(f"Error in follower validation task: {e}")
                await asyncio.sleep(3)  # Longer delay on error