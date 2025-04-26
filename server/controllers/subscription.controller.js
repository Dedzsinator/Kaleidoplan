const mongoose = require('mongoose');
const Subscription = require('../models/subscription.model');
const Event = require('../models/event.model');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * Subscribe to event notifications
 */
const subscribe = async (req, res, next) => {
  try {
    const { email, eventId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');

    // Check if subscription already exists
    let subscription = await Subscription.findOne({ email });

    // For handling temporary event IDs
    let eventName = 'this event';
    let eventObject = null;

    if (eventId) {
      try {
        // Try ObjectId first
        if (mongoose.Types.ObjectId.isValid(eventId)) {
          eventObject = await Event.findById(eventId);
        }

        // If not found, try string ID
        if (!eventObject) {
          eventObject = await Event.findOne({ id: eventId });
        }

        if (eventObject) {
          eventName = eventObject.name;
        }
      } catch (err) {
        console.error(`Error finding event ${eventId}:`, err);
        // Continue with just the ID if event lookup fails
      }
    }

    if (subscription) {
      // Update existing subscription
      if (eventId && !subscription.eventIds.includes(eventId)) {
        subscription.eventIds.push(eventId);
      }

      if (!subscription.isConfirmed) {
        subscription.confirmationToken = confirmationToken;
      }

      await subscription.save();
    } else {
      // Create new subscription
      subscription = new Subscription({
        email,
        eventIds: eventId ? [eventId] : [],
        confirmationToken,
      });

      await subscription.save();
    }

    // Send confirmation email
    try {
      await sendConfirmationEmail(email, confirmationToken, eventName);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue even if email fails - we've saved the subscription
    }

    return res.status(201).json({
      success: true,
      message: 'Subscription created. Please check your email to confirm.',
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({
      error: 'An error occurred while processing your subscription',
      details: error.message,
    });
  }
};

/**
 * Send confirmation email
 */
const sendConfirmationEmail = async (email, token, eventName) => {
  // Create transporter using environment variables
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Confirmation URL
  const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/confirm-subscription/${token}`;

  // Email options
  const mailOptions = {
    from: `"Kaleidoplan Events" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Confirm your subscription to ${eventName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3357FF;">Confirm Your Subscription</h2>
        <p>Thank you for subscribing to updates about ${eventName}.</p>
        <p>Please click the button below to confirm your subscription:</p>
        <a href="${confirmUrl}" style="display: inline-block; background-color: #3357FF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Confirm Subscription</a>
        <p>If you didn't request this subscription, you can ignore this email.</p>
        <p>Thank you,<br>Kaleidoplan Events Team</p>
      </div>
    `,
  };

  // Send email
  return transporter.sendMail(mailOptions);
};

/**
 * Confirm subscription with token
 */
const confirmSubscription = async (req, res, next) => {
  try {
    const { token } = req.params;

    const subscription = await Subscription.findOne({ confirmationToken: token });

    if (!subscription) {
      return res.status(404).json({ error: 'Invalid or expired confirmation token' });
    }

    subscription.isConfirmed = true;
    subscription.confirmationToken = null;
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Subscription confirmed successfully',
    });
  } catch (error) {
    console.error('Error confirming subscription:', error);
    next(error);
  }
};

/**
 * Unsubscribe from notifications
 */
const unsubscribe = async (req, res, next) => {
  try {
    const { email } = req.params;

    const subscription = await Subscription.findOne({ email });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    subscription.isActive = false;
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    next(error);
  }
};

module.exports = {
  subscribe,
  confirmSubscription,
  unsubscribe,
};
