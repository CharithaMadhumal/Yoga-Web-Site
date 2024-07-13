const { parse } = require('dotenv');
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 3000;
console.log(process.env.DB_USER)

//middleware

app.use(cors());
app.use(express.json());

// verify token

const verifyJWT = (req, res, next)=>{
  const authorization = req.headers.authorization;
  if(authorization){
    return res.status(401).send({message: 'Invalid authorization'})
  }

  const token = authorization?.split(' ')[1];
  jwt.verify(token, process.env.ASSESS_SECRET, (err, decoded)=> {
    if(err){
      return res.status(403).send({message: 'Forbidden access'})
    }
    req.decoded = decoded;
    next();
  })
}





// mongodb connection


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

    // users routes here

    app.post("/api/set-token", async (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ASSESS_SECRET, {
        expiresIn: '24h'
      });
      res.send({token});
    })

    // middleware for admin and instructor

    const verifyAdmin = async (req,res, next) =>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollections.findOne(query);
      if(user.role === 'admin'){
        next();
      }else{
        return res.status(401).send({message: 'Forbidden access'});
      }
    }

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollections.findOne(query);
      if(user.role === 'instructor'){
        next();
      }else{
        return res.status(401).send({message: 'Unauthorized access'});
      }
    }



    app.post('/new-user', async (req,res) => {
      const newUser = req.body;
      const result = await userCollections.insertOne(newUser);
      res.send(result);
    })

    app.get('/users', async (req,res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    })

    app.get('/users/:id', async (req,res) =>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await userCollections.findOne(query);
      res.send(result);
    });

    app.get('/user/:email', verifyJWT, async (req,res) =>{
      const email = req.params.email;
      const query = {email: email};
      const result = await userCollections.findOne(query);
      res.send(result);
    });

    app.delete('/delete-user/:id', verifyJWT,verifyAdmin, async (req,res)=> {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollections.deleteOne(query);
      res.send(result);
    });

    app.put('/update-user/:id', verifyJWT, verifyAdmin, async (req,res) =>{
      const id = req.params.id;
      const updatedUser = req.body;
      const filter = {_id: new ObjectId(id)};
      const options = {upsert: true};
      const updateDoc = {
        $set: {
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.option,
          address: updatedUser.address,
          about: updatedUser.about,
          photoUrl: updatedUser.photoUrl,
          skills: updatedUser.skills ? updatedUser.skills : null,
        }
      }
      const result = await userCollections.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // classes routes here

    app.post("/new-class", verifyJWT, verifyInstructor, async(req,res) => {
      const newClass = req.body;
      //newClass.availableSeats = parseInt(newClass.availableSeats);

      const result = await classesCollections.insertOne(newClass);
      res.send(result);
    })

    app.get("/classes", verifyJWT, async(req,res)=>{
       const query = {status: 'approved'};
       const result = await classesCollections.find().toArray();
       res.send(result);
    })

    // get classes by instructor email address

    app.get("/classes/:email", verifyJWT, verifyInstructor, async(req,res)=>{
        const email = req.params.email;
        const query = {instructorEmail: email};
        const result = await classesCollections.find(query).toArray();
        res.send(result);
    })

    // manages classes

    app.get("/classes-manage", async(req,res)=>{
      const result = await classesCollections.find().toArray();
        res.send(result);
    })

    // update classes

    app.patch("/change-status/:id", verifyJWT, verifyAdmin, async(req,res)=>{
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

    app.get('/approved-classes',  async(req,res)=>{
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


    app.put('/update-class/:id', verifyJWT, verifyInstructor, async(req,res)=>{
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

    app.post('/add-to-cart', verifyJWT,  async(req,res)=> {
      const newCartItem = req.body;
      const result = await cartCollections.insertOne(newCartItem);
      res.send(result);
    });

    // get cart item by id

    app.get('/cart-item/:id', verifyJWT, async(req,res)=> {
      const id = req.params.id;
      const email = req.body.email;
      const query = {
        classId: id,
        userMail: email,
      };

     const projection = {classId: 1};
      const result = await cartCollections.findOne(query, {projection: projection});
      res.send(result);
    });

    // cart info by user email

    app.get('/cart/:email', verifyJWT, async(req,res)=> {
      const email = req.params.email;
      const query = {userMail: email};
      const projection = {classId: 1};
      const carts = await cartCollections.find(query, {projection: projection});
      const classIds = carts.map((cart) => new ObjectID(cart.classId));
      const query2 = {_id: {$in: classIds}};
      const result = await classesCollections.find(query2).toArray();
      res.send(result);

    });

    // delete cart item

    app.delete('/delete-cart-item/:id',verifyJWT, async(req,res)=>{
      const id = req.params.id;
      const query = {classId: id};
      const result = await cartCollections.deleteOne(query);
      res.send(result);
    });

    // Payment Routes

    app.post('/create-payment-intent', async(req,res)=>{
      const {price} = req.body;
      const amount = parseInt(price) * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })

    // Post payment info to do

    app.post("/payment-info",verifyJWT, async (req,res) =>{
      const paymentInfo = req.body;
      const classId = paymentInfo.classId;
      const userEmail = paymentInfo.userEmail;
      const signleClassId = req.query.classId;
       let query;
       if(signleClassId){
        query = {classId: signleClassId, userMail: userEmail};
       }else {
        query = {classId: {$in: classId}};
       }

       const classesQuery = {_id: {$in : classesId.map( id => new ObjectId(id))}};
       const classes = await classesCollections.find(classesQuery).toArray();
       const newEnrolleData = {
        userEmail: userEmail,
        classId: signleClassId.map(id => new ObjectId(id)),
        trasnsactionId: paymentInfo.trasnsactionId
       };

       const updateDoc ={
        $set: {
          totalEnrolled: classes.reduce((total, current) => total+current.totalEnrolled, 0) +1 || 0,
          availableSeats: classes.reduce((total, current) => total + current.availableSeats, 0 ) -1 || 0
        }
       };

       const updateResult = await classesCollections.updateMany(classesQuery, updateDoc, {upsert: true});
       const enrolledResult = await enrolledCollections.insertOne(newEnrolleData);
       const deletedResult = await cartCollections.deleteMany(query);
       const paymentResult = await paymentCollections.insertOne(paymentInfo);

       res.send({paymentResult, deletedResult, enrolledResult, updateResult})
    });

    // get payment history

    app.get("/payment-history/email", async (req, res) =>{
      const email = req.params.email;
      const query = {userEmail: email};
      const result  = await paymentCollections.find(query).sort({date: -1}).toArray();
      res.send(result);
    });

    // payment history length

    app.get("/payment-history-length/:email" , async (req,res)=>{
      const email = req.params.email;
      const query = {userEmail: email};
      const total = await paymentCollections.countDocuments(query);
      res.send({total});
    });

    // Enrollement Routes

    app.get("/popular_classes", async (req,res)=>{
      const result = await classesCollections.find().sort({totalEnrolled: -1}).limit(6).toArray();
      res.send(result);
    })

    app.get('/popular-instructors', async (req,res)=>{
      const pipeline = [

        {
          $group: {
            _id: "$instructorEmail",
            totalEnrolled: { $sum: "$totalEnrolled" }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "email",
            as: "instructor"
          }
        },
        {
          $project: {
            _id: 0,
            instructor: {
              $arrayElemAt: [ "$instructor", 0 ]
            },
            totalEnrolled: 1
          }
        },
        {
          $sort: {
            totalEnrolled: -1
          }
        },
        {
          $limit: 6
        }
      ];

      const result = await classesCollections.aggregate(pipeline).toArray();
      res.send(result);
    })

    // Admin status

    app.get('/admin-stats', verifyJWT, verifyAdmin, async (req,res)=> {
      const approvedCllases = ((await classesCollections.find({status: 'approved'})).toArray()).length;
      const pendingCllases = ((await classesCollections.find({status: 'pending'})).toArray()).length;
      const instructors = ((await userCollections.find({role: 'instructor'})).toArray()).length;
      const totalClasses = (await classesCollections.find().toArray()).length;
      const totalEnrolled = (await enrolledCollections.find().toArray()).length;

      const result = {
        approvedCllases,
        pendingCllases,
        instructors,
        totalClasses,
        totalEnrolled
      }
      res.send(result);
    });

    // get all instructor

    app.get('/instructor', async (req,res)=>{
      const result = await userCollections.find({role: 'instructor'}).toArray();
      res.send(result);
    });

    app.get('/enrolled-classes/:email',verifyJWT, async (req,res)=> {
      const email = req.params.email;
      const query = {userEmail: email};
      const pipeline = [
        {
          $match: query
        },
        {
          $lookup: {
            from: "classes",
            localField: "classId",
            foreignField: "_id",
            as: "class"
          }
        },
        {
          $unwind: "$classes"
        },
        {
          $lookup: {
            from: "users",
            localField: "classes.instructorEmail",
            foreignField: "email",
            as: "instructor"
          }
        },
        {
          $project: {
            _id: 0,
          
            instructor: {
              $arrayElemAt: [ "$instructor", 0 ]
            },
            classes: 1
          }
        }
      ];
      const result = await enrolledCollections.aggregate(pipeline).toArray();
      res.send(result);
    })

    // applied for instructor

    app.post('/ass-instructor', async (req,res)=> {
      const data = req.body;
      const result = await appliedCollections.insertOne(data);
      res.send(result);
    });

    app.get('/applied-instructors/:email', async (req,res)=> {
      const email = req.params.email;
      const result = await appliedCollections.findOne({email});
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