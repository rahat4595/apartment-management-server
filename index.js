const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ev60phs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("manageDb").collection("users");
    const apartCollection = client.db("manageDb").collection("apartment");
    const apartmentCollection = client.db("manageDb").collection("aparts");


    // Create unique index on email to ensure one agreement per user
    await apartmentCollection.createIndex({ email: 1 }, { unique: true });



    // users related api
    app.post('/users', async(req, res) =>{
      const user = req.body;
       // insert email if user doesnt exists: 
      const query = {email: user.email};
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: 'user alrady exists', insertedId: null})
      }
       
      const result = await userCollection.insertOne(user);
      res.send(result)
    })




    // apartment related api
    app.get('/apartment', async (req, res) => {
        const result = await apartCollection.find().toArray();
        res.send(result);
    });

    // Get agreements by email
    app.get('/aparts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await apartmentCollection.find(query).toArray();
      res.send(result);
    });

    // Add new agreement
    app.post('/aparts', async (req, res) => {
      const cartItem = req.body;
      const query = { email: cartItem.email };

      // Check if the user already has an agreement
      const existingAgreement = await apartmentCollection.findOne(query);
      if (existingAgreement) {
        return res.status(400).send({ message: 'User already has an agreement' });
      }

      const result = await apartmentCollection.insertOne(cartItem);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('management is running');
});

app.listen(port, () => {
    console.log(`management is running on ${port}`);
});
