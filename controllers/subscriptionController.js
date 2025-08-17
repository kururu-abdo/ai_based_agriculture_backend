// controllers/subscriptionController.js
const supabase = require('../config/supabase');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createSubscription = async (req, res) => {
  try {
    const { paymentMethodId, planId } = req.body;
    
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: req.user.email,
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId }
    });
    
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ plan: planId }],
      expand: ['latest_invoice.payment_intent']
    });
    
    // Update user in Supabase
    const { error } = await supabase
      .from('users')
      .update({
        subscription_plan: getPlanName(planId),
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id
      })
      .eq('id', req.userId);
      
    if (error) throw error;
    
    res.json({
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: subscription.id
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

function getPlanName(planId) {
  if (planId.includes('premium')) return 'premium';
  if (planId.includes('basic')) return 'basic';
  return 'free';
}