const jwt = require('jsonwebtoken');

/**
 * Extracts and verifies JWT token from request header or cookie
 * @param {Object} req - Express request object
 * @param {string} secret - JWT secret
 * @param {Function} callback - Callback with (err, user)
 */
function extractAndVerifyToken(req, secret, callback) {
    let token = null;
    
    // Try Authorization header first
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        token = authHeader.split(' ')[1];
    }
    
    // Try cookies if no header token
    if (!token && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'authToken') {
                token = value;
                break;
            }
        }
    }
    
    if (!token) {
        return callback(new Error('Access token required'), null);
    }
    
    jwt.verify(token, secret, (err, user) => {
        if (err) {
            return callback(new Error('Invalid or expired token'), null);
        }
        callback(null, user);
    });
}

module.exports = { extractAndVerifyToken };
