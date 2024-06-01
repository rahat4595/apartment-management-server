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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const apartCollection = client.db("manageDb").collection("apartment");
    const apartmentCollection = client.db("manageDb").collection("aparts");
    // const cartCollection = client.db("manageDb").collection("carts");

    // apartment related api
    app.get('/apartment', async(req, res) =>{
        const result = await apartCollection.find().toArray();
        res.send(result)
    })

    // carts collection
    // app.post('/carts', async (req, res) => {
    //   const cartItem = req.body;
    //   const result = await cartCollection.insertOne(cartItem);
    //   res.send(result);
    // });

    
    app.get('/aparts', async(req, res) =>{
      const email = req.query.email;
      const query = {email: email};
      const result = await apartmentCollection.find(query).toArray();
      res.send(result)
  })

    app.post('/aparts', async (req, res) => {
      const cartItem = req.body;
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
    res.send('management is running')
})

app.listen(port, () => {
    console.log(`management is running on ${port}`)
})