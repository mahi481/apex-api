import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

const appointments: any[] = []

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// ✅ Added GET for browser testing
export async function GET() {
  return NextResponse.json({ message: "Appointment API is working" })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, mobile, date, department, doctor, message } = body

    // Validate required fields
    if (!name || !email || !mobile || !date || !department) {
      return NextResponse.json(
        { error: "Name, email, mobile, date, and department are required" },
        { status: 400 }
      )
    }

    // Create appointment object
    const appointment = {
      id: Date.now().toString(),
      name,
      email,
      mobile,
      date,
      department,
      doctor: doctor || "",
      message: message || "",
      status: "new",
      createdAt: new Date().toISOString(),
    }

    // Save to "database"
    appointments.push(appointment)

    // Send email to admin
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL || "admin@apexhospital.com",
        subject: "New Appointment Request",
        html: `
          <div style="font-family:Arial,sans-serif; background:#f9f9fa; padding:12px;">
            <div style="max-width:600px; margin:auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
              
              <!-- Header -->
              <div style="background:#16a34a; padding:12px 16px; color:#ffffff; font-weight:600; font-size:16px;">
                Appointment Request
              </div>

              <!-- Body -->
              <div style="padding:16px; color:#1f2d3d; font-size:14px; line-height:1.5;">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Mobile:</strong> ${mobile}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Department:</strong> ${department}</p>
                <p><strong>Doctor:</strong> ${doctor || "Not specified"}</p>
                <p><strong>Message:</strong><br>${message?.replace(/\n/g, "<br>") || "None"}</p>
                <p><strong>Submitted At:</strong> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
              </div>

              <!-- Footer -->
              <div style="border-top:1px solid #e2e8f0; padding:8px 16px; font-size:11px; color:#6b7280; text-align:center;">
                This is an automated notification.
              </div>
            </div>
          </div>
        `,
      })
    } catch (emailError) {
      console.error("Email sending failed:", emailError)
    }

    return NextResponse.json({
      success: true,
      message: "Your appointment request has been submitted successfully! We will contact you soon.",
      appointmentId: appointment.id,
    })
  } catch (error) {
    console.error("Appointment request error:", error)
    return NextResponse.json({ error: "Failed to submit appointment request. Please try again." }, { status: 500 })
  }
}