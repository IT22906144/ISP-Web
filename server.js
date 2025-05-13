const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const connectToDB = require('./backend/db');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/register', async (req, res) => {
  const userData = req.body;

  try {
    const db = await connectToDB();
    const collection = db.collection('users');
    const result = await collection.insertOne(userData);
    res.status(201).send({ message: 'User registered successfully', id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Registration failed' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
