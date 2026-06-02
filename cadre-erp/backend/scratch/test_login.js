require('dotenv').config({ path: '../.env' });
const { login } = require('../src/controllers/authController');

const req = {
  body: {
    email: 'admin@cadre.app',
    password: undefined
  }
};

const res = {
  status: (code) => {
    console.log('Status:', code);
    return res;
  },
  json: (data) => {
    console.log('Response:', data);
  }
};

async function test() {
  await login(req, res);
  process.exit(0);
}

test();
