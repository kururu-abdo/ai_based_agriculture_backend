const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-subscription', async (req, res) => {
  try {
    const { planId, supabaseUserId } = req.body;
    
    // Get user from MongoDB
    const user = await User.findOne({ supabaseUserId });
    if (!user) throw new Error('User not found');
    
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabaseUserId }
    });
    
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: planId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });
    
    // Update user record
    user.subscription = {
      plan: planId.includes('premium') ? 'premium' : 'basic',
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      expiresAt: new Date(subscription.current_period_end * 1000)
    };
    
    await user.save();
    
    res.json({
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: subscription.id
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});