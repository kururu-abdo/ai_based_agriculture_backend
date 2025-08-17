// controllers/soilController.js
const supabase = require('../config/supabase');
const axios = require('axios');

exports.analyzeSoil = async (req, res) => {
  try {
    const { ph, nitrogen, phosphorus, potassium, moisture } = req.body;
    
    // Call ML service
    const mlResponse = await axios.post(process.env.ML_SOIL_API, {
      ph, nitrogen, phosphorus, potassium, moisture
    });
    
    // Store result in Supabase
    const { data: analysis, error } = await supabase
      .from('soil_analyses')
      .insert([{
        user_id: req.userId,
        ph,
        nitrogen,
        phosphorus,
        potassium,
        moisture,
        quality_score: mlResponse.data.quality_score
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    // Update API usage
    await updateApiUsage(req.userId, 'soil_analysis');
    
    res.json({
      analysis_id: analysis.id,
      quality_score: analysis.quality_score,
      recommendations: generateRecommendations(analysis.quality_score)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

async function updateApiUsage(userId, endpoint) {
  // Check if record exists
  const { data: existing } = await supabase
    .from('api_usage')
    .select()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .maybeSingle();
    
  if (existing) {
    await supabase
      .from('api_usage')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('api_usage')
      .insert([{
        user_id: userId,
        endpoint,
        count: 1
      }]);
  }
}