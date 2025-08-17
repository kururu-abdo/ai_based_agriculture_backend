const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const {User} = require('../models/user');
const { sendEmail } = require('../services/emailService');
const { authenticate, checkVerified } = require('../middleware/authMiddleware');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Create user in Supabase
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) throw error;

    // Create user in MongoDB
    const newUser = new User({
      email,
      name,
      supabaseUserId: user.id,
      subscription: {
        plan: 'free',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30-day trial
      }
    });

    await newUser.save();

    // Send verification email
    const verificationLink = await supabase.auth.api.generateEmailVerificationLink(email);
    await sendEmail({
      to: email,
      subject: 'Verify Your Email',
      html: `Click <a href="${verificationLink}">here</a> to verify your email.`
    });

    res.status(201).json({ message: 'Registration successful. Please check your email.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { user, error, session } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Get user from MongoDB
    const dbUser = await User.findOne({ supabaseUserId: user.id });

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: dbUser._id, 
        email: user.email,
        plan: dbUser.subscription.plan 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      token,
      user: {
        id: dbUser._id,
        email: user.email,
        name: dbUser.name,
        plan: dbUser.subscription.plan,
        isVerified: user.email_confirmed_at !== null
      }
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-__v -createdAt -updatedAt');

    if (!user) throw new Error('User not found');

    res.json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Request password reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) throw error;

    res.json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update password
router.post('/update-password', authenticate, async (req, res) => {
  try {
    const { newPassword } = req.body;

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;