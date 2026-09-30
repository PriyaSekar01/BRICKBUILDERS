"use strict";

const nodemailer = require("nodemailer");

const allowedProjectTypes = new Set([
    "Residential Construction",
    "Commercial Construction",
    "Renovation / Remodeling",
    "Civil / Structural Work",
    "Other"
]);

function getText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function respond(res, statusCode, payload) {
    res.setHeader("Cache-Control", "no-store");
    res.status(statusCode).json(payload);
}

module.exports = async function contact(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return respond(res, 405, { success: false, message: "Method not allowed." });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = getText(body.name);
    const phone = getText(body.phone);
    const email = getText(body.email);
    const projectType = getText(body.projectType);
    const message = getText(body.message);
    const honeypot = getText(body._honey);

    if (honeypot) {
        return respond(res, 400, { success: false, message: "Invalid form submission." });
    }

    if (!name || name.length > 120) {
        return respond(res, 400, { success: false, message: "Enter a valid name." });
    }

    if (!/^[+()\d\s.-]{7,25}$/.test(phone)) {
        return respond(res, 400, { success: false, message: "Enter a valid phone number." });
    }

    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return respond(res, 400, { success: false, message: "Enter a valid email address." });
    }

    if (!allowedProjectTypes.has(projectType)) {
        return respond(res, 400, { success: false, message: "Select a valid project type." });
    }

    if (message.length > 5000) {
        return respond(res, 400, { success: false, message: "Project description is too long." });
    }

    const requiredSettings = [
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASS",
        "CONTACT_EMAIL"
    ];
    const missingSettings = requiredSettings.filter((key) => !process.env[key]);
    if (missingSettings.length) {
        console.error("Contact API is missing environment settings:", missingSettings.join(", "));
        return respond(res, 500, {
            success: false,
            message: "The enquiry service is not configured yet. Please call +91 9003758369."
        });
    }

    const port = Number(process.env.SMTP_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.error("SMTP_PORT must be a valid port number.");
        return respond(res, 500, {
            success: false,
            message: "The enquiry service is not configured yet. Please call +91 9003758369."
        });
    }

    const secure = process.env.SMTP_SECURE === "true";
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: process.env.CONTACT_EMAIL,
            replyTo: email || undefined,
            subject: "New BRICKBUILDERS project enquiry",
            text: [
                `Name: ${name}`,
                `Phone: ${phone}`,
                `Email: ${email || "Not provided"}`,
                `Project type: ${projectType}`,
                `Project description: ${message || "Not provided"}`
            ].join("\n")
        });

        return respond(res, 200, { success: true });
    } catch (error) {
        console.error("Failed to send BRICKBUILDERS enquiry email:", error);
        return respond(res, 502, {
            success: false,
            message: "The email service couldn't deliver your enquiry. Please call +91 9003758369."
        });
    }
};
