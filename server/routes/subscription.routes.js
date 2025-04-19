const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');

// Subscribe to notifications
router.post('/', subscriptionController.subscribe);

// Confirm subscription with token
router.get('/confirm/:token', subscriptionController.confirmSubscription);

// Unsubscribe from notifications
router.get('/unsubscribe/:email', subscriptionController.unsubscribe);

module.exports = router;
