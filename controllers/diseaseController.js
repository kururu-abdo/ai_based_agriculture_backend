// controllers/diseaseController.js
const supabase = require('../config/supabase');
const axios = require('axios');
const uuid = require('uuid');

exports.detectDisease = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    // Upload image to Supabase Storage
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${uuid.v4()}.${fileExt}`;
    const filePath = `disease-scans/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('plant-images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype
      });
      
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('plant-images')
      .getPublicUrl(filePath);
    
    // Call ML service
    const mlResponse = await axios.post(process.env.ML_DISEASE_API, {
      image_url: publicUrl
    });
    
    // Store result
    const { data: detection, error } = await supabase
      .from('disease_detections')
      .insert([{
        user_id: req.userId,
        image_url: publicUrl,
        diagnosis: mlResponse.data.diagnosis,
        confidence: mlResponse.data.confidence
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    // Update API usage
    await updateApiUsage(req.userId, 'disease_detection');
    
    res.json({
      detection_id: detection.id,
      image_url: detection.image_url,
      diagnosis: detection.diagnosis,
      confidence: detection.confidence,
      treatment: getTreatment(detection.diagnosis)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};