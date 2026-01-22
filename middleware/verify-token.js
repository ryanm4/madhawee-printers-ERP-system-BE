const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        // Expected format: "Bearer <token>"
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token missing' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid or expired token' });
            }

            // Attach decoded payload to request
            req.user = decoded;
            next();
        });

    } catch (error) {
        return res.status(500).json({ message: 'Token verification failed' });
    }
};
