const connection = require('../../sql-connection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.userRegistration = async (req, res, next) => {
    const { name, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // system time from Node.js
        const now = new Date();

        const query = `
      INSERT INTO users
        (name, email, password, created_on, updated_on)
      VALUES (?, ?, ?, ?, ?)
    `;

        connection.query(
            query,
            [name, email, hashedPassword, now, now],
            (err) => {
                if (err) {
                    console.error('Error registering user:', err);
                    return next(err);
                }
                res.status(201).send('User registered successfully');
            }
        );
    } catch (error) {
        res.status(500).send('Error registering user');
    }
};


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

exports.getAllUsers = (req, res, next) => {
    const query = 'SELECT * FROM users';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return next(err);
        }
        const data = {
            users: results,
            message: 'Users fetched successfully'
        }
        res.status(200).json(data);
    });
}

exports.updateUser = (req, res) => {
    const { id } = req.params;

    const {
        name,
        email,
        user_role
    } = req.body;

    if (!id) {
        return res.status(400).json({ message: "User ID is required" });
    }

    let fields = [];
    let values = [];

    if (name) {
        fields.push("name = ?");
        values.push(name);
    }

    if (email) {
        fields.push("email = ?");
        values.push(email);
    }

    if (user_role) {
        fields.push("user_role = ?");
        values.push(user_role);
    }

    if (fields.length === 0) {
        return res.status(400).json({ message: "No fields provided to update" });
    }

    // ✅ Always system time from DB
    fields.push("updated_on = NOW()");

    const query = `
    UPDATE \`erp-madhawi-db\`.users
    SET ${fields.join(", ")}
    WHERE id = ?
  `;

    values.push(id);

    connection.query(query, values, (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ message: "Email already exists" });
            }

            return res.status(500).json({
                message: "Error updating user",
                error: err
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User updated successfully"
        });
    });
};
