import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

const contacts: any[] = []

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// ✅ Added GET method for browser testing
export async function GET() {
  return NextResponse.json({ message: "Contact API is working" })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, subject, message } = body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Name, email, subject, and message are required" }, { status: 400 })
    }

    // Create contact object
    const contact = {
      id: Date.now().toString(),
      name,
      email,
      phone: phone || "",
      subject,
      message,
      status: "new",
      createdAt: new Date().toISOString(),
    }

    // Save to "database"
    contacts.push(contact)

    // Send email to admin
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL || "admin@apexhospital.com",
        subject: `Contact Form: ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
          <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
        `,
      })

      // ✅ Send confirmation email to user (contact form)
      const hospitalName = "Apex Hospital"
      const hospitalAddress =
        "Plot No 1 and 6, Vijapur Rd, opp. to Galaxy Panache, Yamini Nagar, Swami Vivekanand Nagar 2, Solapur, Maharashtra 413007"
      const hospitalPhone = "0217 260 0603"

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Thank you for contacting Apex Hospital",
        html: `
  <div style="font-family: Arial, sans-serif; background-color: #f5f7fa; padding:0; margin:0;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <tr>
        <td style="background:#004a99; padding:16px 24px; color:#ffffff;">
          <div style="font-size:24px; font-weight:700; letter-spacing:0.5px;">
            ${hospitalName}
          </div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:24px; color:#1f2d3d;">
          <h2 style="margin-top:0; font-size:22px; color:#0f254e;">Thank you for contacting us!</h2>
          <p style="margin:8px 0;">Dear ${name},</p>
          <p style="margin:8px 0;">We have received your message and will get back to you within 24 hours.</p>
          <p style="margin:16px 0;"><strong>Your Message:</strong></p>
          <div style="background:#f0f4f9; padding:12px; border-radius:4px; margin-bottom:16px; white-space:pre-wrap; line-height:1.4;">
            ${message.replace(/\n/g, "<br>")}
          </div>
          <p style="margin:24px 0 0; font-size:14px; color:#555;">Best regards,<br /><strong>${hospitalName} Team</strong></p>
        </td>
      </tr>

      <!-- Subfooter -->
      <tr>
        <td style="background:#f0f4f9; padding:16px 24px; font-size:12px; color:#666;">
          <div style="margin-bottom:6px;">
            <strong>Address:</strong> ${hospitalAddress}
          </div>
          <div style="margin-bottom:6px;">
            <strong>For any queries, call:</strong> ${hospitalPhone}
          </div>
          <div style="margin-bottom:4px;">
            This is an automated message. Please do not reply to this email if you are expecting a reply—use the phone number above for urgent help.
          </div>
          <div style="font-size:11px; color:#999;">
            © ${new Date().getFullYear()} ${hospitalName}. All rights reserved.
          </div>
        </td>
      </tr>

    </table>
  </div>
  `,
      })
    } catch (emailError) {
      console.error("Email sending failed:", emailError)
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your message! We will get back to you soon.",
      contactId: contact.id,
    })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 })
  }
}