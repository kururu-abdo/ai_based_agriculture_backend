const express = require('express');
const router = express.Router();
const { authenticate, checkVerified } = require('../middleware/authMiddleware');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const { predictDisease } = require('../services/mlService');

// Submit image for disease prediction
router.post('/disease', authenticate, checkVerified, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Check user's API usage
    const user = await User.findById(req.userId);
    if (user.apiUsage.diseaseDetection >= user.subscription.limits.diseaseDetection) {
      return res.status(429).json({ error: 'API limit exceeded for your plan' });
    }

    // Process image and make prediction
    const prediction = await predictDisease(req.file.buffer);

    // Save prediction history
    const newPrediction = new Prediction({
      userId: req.userId,
      type: 'disease',
      input: { image: req.file.originalname },
      output: prediction,
      modelVersion: '1.0.0'
    });

    await newPrediction.save();

    // Update user's API usage
    user.apiUsage.diseaseDetection += 1;
    await user.save();

    res.json({
      prediction,
      remainingQuota: user.subscription.limits.diseaseDetection - user.apiUsage.diseaseDetection
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prediction history
router.get('/history', authenticate, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;