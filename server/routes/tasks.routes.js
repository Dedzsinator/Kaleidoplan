// Task management routes
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const tasksController = require('../controllers/tasks.controller');

// All task routes require authentication
router.use(authMiddleware.verifyToken);

// Task CRUD operations
router.get('/', tasksController.getAllTasks);
router.get('/:id', tasksController.getTaskById);
router.post('/', tasksController.createTask);
router.put('/:id', tasksController.updateTask);
router.delete('/:id', tasksController.deleteTask);

// Task logs
router.get('/logs', tasksController.getTaskLogs);
router.get('/:taskId/logs', tasksController.getTaskLogsByTaskId);

module.exports = router;