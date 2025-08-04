import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

const healthPackageInquiries: any[] = []

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, mobile, date, message, packageName } = body

    // Validate required fields
    if (!name || !email || !mobile || !date) {
      return NextResponse.json({ error: "Name, email, mobile, and date are required" }, { status: 400 })
    }

    // Create inquiry object
    const inquiry = {
      id: Date.now().toString(),
      name,
      email,
      mobile,
      date,
      message: message || "",
      packageName: packageName || "",
      status: "new",
      createdAt: new Date().toISOString(),
    }

    // Save to "database"
    healthPackageInquiries.push(inquiry)

   // Send email to admin (simple styled)
try {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.ADMIN_EMAIL || "admin@apexhospital.com",
    subject: "New Inquiry Received",
    html: `
      <div style="font-family: system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; background:#f9f9fa; padding:12px;">
        <div style="max-width:600px; margin:auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
          
          <!-- header -->
          <div style="background:#2563eb; padding:12px 16px; color:#ffffff; font-weight:600; font-size:16px;">
            New Inquiry
          </div>

          <!-- body -->
          <div style="padding:16px; color:#1f2d3d; font-size:14px; line-height:1.5;">
            <p style="margin:8px 0;"><strong>Package:</strong> ${packageName}</p>
            <p style="margin:8px 0;"><strong>Name:</strong> ${name}</p>
            <p style="margin:8px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin:8px 0;"><strong>Mobile:</strong> ${mobile}</p>
            <p style="margin:8px 0;"><strong>Preferred Date:</strong> ${date}</p>
            <p style="margin:8px 0;"><strong>Message:</strong><br>${message.replace(/\n/g, "<br>")}</p>
            <p style="margin:8px 0;"><strong>Inquiry Time:</strong> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
          </div>

          <!-- footer line -->
          <div style="border-top:1px solid #e2e8f0; padding:8px 16px; font-size:11px; color:#6b7280; text-align:center;">
            This is an automated notification.
          </div>
        </div>
      </div>
    `,
  });
} catch (emailError) {
  console.error("Email sending failed:", emailError);
}

    return NextResponse.json({
      success: true,
      message: "Your inquiry has been submitted successfully! We will contact you soon.",
      inquiryId: inquiry.id,
    })
  } catch (error) {
    console.error("Health package inquiry error:", error)
    return NextResponse.json({ error: "Failed to submit inquiry. Please try again." }, { status: 500 })
  }
}
