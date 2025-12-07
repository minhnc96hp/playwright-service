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

// Interactive automation endpoint - Tương tác phức tạp với trình duyệt
app.post('/interact', async (req, res) => {
  const { url, actions, waitForNavigation = false, screenshot = false } = req.body;
  
  if (!url || !actions || !Array.isArray(actions)) {
    return res.status(400).json({ 
      error: 'URL and actions array are required' 
    });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const results = [];
    
    // Thực hiện từng action theo thứ tự
    for (const action of actions) {
      const { type, selector, value, options = {} } = action;
      
      try {
        switch (type) {
          case 'click':
            await page.click(selector, options);
            results.push({ action: 'click', selector, success: true });
            break;
            
          case 'fill':
          case 'type':
            await page.fill(selector, value);
            results.push({ action: 'fill', selector, value, success: true });
            break;
            
          case 'select':
            await page.selectOption(selector, value);
            results.push({ action: 'select', selector, value, success: true });
            break;
            
          case 'check': // Checkbox/radio
            await page.check(selector);
            results.push({ action: 'check', selector, success: true });
            break;
            
          case 'uncheck':
            await page.uncheck(selector);
            results.push({ action: 'uncheck', selector, success: true });
            break;
            
          case 'hover':
            await page.hover(selector);
            results.push({ action: 'hover', selector, success: true });
            break;
            
          case 'scroll':
            await page.evaluate((sel) => {
              document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' });
            }, selector);
            results.push({ action: 'scroll', selector, success: true });
            break;
            
          case 'wait':
            if (selector) {
              await page.waitForSelector(selector, { timeout: options.timeout || 5000 });
            } else if (value) {
              await page.waitForTimeout(parseInt(value));
            }
            results.push({ action: 'wait', selector, success: true });
            break;
            
          case 'getText':
            const text = await page.textContent(selector);
            results.push({ action: 'getText', selector, text, success: true });
            break;
            
          case 'getAttribute':
            const attr = await page.getAttribute(selector, value);
            results.push({ action: 'getAttribute', selector, attribute: value, value: attr, success: true });
            break;
            
          case 'evaluate':
            const evalResult = await page.evaluate(value);
            results.push({ action: 'evaluate', result: evalResult, success: true });
            break;
            
          case 'press':
            await page.press(selector, value); // Nhấn phím như Enter, Tab, etc.
            results.push({ action: 'press', selector, key: value, success: true });
            break;
            
          default:
            results.push({ action: type, error: 'Unknown action type', success: false });
        }
        
        // Đợi một chút sau mỗi action để page ổn định
        await page.waitForTimeout(options.delay || 100);
        
      } catch (error) {
        results.push({ 
          action: type, 
          selector, 
          error: error.message, 
          success: false 
        });
      }
    }
    
    // Lấy thông tin cuối cùng
    const finalUrl = page.url();
    const title = await page.title();
    
    let screenshotData = null;
    if (screenshot) {
      const shot = await page.screenshot({ fullPage: false });
      screenshotData = shot.toString('base64');
    }
    
    await browser.close();
    
    res.json({ 
      success: true,
      data: {
        results,
        finalUrl,
        title,
        screenshot: screenshotData
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
