const express = require('express'); // import express
const app = express();    // create app instance
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { open } = require('sqlite');  // import open method from sqlite package
const path = require('path');
const sqlite3 = require('sqlite3');

app.use(cors()); // Enable CORS
app.use(express.json());

const dbPath = path.join(__dirname, "appointments.db");
let db = null;

const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(3000, () => {
            console.log("Server Running at localhost:3000"); //port 
        });
    } catch (e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];
    }

    if (jwtToken === undefined) {
        response.status(401).json({ error: "Invalid Access Token" });
    } else {
        jwt.verify(jwtToken, "sdbsigfbugjuershllhlsuw", (error, payload) => {
            if (error) {
                response.status(401).json({ error: "Invalid Access Token" });
            } else {
                request.username = payload.username;
                next();
            }
        });
    }
};

app.get("/", authenticateToken, async (request, response) => {
    try {
        const getUser = `SELECT * FROM users;`;
        const user = await db.all(getUser);
        response.json(user);
    } catch (error) {
        response.status(500).json({ error: error.message });
    }
});

app.post("/signup/", async (request, response) => {
    try {
        const { username, password } = request.body;
        const hashedPassword = await bcrypt.hash(password, 8);
        const findUser = `SELECT * FROM users WHERE username = '${username}'`;
        const dbUser = await db.get(findUser);

        if (dbUser === undefined) {
            const createUser = `
                INSERT INTO users (username, password)
                VALUES ('${username}', '${hashedPassword}');
            `;
            await db.run(createUser);
            response.json({ message: "User Created Successfully" });
        } else {
            response.status(400).json({ error: "Username Already Exists" });
        }
    } catch (error) {
        response.status(500).json({ error: error.message });
    }
});

app.post("/signin/", async (request, response) => {
    try {
        const { username, password } = request.body;
        const findUser = `SELECT * FROM users WHERE username = '${username}'`;
        const dbUser = await db.get(findUser);

        if (dbUser === undefined) {
            response.status(400).json({ error: "Invalid User" });
        } else {
            const checkPassword = await bcrypt.compare(password, dbUser.password);

            if (checkPassword === true) {
                const payload = { username: username };
                const jwtToken = jwt.sign(payload, "sdbsigfbugjuershllhlsuw");
                response.json({ jwtToken, username });
            } else {
                response.status(400).json({ error: "Invalid Password" });
            }
        }
    } catch (error) {
        response.status(500).json({ error: error.message });
    }
});

app.post("/appointments/", authenticateToken, async (request, response) => {
    try {
        const { id, name, date, age } = request.body;
        const { username } = request;
        const addAppointment = `
            INSERT INTO appointments (id, name, date, age, username)
            VALUES (${id}, '${name}', '${date}', ${age}, '${username}')
        `;
        await db.run(addAppointment);
        response.json({ message: "Appointment Added Successfully" });
    } catch (error) {
        response.status(500).json({ error: error.message });
    }
});

app.get("/appointments/", authenticateToken, async (request, response) => {
    try {
        const { username } = request;
        const getAppointments = `
            SELECT * FROM appointments
            WHERE username = '${username}'
        `;
        const appointments = await db.all(getAppointments);
        response.json(appointments);
    } catch (error) {
        response.status(500).json({ error: error.message });
    }
});
