require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const keep_alive = require('./keep_alive');

const app = express();
const PORT = process.env.PORT || 5000;

// Define allowed origins
const allowedOrigins = [
  'https://technology-master.com',
  'https://www.technology-master.com',
  'http://localhost:3000',
  'http://localhost:5000'
];

// Basic middleware
app.use(bodyParser.json());

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Log the origin for debugging
  console.log('Request origin:', origin);

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});


// Enhanced security middleware
app.use(helmet());

// Initialize nodemailer with retry logic
const createTransporter = () => {
  // Email configuration
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false // Needed for some email providers
    }
  });

  return transporter;
};

const transporter = createTransporter();

// Sanitize input function
const sanitizeInput = (input) => sanitizeHtml(input, {
  allowedTags: [], // Strip all HTML tags
  allowedAttributes: {},
  disallowedTagsMode: 'recursiveEscape'
});

// Enhanced validation middleware
const validateContact = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .escape(),

  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-]{10,}$/)
    .withMessage('Please provide a valid phone number'),

  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
    .escape(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        message: 'Validation failed'
      });
    }
    next();
  }
];

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

// Enhanced email sending function with retry logic
const sendContactEmail = async (data, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await transporter.sendMail(data);
      return { success: true, response };
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`Retry attempt ${attempt} of ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};


// Enhanced contact form endpoint
app.post('/api/contact',
  validateContact,
  async (req, res) => {
    const { name, email, phone, message } = req.body;

    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      phone: phone ? sanitizeInput(phone) : '',
      message: sanitizeInput(message)
    };

    try {
      const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);

      console.log(`[${requestId}] Received contact form submission:`, {
        timestamp: new Date().toISOString(),
        ...sanitizedData
      });

      const emailData = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Contact Form',
          address: process.env.EMAIL_USER
        },
        to: sanitizedData.email,
        bcc: [process.env.BCC_1, process.env.BCC_2].filter(Boolean),
        subject: `New Contact Form Submission from ${sanitizedData.name}`,
        html: createEmailHTML(
          sanitizedData.name,
          sanitizedData.email,
          sanitizedData.phone || 'Not provided',
          sanitizedData.message
        ),
        text: `Name: ${sanitizedData.name}\nEmail: ${sanitizedData.email}\nPhone: ${sanitizedData.phone || 'Not provided'}\nMessage: ${sanitizedData.message}`,
        headers: {
          'X-Priority': 'High',
          'X-Contact-Form': 'true',
          'X-Request-ID': requestId
        }
      };

      const { response } = await sendContactEmail(emailData);

      console.log(`[${requestId}] Email sent successfully:`, {
        messageId: response.messageId,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Thank you for your message. We will get back to you shortly!',
        requestId
      });

    } catch (error) {
      const errorId = Date.now().toString(36);
      console.error(`[${errorId}] Contact form error:`, {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        message: 'We apologize, but we could not process your request at this time. Please try again later.',
        errorId,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  const errorId = Date.now().toString(36);
  console.error(`[${errorId}] Global error:`, error);

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    errorId,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
  });
});

// Start server with error handling
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  transporter.close();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});