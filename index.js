const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uxqvb.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('manufacture_dwell').collection('services')
        const myReviewCollection = client.db('manufacture_dwell').collection('myReviews')
        const userCollection = client.db('manufacture_dwell').collection('users')
        const orderCollection = client.db('manufacture_dwell').collection('orders')


        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        //---all users-start----
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updatedDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })
        // showing detail
        app.get('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await serviceCollection.findOne(query);
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
            const orders = await orderCollection.find().toArray();
            res.send(orders);
        });

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