import express from 'express';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Create email transporter - Using Brevo SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter connection
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
    console.error('Please check your SMTP credentials in .env file');
    console.error('SMTP_USER:', process.env.SMTP_USER);
    console.error('SENDER_EMAIL:', process.env.SENDER_EMAIL);
  } else {
    console.log('✅ Brevo SMTP server is ready to send messages');
    console.log('Configured sender:', process.env.SENDER_EMAIL);
  }
});

// TEST endpoint - Simple email test
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🧪 Testing email with simple message...');
    console.log('To:', email);
    console.log('From:', process.env.SENDER_EMAIL);
    
    const testMail = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: 'Test Email from ADHYAN.AI',
      text: 'This is a test email. If you receive this, email is working!',
    };
    
    const result = await transporter.sendMail(testMail);
    console.log('✅ Test email sent!', result);
    
    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('❌ Test email failed:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Command:', error.command);
    console.error('Response:', error.response);
    console.error('ResponseCode:', error.responseCode);
    
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      response: error.response
    });
  }
});

// Teacher Forgot Password Route
router.post('/teacher/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log('\n🔍 Searching for teacher with email:', email);
    const teacher = await User.findOne({ email, role: 'teacher' });
    
    console.log('Query result:', teacher ? '✅ Found' : '❌ Not found');
    console.log('Found user:', teacher ? { name: teacher.name, email: teacher.email, role: teacher.role } : 'null');
    
    // If not found with role, try without role to debug
    if (!teacher) {
      const anyUser = await User.findOne({ email });
      console.log('\n🔎 Searching for user with email (without role filter):', anyUser ? '✅ Found' : '❌ Not found');
      if (anyUser) {
        console.log('User found but role mismatch. User role:', anyUser.role, 'Expected: teacher');
      }
      console.log('\n⚠️  No teacher account found with this email');
      return res.status(404).json({ error: 'No account found with this email. Make sure this email is registered as a teacher.' });
    }

    console.log('📋 Teacher found:', { name: teacher.name, email: teacher.email, hasPassword: !!teacher.password });

    // Generate a new temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex').substring(0, 12).toUpperCase();
    console.log('🔐 Generated temporary password:', tempPassword);
    
    // Hash the temporary password before storing
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Update user with new hashed password
    await User.findByIdAndUpdate(teacher._id, { password: hashedPassword });
    console.log('✅ Password updated in database');

    // Email content
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: 'ADHYAN.AI - Your Password Recovery',
      text: `Hello ${teacher.name || 'Teacher'},\n\nYour temporary password is: ${tempPassword}\n\nPlease login at: http://localhost:5174/login and change your password immediately after logging in.\n\nFor security reasons, do not share this password with anyone.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .password-box { background: white; border: 2px solid #7c3aed; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
            .password { font-size: 24px; font-weight: bold; color: #7c3aed; letter-spacing: 2px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Recovery</h1>
              <p>ADHYAN.AI</p>
            </div>
            <div class="content">
              <p>Hello ${teacher.name || 'Teacher'},</p>
              <p>We received a request to recover your password. Here is your temporary password:</p>
              
              <div class="password-box">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Temporary Password</p>
                <p class="password">${tempPassword}</p>
              </div>

              <div class="warning">
                <strong>⚠️ Important Security Note</strong>
                <p style="margin: 5px 0 0 0;"><strong>This is a temporary password.</strong> Please change it immediately after logging in for security reasons. Do not share this password with anyone.</p>
              </div>

              <p>To login, use this temporary password and then set your own strong password in your account settings.</p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.TEACHER_URL || 'http://localhost:5174'}/login" 
                   style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Login to Your Account
                </a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated email from ADHYAN.AI</p>
              <p>If you need assistance, contact us at support@adhyan.ai</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Send email
    console.log('📧 Attempting to send email to teacher...');
    console.log('From:', process.env.SENDER_EMAIL);
    console.log('To:', email);
    console.log('SMTP User:', process.env.SMTP_USER);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Teacher email sent successfully:', info.messageId);
    console.log('Response:', info.response);

    res.json({ 
      message: 'Password sent successfully to your email',
      success: true 
    });

  } catch (error) {
    console.error('❌ Teacher forgot password error:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.response) console.error('Error response:', error.response);
    
    res.status(500).json({ 
      error: 'Failed to send email. Please try again later.',
      details: error.message,
      code: error.code
    });
  }
});

// Student Forgot Password Route
router.post('/student/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log('\n🔍 Searching for student with email:', email);
    // Find student by email
    const student = await User.findOne({ email, role: 'student' });

    console.log('Query result:', student ? '✅ Found' : '❌ Not found');
    console.log('Found user:', student ? { name: student.name, email: student.email, role: student.role } : 'null');

    if (!student) {
      // If not found with role, try without role to debug
      const anyUser = await User.findOne({ email });
      console.log('\n🔎 Searching for user with email (without role filter):', anyUser ? '✅ Found' : '❌ Not found');
      if (anyUser) {
        console.log('User found but role mismatch. User role:', anyUser.role, 'Expected: student');
      }
      console.log('\n⚠️  No student account found with this email');
      return res.status(404).json({ error: 'No account found with this email. Make sure this email is registered as a student.' });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex').substring(0, 12).toUpperCase();
    console.log('🔐 Generated temporary password:', tempPassword);
    
    // Hash the temporary password before storing
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Update user with new hashed password
    await User.findByIdAndUpdate(student._id, { password: hashedPassword });
    console.log('✅ Password updated in database');

    console.log('📋 Student found:', { name: student.name, email: student.email, hasPassword: !!tempPassword });

    // Email content
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: 'ADHYAN.AI - Your Password Recovery',
      text: `Hello ${student.name || 'Student'},\n\nYour temporary password is: ${tempPassword}\n\nPlease login at: http://localhost:5173/login and change your password immediately after logging in.\n\nFor security reasons, do not share this password with anyone.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .password-box { background: white; border: 2px solid #7c3aed; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
            .password { font-size: 24px; font-weight: bold; color: #7c3aed; letter-spacing: 2px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Recovery</h1>
              <p>ADHYAN.AI</p>
            </div>
            <div class="content">
              <p>Hello ${student.name || 'Student'},</p>
              <p>We received a request to recover your password. Here is your temporary password:</p>
              
              <div class="password-box">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Temporary Password</p>
                <p class="password">${tempPassword}</p>
              </div>

              <div class="warning">
                <strong>⚠️ Important Security Note</strong>
                <p style="margin: 5px 0 0 0;"><strong>This is a temporary password.</strong> Please change it immediately after logging in for security reasons. Do not share this password with anyone.</p>
              </div>

              <p>To login, use this temporary password and then set your own strong password in your account settings.</p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.STUDENT_URL || 'http://localhost:5173'}/login" 
                   style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Login to Your Account
                </a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated email from ADHYAN.AI</p>
              <p>If you need assistance, contact us at support@adhyan.ai</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Send email
    console.log('📧 Attempting to send email to student...');
    console.log('From:', process.env.SENDER_EMAIL);
    console.log('To:', email);
    console.log('SMTP User:', process.env.SMTP_USER);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Student email sent successfully:', info.messageId);
    console.log('Response:', info.response);

    res.json({ 
      message: 'Password sent successfully to your email',
      success: true 
    });

  } catch (error) {
    console.error('❌ Student forgot password error:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.response) console.error('Error response:', error.response);
    
    res.status(500).json({ 
      error: 'Failed to send email. Please try again later.',
      details: error.message,
      code: error.code
    });
  }
});

export default router;