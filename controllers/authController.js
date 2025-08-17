// controllers/authController.js
const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data: user, error } = await supabase
      .from('users')
      .insert([{ 
        email, 
        password_hash: hashedPassword 
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { 
      expiresIn: '7d' 
    });
    
    res.status(201).json({ 
      token, 
      user: { 
        email: user.email, 
        plan: user.subscription_plan 
      } 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (error || !user) throw new Error('Invalid credentials');
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) throw new Error('Invalid credentials');
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    
    res.json({ 
      token, 
      user: { 
        email: user.email, 
        plan: user.subscription_plan 
      } 
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};