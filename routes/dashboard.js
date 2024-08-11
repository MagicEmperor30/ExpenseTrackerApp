import express from 'express';
import pg from 'pg';
import env from 'dotenv';

env.config();
const router = express.Router();

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

// Dashboard route
router.get('/dashboard', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        const { username } = req.user;

        // Fetch expenses and budget from the database
        const expensesResult = await db.query('SELECT id, exp_date, amount, description FROM expenses WHERE username = $1;', [username]);
        const budgetResult = await db.query('SELECT budget FROM budget WHERE username = $1;', [username]);

        // Calculate total expense and get budget
        const totalExpense = expensesResult.rows.reduce((acc, expense) => acc + Number(expense.amount), 0);
        const budget = Number(budgetResult.rows.length > 0 ? budgetResult.rows[0].budget : 0);

        // Render the dashboard view
        res.render('dashboard', { expenses: expensesResult.rows, sum: totalExpense, budget: budget, profile: username });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Add expense route
router.post('/dashboard/addExpense', async (req, res) => {
    try {
        const { date, description, amount } = req.body;
        const { username } = req.user;

        // Insert new expense into the database
        const result = await db.query(
            'INSERT INTO expenses (exp_date, amount, description, username) VALUES ($1, $2, $3, $4);',
            [date, amount, description, username]
        );

        if (result.rowCount > 0) {
            console.log('Added successfully!');
            res.redirect('/dashboard');
        } else {
            console.log('Not Added');
            res.redirect('/dashboard');
        }
    } catch (err) {
        console.log(`Error: ${err}`);
        res.status(500).json({ message: 'Internal Server Error.' });
    }
});

// Update expense route
router.post('/dashboard/update-expense', async (req, res) => {
    const { id, date, amount, description } = req.body;

    try {
        const result = await db.query(
            'UPDATE expenses SET exp_date = $1, description = $2, amount = $3 WHERE id = $4',
            [date, description, amount, id]
        );

        if (result.rowCount === 0) {
            res.status(401).json({ error: 'Cannot update expense' });
        } else {
            res.redirect('/dashboard');
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete expense route
router.post('/dashboard/delete-expense', async (req, res) => {
    const id = req.body.expenseId;

    try {
        const result = await db.query('DELETE FROM expenses WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            res.status(401).json({ error: 'Expense not found' });
        } else {
            res.redirect('/dashboard');
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add or update budget route
router.post('/dashboard/addBudget', async (req, res) => {
    try {
        const { budget } = req.body;
        const { username } = req.user;

        // Check if the user already has a budget
        const result = await db.query('SELECT budget FROM budget WHERE username = $1', [username]);

        if (result.rowCount > 0) {
            // If budget exists, update it
            const updateResult = await db.query('UPDATE budget SET budget = $1 WHERE username = $2', [budget, username]);

            if (updateResult.rowCount > 0) {
                console.log('Budget updated successfully!');
                res.redirect('/dashboard');
            } else {
                console.log('Failed to update budget');
                res.redirect('/dashboard');
            }
        } else {
            // If budget does not exist, insert it
            const insertResult = await db.query('INSERT INTO budget (budget, username) VALUES ($1, $2)', [budget, username]);

            if (insertResult.rowCount > 0) {
                console.log('Budget added successfully!');
                res.redirect('/dashboard');
            } else {
                console.log('Failed to add budget');
                res.redirect('/dashboard');
            }
        }
    } catch (err) {
        console.error(`Error: ${err}`);
        res.status(500).json({ message: 'Internal Server Error.' });
    }
});

export { router as dashboardRoutes};
