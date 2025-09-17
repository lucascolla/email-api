const nodemailer = require('nodemailer')
const mustache = require('mustache')
const fs = require('fs')
const path = require('path')

sendEmail = function (req, res) {
  const _cc = [];

  let smtp_from = req.body.from || process.env.SMTP_FROM;

  if (req.body.cc) {
    _cc.push(req.body.cc);
  }
  if (process.env.SMTP_CC) {
    _cc.push(process.env.SMTP_CC);
  }

  const template = req.body.template || '';
  const variables = req.body.variables || {};
  let finalHtml = req.body.html;

  if (req.body.template) {
    const templatePath = path.join(__dirname, 'templates', `${template}.html`);
    if (!fs.existsSync(templatePath)) {
      return res.status(400).json({ error: 'Template not found [' + template + '].' });
    }
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    finalHtml = mustache.render(templateContent, variables);
  }

  if (req.body?.cc) {
    _cc.push(req.body.cc);
  }
  if (process.env.SMTP_CC) {
    _cc.push(process.env.SMTP_CC);
  }
  return deliver({
    from: smtp_from,
    to: req.body.to,
    cc: _cc,
    subject: `${req.body.subject}`,
    text: req.body.text,
    html: finalHtml
  }, res);
}


function deliver(message, res) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_FROM,
      pass: process.env.SMTP_PASS
    },
    requireTLS: true,
    logger: true
  })

  transporter.sendMail(message, (error, info) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error("🔴 Send Email Error:", error.toString());
      res.sendStatus(500)
    } else {
      res.sendStatus(200)
    }
  })
}

module.exports = {
  sendEmail
}