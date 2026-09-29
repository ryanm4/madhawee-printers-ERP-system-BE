const pool = require("../../sql-connection");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

exports.userRegistration = async (req, res, next) => {
    const { name, email, password, user_role, phone } = req.body;

    const phoneValue = phone || null;

    const emailValue = email || null;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // system time from Node.js
        const now = new Date();

        const query = `
      INSERT INTO users
        (name, email, phone, password, user_role, created_on, updated_on)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        pool.query(
            query,
            [name, emailValue, phoneValue, hashedPassword, user_role, now, now],
            (err) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({ message: "Email already exists" });
                    }
                    console.error("Error registering user:", err);
                    return next(err);
                }
                res.status(201).json({
                    status: "success",
                    message: "User registered successfully",
                });
            }
        );
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Error registering user",
        });
    }
};

exports.userLogin = (req, res, next) => {
    const { name, password } = req.body;
    const query = "SELECT * FROM users WHERE name = ?";
    pool.query(query, [name], async (err, results) => {
        if (err) {
            console.error("Error during login:", err);
            return next(err);
        }
        if (results.length === 0) {
            return res.status(401).json({
                status: "fail",
                message: "Invalid name or password",
            });
        }
        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: "fail",
                message: "Invalid name or password",
            });
        }

        // 1. Create SHORT-LIVED access token (15 minutes)
        const accessToken = jwt.sign(
            {
                user_id: user.id,
                name: user.name,
                user_role: user.user_role,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
        );

        // 2. Create LONG-LIVED refresh token (7 days)
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // 3. Store refresh token in database
        const insertQuery = `
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES (?, ?, ?)
        `;
        pool.query(insertQuery, [user.id, refreshToken, expiresAt], (insertErr) => {
            if (insertErr) {
                console.error("Error storing refresh token:", insertErr);
                return res.status(500).json({ message: "Login failed" });
            }

            // 4. Set refresh token as HttpOnly cookie
            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/',
            });

            // 5. Return access token + user info in response body
            res.status(200).json({
                message: "Login successful",
                accessToken,
                user: {
                    user_id: user.id,
                    name: user.name,
                    user_role: user.user_role,
                },
            });
        });
    });
};

// ✅ Refresh token endpoint — exchanges a valid refresh token for a new access token
exports.refreshToken = (req, res) => {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token provided" });
    }

    // 1. Look up refresh token in database
    const query = `
        SELECT rt.*, u.name, u.user_role, u.id as user_id
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = ? AND rt.revoked = 0 AND rt.expires_at > NOW()
    `;

    pool.query(query, [refreshToken], (err, results) => {
        if (err) {
            console.error("Refresh token lookup error:", err);
            return res.status(500).json({ message: "Server error" });
        }

        if (results.length === 0) {
            return res.status(403).json({ message: "Invalid or expired refresh token" });
        }

        const tokenRecord = results[0];

        // 2. Revoke the old refresh token (rotation)
        pool.query("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?", [tokenRecord.id]);

        // 3. Create new access token
        const accessToken = jwt.sign(
            {
                user_id: tokenRecord.user_id,
                name: tokenRecord.name,
                user_role: tokenRecord.user_role,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
        );

        // 4. Create new refresh token (rotation)
        const newRefreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        pool.query(
            "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
            [tokenRecord.user_id, newRefreshToken, expiresAt],
            (insertErr) => {
                if (insertErr) {
                    console.error("Error creating new refresh token:", insertErr);
                    return res.status(500).json({ message: "Server error" });
                }

                // 5. Set new refresh token cookie
                res.cookie('refresh_token', newRefreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                    path: '/',
                });

                // 6. Return new access token
                res.status(200).json({ accessToken });
            }
        );
    });
};

// ✅ Logout — revoke refresh token and clear cookie
exports.logout = (req, res) => {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
        // Revoke the refresh token in database
        pool.query("UPDATE refresh_tokens SET revoked = 1 WHERE token = ?", [refreshToken]);
    }

    // Clear the cookie
    res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    res.status(200).json({ message: "Logged out successfully" });
};

exports.getAllUsers = (req, res, next) => {
    const query = `
        SELECT 
            id,
            name,
            email,
            phone,
            user_role,
            created_on,
            updated_on
        FROM users
    `;

    pool.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching users:", err);
            return next(err);
        }

        res.status(201).json({
            users: results,
            message: "Users fetched successfully",
        });
    });
};

exports.updateUser = (req, res) => {
    const { id } = req.params;

    const { name, email, user_role, phone } = req.body;

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

    if (phone !== undefined) {
        fields.push("phone = ?");
        values.push(phone || null);
    }

    if (fields.length === 0) {
        return res.status(400).json({ message: "No fields provided to update" });
    }

    // ✅ Always system time from DB
    fields.push("updated_on = NOW()");

    const query = `
    UPDATE \`erp_madhawi_db\`.users
    SET ${fields.join(", ")}
    WHERE id = ?
  `;

    values.push(id);

    pool.query(query, values, (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ message: "Email already exists" });
            }

            return res.status(500).json({
                message: "Error updating user",
                error: err,
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User updated successfully",
        });
    });
};
