import express from "express";
import path from 'path';
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import flash from "connect-flash";
import env from "dotenv";
import { error } from "console";

env.config();
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;
const saltRounds = 10;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine and views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        }       
    })
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
// Database
const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect().then(() => console.log("Connected to the database"))
  .catch(err => console.log(`Error connecting to DB: ${err}`));

// Routes
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("login.ejs", { messages: req.flash('error') });
});

app.get("/register", (req, res) => {
    res.render("register.ejs", { messages: req.flash('error') });
});

app.get("/logout", (req, res, next) => {
    req.logout(function(err) {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

app.get("/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        const { username } = req.user;

        const expensesResult = await db.query("SELECT id,exp_date, amount, description FROM expenses WHERE username = $1;", [username]);
        const budgetResult = await db.query("SELECT budget FROM budget WHERE username = $1;", [username]);
        const totalExpense = expensesResult.rows.reduce((acc, expense) => acc + Number(expense.amount), 0); 
        const budget =Number( budgetResult.rows.length > 0 ? budgetResult.rows[0].budget : 0); 
        res.render("dashboard", { expenses: expensesResult.rows, sum: totalExpense, budget: budget ,profile:username});
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

//dashboard functionality here
app.post('/dashboard/addExpense', async (req, res) => {
       // console.log(`Date: ${date}, Description: ${description}, Amount: ${amount}, Username: ${username}`);
       
        try {
            const { date, description, amount } = req.body;
            const { username } = req.user; 
            const result = await db.query(
                "INSERT INTO expenses (exp_date, amount, description, username) VALUES ($1, $2, $3, $4);",
                [date, amount, description, username]
            );

            if (result.rowCount > 0) {
                console.log("Added successfully!");
                res.redirect("/dashboard");
                res.status(201);
            } else {
                console.log("Not Added");
                res.redirect("/dashboard");
                res.status(400);
            }
        } catch (err) {
            console.log(`Error: ${err}`);
            res.status(500).json({ message: "Internal Server Error." });
        }
    } 
);
app.post("/dashboard/addBudget", async (req, res) => {
    try {
        const { budget } = req.body;
        const { username } = req.user;
        // Check if the user already has a budget
        const result = await db.query("SELECT budget FROM budget WHERE username = $1", [username]);
        if (result.rowCount > 0) {
            // If budget exists, update it
            const updateResult = await db.query("UPDATE budget SET budget = $1 WHERE username = $2", [budget, username]);
            if (updateResult.rowCount > 0) {
                console.log("Budget updated successfully!");
                res.redirect("/dashboard");
                res.status(200);
            } else {
                console.log("Failed to update budget");
                res.redirect("/dashboard");
                res.status(400); 
            }
        } else {
            const insertResult = await db.query("INSERT INTO budget (budget, username) VALUES ($1, $2)", [budget, username]);
            if (insertResult.rowCount > 0) {
                console.log("Budget added successfully!");
                res.redirect("/dashboard");
                res.status(201); 
            } else {
                console.log("Failed to add budget");
                res.redirect("/dashboard");
                res.status(400); 
            }
        }
    } catch (err) {
        console.error(`Error: ${err}`);
        res.status(500).json({ message: "Internal Server Error." });
    }
});

    app.post("/dashboard/delete-expense",async(req,res)=>{
        const  id  = req.body.expenseId;
        try{
            const result = await db.query("DELETE FROM expenses where id = ($1)",[id]);
            if(result.rowCount === 0)
            {
                res.status(401).json({error:"Expense not found"});
            }else{
                res.status(201)
                res.redirect("/dashboard");
            }
        }catch(err){
            console.log(err)
        }
    })

    app.post("/dashboard/update-expense",async(req,res)=>{
        const id = req.body.updateId;
        const date = req.body.date;
        const amount = req.body.amount;
        const description = req.body.description;
        try{
            const result = await db.query(
                "UPDATE expenses SET exp_date = $1, description = $2, amount = $3 WHERE id = $4",
                [date, description, amount, id]
            );
            if(result.rowCount === 0)
            {
                res.status(401).json({error:"cannot update expense"});
            }else
            {
                res.status(201);
                res.redirect("/dashboard");
            }
        }catch(err){
            console.log(err);
        }
    })
//dashboard functions
app.post("/login", (req, res, next) => {
    passport.authenticate("local", {
        successRedirect: "/dashboard",
        failureRedirect: "/login",
        failureFlash: true 
    })(req, res, next);
});

app.post("/register", async (req, res) => {
    const username = req.body.email;
    const password = req.body.password;
    console.log(username);
    try {
        const checkResult = await db.query("SELECT * FROM users WHERE username = $1", [username]);

        if (checkResult.rows.length > 0) {
            req.flash('error', 'Username already exists.');
            res.redirect("/register");
        } else {
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if (err) {
                    console.error("Error hashing password:", err);
                    req.flash('error', 'Error registering user.');
                    res.redirect("/register");
                } else {
                    try {
                        const result = await db.query(
                            "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
                            [username, hash]
                        );
                        const user = result.rows[0];
                        req.login(user, (err) => {
                            if (err) {
                                console.error("Error logging in user:", err);
                                req.flash('error', 'Error logging in user.');
                                res.redirect("/register");
                            } else {
                                res.redirect("/dashboard");
                            }
                        });
                    } catch (err) {
                        console.error("Error inserting user into database:", err);
                        req.flash('error', 'Error registering user.');
                        res.redirect("/register");
                    }
                }
            });
        }
    } catch (err) {
        console.error("Error checking user in database:", err);
        req.flash('error', 'Error checking user.');
        res.redirect("/register");
    }
});

// Passport Local Strategy
passport.use(new Strategy({
    usernameField: 'username',
    passwordField: 'password'
}, async (username, password, cb) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedHashedPassword = user.password;

            bcrypt.compare(password, storedHashedPassword, (err, valid) => {
                if (err) {
                    console.error("Error comparing passwords:", err);
                    return cb(err);
                } else if (valid) {
                    console.log("User authenticated successfully");
                    return cb(null, user);
                } else {
                    console.log("Incorrect password");
                    return cb(null, false);
                }
            });
        } else {
            console.log("User not found");
            return cb(null, false);
        }
    } catch (err) {
        console.error("Error querying user:", err);
        return cb(err);
    }
}));

// Serialize and Deserialize User
passport.serializeUser((user, cb) => {
    cb(null, user.username); 
});


passport.deserializeUser(async (username, cb) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        if (result.rows.length > 0) {
            cb(null, result.rows[0]);
        } else {
            cb(new Error('User not found'));
        }
    } catch (err) {
        cb(err);
    }
});


// Error handling
app.use((req, res, next) => {
    res.status(404).send('Page Not Found');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
