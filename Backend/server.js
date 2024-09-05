const io = require('socket.io');
const cors = require('cors');
const express = require('express');
const app = express();
const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://krishp2304:mongoChub@cluster0.6rgp1.mongodb.net/";
const client = new MongoClient(uri);

let database, messagesCollection;

async function run() {
    try {
        await client.connect();
        database = client.db('C-hub');
        messagesCollection = database.collection('messages'); // Define the messages collection
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

run().catch(console.dir);

app.use(cors());

const server = require('http').createServer(app);
const socketIo = require('socket.io')(server, {
    cors: {
        origin: '*', // Allow all origins
        methods: ['GET', 'POST']
    }
});

const users = {};

socketIo.on('connection', socket => {
    socket.on('join-room', ({ name, room }) => {
        socket.join(room);
        users[socket.id] = { name, room };
        socket.to(room).emit('user-joined', name);
    });

    socket.on('send', async ({ message, room }) => {
        const sender = users[socket.id].name;
        const messageData = {
            name: sender,
            room: room,
            message: message,
            timestamp: new Date() // Store the current timestamp
        };

        // Save the message to MongoDB
        try {
            await messagesCollection.insertOne(messageData);
            console.log("Message saved to MongoDB:", messageData);
        } catch (error) {
            console.error("Error saving message to MongoDB:", error);
        }

        socket.to(room).emit('receive', { message: message, name: sender });
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            const { name, room } = user;
            socket.to(room).emit('left', name);
            delete users[socket.id];
        }
    });
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chat Application</title>
        </head>
        <body>
            <h1>Hello</h1>
        </body>
        </html>
    `);
});

server.listen(8000, () => {
    console.log('Server is running on 8000');
});
