const express = require('express');
const router = express.Router();
const { authenticate, checkVerified } = require('../middleware/authMiddleware');
const CropRecommendation = require('../models/CropRecommendation');
const User = require('../models/User');
const { recommendCrops } = require('../services/mlService');

// Get crop recommendations
router.post('/crops', authenticate, checkVerified, async (req, res) => {
  try {
    const { soilAnalysisId, location, season } = req.body;

    // Get soil analysis data if provided
    let soilData = null;
    if (soilAnalysisId) {
      const analysis = await SoilAnalysis.findOne({ 
        _id: soilAnalysisId, 
        userId: req.userId 
      });
      if (!analysis) {
        return res.status(404).json({ error: 'Soil analysis not found' });
      }
      soilData = analysis.parameters;
    }

    // Check user's API usage
    const user = await User.findById(req.userId);
    if (user.apiUsage.cropRecommendation >= user.subscription.limits.cropRecommendation) {
      return res.status(429).json({ error: 'API limit exceeded for your plan' });
    }

    // Get recommendations
    const recommendations = await recommendCrops({
      soilData,
      location,
      season
    });

    // Save recommendation history
    const newRecommendation = new CropRecommendation({
      userId: req.userId,
      input: { soilAnalysisId, location, season },
      output: recommendations,
      modelVersion: '1.0.0'
    });

    await newRecommendation.save();

    // Update user's API usage
    user.apiUsage.cropRecommendation += 1;
    await user.save();

    res.json({
      recommendations,
      remainingQuota: user.subscription.limits.cropRecommendation - user.apiUsage.cropRecommendation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get fertilizer recommendations
router.post('/fertilizer', authenticate, checkVerified, async (req, res) => {
  try {
    const { soilAnalysisId, cropType } = req.body;

    // Get soil analysis data
    const analysis = await SoilAnalysis.findOne({ 
      _id: soilAnalysisId, 
      userId: req.userId 
    });
    if (!analysis) {
      return res.status(404).json({ error: 'Soil analysis not found' });
    }

    // Check user's API usage
    const user = await User.findById(req.userId);
    if (user.apiUsage.fertilizerRecommendation >= user.subscription.limits.fertilizerRecommendation) {
      return res.status(429).json({ error: 'API limit exceeded for your plan' });
    }

    // Get recommendations (simplified example)
    const recommendations = {
      nitrogen: Math.max(0, (0.8 - analysis.parameters.nitrogen) * 2.17),
      phosphorus: Math.max(0, (0.4 - analysis.parameters.phosphorus) * 4.76),
      potassium: Math.max(0, (0.5 - analysis.parameters.potassium) * 1.67),
      organic: analysis.parameters.organicMatter < 2 ? 'Add compost (5kg/m²)' : 'Maintain current levels'
    };

    // Update user's API usage
    user.apiUsage.fertilizerRecommendation += 1;
    await user.save();

    res.json({
      recommendations,
      remainingQuota: user.subscription.limits.fertilizerRecommendation - user.apiUsage.fertilizerRecommendation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;