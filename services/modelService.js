const tf = require('@tensorflow/tfjs-node');
const supabase = require('../config/supabase');

class ModelService {
  constructor() {
    this.models = {};
  }

  async loadModel(modelName) {
    if (this.models[modelName]) return;
    
    // Download model from Supabase Storage
    const { data, error } = await supabase.storage
      .from('models')
      .download(`${modelName}/model.json`);
      
    if (error) throw new Error(`Model load failed: ${error.message}`);
    
    // Load TensorFlow model
    this.models[modelName] = await tf.loadLayersModel(
      `data:application/json,${encodeURIComponent(await data.text())}`
    );
  }

  async predictSoilQuality(inputData) {
    await this.loadModel('soil_analysis');
    
    // Preprocess input
    const inputTensor = tf.tensor2d([
      [inputData.pH, inputData.nitrogen, inputData.phosphorus, 
       inputData.potassium, inputData.moisture]
    ]);
    
    // Make prediction
    const prediction = this.models['soil_analysis'].predict(inputTensor);
    const result = await prediction.data();
    
    return {
      qualityScore: result[0],
      recommendations: this.generateRecommendations(result[0])
    };
  }

  async detectDisease(imageBuffer) {
    await this.loadModel('disease_detection');
    
    // Preprocess image
    const decodedImage = tf.node.decodeImage(imageBuffer);
    const resizedImage = tf.image.resizeBilinear(decodedImage, [224, 224]);
    const normalizedImage = resizedImage.div(255.0);
    const batchedImage = normalizedImage.expandDims(0);
    
    // Make prediction
    const prediction = this.models['disease_detection'].predict(batchedImage);
    const result = await prediction.data();
    
    return {
      healthy: result[0],
      fungal: result[1],
      bacterial: result[2]
    };
  }

  generateRecommendations(score) {
    // Your recommendation logic here
  }
}

module.exports = new ModelService();