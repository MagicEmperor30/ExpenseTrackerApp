import express from 'express';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import session from 'express-session';
import flash from 'connect-flash';
import passport from 'passport';
import env from 'dotenv';

// Import route modules
import { indexRoutes } from './routes/index.js';
import { authRoutes } from './routes/auth.js';
import { dashboardRoutes } from './routes/dashboard.js';

env.config();
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
        },
    })
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Use route modules
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', dashboardRoutes);

// Error handling for 404 Not Found
app.use((req, res, next) => {
    res.status(404).send('Page Not Found');
    next();
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
