const express = require('express');
const cors = require('cors');
const { sequelize } = require('./utils/db');
const authRoutes = require('./routes/auth');
const voteRoutes = require('./routes/vote');
const electionRoutes = require('./routes/elections');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/elections', electionRoutes);

sequelize.sync().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
});
