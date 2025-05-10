const express = require('express');
const cors = require('cors');
const { initDb } = require('../utils/db');
const authRoutes = require('./routes/auth');
const electionRoutes = require('./routes/elections');
const voteRoutes = require('./routes/vote');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/vote', voteRoutes);

initDb()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Backend listening on port ${process.env.PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  });
