require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT;
const mailer = require("./mailer");
const Markdown = require("markdown-it");
const fs = require("fs");
const path = require("path");
const readme = fs.readFileSync(path.join(__dirname, "./README.md"));
const { body, validationResult } = require("express-validator");
const cors = require("cors");

const md = Markdown();
const html = md.render(readme.toString().replaceAll('{domain.com}', process.env?.DOMAIN ? process.env.DOMAIN : `localhost:${process.env.PORT}`));

// Configure CORS
var whitelist = process.env?.WHITELIST && process.env?.WHITELIST !== '' ? process.env.WHITELIST?.split(',') : [];
if (whitelist.length > 0) {
  console.log("CORS Whitelist: ", whitelist)
}
var corsOptionsDelegate = function (req, callback) {
  if (whitelist.indexOf(req.header('Origin')) === -1 && req.header('authorization') !== process.env.AUTHORIZATION_KEY) {
    return callback(new Error("Not allowed by CORS"));
  }
  return callback(null, true);
}

app.get("/", cors(corsOptionsDelegate), (req, res) => {
  res.status(200)
    .set("Content-Type", "text/html")
    .send(Buffer.from('<body style="background-color: black;"><img src="https://http.cat/200" alt="https://http.cat/200" style="text-align: center;position: absolute;margin: auto;top: 0;right: 0;bottom: 0;left: 0;max-width: 100%;"></body>'));
});

app.get("/readme", (req, res) => {
  res.set("Content-Type", "text/html");
  res.send(Buffer.from(html));
});

app.use(express.json());
app.options('/send', cors(corsOptionsDelegate)) // enable pre-flight request for POST request
app.post(
  "/send",
  cors(corsOptionsDelegate),
  // Normal Email
  body("from").optional().isEmail().normalizeEmail(),
  body("to").notEmpty().isEmail().normalizeEmail(),
  body("cc").optional().isEmail().normalizeEmail(),
  body("subject")
    .notEmpty()
    .trim()
    .escape()
    .isLength({ min: 2 }),
  body("html").optional().trim().escape().isLength({ min: 2 }),
  body("text").optional().trim().escape().isLength({ min: 2 }),
  body("template").optional().isString().trim().escape(),
  body("variables").optional().isObject(),
  body().custom((body) => {
    if (!body.text && !body.html && !body.template) {
      throw new Error("At least one of 'text', 'html' or 'template' is required.");
    }
    if (body.template && !body.variables) {
      throw new Error("Variables are required when using a template.");
    }
    return true;
  }),
  (req, res, next) => {
    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    return next();
  },
  mailer.sendEmail
);

app.use((err, req, res, next) => {
  console.error("🔴 Express Error Catched:", err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong' });
  // res.status(500)
  //   .set("Content-Type", "text/html")
  //   .send(Buffer.from('<body style="background-color: black;"><img src="https://http.cat/500" alt="https://http.cat/500" style="text-align: center;position: absolute;margin: auto;top: 0;right: 0;bottom: 0;left: 0;max-width: 100%;"></body>'));
})


app.listen(port, () => {
  console.log(`🟢 Mailer API listening on port ${port}`);
});

process.on('uncaughtException', function (err) {
  console.error("🔴 Node Error Catched:", err.stack);
});
