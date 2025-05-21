# Distributed Voting System

A secure, fault-tolerant distributed voting platform built with Node.js, React, and Redis, implementing parallel and distributed computing principles.

## Overview

This distributed voting system demonstrates advanced distributed computing concepts including:

- **Raft-inspired Leader Election**: Ensures a single leader node processes votes at any time
- **Consensus Protocol**: Lightweight consensus mechanism where nodes independently tally votes
- **Distributed Mutex**: Redis-based locks prevent race conditions during concurrent operations
- **Vote Replication**: Redis pub/sub ensures reliable real-time vote replication across nodes
- **Time Synchronization**: Consistent timestamps for election timing and vote validation
- **Multi-Factor Authentication**: JWT-based auth with rate limiting for security

## System Architecture

### Backend (Node.js/Express)

- **Distributed Consensus**: Leader-based voting with Redis TTL mechanism
- **Data Storage**: PostgreSQL database with Sequelize ORM
- **Replication**: Vote data synchronization across nodes using Redis pub/sub
- **Security**: JWT authentication, RSA encryption for vote data
- **API**: RESTful endpoints for elections, voting, and results

### Frontend (React)

- Modern, responsive user interface
- Real-time election status updates
- Secure authentication flow
- Results visualization

### Infrastructure

- Docker containerization for consistent deployment
- Redis for distributed state management and pub/sub
- Multiple backend nodes for fault tolerance
- PostgreSQL for persistent storage

## Key Files and Components

- **Raft Implementation**: Leader election and consensus mechanism
- **Distributed Locking**: Atomicity for concurrent operations
- **Vote Replication**: Real-time data synchronization
- **Tally Consensus**: Agreement on election results across nodes
- **Time Synchronization**: Consistent timing across the system

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ and npm
- Redis server (for local development)

### Installation and Setup

1. Clone the repository

   ```
   git clone https://github.com/yourusername/distributed-voting-system.git
   cd distributed-voting-system
   ```

2. Install dependencies

   Install npm packages in the root, frontend, and backend directories:

   ```
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install
   cd ..

   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. Generate RSA keys for encryption (if not already present)

   ```
   mkdir -p secrets
   ssh-keygen -t rsa -b 4096 -m PEM -f secrets/private.pem
   openssl rsa -in secrets/private.pem -pubout -outform PEM -out secrets/public.pem
   ```

4. Create environment files for backend

   Create a `.env` file in the `backend` directory with the following content:

   ```
   # JWT Authentication
   JWT_SECRET=your_secure_jwt_secret_here

   # PostgreSQL Configuration
   POSTGRES_DB=voting_db
   POSTGRES_USER=user
   POSTGRES_PASSWORD=password
   POSTGRES_HOST=postgres

   # Redis Configuration
   REDIS_HOST=redis
   REDIS_PORT=6379

   # RSA Key Paths
   RSA_PRIVATE_KEY_PATH=/secrets/private.pem
   RSA_PUBLIC_KEY_PATH=/secrets/public.pem

   # For HTTPS (Optional - only for production)
   # HTTPS_KEY_PATH=/secrets/ssl.key
   # HTTPS_CERT_PATH=/secrets/ssl.crt

   # Email OTP Configuration
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com   # For development/testing (Remove in production)
   OTP_DISABLED=true
   ```

5. Generate a secure JWT secret

   ````powershell
   openssl rand -base64 64
   ```   Copy the output and use it as your JWT_SECRET in the `.env` file.

   ````

6. Generate SSL certificates (optional, for HTTPS in production)

   ```powershell
   mkdir -p secrets   openssl req -x509 -newkey rsa:4096 -keyout secrets/ssl.key -out secrets/ssl.crt -days 365 -nodes -subj "/CN=localhost"
   ```

7. For production deployment, update frontend API configuration

   In `frontend/src/utils/api.js`, update the production URL:

   ```javascript
   const BASE_URL =
     process.env.NODE_ENV === "production"
       ? "https://your-production-domain/api"
       : "/api";
   ```

8. Start the entire system (backend containers and frontend)

   ```
   npm start
   ```

   Or start components individually:

   - For backend: `npm run backend`
   - For frontend: `npm run frontend`
   - For local development: `npm run local`

### Development Mode

For local development without Docker:

```
npm run backend-local
npm run frontend
```

## API Endpoints

- **Authentication**: `POST /api/auth/login`
- **Elections**:
  - Create: `POST /api/elections`
  - List: `GET /api/elections`
  - Details: `GET /api/elections/:id`
- **Voting**: `POST /api/vote`
- **Results**: `GET /api/elections/:id/results`
- **System Status**: `GET /api/status`

## Deployment Notes

- Multiple backend nodes can be added by extending the docker-compose.yml
- For production deployment, configure proper TLS termination
- Redis persistence should be enabled in production environments
- Consider implementing a proper load balancer for production deployments

## License

This project is licensed under the MIT License - see the LICENSE file for details.
