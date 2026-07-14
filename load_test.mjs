import https from 'https';

const TARGET_URL = 'https://wedding-app-ilbo.onrender.com/';
const TOTAL_REQUESTS = 200;
const CONCURRENCY = 40; 

let completed = 0;
let success = 0;
let errors = 0;
let totalTime = 0;

console.log(`🚀 開始對 ${TARGET_URL} 進行極限壓力測試...`);
console.log(`👥 模擬 ${TOTAL_REQUESTS} 位賓客以高併發 (Concurrency: ${CONCURRENCY}) 同時湧入...`);

const startTime = Date.now();

async function makeRequest(id) {
  const reqStart = Date.now();
  return new Promise((resolve) => {
    const req = https.get(TARGET_URL, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const reqEnd = Date.now();
        const duration = reqEnd - reqStart;
        totalTime += duration;
        
        if (res.statusCode >= 200 && res.statusCode < 400) {
          success++;
          process.stdout.write('🟢');
        } else {
          errors++;
          process.stdout.write(`🔴[${res.statusCode}]`);
        }
        completed++;
        resolve();
      });
    }).on('error', (err) => {
      errors++;
      process.stdout.write('❌');
      completed++;
      resolve();
    });
    
    // Set a timeout of 15 seconds per request
    req.setTimeout(15000, () => {
      req.destroy();
      errors++;
      process.stdout.write('⏱️');
      completed++;
      resolve();
    });
  });
}

async function run() {
  const queue = Array.from({ length: TOTAL_REQUESTS }, (_, i) => i);
  
  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      await makeRequest(id);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  
  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;
  
  console.log('\n\n📊 ===== 壓力測試報告 =====');
  console.log(`總請求數: ${TOTAL_REQUESTS}`);
  console.log(`最高同時連線數: ${CONCURRENCY}`);
  console.log(`總花費時間: ${totalDuration.toFixed(2)} 秒`);
  console.log(`平均回應時間: ${(totalTime / TOTAL_REQUESTS).toFixed(2)} 毫秒`);
  console.log(`成功次數 (HTTP 200): ${success}`);
  console.log(`失敗/當機次數: ${errors}`);
  console.log('===========================\n');
  
  if (errors === 0) {
    console.log('🎉 恭喜！Render Starter 伺服器完美扛住了 200 人的極限轟炸，毫無壓力！您的婚禮絕對順暢！');
  } else {
    console.log('⚠️ 伺服器出現了錯誤，可能是剛升級還沒重開機完畢，或是連線數達到上限。');
  }
}

run();
