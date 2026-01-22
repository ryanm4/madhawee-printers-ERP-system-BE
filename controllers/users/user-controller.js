const connection = require('../../sql-connection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.userRegistration = async (req, res, next) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        connection.query(query, [name, email, hashedPassword], (err, result) => {
            if (err) {
                console.error('Error registering user:', err);
                return next(err);
            }
            res.status(201).send('User registered successfully');
        });
    } catch (error) {
        res.status(500).send('Error registering user');
    }
}

exports.userLogin = (req, res, next) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ?';
    connection.query(query, [email], async (err, results) => {
        if (err) {
            console.error('Error during login:', err);
            return next(err);
        }
        if (results.length === 0) {
            return res.status(401).send('Invalid email or password');
        }
        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send('Invalid email or password');
        }
        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                // role: user.role, // optional but useful
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                email: user.email,
            },
        });

    });
}