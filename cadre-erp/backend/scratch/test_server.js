const express = require('express');
const authRoutes = require('../src/routes/authRoutes');
const pool = require('../src/config/db'); // ensure db works

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
  console.error('Global err:', err.stack);
  res.status(500).json({ error: err.message, stack: err.stack });
});

app.listen(5001, () => {
  console.log('Test server running on 5001');
  
  // Now hit it
  const axios = require('axios');
  axios.post('http://127.0.0.1:5001/api/auth/login', {
    email: 'admin@cadre.app',
    password: 'Password123!'
  }).then(res => {
    console.log('Success:', res.data);
    process.exit(0);
  }).catch(err => {
    console.error('API Error:', err.response ? err.response.data : err.message);
    process.exit(1);
  });
});
