// enforce Node.js runtime (nodemailer won't work on the Edge runtime)
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// In-memory storage
const contacts: any[] = [];

// Enhanced CORS config to accept requests from anywhere
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow all origins
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
  "Access-Control-Allow-Credentials": "false", // Set to false when using wildcard origin
  "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
};

// helper function to add CORS headers
function withCors(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders,
  });
}

// Create transporter with better error handling
const createTransport = () => {
  try {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
      // Add timeout and connection limits
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });
  } catch (error) {
    console.error("Failed to create transporter:", error);
    return null;
  }
};

const transporter = createTransport();

// Verify transporter on startup (optional, non-blocking)
if (transporter) {
  transporter.verify()
    .then(() => {
      console.log("✅ SMTP transporter ready");
    })
    .catch((err) => {
      console.error("❌ SMTP verify failed:", err.message);
    });
}

// Handle preflight OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Handle POST requests for contact form
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return withCors({ 
        error: "Name, email, subject, and message are required.",
        missing: {
          name: !name,
          email: !email,
          subject: !subject,
          message: !message,
        }
      }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return withCors({ error: "Please provide a valid email address." }, 400);
    }

    // Validate phone format if provided (10 digits)
    if (phone && phone.trim()) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone.trim())) {
        return withCors({ error: "Please provide a valid 10-digit phone number." }, 400);
      }
    }

    // Check if email configuration is available
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("Missing SMTP configuration");
      // Still save the contact but warn about email
    }

    // Create contact object
    const contact = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || "",
      subject: subject.trim(),
      message: message.trim(),
      status: "new",
      createdAt: new Date().toISOString(),
    };

    // Store contact
    contacts.push(contact);
    console.log(`📧 New contact form submission: ${contact.id} from ${name}`);

    // Send emails if transporter is available
    let emailStatus = {
      adminSent: false,
      userSent: false,
      error: null as string | null,
    };

    if (transporter && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Admin email
      if (process.env.ADMIN_EMAIL) {
        try {
          const adminMailOptions = {
            from: process.env.SMTP_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `📧 New Contact Form Submission - ${subject}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
                <div style="background: #004a99; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                  <h2 style="margin: 0;">📧 New Contact Form Submission</h2>
                </div>
                <div style="background: white; padding: 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${name}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${email}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${phone || "N/A"}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Subject:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${subject}</td></tr>
                    <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Message:</strong></td><td style="padding: 8px 0;">${message.replace(/\n/g, "<br>")}</td></tr>
                  </table>
                  <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                    <p style="margin: 0; color: #1565c0;"><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
                    <p style="margin: 5px 0 0 0; color: #1565c0;"><strong>Status:</strong> New</p>
                  </div>
                </div>
              </div>
            `,
          };

          await transporter.sendMail(adminMailOptions);
          emailStatus.adminSent = true;
          console.log("✅ Admin notification sent");
        } catch (error) {
          console.error("❌ Admin email failed:", error);
          emailStatus.error = "Failed to send admin notification";
        }
      }

      // User confirmation email
      try {
        const hospitalName = "Apex Hospital";
        const hospitalAddress = "Plot No 1 and 6, Vijapur Rd, opp. to Galaxy Panache, Yamini Nagar, Swami Vivekanand Nagar 2, Solapur, Maharashtra 413007";
        const hospitalPhone = "0217 260 0603";

        const userMailOptions = {
          from: process.env.SMTP_USER,
          to: email,
          subject: "✅ Thank you for contacting Apex Hospital",
          html: `
            <div style="font-family: Arial, sans-serif; background-color: #f5f7fa; padding: 0; margin: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background: #004a99; padding: 16px 24px; color: #ffffff;">
                    <div style="font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">🏥 ${hospitalName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px; color: #1f2d3d;">
                    <h2 style="margin-top: 0; font-size: 22px; color: #0f254e;">Thank you for contacting us!</h2>
                    <p style="margin: 8px 0;">Dear ${name},</p>
                    <p style="margin: 8px 0;">We have received your message and will get back to you within 24 hours.</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h4 style="margin: 0 0 12px 0; color: #374151;">📝 Your Message:</h4>
                      <div style="background: #ffffff; padding: 12px; border-radius: 4px; border: 1px solid #e1e5ea; white-space: pre-wrap; line-height: 1.4; color: #1f2937;">
${message.replace(/\n/g, "<br>")}
                      </div>
                    </div>

                    <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
                      <p style="margin: 0; color: #1e40af; font-weight: 500;">📞 We will respond to your inquiry shortly.</p>
                    </div>

                    <p style="margin: 24px 0 0; font-size: 14px; color: #555;">Best regards,<br /><strong>${hospitalName} Team</strong></p>
                  </td>
                </tr>
                <tr>
                  <td style="background: #f0f4f9; padding: 16px 24px; font-size: 12px; color: #666;">
                    <div style="margin-bottom: 6px;"><strong>📍 Address:</strong> ${hospitalAddress}</div>
                    <div style="margin-bottom: 6px;"><strong>📞 For urgent queries:</strong> ${hospitalPhone}</div>
                    <div style="margin-bottom: 4px;">This is an automated message. Please do not reply to this email.</div>
                    <div style="font-size: 11px; color: #999;">© ${new Date().getFullYear()} ${hospitalName}. All rights reserved.</div>
                  </td>
                </tr>
              </table>
            </div>
          `,
        };

        await transporter.sendMail(userMailOptions);
        emailStatus.userSent = true;
        console.log("✅ User confirmation sent");
      } catch (error) {
        console.error("❌ User email failed:", error);
        emailStatus.error = emailStatus.error 
          ? `${emailStatus.error}; User email failed` 
          : "Failed to send user confirmation";
      }
    }

    // Prepare response based on email status
    if (!transporter || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return withCors({
        success: true,
        message: "Thank you for your message! (Email notifications are currently unavailable)",
        contactId: contact.id,
        emailStatus: "disabled"
      }, 200);
    }

    if (emailStatus.userSent && emailStatus.adminSent) {
      return withCors({
        success: true,
        message: "Thank you for your message! We will get back to you soon.",
        contactId: contact.id,
        emailStatus: "sent"
      }, 200);
    }

    if (emailStatus.userSent && !emailStatus.adminSent) {
      return withCors({
        success: true,
        message: "Thank you for your message! Confirmation email sent.",
        contactId: contact.id,
        emailStatus: "partial"
      }, 200);
    }

    return withCors({
      success: true,
      message: "Thank you for your message! We will get back to you soon.",
      contactId: contact.id,
      emailStatus: "failed",
      warning: emailStatus.error
    }, 200);

  } catch (error) {
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : undefined;

    return withCors({ 
      error: "Failed to send message. Please try again later.",
      details: message
    }, 500);
  }
}

// Handle GET requests for testing/status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'test') {
      return withCors({
        status: "Contact API is working",
        timestamp: new Date().toISOString(),
        contacts: contacts.length,
        emailConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
        adminEmail: !!process.env.ADMIN_EMAIL,
      }, 200);
    }

    return withCors({
      message: "Contact API is working",
      totalContacts: contacts.length,
      lastContact: contacts.length > 0 ? contacts[contacts.length - 1].createdAt : null,
    }, 200);
  } catch (error) {
    console.error("❌ GET error:", error);
    return withCors({ error: "Internal server error" }, 500);
  }
}
