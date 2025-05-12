require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initDb } = require("./utils/db");
const electionRoutes = require("./routes/elections");
const voteRoutes = require("./routes/vote");
const authRoutes = require("./routes/auth");
const raft = require("./utils/raft");
const statusRoutes = require("./routes/status");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/vote", voteRoutes);
app.use("/api/status", statusRoutes);

initDb()
  .then(() => {
    // Start leader election loop
    raft.tryBecomeLeader();
    app.listen(process.env.PORT, () => {
      console.log(`Backend listening on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize DB:", err);
    process.exit(1);
  });
