require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Say hello world');
    console.log('Success:', result.response.text());
  } catch (error) {
    console.error('Error:', error);
  }
}

testGemini();
