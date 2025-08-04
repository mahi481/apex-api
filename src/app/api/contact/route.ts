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

// ✅ Added GET method to test API in browser
export async function GET() {
  return NextResponse.json({ message: "Contact API is working" })
}

// ✅ POST to handle contact form submission
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

    // Save to "database" (In-memory)
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

      // Send confirmation email to user
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Thank you for contacting Apex Hospital",
        html: `
          <h2>Thank you for contacting us!</h2>
          <p>Dear ${name},</p>
          <p>We have received your message and will get back to you within 24 hours.</p>
          <p><strong>Your Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
          <br>
          <p>Best regards,<br>Apex Hospital Team</p>
        `,
      })
    } catch (emailError) {
      console.error("Email sending failed:", emailError)
    }

    // Return success response
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