const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://sudeepait2002:MONGOsudeepa123@isp-db.yegzvnh.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function connectToDB() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    return client.db("ispdb");
  } catch (err) {
    console.error("❌ DB connection error:", err);
  }
}

module.exports = connectToDB;
