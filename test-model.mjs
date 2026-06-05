import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
  try {
    const models = await genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }).generateContent('test');
    console.log('gemini-1.5-pro works!');
  } catch(e) {
    console.error('Pro error:', e.message);
  }
}
run();
