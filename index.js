/* ALL NECESSARY IMPORTS ---------------------------------------------------------------------------------------------*/

const express = require('express');                          //Default from Express.js
const cors = require('cors');                      //From CORS Middleware, but positioned here for better reliability and instructed in the document.
const app = express();                                             //Default from Express.js

require('dotenv').config();                                                    //Default from dotenv package.
// console.log(process.env);                                                   //Remove this after you've confirmed it is working.

const port = process.env.PORT || 3000;                            //Default from Express.js but .env applied, therefore positioned after dotenv import.
// console.log(port);

const jwt = require('jsonwebtoken');                                       //Default from JSON Web Token.

const cookieParser = require('cookie-parser');      //Default from cookie-parser package.





/* ALL NECESSARY MIDDLEWARES -----------------------------------------------------------------------------------------*/

/* It enables Cross-Origin Resource Sharing (CORS), allowing your server to handle requests from different allowed origins or domains securely.
Credentials: true allows sending and receiving credentials (like cookies or authorization headers) with cross-origin requests.
Methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] specifies which HTTP methods are allowed for cross-origin requests. */
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://xtask-management-application.netlify.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))

/* It helps to parse incoming JSON payloads from the client (e.g., a POST or PUT request with a JSON body) into a JavaScript object, accessible via req.body. */
app.use(express.json());

/* Parses incoming requests with URL-encoded payloads, typically used when data is sent from HTML forms.
Setting extended: true enables parsing of nested objects, allowing for more complex form data structures. */
app.use(express.urlencoded({extended: true}))

/* It allows the server to parse and handle cookies sent by the client in HTTP requests.
After using cookieParser(), you can access cookies through req.cookies (for normal cookies) and req.signedCookies (for signed cookies) in your routes. */
app.use(cookieParser());





// Custom middleware for JWT verification.
const verifyJWT = (req, res, next) => {
    const email = req?.body?.email;
    const token = req?.cookies?.token;
    // console.log({email, token});

    // If there is no JWT
    if (!token) {
        return res.send({status: 401, message: "No token provided, authorization denied!"});
    }

    // Verify the JWT
    jwt.verify(token, process.env.ACCESS_JWT_SECRET, (error, decoded) => {
        if (error) {
            return res.send({status: 402, message: "Invalid or expired token!"});
        }
        req.decoded_email = decoded?.data;
        next(); // Call the next middleware.
    });
};





/* MONGODB CONNECTIONS AND APIS --------------------------------------------------------------------------------------*/

const {MongoClient, ServerApiVersion, ObjectId} = require('mongodb');

