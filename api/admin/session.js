"use strict";

const {
    clearSessionCookie,
    createSession,
    getConfiguration,
    hasValidSession,
    isSameOrigin,
    safeEqual,
    setSessionCookie
} = require("../../lib/admin-auth");

function respond(res, statusCode, payload) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(statusCode).json(payload);
}

module.exports = async function adminSession(req, res) {
    if (req.method === "GET") {
        try {
            return respond(res, 200, { authenticated: hasValidSession(req) });
        } catch (error) {
            console.error("Admin authentication is not configured:", error.message);
            return respond(res, 503, { authenticated: false, message: "Admin sign-in is not configured." });
        }
    }

    if (req.method !== "POST" && req.method !== "DELETE") {
        res.setHeader("Allow", "GET, POST, DELETE");
        return respond(res, 405, { message: "Method not allowed." });
    }

    if (!isSameOrigin(req)) {
        return respond(res, 403, { message: "Request origin is not allowed." });
    }

    if (req.method === "DELETE") {
        clearSessionCookie(res);
        return respond(res, 200, { authenticated: false });
    }

    try {
        const { password, secret } = getConfiguration();
        const submittedPassword =
            req.body && typeof req.body.password === "string" ? req.body.password : "";

        if (!submittedPassword || !safeEqual(submittedPassword, password)) {
            return respond(res, 401, { message: "The password is incorrect." });
        }

        setSessionCookie(res, createSession(secret));
        return respond(res, 200, { authenticated: true });
    } catch (error) {
        console.error("Admin sign-in configuration error:", error.message);
        return respond(res, 503, { message: "Admin sign-in is not configured." });
    }
};
