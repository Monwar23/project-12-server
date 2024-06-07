const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.as3doaz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const usersCollection = client.db('LovingPets').collection('users')
    const categoryCollection = client.db('LovingPets').collection('PetCategory')
    const petCollection = client.db('LovingPets').collection('Pets')
    const campaignsCollection = client.db('LovingPets').collection('CampaignsPet')
    const paymentCollection = client.db('LovingPets').collection('Payments')
    const adoptCollection = client.db('LovingPets').collection('Adoption')

    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      console.log('hello')
      const user = req.user
      const query = { email: user?.email }
      const result = await usersCollection.findOne(query)
      console.log(result?.role)
      if (!result || result?.role !== 'admin')
        return res.status(401).send({ message: 'unauthorized access!!' })

      next()
    }

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })

    //   category get

    app.get('/petCategory', async (req, res) => {
      const result = await categoryCollection.find().toArray()
      res.send(result)
    })

    //  petListing


    app.get('/pets', async (req, res) => {
      const { name, category, status } = req.query;
      const query = { pet_status: status || 'not adopted' };
      if (name) {
        query.pet_name = { $regex: name, $options: 'i' };
      }
      if (category) {
        query.$or = [
          { 'pet_category.value': category },
          { pet_category: category }
        ];
      }
      const result = await petCollection.find(query).sort({ timestamp: -1 }).toArray();
      res.send(result);
    });

    app.get('/pets/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petCollection.findOne(query);
      res.send(result);
    })

    // all campaigns
    app.get('/campaignsPets', verifyToken, verifyAdmin, async (req, res) => {
      const result = await campaignsCollection.find().sort({ time: -1 }).toArray();
      res.send(result);
    });
    app.get('/campaignsPets/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campaignsCollection.findOne(query);
      res.send(result);
    })

    app.delete('/campaignsPets/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campaignsCollection.deleteOne(query);
      res.send(result);
    })

    // campaigns

    app.get('/campaignsPet', async (req, res) => {
      const query = { status: 'unpaused' };
      const result = await campaignsCollection.find(query).sort({ time: -1 }).toArray();
      res.send(result);
    });


    app.get('/campaignsPet/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campaignsCollection.findOne(query);
      res.send(result);
    })

    app.post('/campaignsPet', verifyToken, async (req, res) => {
      const item = req.body;
      const result = await campaignsCollection.insertOne(item);
      res.send(result);
    });

    app.get("/campaignsPet/email/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const result = await campaignsCollection.find(query).toArray();
      res.send(result);
    });

    app.patch('/campaignsPet/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: { status }
      };
      const result = await campaignsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.put('/campaignsPet/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatePets = req.body;
      const pets = {
        $set: {
          pet_image_url: updatePets.pet_image_url,
          pet_name: updatePets.pet_name,
          maximum_donation_amount: updatePets.maximum_donation_amount,
          last_date_of_donation: updatePets.last_date_of_donation,
          short_description: updatePets.short_description,
          long_description: updatePets.long_description,
          status: updatePets.status,
          email: updatePets.email,
        },
      };
      const result = await campaignsCollection.updateOne(filter, pets, options);
      res.send(result);
    });

    // Adoption

    app.post('/adopt', verifyToken, async (req, res) => {
      const item = req.body;
      const result = await adoptCollection.insertOne(item);
      res.send(result);
    });

    app.get('/adopt', async (req, res) => {
      const result = await adoptCollection.find().toArray()
      res.send(result)
    })


    app.get('/adopt/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await adoptCollection.findOne(query);
      res.send(result);
    })

    app.get("/adopt/email/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const result = await adoptCollection.find(query).toArray();
      res.send(result);
    });
    app.patch('/adopt/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'accepted'
        }
      }
      const result = await adoptCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

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

    app.post('/payments', async (req, res) => {
      const payment = req.body;

      const paymentAmount = payment.donated_amount;
      const updateDoc = {
        $inc: { donated_amount: paymentAmount }
      }
      const paymentQuery = { _id: new ObjectId(payment.cartIds) }
      const updateAmount = await campaignsCollection.updateOne(paymentQuery, updateDoc)
      const paymentResult = await paymentCollection.insertOne(payment);
      return res.send(paymentResult);


    });

    app.get('/payments', async (req, res) => {
      const result = await paymentCollection.find().toArray()
      res.send(result)
    })


    app.get("/payments/email/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });


    // all pets

    app.get('/allPets', async (req, res) => {
      const result = await petCollection.find().toArray()
      res.send(result)
    })

    app.get('/allPets/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petCollection.findOne(query);
      res.send(result);
    })

    app.get("/allPets/email/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const result = await petCollection.find(query).toArray();
      res.send(result);
    });


    app.post('/allPets', verifyToken, async (req, res) => {
      const item = req.body;
      const result = await petCollection.insertOne(item);
      res.send(result);
    });

    app.put('/allPets/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatePets = req.body;
      const pets = {
        $set: {
          pet_name: updatePets.pet_name,
          pet_age: updatePets.pet_age,
          pet_location: updatePets.pet_location,
          pet_category: {
            value: updatePets.pet_category.value,
            label: updatePets.pet_category.label
          },
          pet_short_description: updatePets.pet_short_description,
          pet_long_description: updatePets.pet_long_description,
          pet_status: updatePets.pet_status,
          email: updatePets.email,
          pet_image_url: updatePets.pet_image_url,
        },
      };
      const result = await petCollection.updateOne(filter, pets, options);
      res.send(result);
    });

    app.patch('/allPets/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const pet = await petCollection.findOne(filter);
      const newStatus = pet.pet_status === 'adopted' ? 'not adopted' : 'adopted';

      const updatedDoc = {
        $set: {
          pet_status: newStatus
        }
      }
      const result = await petCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.delete('/allPets/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petCollection.deleteOne(query);
      res.send(result);
    })

    // user

    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const result = await usersCollection.findOne({ email })
      res.send(result)
    })


    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.patch('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })



    app.put('/user', async (req, res) => {
      const user = req.body
      const query = { email: user?.email }
      // check if user already exists in db
      const isExist = await usersCollection.findOne(query)
      if (isExist) {
        return res.send(isExist)
      }

      // save user for the first time
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('running')
})

app.listen(port, () => {
  console.log(`SavingPets is running on port ${port}`)
})