const express = require('express');
const router = express.Router();
const multer = require('multer');
const modelService = require('../services/modelService');
const { checkApiAccess } = require('../middleware/planValidation');
const User = require('../models/User');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/detect', 
  checkApiAccess('diseaseDetection'),
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }
      
      // Call model service
      const diagnosis = await modelService.detectDisease(req.file.buffer);
      
      // Upload image to Supabase Storage
      const filePath = `disease_scans/${Date.now()}-${req.file.originalname}`;
      const { error } = await supabase.storage
        .from('plant-images')
        .upload(filePath, req.file.buffer);
      
      if (error) throw error;
      
      // Get public URL
      const { publicURL } = supabase.storage
        .from('plant-images')
        .getPublicUrl(filePath);
      
      // Update usage
      await User.findByIdAndUpdate(req.userId, {
        $inc: { 'apiUsage.diseaseDetection': 1 }
      });
      
      res.json({
        diagnosis,
        imageUrl: publicURL
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;