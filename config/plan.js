// config/plans.js
module.exports = {
  free: {
    soilAnalysis: 10,       // 10 requests/month
    cropRecommendation: 10,
    diseaseDetection: 5,
    price: 0
  },
  basic: {
    soilAnalysis: 100,      // 100 requests/month
    cropRecommendation: 100,
    diseaseDetection: 50,
    price: 9.99             // $9.99/month
  },
  premium: {
    soilAnalysis: 1000,     // 1000 requests/month
    cropRecommendation: 1000,
    diseaseDetection: 500,
    price: 29.99            // $29.99/month
  }
};