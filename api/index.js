require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@recipebook.gt8vyyi.mongodb.net/?retryWrites=true&w=majority&appName=recipeBook`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    const recipeCollection = client.db('recipeDB').collection('recipeData');


    // POST: Add a new recipe
    app.post('/addRecipe', async (req, res) => {
        const addRecipe = {
            ...req.body,
            categories: Array.isArray(req.body.categories) ? req.body.categories : [req.body.categories].filter(Boolean),
            likes: 0,
            userId: req.body.userId,
            isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true,
        };
        const result = await recipeCollection.insertOne(addRecipe);
        res.send(result);
    });

    // GET: Get recipes
    app.get('/addRecipe', async (req, res) => {
        const limit = parseInt(req.query.limit) || 10;
        const sort = req.query.sort === '-likes' ? { likes: -1 } : {};
        const userId = req.query.userId;
        const cuisine = req.query.cuisine;
        const search = req.query.search;

        let query = {};
        if (userId) {
            query.userId = userId;
        } else if (cuisine) {
            query.cuisine = cuisine;
        } else if (search) {
            query.title = { $regex: search, $options: 'i' }; // Case-insensitive title search
        } else {
            query.isPublic = true;
        }

        const result = await recipeCollection.find(query).sort(sort).limit(limit).toArray();
        res.send(result);
    });

    // GET: Get a single recipe by ID
    app.get('/addRecipe/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await recipeCollection.findOne(query);
        if (!result) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.send(result);
    });

    // PUT: Update a recipe
    app.put('/addRecipe/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedRecipes = {
            ...req.body,
            categories: Array.isArray(req.body.categories) ? req.body.categories : [req.body.categories].filter(Boolean),
            likes: req.body.likes || 0,
        };
        const updatedDocs = { $set: updatedRecipes };
        const result = await recipeCollection.updateOne(filter, updatedDocs);
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.send(result);
    });

    // PATCH: Increment likes
    app.patch('/addRecipe/:id/like', async (req, res) => {
        const id = req.params.id;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const filter = { _id: new ObjectId(id) };
        const recipe = await recipeCollection.findOne(filter);

        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        if (recipe.userId === userId) {
            return res.status(403).json({ error: 'You cannot like your own recipe' });
        }

        const update = { $inc: { likes: 1 } };
        const result = await recipeCollection.updateOne(filter, update);

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        const updatedRecipe = await recipeCollection.findOne(filter);
        res.status(200).json({ message: 'Likes updated successfully', likes: updatedRecipe.likes });
    });

    // DELETE: Delete a recipe
    app.delete('/addRecipe/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await recipeCollection.deleteOne(query);
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.send(result);
    });
}

run();

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});