// models/User.js
const supabase = require('../config/supabase');

class User {
  // Create user profile after auth signup
  static async createProfile(userId, email, fullName = '') {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        { 
          id: userId,
          email,
          full_name: fullName
        }
      ]);
    
    if (error) throw error;
    return data;
  }

  // Get user by ID
  static async findById(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Update user profile
  static async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  // Increment API usage counter
  static async incrementApiUsage(userId, endpoint) {
    const { data, error } = await supabase.rpc('increment_jsonb_field', {
      table_name: 'profiles',
      field_name: 'api_usage',
      key: endpoint,
      id: userId
    });
    
    if (error) throw error;
    return data;
  }

  // Get users by subscription plan
  static async getBySubscription(plan) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('subscription_plan', plan);
    
    if (error) throw error;
    return data;
  }
}

module.exports = User;