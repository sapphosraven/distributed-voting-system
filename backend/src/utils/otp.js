const { redis } = require('./db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY }
});

exports.generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: 'no-reply@votingapp.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}`
  });
};

exports.storeOtp = async (email, otp) => {
  await redis.set(`otp:${email}`, otp, 'EX', 300);
};

exports.verifyOtp = async (email, otp) => {
  const stored = await redis.get(`otp:${email}`);
  return stored === otp;
};
