const axios = require('axios');

const test = async () => {
  try {
    // Note: I need a token. I'll try to find a way to test without token or if I can get one.
    // Actually, I'll just look for a token in the browser storage if I had a browser session.
    // But I don't.
    
    // Let's assume the error is visible in the backend logs which I can't see easily.
    // Wait! I can check the backend process if it's running.
    console.log("Testing template creation...");
  } catch (e) {
    console.error(e);
  }
};
test();
