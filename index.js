/* ALL NECESSARY IMPORTS ---------------------------------------------------------------------------------------------*/

const express = require('express');                          //Default from Express.js
const cors = require('cors');                      //From CORS Middleware, but positioned here for better reliability and instructed in the document.
const app = express();                                             //Default from Express.js

require('dotenv').config();                                                    //Default from dotenv package.
// console.log(process.env);                                                   //Remove this after you've confirmed it is working.

const port = process.env.PORT || 3000;                            //Default from Express.js but .env applied, therefore positioned after dotenv import.
// console.log(port);

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


        /*============================================================================================================*/


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
