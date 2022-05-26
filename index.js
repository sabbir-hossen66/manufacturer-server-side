const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId, ObjectID } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uxqvb.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//-----jwt
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            console.log(err);
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

//-----end jwt----



async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('manufacture_dwell').collection('services')
        const myReviewCollection = client.db('manufacture_dwell').collection('myReviews')
        const userCollection = client.db('manufacture_dwell').collection('users')
        const orderCollection = client.db('manufacture_dwell').collection('orders')
        const profileCollection = client.db('manufacture_dwell').collection('profiles')


        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        //--- users-start----
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;

            const user = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updatedDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
        })

        //for admin---
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                const filter = { email: email }
                const updatedDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updatedDoc);
                res.send(result);
            }

            else {
                res.status(403).send({ message: 'forbidden' })
            }

        })


        // showing detail
        app.get('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await serviceCollection.findOne(query);
            res.send(result);
        });


        // post / add parts
        app.post('/service', async (req, res) => {
            const newService = req.body;
            const result = await serviceCollection.insertOne(newService);
            res.send(result);
        });

        // ---quantity related---

        app.put("/service/:id", async (req, res) => {
            const id = req.params.id;
            const updatedService = req.body;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    availableQuantity: updatedService.availableQuantity,
                },
            };
            const result = await serviceCollection.updateOne(
                query,
                updatedDoc,
                options
            );
            res.send(result);
        });

        //----order----
        app.post("/orders", async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        app.get("/orders", async (req, res) => {
            const query = {}
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });

        //---payment
        app.get('/order/:id', verifyJWT, async, (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) };
            const order = await orderCollection.findOne(query)
            res.send(order)
        })


        app.get("/order/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });

        //----profile 

        app.put('/updateProfile/:email', async (req, res) => {
            const profileData = req.body;
            const email = req.params.email;
            const filter = { email: email }
            const options = { upsert: true }
            const updatedDoc = {
                $set: profileData

            }
            const updatedUserProfile = await profileCollection.updateOne(filter, updatedDoc, options)
            res.send(updatedUserProfile)


        })

        //profile post method

        app.post('/updateProfile', async (req, res) => {
            const profile = req.body;
            const result = await profileCollection.insertOne(profile)
            res.send(result)
        })


        //---order delete
        app.delete("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

        //add review dashboard post user review
        app.post('/myReview', async (req, res) => {
            const review = req.body;
            const result = await myReviewCollection.insertOne(review);
            res.send(result);
        })

        //add review dashboard get all review
        app.get('/myReview', async (req, res) => {
            const reviews = await myReviewCollection.find().toArray()
            res.send(reviews)
        })

    }
    finally {

    }

}

run().catch(console.dir)




app.get('/', (req, res) => {
    res.send('Hello From Manufacture Dwell')
})

app.listen(port, () => {
    console.log(`Manufacture Dwell company's App listing on port ${port}`);
})