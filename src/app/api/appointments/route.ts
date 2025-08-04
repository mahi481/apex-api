// app/api/appointments/route.ts
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// In-memory storage
const appointments: any[] = [];

// Dev-safe CORS (echo origin or wildcard)
function getCorsHeaders(request: NextRequest): Record<string, string> {
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
    headers: getCorsHeaders(request),
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

transporter.verify().then(() => {
  console.log("SMTP transporter verified.");
}).catch((err) => {
  console.error("SMTP transporter verification failed:", err);
});

// Preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
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
      console.error("Missing email env vars.");
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

    // Admin email (non-fatal)
    const adminMailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "New Appointment Booking",
      html: `<h2>New Appointment Booking</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Department:</strong> ${department}</p>
        <p><strong>Doctor:</strong> ${doctor}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Reason:</strong> ${reason || "N/A"}</p>`,
    };

    // Patient email
    const hospitalName = "Apex Hospital";
    const hospitalAddress =
      "Plot No 1 and 6, Vijapur Rd, opp. to Galaxy Panache, Yamini Nagar, Swami Vivekanand Nagar 2, Solapur, Maharashtra 413007";
    const hospitalPhone = "0217 260 0603";

    const patientMailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: `Appointment Confirmation - ${department} Department`,
      html: `<div style="font-family: Arial,sans-serif; padding:16px;">
        <h2>Thank you for booking at ${hospitalName}</h2>
        <p><strong>Doctor:</strong> ${doctor}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p>We will contact you shortly to confirm.</p>
        <div><strong>Address:</strong> ${hospitalAddress}</div>
        <div><strong>Phone:</strong> ${hospitalPhone}</div>
      </div>`,
    };

    try {
      await transporter.sendMail(adminMailOptions);
    } catch (e) {
      console.error("Admin email error:", e);
    }

    try {
      await transporter.sendMail(patientMailOptions);
    } catch (e) {
      console.error("Patient email error:", e);
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
    return withCors({ error: "Failed to book appointment. Try again later." }, request, 500);
  }
}

export async function GET(request: NextRequest) {
  return withCors(
    {
      appointments: appointments.length,
      message: "Appointment API is working",
    },
    request,
    200
  );
}
