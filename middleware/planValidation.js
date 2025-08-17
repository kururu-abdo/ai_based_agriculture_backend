// middleware/planValidation.js
const supabase = require('../config/supabase');
const plans = require('../config/plans');

exports.checkApiAccess = (endpoint) => async (req, res, next) => {
  try {
    // Get user's subscription plan
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_plan, subscription_expires_at')
      .eq('id', req.userId)
      .single();
      
    if (error) throw error;
    
    // Check if subscription is active
    if (new Date(user.subscription_expires_at) < new Date()) {
      return res.status(403).json({ error: 'Subscription expired' });
    }
    
    // Get API usage
    const { data: usage } = await supabase
      .from('api_usage')
      .select('count')
      .eq('user_id', req.userId)
      .eq('endpoint', endpoint)
      .maybeSingle();
      
    const usageCount = usage?.count || 0;
    
    // Check against plan limits
    if (usageCount >= plans[user.subscription_plan][endpoint]) {
      return res.status(429).json({ 
        error: `API limit exceeded for your ${user.subscription_plan} plan` 
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};