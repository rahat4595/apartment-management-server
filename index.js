const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const paymentCollection = client.db("manageDb").collection("payments");
    const announcmentCollection = client.db("manageDb").collection("announcment");


    // Create unique index on email to ensure one agreement per user
    await apartmentCollection.createIndex({ email: 1 }, { unique: true });

    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })

    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // use verify member after verifyToken
    const verifyMember = async (req, res, next) => {
      const email = req.decoded?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isMember = user?.role === 'member';
      if (!isMember) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }




    // users related api
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // securing admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });

    })

    // securing Member
    app.get('/users/member/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let member = false;
      if (user) {
        member = user?.role === 'member';
      }
      res.send({ member });

    })



    // sending user data to server

    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists: 
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user alrady exists', insertedId: null })
      }

      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    // make admin
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    // make members

    app.patch('/users/member/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'member'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })


    // make users
    app.patch('/users/user/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: ' '
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })





    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })




    // apartment related api
    app.get('/apartment', async (req, res) => {
      const result = await apartCollection.find().toArray();
      res.send(result);
    });

    // Get agreements by email
    // Get apartments by email
    app.get('/aparts/email', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ error: 'Email query parameter is required' });
      }

      const query = { email: email };
      const result = await apartmentCollection.find(query).toArray();
      res.send(result);
    });

    // Get all apartments
    app.get('/aparts', async (req, res) => {
      const result = await apartmentCollection.find().toArray();
      res.send(result);
    });

  // Update the status of an agreement
  app.put('/aparts/:id', async (req, res) => {
    const id = req.params.id;
    const { status, acceptDate } = req.body;

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: status,
        acceptDate: acceptDate,
      },
    };

    const result = await apartmentCollection.updateOne(filter, updateDoc);
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


    // Announcement related api

    app.get('/announcment', async (req, res) => {
      const result = await announcmentCollection.find().toArray();
      res.send(result);
    });


    app.post('/announcment', verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await announcmentCollection.insertOne(item);
      res.send(result);
    });


    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


    app.get('/payments/:email', verifyToken, async(req, res) =>{
      const query = {email: req.params.email}
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' })
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async(req, res) =>{
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      // carefully delete each item from the apart
      console.log('payment info', payment);
      const query = {_id: {
        $in:payment.apartId.map(id => new ObjectId(id))
      }};
      const deleteResult = await apartmentCollection.deleteMany(query)

      res.send({paymentResult, deleteResult})
    })




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