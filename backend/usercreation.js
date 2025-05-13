const express = require('express');
const bodyParser = require('body-parser');
const connectToDB = require('./db');
const app = express();

app.use(bodyParser.json());

app.post('/register', async (req, res) => {
    const userData = req.body;

    try {
        const db = await connectToDB();
        const collection = db.collection('users'); // collection will auto-create
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
