// routes/subscriptionRoutes.js
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

const router = express.Router();

router.post('/create-subscription', async (req, res) => {
  try {
    const { email, paymentMethodId, planId } = req.body;
    
    // Create customer
    const customer = await stripe.customers.create({
      email,
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId }
    });
    
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ plan: planId }],
      expand: ['latest_invoice.payment_intent']
    });
    
    // Update user in database
    await User.findOneAndUpdate({ email }, {
      subscription: {
        plan: planId.includes('premium') ? 'premium' : 'basic',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id
      }
    });
    
    res.json({
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: subscription.id
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Webhook for subscription events
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle subscription events
  switch (event.type) {
    case 'invoice.payment_succeeded':
      const subscription = event.data.object;
      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': subscription.subscription },
        { $set: { 'subscription.expiresAt': new Date(subscription.period_end * 1000) } }
      );
      break;
    case 'customer.subscription.deleted':
      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': event.data.object.id },
        { $set: { 'subscription.plan': 'free', 'subscription.expiresAt': new Date() } }
      );
      break;
  }

  res.json({ received: true });
});

module.exports = router;