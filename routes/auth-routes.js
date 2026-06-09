/* ===================================
   AUTHENTICATION ROUTES
   Login, Register, Logout functionality
=================================== */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = function(db) {
    const router = express.Router();

    /* ===================================
       UTILITY FUNCTIONS
    =================================== */

    /**
     * Generate JWT token
     * @param {number} userId - User ID
     * @returns {string} JWT token
     */
    function generateToken(userId) {
        return jwt.sign(
            { userId },
            process.env.JWT_SECRET || 'your_secret_key',
            { expiresIn: process.env.JWT_EXPIRES_IN + 'h' || '24h' }
        );
    }

    /**
     * Hash password
     * @param {string} password - Plain password
     * @returns {Promise<string>} Hashed password
     */
    async function hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    /**
     * Compare passwords
     * @param {string} password - Plain password
     * @param {string} hashedPassword - Hashed password
     * @returns {Promise<boolean>} True if passwords match
     */
    async function comparePasswords(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }

    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Promise<object>} User object or null
     */
    function getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    /**
     * Get user by ID
     * @param {number} id - User ID
     * @returns {Promise<object>} User object or null
     */
    function getUserById(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    /**
     * Create new user
     * @param {string} name - User name
     * @param {string} email - User email
     * @param {string} hashedPassword - Hashed password
     * @returns {Promise<number>} User ID
     */
    function createUser(name, email, hashedPassword) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, hashedPassword],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    /* ===================================
       REGISTER ENDPOINT
    =================================== */

    /**
     * POST /api/auth/register
     * Register a new user
     */
    router.post('/register', async (req, res) => {
        try {
            const { name, email, password } = req.body;

            // Validation
            if (!name || !email || !password) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Name, email, and password are required'
                });
            }

            if (name.length < 2 || name.length > 50) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Name must be between 2 and 50 characters'
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Password must be at least 8 characters'
                });
            }

            // Check if user already exists
            const existingUser = await getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Email already registered'
                });
            }

            // Hash password
            const hashedPassword = await hashPassword(password);

            // Create user
            const userId = await createUser(name, email, hashedPassword);

            // Get created user
            const user = await getUserById(userId);

            res.status(201).json({
                status: 'success',
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    created_at: user.created_at
                }
            });

        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Registration failed. Please try again.'
            });
        }
    });

    /* ===================================
       LOGIN ENDPOINT
    =================================== */

    /**
     * POST /api/auth/login
     * Authenticate user and return JWT token
     */
    router.post('/login', async (req, res) => {
        try {
            const { email, password, rememberMe } = req.body;

            // Validation
            if (!email || !password) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email and password are required'
                });
            }

            // Find user by email
            const user = await getUserByEmail(email);
            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid email or password'
                });
            }

            // Compare passwords
            const isPasswordValid = await comparePasswords(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid email or password'
                });
            }

            // Generate JWT token
            const token = generateToken(user.id);

            // Get user data without password
            const userData = await getUserById(user.id);

            res.status(200).json({
                status: 'success',
                message: 'Login successful',
                token,
                user: {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    created_at: userData.created_at
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Login failed. Please try again.'
            });
        }
    });

    /* ===================================
       VERIFY TOKEN ENDPOINT
    =================================== */

    /**
     * POST /api/auth/verify
     * Verify JWT token
     */
    router.post('/verify', (req, res) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    status: 'error',
                    message: 'No token provided'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');

            res.status(200).json({
                status: 'success',
                message: 'Token is valid',
                userId: decoded.userId
            });

        } catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }
    });

    /* ===================================
       GET USER PROFILE ENDPOINT
    =================================== */

    /**
     * GET /api/auth/profile
     * Get current user profile
     */
    router.get('/profile', async (req, res) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    status: 'error',
                    message: 'No token provided'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
            const user = await getUserById(decoded.userId);

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            res.status(200).json({
                status: 'success',
                user
            });

        } catch (error) {
            console.error('Profile fetch error:', error);
            res.status(401).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }
    });

    /* ===================================
       LOGOUT ENDPOINT
    =================================== */

    /**
     * POST /api/auth/logout
     * Logout user (client-side token deletion)
     */
    router.post('/logout', (req, res) => {
        res.status(200).json({
            status: 'success',
            message: 'Logout successful'
        });
    });

    /* ===================================
       CHANGE PASSWORD ENDPOINT
    =================================== */

    /**
     * POST /api/auth/change-password
     * Change user password
     */
    router.post('/change-password', async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    status: 'error',
                    message: 'No token provided'
                });
            }

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Current and new passwords are required'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
            const user = await getUserById(decoded.userId);

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            // Get full user with password
            const fullUser = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM users WHERE id = ?', [decoded.userId], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });

            // Verify current password
            const isPasswordValid = await comparePasswords(currentPassword, fullUser.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            const hashedPassword = await hashPassword(newPassword);

            // Update password
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [hashedPassword, decoded.userId],
                    (err) => {
                        if (err) reject(err);
                        resolve();
                    }
                );
            });

            res.status(200).json({
                status: 'success',
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to change password'
            });
        }
    });

    return router;
};
