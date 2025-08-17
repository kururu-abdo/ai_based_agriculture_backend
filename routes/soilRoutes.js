const express = require('express');
const router = express.Router();
const modelService = require('../services/modelService');
const { checkApiAccess } = require('../middleware/planValidation');
const User = require('../models/User');

router.post('/analyze', checkApiAccess('soilAnalysis'), async (req, res) => {
  try {
    const { pH, nitrogen, phosphorus, potassium, moisture } = req.body;
    
    // Call model service
    const result = await modelService.predictSoilQuality({
      pH, nitrogen, phosphorus, potassium, moisture
    });
    
    // Update usage
    await User.findByIdAndUpdate(req.userId, {
      $inc: { 'apiUsage.soilAnalysis': 1 }
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;