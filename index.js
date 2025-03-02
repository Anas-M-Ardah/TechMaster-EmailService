require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mailgun = require('mailgun-js');
const keep_alive = require('./keep_alive');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

const mg = mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN});

// HTML email template
const createEmailHTML = (name, email, phone, message) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            max-width: 200px;
            height: auto;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
        }
        .field {
            margin-bottom: 15px;
        }
        .label {
            font-weight: bold;
            color: #666;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${process.env.COMPANY_LOGO_URL}" alt="Company Logo" class="logo">
            <h2>New Contact Form Submission</h2>
        </div>
        <div class="content">
            <div class="field">
                <span class="label">Name:</span>
                <p>${name}</p>
            </div>
            <div class="field">
                <span class="label">Email:</span>
                <p>${email}</p>
            </div>
            <div class="field">
                <span class="label">Phone:</span>
                <p>${phone}</p>
            </div>
            <div class="field">
                <span class="label">Message:</span>
                <p>${message}</p>
            </div>
        </div>
        <div class="footer">
            <p>This is an automated message from your contact form.</p>
        </div>
    </div>
</body>
</html>
`;

app.post('/api/contact', (req, res) => {
  const { name, email, phone, message } = req.body;

  //validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid email address' 
    });
  }

  const data = {
    from: `${process.env.COMPANY_NAME} <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    bcc: [process.env.EMAIL_USER2, process.env.EMAIL_USER3].join(', '),
    subject: 'New Contact Form Submission',
    html: createEmailHTML(name, email, phone, message),
    // Keep the text version as fallback
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`,
  };

  mg.messages().send(data, (error, body) => {
    if (error) {
      console.error('Email sending error:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to send email',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    res.status(200).json({ 
      success: true,
      message: 'Thank you for your message. We will get back to you shortly!' 
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});