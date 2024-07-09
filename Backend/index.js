const { parse } = require('dotenv');
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;
console.log(process.env.DB_USER)

//middleware

app.use(cors());
app.use(express.json())


// mongodb connection


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nb3sj25.mongodb.net/?appName=Cluster0`;

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

    // create a database and collection

    const database = client.db("Cluster0");
    const userCollections = database.collection("users");
    const classesCollections = database.collection("classes");
    const cartCollections = database.collection("cart");
    const paymentCollections = database.collection("payments");
    const enrolledCollections = database.collection("enrolled");
    const appliedCollections = database.collection("applied");

    // classes routes here

    app.post('/new-class', async(req,res) => {
      const newClass = req.body;
      //newClass.availableSeats = parseInt(newClass.availableSeats);

      const result = await classesCollections.insertOne(newClass);
      res.send(result);
    })

    app.get('/classes', async(req,res)=>{
       const query = {status: 'approved'};
       const result = await classesCollections.find().toArray();
       res.send(result);
    })

    // get classes by instructor email address

    app.get('/classes/:email', async(req,res)=>{
        const email = req.params.email;
        const query = {instructorEmail: email};
        const result = await classesCollections.find(query).toArray();
        res.send(result);
    })

    // manages classes

    app.get('/classes-manage', async(req,res)=>{
      const result = await classesCollections.find().toArray();
        res.send(result);
    })

    // update classes

    app.patch('/change-status/:id', async(req,res)=>{
       const id = req.params.id;
       const status = req.body.status;
       const reason = req.body.reason;
       const filter = {_id: new ObjectID(id)};
       const options = {upsert: true};
       const updateDoc ={
        $set: {
          status: status,
          reason: reason,
        },
       };

       const result = await classesCollections.updateOne(filter, updateDoc, options);
       res.send(result);


    })

    app.get('/approved-classes', async(req,res)=>{
        const query = {status: 'approved'};
        const result = await classesCollections.find(query).toArray();
        res.send(result);
    })

    // get single class details

    app.get('/class/:id', async(req,res)=> {
      const id = req.params.id;
      const query = {_id: new ObjectID(id)};
      const result = await classesCollections.findOne(query);
      res.send(result);
    })

    // update class details(all data)


    app.put('/update-class/:id', async(req,res)=>{
      const id = req.params.id;
      const updateClass = req.body;
      const filter = {_id: new ObjectID(id)};
      const options = {upsert: true};
      const updateDoc = {
        $set: {
          name: updateClass.name,
          description: updateClass.description,
          price: updateClass.price,
          availableSeats: parseInt(updateClass.availableSeats),
          videoLink: updateClass.videoLink,
          status: 'pending',
        }
      };
      const result = await classesCollections.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // Cart Routes

    app.post('/add-to-cart', async(req,res)=> {
      const newCartItem = req.body;
      const result = await cartCollections.insertOne(newCartItem);
      res.send(result);
    });

    // get cart item by id

    app.get('/cart-item/:id', async(req,res)=> {
      const id = req.params.id;
      const email = req.body.email;
      const query = {
        classId: id,
        userMail: email,
      };

     const projection = {classId: 1};
      const result = await cartCollections.findOne(query, {projection: projection});
      res.send(result);
    })

    


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch(err) {
    // Ensures that the client will close when you finish/error
    console.error(err);
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.listen(port, () =>{
    console.log('Example app listening on port 3000!')
})