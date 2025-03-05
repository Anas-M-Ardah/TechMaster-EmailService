require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port:  587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // Needed for some email providers
  }
});

// Validation middleware
const validateContact = [
  body('name').trim().isLength({ min: 2 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('message').trim().isLength({ min: 10 }).escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

// Create email HTML
const createEmailHTML = (name, email, phone, message) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            margin: 0;
            padding: 0;
            background-color: #f5f6fa;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            max-width: 180px;
            height: auto;
            margin-bottom: 15px;
            border-radius: 5%;
        }
        .header h2 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .content {
            padding: 30px;
            background-color: #ffffff;
        }
        .field {
            margin-bottom: 25px;
            border-bottom: 1px solid #e1e8f0;
            padding-bottom: 15px;
        }
        .field:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .label {
            font-weight: 600;
            color: #1e3799;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
            display: block;
        }
        .value {
            font-size: 16px;
            color: #2c3e50;
            margin: 5px 0 0 0;
            line-height: 1.6;
        }
        .message-box {
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            margin-top: 5px;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e1e8f0;
        }
        .footer p {
            margin: 0;
            color: #606f7b;
            font-size: 13px;
        }
        .company-info {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e1e8f0;
            font-size: 12px;
            color: #8795a1;
        }
        @media only screen and (max-width: 600px) {
            .container {
                margin: 10px;
                width: auto;
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${process.env.COMPANY_LOGO_URL}" alt="Company Logo" class="logo">
            <h2>New Contact Inquiry</h2>
        </div>
        <div class="content">
            <div class="field">
                <span class="label">Name</span>
                <p class="value">${name}</p>
            </div>
            <div class="field">
                <span class="label">Email Address</span>
                <p class="value">${email}</p>
            </div>
            <div class="field">
                <span class="label">Phone Number</span>
                <p class="value">${phone}</p>
            </div>
            <div class="field">
                <span class="label">Message</span>
                <div class="message-box">
                    <p class="value">${message}</p>
                </div>
            </div>
        </div>
        <div class="footer">
            <p>This is an automated message from your contact form.</p>
            <div class="company-info">
                <p>${process.env.COMPANY_NAME || 'Your Company Name'}</p>
                <p>${process.env.COMPANY_ADDRESS || 'Company Address'}</p>
                <p>${process.env.COMPANY_PHONE || 'Contact Number'}</p>
            </div>
        </div>
    </div>
</body>
</html>
`;


// Contact form endpoint
app.post('/api/contact', validateContact, async (req, res) => {
  const { name, email, phone, message } = req.body;

  if(phone === '') {
    phone = 'Not Provided';
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      subject: `New Contact Form Submission from ${name}`,
      html: createEmailHTML(name, email, phone, message),
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    });

    res.status(200).json({
      success: true,
      message: 'Thank you for your message. We will get back to you shortly!'
    });

  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});