/* The URI points to a specific MongoDB cluster and includes options for retrying writes and setting the write concern. */
const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.ktxyk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`; //From MongoDB Connection String

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

console.log('Current selected Domain: ', process.env.NODE_ENVIRONMENT === 'production' ? 'xtask-management-application.netlify.app' : 'localhost');

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
        const database = client.db("xTaskManagementApplicationSystemDB");





        /*====================================== AUTH RELATED APIs ===================================================*/

        app.post('/generate_jwt_and_get_token', async (req, res) => {
            const {email} = req.body;

            //Generating JSON Web Token.
            const token = jwt.sign({data: email}, process.env.ACCESS_JWT_SECRET, {expiresIn: '1h'});
            // console.log(token)

            //Setting JWT, at the client side, in the HTTP only cookie.
            res.cookie('token', token, {
                httpOnly: true,                                                                                                             //Cookies access restricted from client side.
                secure: process.env.NODE_ENVIRONMENT === 'production',                                                                      //Set false while in dev environment, and true while in production.
                sameSite: process.env.NODE_ENVIRONMENT === 'production' ? 'none' : 'Lax',                                                   //Protection from CSRF. None or lax supports most cross-origin use cases.
                maxAge: 3600000,                                                                                                            //Token validity in millisecond. Setting this to cookies.
            }).status(201).send({token, success: true, message: "Login Successful, JWT stored in Cookie!"});
        })


        app.post('/logout_and_clear_jwt', (req, res) => {
            // Clearing the HTTP-only cookie by setting maxAge to 0.
            res.clearCookie('token', {
                httpOnly: true,                                                                                                             //Cookies access restricted from client side.
                secure: process.env.NODE_ENVIRONMENT === 'production',                                                                      //Set false while in dev environment, and true while in production.
                sameSite: process.env.NODE_ENVIRONMENT === 'production' ? 'none' : 'Lax',                                                   //Protection from CSRF. None or lax supports most cross-origin use cases.
                maxAge: 0,                                                                                                                  //Token validity in millisecond. Setting this to cookies.
            }).status(200).send({success: true, message: "Logout successful, cookie cleared!"});
        });





        /*====================================== USERS COLLECTION ====================================================*/

        /* CREATING (IF NOT PRESENT) / CONNECTING THE COLLECTION NAMED "userCollection" AND ACCESS IT */
        const userCollection = database.collection("userCollection");


        /* VERIFY JWT MIDDLEWARE WILL NOT WORK HERE, USER MAY UNAVAILABLE */
        app.post('/users/add_new_user', async (req, res) => {
            try {
                const {newUser} = req.body;
                const result = await userCollection.insertOne(newUser);
                if (result){
                    res.send({status: 201, message: "User created successfully."});
                }
            } catch (error) {
                res.send({status: 500, message: "Internal Server Error"});
            }
        });


        /* VERIFY JWT MIDDLEWARE WILL NOT WORK HERE, USER MAY UNAVAILABLE */
        app.post('/users/find_availability_by_email', async (req, res) => {
            const { email } = req.body;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            if (result) {
                res.send({ status: 409, exists: true, message: 'Registration failed. Email already exists!' });
            } else {
                res.send({ status: 404, exists: false, message: 'Email address not exists!' });
            }
        });


        /* VERIFY JWT MIDDLEWARE WILL NOT WORK HERE, USER MAY UNAVAILABLE */
        app.post('/users/get_user_by_email', async (req, res) => {
            const { email } = req.body;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            // res.status(200).send(result);
            res.send({status: 200, data: result, message: 'Login successful!'});
        })





        /*====================================== CATEGORIES COLLECTION ===============================================*/

        /* CREATING (IF NOT PRESENT) / CONNECTING THE COLLECTION NAMED "categoriesCollection" AND ACCESS IT */
        const categoriesCollection = database.collection("categoriesCollection");


        app.get('/categories/get_all_categories', async (req, res) => {
            const result = await categoriesCollection.find().toArray();
            return res.send({status: 200, data: result});
        })





        /*====================================== TASKS COLLECTION ====================================================*/

        /* CREATING (IF NOT PRESENT) / CONNECTING THE COLLECTION NAMED "tasksCollection" AND ACCESS IT */
        const tasksCollection = database.collection("tasksCollection");


        app.post('/tasks/create_new_task', verifyJWT, async (req, res) => {
            const {userEmail, newTaskObj} = req.body;
            // console.log(userEmail, newTaskObj);

            // Verifying user authenticity.
            const {decoded_email} = req;
            // console.log(email, decoded_email);
            if (userEmail !== decoded_email) {
                return res.send({status: 403, message: "Forbidden access, email mismatch!"});
            }

            // Inserting the task into the collection.
            const result = await tasksCollection.insertOne(newTaskObj);

            //Saving the task id in the user data.
            const taskId = result?.insertedId.toString();
            const userFilter = {email: userEmail};

            let userUpdate = null;
            if (newTaskObj?.category === 'To Do') userUpdate = {$push: {"myTasks.myToDoTasks": taskId}};
            else if (newTaskObj?.category === 'In Progress') userUpdate = {$push: {"myTasks.myInProgressTasks": taskId}};
            else if (newTaskObj?.category === 'Done') userUpdate = {$push: {"myTasks.myDoneTasks": taskId}};

            const options = {upsert: false, returnDocument: 'after'};
            const userResult = await userCollection.findOneAndUpdate(userFilter, userUpdate, options);

            return res.send({status: 201, message: "Task created successfully"});
        });


        app.get('/tasks/all_my_task_ids', verifyJWT, async (req, res) => {
            const userEmail = req?.query?.userEmail;
            // console.log(userEmail);

            // Verifying user authenticity.
            const {decoded_email} = req;
            // console.log(email, decoded_email);
            if (userEmail !== decoded_email) {
                return res.send({status: 403, message: "Forbidden access, email mismatch!"});
            }

            // Fetch the user by email.
            const userQuery = {email: userEmail};
            const userResult = await userCollection.findOne(userQuery);

            // If user don't exists.
            if (!userResult) {
                // return res.status(404).send({ message: 'User not found' });
                return res.send({status: 404, message: 'User not found'});
            }

            // Fetch all my tasks.
            /*const myTasksArray = {
                myToDoTasks: await tasksCollection.find({_id: {$in: userResult.myTasks.myToDoTasks.map(id => new ObjectId(id))}}).toArray(),
                myInProgressTasks: await tasksCollection.find({_id: {$in: userResult.myTasks.myInProgressTasks.map(id => new ObjectId(id))}}).toArray(),
                myDoneTasks: await tasksCollection.find({_id: {$in: userResult.myTasks.myDoneTasks.map(id => new ObjectId(id))}}).toArray()
            };*/
            const myTasksIdsArray = {
                myToDoTasks: await userResult.myTasks.myToDoTasks,
                myInProgressTasks: await userResult.myTasks.myInProgressTasks,
                myDoneTasks: await userResult.myTasks.myDoneTasks
            };
            // console.log(myTasksArray);
            return res.send({status: 200, data: myTasksIdsArray});
        })


        /*app.get('/tasks/array_of_tasks_by_array_of_ids', verifyJWT, async (req, res) => {
            const {userEmail, arrayOfIds} = req?.query;
            // console.log(userEmail, arrayOfIds);

            // Verifying user authenticity.
            const {decoded_email} = req;
            // console.log(email, decoded_email);
            if (userEmail !== decoded_email) {
                return res.send({status: 403, message: "Forbidden access, email mismatch!"});
            }

            // Fetch the user by email.
            const userQuery = {email: userEmail};
            const userResult = await userCollection.findOne(userQuery);

            // If user don't exists.
            if (!userResult) {
                // return res.status(404).send({ message: 'User not found' });
                return res.send({status: 404, message: 'User not found'});
            }

            // Handle arrayOfIds validation and conversion
            if (!arrayOfIds || !Array.isArray(arrayOfIds) || arrayOfIds.length === 0) {
                return res.send({ status: 400, message: 'Invalid or empty arrayOfIds' });
            }

            // Fetch all my tasks.
            const tasksArrayQuery = { _id: { $in: arrayOfIds.map(id => new ObjectId(id)) } };
            const tasksArray = await tasksCollection.find(tasksArrayQuery).toArray();
            // console.log(myTasksArray);
            return res.send({status: 200, data: tasksArray});
        })*/


        app.get('/tasks/tasks_details_by_id', verifyJWT, async (req, res) => {
            const {userEmail, taskId} = req?.query;
            // console.log(userEmail, taskId);

            // Verifying user authenticity.
            const {decoded_email} = req;
            // console.log(email, decoded_email);
            if (userEmail !== decoded_email) {
                return res.send({status: 403, message: "Forbidden access, email mismatch!"});
            }


            // Fetch task details.
            const taskQuery = { _id: new ObjectId(taskId) };
            const taskResult = await tasksCollection.findOne(taskQuery);
            return res.send({status: 200, data: taskResult});
        })


        app.patch('/tasks/update_a_task', verifyJWT, async (req, res) => {
            const { userEmail, updatedTaskObj } = req.body;
            // console.log(updatedTaskObj);

            // Verifying user authenticity.
            const {decoded_email} = req;
            // console.log(email, decoded_email);
            if (userEmail !== decoded_email) {
                return res.send({status: 403, message: "Forbidden access, email mismatch!"});
            }

            // Extract the necessary fields for the update
            const { _id, title, description, deadline, category } = updatedTaskObj;

            const filter = { _id: new ObjectId(_id) };

            const existingTask = await tasksCollection.findOne(filter);
            if (!existingTask) {
                return res.send({ status: 404, message: 'Task not found' });
            }

            // Create the update object only with the fields that need updating
            const update = {
                $set: {
                    title,
                    description,
                    deadline,
                    category
                },
            };
            const options = { upsert: false };

            const result = await tasksCollection.updateOne(filter, update, options);
            if(result?.modifiedCount > 0){
                return res.send({ status: 200, message: 'Task updated successfully!' });
            }
        })


        app.patch('/tasks/update_task_position_in_category', verifyJWT, async (req, res) => {
            const { userEmail, taskId, categoryId } = req.body;

            // Verifying user authenticity.
            const { decoded_email } = req;
            if (userEmail !== decoded_email) {
                return res.send({ status: 403, message: "Forbidden access, email mismatch!" });
            }

            // Finding the task.
            const taskFilter = { _id: new ObjectId(taskId) };
            const existingTask = await tasksCollection.findOne(taskFilter);
            if (!existingTask) {
                return res.send({ status: 404, message: 'Task not found' });
            }

            // Finding the previous and following category.
            const previousCategory = existingTask?.category;
            const categoryFilter = { _id: new ObjectId(categoryId) };
            const followingCategory = await categoriesCollection.findOne(categoryFilter);

            // Check if following category exists and has a name
            if (!followingCategory || !followingCategory.name) {
                return res.send({ status: 404, message: 'Category not found or invalid' });
            }

            // Updating the category of the task object.
            const updateTask = { $set: { category: followingCategory.name } };
            const taskResult = await tasksCollection.updateOne(taskFilter, updateTask);

            if (taskResult.modifiedCount > 0) {
                // Reflecting the update in the user object.
                const userFilter = { email: userEmail };

                let userUpdate_01 = null;
                if (previousCategory === 'To Do') userUpdate_01 = { $pull: { "myTasks.myToDoTasks": taskId } };
                else if (previousCategory === 'In Progress') userUpdate_01 = { $pull: { "myTasks.myInProgressTasks": taskId } };
                else if (previousCategory === 'Done') userUpdate_01 = { $pull: { "myTasks.myDoneTasks": taskId } };

                const userResult_01 = await userCollection.updateOne(userFilter, userUpdate_01);

                let userUpdate_02 = null;
                if (followingCategory.name === 'To Do') userUpdate_02 = { $push: { "myTasks.myToDoTasks": taskId } };
                else if (followingCategory.name === 'In Progress') userUpdate_02 = { $push: { "myTasks.myInProgressTasks": taskId } };
                else if (followingCategory.name === 'Done') userUpdate_02 = { $push: { "myTasks.myDoneTasks": taskId } };

                const userResult_02 = await userCollection.updateOne(userFilter, userUpdate_02);

                if (userResult_01.modifiedCount > 0 && userResult_02.modifiedCount > 0) {
                    return res.send({ status: 200, message: 'Task category updated successfully!' });
                }
            }
            return res.send({ status: 500, message: 'Failed to update task category' });
        });


        app.delete('/tasks/delete_one_of_my_task', verifyJWT, async (req, res) => {
            const {userEmail, taskId} = req?.query;
            // console.log(userEmail, taskId);

            // Verifying user authenticity.
            const {decoded_email} = req;
            // console.log(userEmail, decoded_email);
            if (userEmail !== decoded_email) {
                return res.send({status: 403, message: "Forbidden access, email mismatch!"});
            }

            const taskID = new ObjectId(taskId);
            const filter = {_id: taskID};
            const taskResult = await tasksCollection.findOne(filter);
            const taskCategory = taskResult?.category;
            const deleteResult = await tasksCollection.deleteOne(filter);

            if (deleteResult?.deletedCount > 0) {

                const userFilter = {email: userEmail};

                let userUpdate = {};
                if (taskCategory === 'To Do') userUpdate = {$pull: {"myTasks.myToDoTasks": taskId}};
                else if (taskCategory === 'In Progress') userUpdate = {$pull: {"myTasks.myInProgressTasks": taskId}};
                else if (taskCategory === 'Done') userUpdate = {$pull: {"myTasks.myDoneTasks": taskId}};


                const options = {upsert: false, returnDocument: 'after'};
                const userResult = await userCollection.findOneAndUpdate(userFilter, userUpdate, options);

                res.send({status: 200, message: 'Task deleted successfully!'});
            } else {
                res.send({status: 404, message: 'Task not found. Please try again!'});
            }
        })





        /*============================================================================================================*/


    } catch (error) {
        console.error('MongoDB connection error:', error);
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);





/* REST CODE OF EXPRESS.JS -------------------------------------------------------------------------------------------*/

/* This defines a route handler for the root URL (/).
When a GET request is made to the root, it sends the response: "Task Management Application Server Side is running!". */
app.get('/', (req, res) => {
    res.send('Task Management Application Server Side is running!');
})


/* This starts the Express server and listens for incoming connections on the specified port.
It logs a message in the console indicating the app is running and the port it's listening on. */
app.listen(port, () => {
    console.log(`Task Management Application listening on port ${port}`);
})
