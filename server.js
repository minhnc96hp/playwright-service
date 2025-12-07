const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'playwright-service' });
});

// Scrape endpoint - Lấy nội dung trang
app.post('/scrape', async (req, res) => {
  const { url, waitFor, selector } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Đợi một thời gian nếu cần
    if (waitFor) {
      await page.waitForTimeout(waitFor);
    }
    
    // Đợi selector nếu có
    if (selector) {
      await page.waitForSelector(selector);
    }
    
    const content = await page.content();
    const title = await page.title();
    
    await browser.close();
    
    res.json({ 
      success: true, 
      data: {
        title,
        content,
        url
      }
    });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Screenshot endpoint - Chụp ảnh màn hình
app.post('/screenshot', async (req, res) => {
  const { url, fullPage = true, type = 'png' } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const screenshot = await page.screenshot({ 
      fullPage, 
      type 
    });
    
    await browser.close();
    
    // Trả về base64
    const base64Image = screenshot.toString('base64');
    
    res.json({ 
      success: true, 
      data: {
        image: base64Image,
        type,
        url
      }
    });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// PDF endpoint - Xuất PDF
app.post('/pdf', async (req, res) => {
  const { url, format = 'A4' } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const pdf = await page.pdf({ format });
    
    await browser.close();
    
    // Trả về base64
    const base64PDF = pdf.toString('base64');
    
    res.json({ 
      success: true, 
      data: {
        pdf: base64PDF,
        url
      }
    });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Execute script endpoint - Chạy custom script
app.post('/execute', async (req, res) => {
  const { url, script, waitFor } = req.body;
  
  if (!url || !script) {
    return res.status(400).json({ error: 'URL and script are required' });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    
    if (waitFor) {
      await page.waitForTimeout(waitFor);
    }
    
    // Thực thi script trong page context
    const result = await page.evaluate(script);
    
    await browser.close();
    
    res.json({ 
      success: true, 
      data: result
    });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Fill form endpoint - Điền form
app.post('/fill-form', async (req, res) => {
  const { url, fields, submitSelector, waitAfterSubmit = 2000 } = req.body;
  
  if (!url || !fields) {
    return res.status(400).json({ error: 'URL and fields are required' });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Điền các field
    for (const field of fields) {
      const { selector, value, type = 'fill' } = field;
      
      if (type === 'fill') {
        await page.fill(selector, value);
      } else if (type === 'click') {
        await page.click(selector);
      } else if (type === 'select') {
        await page.selectOption(selector, value);
      }
    }
    
    // Submit form nếu có
    if (submitSelector) {
      await page.click(submitSelector);
      await page.waitForTimeout(waitAfterSubmit);
    }
    
    const content = await page.content();
    const url_after = page.url();
    
    await browser.close();
    
    res.json({ 
      success: true, 
      data: {
        content,
        url: url_after
      }
    });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Playwright service running on port ${PORT}`);
});
