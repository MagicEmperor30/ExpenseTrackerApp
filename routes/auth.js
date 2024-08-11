import express from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { Strategy } from 'passport-local';
import { error } from 'console';
import pg from 'pg';
import env from 'dotenv';

env.config();

const router = express.Router();
const saltRounds = 10;

// Initialize database client
const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect().then(() => console.log('Connected to the database'))
  .catch(err => console.log(`Error connecting to DB: ${err}`));

router.get('/login', (req, res) => {
    res.render('login.ejs', { messages: req.flash('error') });
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
});

router.get('/register', (req, res) => {
    res.render('register.ejs', { messages: req.flash('error') });
});

router.post('/register', async (req, res) => {
    const username = req.body.email;
    const password = req.body.password;
    console.log(username);
    try {
        const checkResult = await db.query('SELECT * FROM users WHERE username = $1', [username]);

        if (checkResult.rows.length > 0) {
            req.flash('error', 'Username already exists.');
            res.redirect('/register');
        } else {
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if (err) {
                    console.error('Error hashing password:', err);
                    req.flash('error', 'Error registering user.');
                    res.redirect('/register');
                } else {
                    try {
                        const result = await db.query(
                            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
                            [username, hash]
                        );
                        const user = result.rows[0];
                        req.login(user, (err) => {
                            if (err) {
                                console.error('Error logging in user:', err);
                                req.flash('error', 'Error logging in user.');
                                res.redirect('/register');
                            } else {
                                res.redirect('/dashboard');
                            }
                        });
                    } catch (err) {
                        console.error('Error inserting user into database:', err);
                        req.flash('error', 'Error registering user.');
                        res.redirect('/register');
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error checking user in database:', err);
        req.flash('error', 'Error checking user.');
        res.redirect('/register');
    }
});

passport.use(new Strategy({
    usernameField: 'username',
    passwordField: 'password'
}, async (username, password, cb) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedHashedPassword = user.password;

            bcrypt.compare(password, storedHashedPassword, (err, valid) => {
                if (err) {
                    console.error('Error comparing passwords:', err);
                    return cb(err);
                } else if (valid) {
                    console.log('User authenticated successfully');
                    return cb(null, user);
                } else {
                    console.log('Incorrect password');
                    return cb(null, false);
                }
            });
        } else {
            console.log('User not found');
            return cb(null, false);
        }
    } catch (err) {
        console.error('Error querying user:', err);
        return cb(err);
    }
}));

passport.serializeUser((user, cb) => {
    cb(null, user.username);
});

passport.deserializeUser(async (username, cb) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length > 0) {
            cb(null, result.rows[0]);
        } else {
            cb(new Error('User not found'));
        }
    } catch (err) {
        cb(err);
    }
});

export { router as authRoutes };
