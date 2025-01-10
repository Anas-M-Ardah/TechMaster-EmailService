require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mailgun = require('mailgun-js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

const mg = mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN});

app.post('/api/contact', (req, res) => {
  const { name, email, phone, message } = req.body;

  const data = {
    from: email,
    to: process.env.EMAIL_USER,
    subject: 'New Contact Form Submission',
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`,
  };

  mg.messages().send(data, (error, body) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to send email' });
    }
    res.status(200).json({ message: 'Email sent successfully' });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});