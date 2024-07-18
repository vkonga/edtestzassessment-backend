const express = require('express'); // import express
const app = express();    // create app instance
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const {open} = require('sqlite');  // import open method from sqlite package
const path = require('path');
app.use(express.json());
app.use(cors());
const sqlite3 = require('sqlite3');
const dbPath = path.join(__dirname,"appointments.db");
let db = null;
const initializeDBAndServer =async () => {

    try {
        db = await open({
        filename:dbPath,
        driver: sqlite3.Database,
    });
    app.listen(3000, () => {
        console.log("Server Running at localhost:3000"); //port 
    })
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
        response.status(401);
        response.send("Invalid Access Token");
    } else {
        jwt.verify(jwtToken,"sdbsigfbugjuershllhlsuw", async (error, payload) => {
            if (error) {
                response.status(401);
                response.send("Invalid Access Token")
            } else {
                request.username = payload.username;
                next();
            }
        })
    }
}

app.get("/" ,authenticateToken ,async (request, response) => {
    getUser = ` 
                        SELECT * FROM users;
                    `;
                const user = await db.all(getUser);
                response.send(user);
});

app.post("/signup/" ,async (request,response) => {
    const {username,password} = request.body;
    const hashedPassword = await bcrypt.hash(password,8);
    const findUser = `
                    SELECT * FROM users
                    WHERE username = '${username}'
                    `;
    const dbUser = await db.get(findUser);
    if(dbUser === undefined) {
        const createUSer = `
            INSERT INTO 
                users(username,password)
            VALUES (
                '${username}',
                '${hashedPassword}'
            );`;
        await db.run(createUSer);
        response.send("User Created Successfully");
    } else {
        response.status(400);
        response.send("Username Already Exist");
    }
});

app.post("/signin/",async (request, response) => {
    const {username,password} = request.body;
    const findUser = `
                SELECT * FROM users WHERE username = '${username}';
                        `;
    const dbUser =  await db.get(findUser);
    if (dbUser === undefined) {
        response.status(400);
        response.send("Invalid User");
    } else {
        const checkPassword = await bcrypt.compare(password, dbUser.password);
        
        if (checkPassword === true) {
            const payload = {username: username};
            const jwtToken = jwt.sign(payload,"sdbsigfbugjuershllhlsuw");
            response.send({jwtToken,username});
        } else {
            response.status(400);
            response.send("Invalid Password");
        }
    }
});

app.post("/appointments/", authenticateToken, async (request, response) => {
    const {id,name,date,age} = request.body;
    const {username} = request;
    const addAppointment = `
                            INSERT INTO appointments(id,name,date,age,username)
                            VALUES (
                                ${id},
                                '${name}',
                                '${date}',
                                ${age},
                                '${username}'
                            )
                            `;
    const appointment = await db.run(addAppointment);
    response.send(appointment);
});

app.get("/appointments/", authenticateToken, async (request, response) => {

    const {username} = request;
    const getUsername = `SELECT username FROM users WHERE username='${username}'`;
    const dbUser = await db.get(getUsername);
    const getAppointments = `
                            SELECT * FROM appointments
                            WHERE username = '${dbUser.username}';
                            `;
    const getApp = await db.all(getAppointments);
    response.send(getApp);
});



