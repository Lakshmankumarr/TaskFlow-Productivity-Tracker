/* ===================================
   TASK ROUTES
   CRUD operations for tasks
=================================== */

const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function(db) {
    const router = express.Router();

    /* ===================================
       MIDDLEWARE - VERIFY TOKEN
    =================================== */

    /**
     * Verify JWT token middleware
     */
    function verifyToken(req, res, next) {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'No token provided'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
            req.userId = decoded.userId;
            next();
        } catch (error) {
            res.status(401).json({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }
    }

    /* ===================================
       UTILITY FUNCTIONS
    =================================== */

    /**
     * Get all tasks for a user
     */
    function getUserTasks(userId, date = null) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM tasks WHERE user_id = ?';
            let params = [userId];

            if (date) {
                query += ' AND DATE(created_at) = DATE(?)';
                params.push(date);
            }

            query += ' ORDER BY created_at DESC';

            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });
    }

    /**
     * Get single task
     */
    function getTaskById(taskId, userId) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
                [taskId, userId],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });
    }

    /**
     * Create new task
     */
    function createTask(userId, title) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO tasks (user_id, title, completed) VALUES (?, ?, 0)',
                [userId, title],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    /**
     * Update task
     */
    function updateTask(taskId, userId, title, completed) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE tasks SET title = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
                [title, completed ? 1 : 0, taskId, userId],
                function(err) {
                    if (err) reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }

    /**
     * Delete task
     */
    function deleteTask(taskId, userId) {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM tasks WHERE id = ? AND user_id = ?',
                [taskId, userId],
                function(err) {
                    if (err) reject(err);
                    resolve(this.changes > 0);
                }
            );
        });
    }

    /* ===================================
       GET ALL TASKS - TODAY'S TASKS
    =================================== */

    /**
     * GET /api/tasks
     * Get all tasks for today
     */
    router.get('/', verifyToken, async (req, res) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const tasks = await getUserTasks(req.userId, today);

            res.status(200).json({
                status: 'success',
                tasks,
                count: tasks.length
            });
        } catch (error) {
            console.error('Get tasks error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to fetch tasks'
            });
        }
    });

    /* ===================================
       GET ALL TASKS - HISTORY
    =================================== */

    /**
     * GET /api/tasks/all
     * Get all tasks (history)
     */
    router.get('/all', verifyToken, async (req, res) => {
        try {
            const tasks = await getUserTasks(req.userId);

            res.status(200).json({
                status: 'success',
                tasks,
                count: tasks.length
            });
        } catch (error) {
            console.error('Get all tasks error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to fetch tasks'
            });
        }
    });

    /* ===================================
       GET SINGLE TASK
    =================================== */

    /**
     * GET /api/tasks/:id
     * Get single task by ID
     */
    router.get('/:id', verifyToken, async (req, res) => {
        try {
            const task = await getTaskById(req.params.id, req.userId);

            if (!task) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Task not found'
                });
            }

            res.status(200).json({
                status: 'success',
                task
            });
        } catch (error) {
            console.error('Get task error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to fetch task'
            });
        }
    });

    /* ===================================
       CREATE TASK
    =================================== */

    /**
     * POST /api/tasks
     * Create new task
     */
    router.post('/', verifyToken, async (req, res) => {
        try {
            const { title } = req.body;

            if (!title || title.trim() === '') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Task title is required'
                });
            }

            if (title.length > 200) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Task title must be less than 200 characters'
                });
            }

            const taskId = await createTask(req.userId, title.trim());
            const task = await getTaskById(taskId, req.userId);

            res.status(201).json({
                status: 'success',
                message: 'Task created successfully',
                task
            });
        } catch (error) {
            console.error('Create task error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to create task'
            });
        }
    });

    /* ===================================
       UPDATE TASK
    =================================== */

    /**
     * PUT /api/tasks/:id
     * Update task
     */
    router.put('/:id', verifyToken, async (req, res) => {
        try {
            const { title, completed } = req.body;

            const task = await getTaskById(req.params.id, req.userId);
            if (!task) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Task not found'
                });
            }

            const updatedTitle = title !== undefined ? title : task.title;
            const updatedCompleted = completed !== undefined ? completed : task.completed;

            if (updatedTitle.length > 200) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Task title must be less than 200 characters'
                });
            }

            const updated = await updateTask(req.params.id, req.userId, updatedTitle, updatedCompleted);

            if (!updated) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Failed to update task'
                });
            }

            const updatedTask = await getTaskById(req.params.id, req.userId);

            res.status(200).json({
                status: 'success',
                message: 'Task updated successfully',
                task: updatedTask
            });
        } catch (error) {
            console.error('Update task error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to update task'
            });
        }
    });

    /* ===================================
       TOGGLE TASK COMPLETION
    =================================== */

    /**
     * PATCH /api/tasks/:id/toggle
     * Toggle task completion status
     */
    router.patch('/:id/toggle', verifyToken, async (req, res) => {
        try {
            const task = await getTaskById(req.params.id, req.userId);

            if (!task) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Task not found'
                });
            }

            const updated = await updateTask(req.params.id, req.userId, task.title, !task.completed);

            if (!updated) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Failed to toggle task'
                });
            }

            const updatedTask = await getTaskById(req.params.id, req.userId);

            res.status(200).json({
                status: 'success',
                message: 'Task toggled successfully',
                task: updatedTask
            });
        } catch (error) {
            console.error('Toggle task error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to toggle task'
            });
        }
    });

    /* ===================================
       DELETE TASK
    =================================== */

    /**
     * DELETE /api/tasks/:id
     * Delete task
     */
    router.delete('/:id', verifyToken, async (req, res) => {
        try {
            const task = await getTaskById(req.params.id, req.userId);

            if (!task) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Task not found'
                });
            }

            const deleted = await deleteTask(req.params.id, req.userId);

            if (!deleted) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Failed to delete task'
                });
            }

            res.status(200).json({
                status: 'success',
                message: 'Task deleted successfully'
            });
        } catch (error) {
            console.error('Delete task error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to delete task'
            });
        }
    });

    /* ===================================
       GET TASK STATISTICS
    =================================== */

    /**
     * GET /api/tasks/stats/today
     * Get today's task statistics
     */
    router.get('/stats/today', verifyToken, async (req, res) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const tasks = await getUserTasks(req.userId, today);

            const total = tasks.length;
            const completed = tasks.filter(t => t.completed).length;
            const pending = total - completed;

            res.status(200).json({
                status: 'success',
                stats: {
                    total,
                    completed,
                    pending,
                    completion_rate: total === 0 ? 0 : Math.round((completed / total) * 100)
                }
            });
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to fetch statistics'
            });
        }
    });

    return router;
};
