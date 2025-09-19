const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Queue = require('bull');
const axios = require('axios');
require('dotenv').config();

const emailQueue = new Queue('email processing', {
  redis: { host: '127.0.0.1', port: 6379 }
});

const otpStorage = new Map();
const emailAttempts = new Map();

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Rate limiting: 500 emails per 24 hours
const DAILY_EMAIL_LIMIT = 500;
let dailyEmailCount = 0;
let lastResetTime = Date.now();

// Reset daily count every 24 hours
const resetDailyCount = () => {
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  
  if (now - lastResetTime >= twentyFourHours) {
    dailyEmailCount = 0;
    lastResetTime = now;
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Queue processor for sending emails
emailQueue.process(async (job) => {
  const { email, otp } = job.data;
  
  resetDailyCount();
  
  if (dailyEmailCount >= DAILY_EMAIL_LIMIT) {
    throw new Error('Daily email limit reached');
  }
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Your OTP for email verification is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 36px; margin: 0;">${otp}</h1>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
  dailyEmailCount++;
  console.log(`Email sent to ${email}. Daily count: ${dailyEmailCount}`);
});


router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    // Check rate limiting per email (max 3 attempts per hour)
    const now = Date.now();
    const emailKey = email.toLowerCase();
    const attempts = emailAttempts.get(emailKey) || [];
    const recentAttempts = attempts.filter(time => now - time < 60 * 60 * 1000);
    
    if (recentAttempts.length >= 3) {
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }
    
    const otp = generateOTP();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes
    
    // Store OTP
    otpStorage.set(emailKey, { otp, expiresAt });
    
    // Track attempt
    recentAttempts.push(now);
    emailAttempts.set(emailKey, recentAttempts);
    
    // Add to queue
    await emailQueue.add('send-otp', { email, otp });
    
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP and check LinkedIn organization
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    const emailKey = email.toLowerCase();
    const storedData = otpStorage.get(emailKey);
    
    if (!storedData) {
      return res.status(400).json({ error: 'No OTP found for this email' });
    }
    
    if (Date.now() > storedData.expiresAt) {
      otpStorage.delete(emailKey);
      return res.status(400).json({ error: 'OTP has expired' });
    }
    
    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    // OTP verified, now check LinkedIn organization
    const domain = email.split('@')[1];
    
    try {
      const linkedinToken = process.env.LINKEDIN_ACCESS_TOKEN;
      
      if (!linkedinToken) {
        throw new Error('LinkedIn access token not configured');
      }
      
      const response = await axios.get(
        `https://api.linkedin.com/rest/organizations?q=emailDomain&emailDomain=${domain}`,
        {
          headers: {
            'Authorization': `Bearer ${linkedinToken}`,
            'LinkedIn-Version': '202405',
            'X-RestLi-Protocol-Version': '2.0.0'
          }
        }
      );
      
      // Clear OTP after successful verification
      otpStorage.delete(emailKey);
      
      if (response.data && response.data.elements && response.data.elements.length > 0) {
        const organization = response.data.elements[0];
        res.json({
          success: true,
          verified: true,
          message: 'Employee verification successful',
          organization: {
            name: organization.localizedName,
            id: organization.id
          }
        });
      } else {
        res.json({
          success: true,
          verified: false,
          message: 'No organization found for this email domain'
        });
      }
      
    } catch (linkedinError) {
      console.error('LinkedIn API error:', linkedinError.response?.data || linkedinError.message);
      
      // Clear OTP even if LinkedIn check fails
      otpStorage.delete(emailKey);
      
      res.json({
        success: true,
        verified: false,
        message: 'Unable to verify organization. Email verified but organization lookup failed.'
      });
    }
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get queue status
router.post('/queue-status', async (req, res) => {
  try {
    const waiting = await emailQueue.getWaiting();
    const active = await emailQueue.getActive();
    const completed = await emailQueue.getCompleted();
    const failed = await emailQueue.getFailed();
    
    resetDailyCount();
    
    res.json({
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      dailyEmailCount,
      dailyLimit: DAILY_EMAIL_LIMIT
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

// Health check
router.post('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


// Graceful shutdown
process.on('SIGTERM', async () => {
  await emailQueue.close();
  process.exit(0);
});

module.exports = router