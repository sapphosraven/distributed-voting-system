require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initDb } = require("./utils/db");
const electionRoutes = require("./routes/elections");
const voteRoutes = require("./routes/vote");
const authRoutes = require("./routes/auth");
const raft = require("./utils/raft");
const statusRoutes = require("./routes/status");
const { initReplication } = require("./utils/replication");
const { initTallyConsensus } = require("./utils/tallyConsensus");
const fs = require('fs');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/vote", voteRoutes);
app.use("/api/status", statusRoutes);

initDb()
  .then(async () => {
    // Start leader election loop
    raft.tryBecomeLeader();
    // Start replication (subscribe to vote events)
    await initReplication();
    // Start tally consensus (subscribe to tally requests)
    await initTallyConsensus();
    const PORT = process.env.PORT || 443;
    const httpsOptions = {
      key: fs.readFileSync(process.env.HTTPS_KEY_PATH),
      cert: fs.readFileSync(process.env.HTTPS_CERT_PATH)
    };
    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`HTTPS server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize DB:", err);
    process.exit(1);
  });
