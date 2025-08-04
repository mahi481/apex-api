// app/api/appointments/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// In-memory storage
const appointments: any[] = [];

// Always allow CORS during dev (echo origin if present)
function getDevCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function withCors(body: any, request: NextRequest, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: getDevCorsHeaders(request),
  });
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

// Verify transporter (for logs)
transporter.verify().then(() => {
  console.log("SMTP transporter verified.");
}).catch((err) => {
  console.error("SMTP transporter verification failed:", err);
});

// Preflight handler
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getDevCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  try {
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
      return withCors({ error: "All required fields must be provided." }, request, 400);
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.ADMIN_EMAIL) {
      console.error("Missing email-related env vars.");
      return withCors({ error: "Server configuration error." }, request, 500);
    }

    const appointment = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      age,
      gender,
      department,
      doctor,
      date,
      time,
      reason: reason || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    appointments.push(appointment);

    const adminMailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "New Appointment Booking",
      html: `
        <h2>New Appointment Booking</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Age:</strong> ${age}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Gender:</strong> ${gender}</p>
        <p><strong>Department:</strong> ${department}</p>
        <p><strong>Doctor:</strong> ${doctor}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Reason:</strong> ${reason || "N/A"}</p>
      `,
    };

    const hospitalName = "Apex Hospital";
    const hospitalAddress =
      "Plot No 1 and 6, Vijapur Rd, opp. to Galaxy Panache, Yamini Nagar, Swami Vivekanand Nagar 2, Solapur, Maharashtra 413007";
    const hospitalPhone = "0217 260 0603";

    const patientMailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: `Appointment Confirmation - ${department} Department`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f7fa; padding: 0; margin: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <tr>
              <td style="background: #004a99; padding: 16px 24px; color: #ffffff;">
                <div style="font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">${hospitalName}</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px; color: #1f2d3d;">
                <h2 style="margin-top: 0; font-size: 22px; color: #0f254e;">Thank you for booking an appointment at ${hospitalName}</h2>
                <p style="margin: 8px 0;">Dear ${name},</p>
                <p style="margin: 8px 0;">Your appointment has been received and is currently <strong>pending confirmation</strong>. Here are the details:</p>
                <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea;"><strong>Doctor:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea;">${doctor}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea;"><strong>Date:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea;">${date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea;"><strong>Time:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e1e5ea;">${time}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Department:</strong></td>
                    <td style="padding: 8px 0;">${department}</td>
                  </tr>
                </table>
                <p style="margin: 16px 0;">We will contact you shortly to confirm your booking.</p>
                <p style="margin: 24px 0 0; font-size: 14px; color: #555;">Best regards,<br /><strong>${hospitalName}</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background: #f0f4f9; padding: 16px 24px; font-size: 12px; color: #666;">
                <div style="margin-bottom: 6px;"><strong>Address:</strong> ${hospitalAddress}</div>
                <div style="margin-bottom: 6px;"><strong>For any queries, call:</strong> ${hospitalPhone}</div>
                <div style="margin-bottom: 4px;">This is an automated message. Please do not reply to this email.</div>
                <div style="font-size: 11px; color: #999;">© ${new Date().getFullYear()} ${hospitalName}. All rights reserved.</div>
              </td>
            </tr>
          </table>
        </div>
      `,
    };

    try {
      await transporter.sendMail(adminMailOptions);
    } catch (adminErr) {
      console.error("Admin email failed:", adminErr);
    }

    try {
      await transporter.sendMail(patientMailOptions);
    } catch (patientErr) {
      console.error("Patient email failed:", patientErr);
      return withCors(
        {
          success: true,
          warning: "Appointment saved but confirmation email failed.",
          appointmentId: appointment.id,
        },
        request,
        200
      );
    }

    return withCors(
      {
        success: true,
        message: "Appointment booked! Confirmation email sent.",
        appointmentId: appointment.id,
      },
      request,
      200
    );
  } catch (err) {
    console.error("POST error:", err);
    return withCors(
      { error: "Failed to book appointment. Try again later." },
      request,
      500
    );
  }
}

export async function GET(request: NextRequest) {
  return withCors(
    {
      appointments: appointments.length,
      message: "Appointments API is working",
    },
    request,
    200
  );
}
