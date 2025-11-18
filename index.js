const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;

    // middleware
    app.use(cors());
    app.use(express.json());

    const uri = `mongodb+srv://${process.env.SECRET_KEY}:${process.env.SECRET_HASH}@cluster0.5grmxkk.mongodb.net/?appName=Cluster0`;

    const client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    app.get('/', (req, res) => {
        res.send('Smart server is running')
    })

async function run() {
    try {
        await client.connect();

        const db = client.db('PlateShare');
        const foodsCollection = db.collection('foods');
        const usersCollection = db.collection('users');
        const foodRequestsCollection = db.collection("foodRequests");


        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email }
            const existingUser = await usersCollection.findOne(query);
            
            if (existingUser) {
                res.send({message: 'user already exits. do not need to insert again'})
            }
            else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
            }
        })


        app.get("/foods", async (req, res) => {
            const { email } = req.query;
            const query = email ? { donator_email: email } : {};
            const foods = await foodsCollection.find(query).toArray();
            res.send(foods);
        });


        app.get('/featured-foods', async (req, res) => {
        const foods = await foodsCollection.find().toArray();

            foods.sort((a, b) => {
            const aNum = parseInt(a.food_quantity.match(/\d+/)[0]);
            const bNum = parseInt(b.food_quantity.match(/\d+/)[0]);
            return bNum - aNum;
        });

        res.send(foods.slice(0, 6));
        });

        app.get('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await foodsCollection.findOne(query);
            res.send(result);
        })

        app.post('/foods', async (req, res) => {
            const newFood = req.body;
            const result = await foodsCollection.insertOne(newFood);
            res.json({ success: true, insertedId: result.insertedId });
        });


        app.patch('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const updates = req.body;
            const query = { _id: new ObjectId(id) };

            const updatedFields = {};

            // Only update the fields that are actually provided
            if (updates.food_name !== undefined) updatedFields.food_name = updates.food_name;
            if (updates.food_image !== undefined) updatedFields.food_image = updates.food_image;
            if (updates.food_quantity !== undefined) updatedFields.food_quantity = updates.food_quantity;
            if (updates.pickup_location !== undefined) updatedFields.pickup_location = updates.pickup_location;
            if (updates.expire_date !== undefined) updatedFields.expire_date = updates.expire_date;
            if (updates.additional_notes !== undefined) updatedFields.additional_notes = updates.additional_notes;
            if (updates.food_status !== undefined) updatedFields.food_status = updates.food_status;

            const update = { $set: updatedFields };

            const result = await foodsCollection.updateOne(query, update);
            res.send(result);
        });


        app.delete('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await foodsCollection.deleteOne(query);
            res.send(result);
        })

        // Update request: status + action + any other fields
app.patch("/foodRequests/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const allowedUpdates = {};
        if (updateData.status !== undefined) allowedUpdates.status = updateData.status;
        if (updateData.action !== undefined) allowedUpdates.action = updateData.action;

        const result = await foodRequestsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: allowedUpdates }
        );

        res.send(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update request" });
    }
});


// Get all requests for foods donated by logged-in user
app.get("/myFoodRequests", async (req, res) => {
    const { userEmail } = req.query; // logged-in user email
    if (!userEmail) return res.status(400).json({ error: "userEmail is required" });

    try {
        const db = client.db("PlateShare");
        const foodsCollection = db.collection("foods");
        const foodRequestsCollection = db.collection("foodRequests");

        // 1. Find all foods donated by this user
        const donatedFoods = await foodsCollection
            .find({ donator_email: userEmail })
            .toArray();

        if (!donatedFoods.length) {
            return res.json([]); // No foods donated, return empty array
        }

        // 2. Get all requests for these food IDs
        const foodIds = donatedFoods.map(food => food._id.toString()); // convert ObjectId to string
        const requests = await foodRequestsCollection
            .find({ foodId: { $in: foodIds } })
            .toArray();

        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch requests for your donated foods" });
    }
});



        //Requester related apis
        // Add food request
        app.post("/foodRequests", async (req, res) => {
        try {
            const requestData = req.body;
            const result = await foodRequestsCollection.insertOne(requestData);
            res.status(201).json(result); // return inserted document info
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to add food request" });
        }
        });
        // Get all requests for a specific food
        app.get("/foodRequests", async (req, res) => {
        const { foodId } = req.query; // get foodId from query
        if (!foodId) return res.status(400).json({ error: "foodId is required" });

        try {
            const requests = await foodRequestsCollection.find({ foodId }).toArray();
            res.json(requests);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch food requests" });
        }
        });



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    }
    finally {

    }
}

run().catch(console.dir)

app.listen(port, () => {
    console.log(`Smart server is running on port: ${port}`)
})