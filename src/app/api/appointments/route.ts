// enforce Node.js runtime (nodemailer won't work on the Edge runtime)
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// In-memory storage
const appointments: any[] = [];

// Enhanced CORS config to accept requests from anywhere
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow all origins
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS,PUT,DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
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
const createTransporter = () => {
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

const transporter = createTransporter();

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

// Handle POST requests for booking appointments
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      name,
      email,
      age,
      phone,
      gender,
      department,
      doctor,
      date,
      time,
      reason,
    } = body;

    // Validate required fields
    if (
      !name ||
      !email ||
      !age ||
      !gender ||
      !phone ||
      !department ||
      !doctor ||
      !date ||
      !time
    ) {
      return withCors({ 
        error: "All required fields must be provided.",
        missing: {
          name: !name,
          email: !email,
          age: !age,
          gender: !gender,
          phone: !phone,
          department: !department,
          doctor: !doctor,
          date: !date,
          time: !time,
        }
      }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return withCors({ error: "Please provide a valid email address." }, 400);
    }

    // Validate phone format (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return withCors({ error: "Please provide a valid 10-digit phone number." }, 400);
    }

    // Validate age
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return withCors({ error: "Please provide a valid age between 1 and 120." }, 400);
    }

    // Check if email configuration is available
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("Missing SMTP configuration");
      // Still save the appointment but warn about email
    }

    // Create appointment object
    const appointment = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      age: ageNum,
      gender,
      department,
      doctor,
      date,
      time,
      reason: reason?.trim() || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Store appointment
    appointments.push(appointment);
    console.log(`📅 New appointment created: ${appointment.id} for ${name}`);

    // Send emails if transporter is available
    let emailStatus = {
      adminSent: false,
      patientSent: false,
      error: null as string | null,
    };

    if (transporter && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Admin email
      if (process.env.ADMIN_EMAIL) {
        try {
          const adminMailOptions = {
            from: process.env.SMTP_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `🏥 New Appointment Booking - ${department}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
                <div style="background: #004a99; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                  <h2 style="margin: 0;">🏥 New Appointment Booking</h2>
                </div>
                <div style="background: white; padding: 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Patient Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${name}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${email}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${phone}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Age:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${age}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Gender:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${gender}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Department:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${department}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Doctor:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${doctor}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${date}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Time:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${time}</td></tr>
                    <tr><td style="padding: 8px 0;"><strong>Reason:</strong></td><td style="padding: 8px 0;">${reason || "N/A"}</td></tr>
                  </table>
                  <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                    <p style="margin: 0; color: #1565c0;"><strong>Appointment ID:</strong> ${appointment.id}</p>
                    <p style="margin: 5px 0 0 0; color: #1565c0;"><strong>Status:</strong> Pending Confirmation</p>
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

      // Patient confirmation email
      try {
        const hospitalName = "Apex Hospital";
        const hospitalAddress = "Plot No 1 and 6, Vijapur Rd, opp. to Galaxy Panache, Yamini Nagar, Swami Vivekanand Nagar 2, Solapur, Maharashtra 413007";
        const hospitalPhone = "0217 260 0603";

        const patientMailOptions = {
          from: process.env.SMTP_USER,
          to: email,
          subject: `✅ Appointment Confirmation - ${department} Department`,
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
                    <h2 style="margin-top: 0; font-size: 22px; color: #0f254e;">Thank you for booking an appointment!</h2>
                    <p style="margin: 8px 0;">Dear ${name},</p>
                    <p style="margin: 8px 0;">Your appointment has been received and is currently <strong style="color: #f59e0b;">pending confirmation</strong>. Here are the details:</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea; font-weight: 600; color: #374151;">👨‍⚕️ Doctor:</td>
                          <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea; color: #1f2937;">${doctor}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea; font-weight: 600; color: #374151;">📅 Date:</td>
                          <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea; color: #1f2937;">${date}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea; font-weight: 600; color: #374151;">🕐 Time:</td>
                          <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea; color: #1f2937;">${time}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-weight: 600; color: #374151;">🏥 Department:</td>
                          <td style="padding: 8px 0; color: #1f2937;">${department}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
                      <p style="margin: 0; color: #1e40af; font-weight: 500;">📞 We will contact you shortly to confirm your booking.</p>
                    </div>

                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
                      <h4 style="margin: 0 0 8px 0; color: #92400e;">📋 Important Reminders:</h4>
                      <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                        <li>Please arrive 15 minutes before your scheduled time</li>
                        <li>Bring your ID proof and previous medical records</li>
                        <li>Consultation fee is payable at the time of visit</li>
                      </ul>
                    </div>

                    <p style="margin: 24px 0 0; font-size: 14px; color: #555;">Best regards,<br /><strong>${hospitalName} Team</strong></p>
                  </td>
                </tr>
                <tr>
                  <td style="background: #f0f4f9; padding: 16px 24px; font-size: 12px; color: #666;">
                    <div style="margin-bottom: 6px;"><strong>📍 Address:</strong> ${hospitalAddress}</div>
                    <div style="margin-bottom: 6px;"><strong>📞 For queries:</strong> ${hospitalPhone}</div>
                    <div style="margin-bottom: 4px;">This is an automated message. Please do not reply to this email.</div>
                    <div style="font-size: 11px; color: #999;">© ${new Date().getFullYear()} ${hospitalName}. All rights reserved.</div>
                  </td>
                </tr>
              </table>
            </div>
          `,
        };

        await transporter.sendMail(patientMailOptions);
        emailStatus.patientSent = true;
        console.log("✅ Patient confirmation sent");
      } catch (error) {
        console.error("❌ Patient email failed:", error);
        emailStatus.error = emailStatus.error 
          ? `${emailStatus.error}; Patient email failed` 
          : "Failed to send patient confirmation";
      }
    }

    // Prepare response based on email status
    if (!transporter || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return withCors({
        success: true,
        message: "Appointment booked successfully! (Email notifications are currently unavailable)",
        appointmentId: appointment.id,
        emailStatus: "disabled"
      }, 200);
    }

    if (emailStatus.patientSent && emailStatus.adminSent) {
      return withCors({
        success: true,
        message: "Appointment booked successfully! Confirmation email sent.",
        appointmentId: appointment.id,
        emailStatus: "sent"
      }, 200);
    }

    if (emailStatus.patientSent && !emailStatus.adminSent) {
      return withCors({
        success: true,
        message: "Appointment booked! Confirmation email sent to you.",
        appointmentId: appointment.id,
        emailStatus: "partial"
      }, 200);
    }

    return withCors({
      success: true,
      message: "Appointment booked successfully! We'll contact you soon.",
      appointmentId: appointment.id,
      emailStatus: "failed",
      warning: emailStatus.error
    }, 200);

  } catch (error) {
    console.error("❌ POST error:", error);
    return withCors({ 
      error: "Failed to book appointment. Please try again later.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        status: "API is working",
        timestamp: new Date().toISOString(),
        appointments: appointments.length,
        emailConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
        adminEmail: !!process.env.ADMIN_EMAIL,
      }, 200);
    }

    return withCors({
      message: "Appointments API is working",
      totalAppointments: appointments.length,
      lastAppointment: appointments.length > 0 ? appointments[appointments.length - 1].createdAt : null,
    }, 200);
  } catch (error) {
    console.error("❌ GET error:", error);
    return withCors({ error: "Internal server error" }, 500);
  }
}
