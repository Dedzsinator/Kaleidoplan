import express from 'express';
const router = express.Router();
// import mongoose from 'mongoose';

import authMiddleware from '../middleware/auth';
import Sponsor from '../models/sponsor.model';
import EventSponsor from '../models/event-sponsor.model';

// All sponsor routes require authentication
router.use(authMiddleware.verifyToken);

/**
 * Get all sponsors
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, limit = 50, page = 1, active } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (active !== undefined) {
      filter.active = active === 'true';
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get sponsors
    const sponsors = await Sponsor.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit));

    // Get total count
    const totalSponsors = await Sponsor.countDocuments(filter);

    res.json({
      sponsors,
      pagination: {
        total: totalSponsors,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalSponsors / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get sponsor by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const sponsor = await Sponsor.findById(id);

    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    res.json(sponsor);
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new sponsor
 * FIX: Change authorizeRoles to authMiddleware.requireOrganizerOrAdmin
 */
router.post('/', authMiddleware.requireOrganizerOrAdmin, async (req, res, next) => {
  try {
    const { name, description, website, logoUrl, contactName, contactEmail, contactPhone, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Sponsor name is required' });
    }

    const newSponsor = new Sponsor({
      name,
      description,
      website,
      logoUrl,
      contactName,
      contactEmail,
      contactPhone,
      address,
      active: true,
    });

    const savedSponsor = await newSponsor.save();

    res.status(201).json(savedSponsor);
  } catch (error) {
    next(error);
  }
});

/**
 * Update a sponsor
 */
router.put('/:id', authMiddleware.requireOrganizerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, website, logoUrl, contactName, contactEmail, contactPhone, address, active } = req.body;

    // Find and update sponsor
    const updatedSponsor = await Sponsor.findByIdAndUpdate(
      id,
      {
        name,
        description,
        website,
        logoUrl,
        contactName,
        contactEmail,
        contactPhone,
        address,
        ...(active !== undefined ? { active } : {}),
      },
      { new: true, runValidators: true },
    );

    if (!updatedSponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    res.json(updatedSponsor);
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a sponsor
 */
router.delete('/:id', authMiddleware.requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if sponsor is linked to any events
    const eventSponsors = await EventSponsor.find({ sponsorId: id });

    if (eventSponsors.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete sponsor that is linked to events',
        linkedEvents: eventSponsors.length,
      });
    }

    // Delete the sponsor
    const deletedSponsor = await Sponsor.findByIdAndDelete(id);

    if (!deletedSponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    res.json({ message: 'Sponsor deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

/**
 * Link sponsor to an event
 */
router.post('/link-to-event', authMiddleware.requireOrganizerOrAdmin, async (req, res, next) => {
  try {
    const { sponsorId, eventId, sponsorshipLevel, sponsorshipAmount, featured } = req.body;

    if (!sponsorId || !eventId) {
      return res.status(400).json({
        error: 'Missing required fields',
        requiredFields: ['sponsorId', 'eventId'],
      });
    }

    // Check if both sponsor and event exist
    const sponsorExists = await Sponsor.exists({ _id: sponsorId });

    if (!sponsorExists) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    // Check if the link already exists
    const existingLink = await EventSponsor.findOne({
      sponsorId,
      eventId,
    });

    if (existingLink) {
      return res.status(400).json({ error: 'Sponsor is already linked to this event' });
    }

    // Create the link
    const eventSponsor = new EventSponsor({
      sponsorId,
      eventId,
      sponsorshipLevel: sponsorshipLevel || 'partner',
      sponsorshipAmount: sponsorshipAmount || 0,
      featured: featured || false,
    });

    await eventSponsor.save();

    res.status(201).json({
      message: 'Sponsor linked to event successfully',
      eventSponsor,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get sponsors for an event
 */
router.get('/event/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Get event sponsors
    const eventSponsors = await EventSponsor.find({ eventId })
      .populate('sponsorId')
      .sort({ sponsorshipLevel: 1, featured: -1 });

    res.json(eventSponsors);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
