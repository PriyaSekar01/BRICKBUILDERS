"use strict";

const crypto = require("node:crypto");

const COOKIE_NAME = "brickbuilders_admin";
const SESSION_MAX_AGE = 60 * 60 * 12;

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length &&
        crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getCookie(req, name) {
    const cookieHeader = req.headers.cookie || "";
    const cookie = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`));

    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : "";
}

function isSameOrigin(req) {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (!origin || !host) return false;

    try {
        const originUrl = new URL(origin);
        return originUrl.host === host &&
            (originUrl.protocol === "https:" || originUrl.hostname === "localhost" ||
                originUrl.hostname === "127.0.0.1");
    } catch {
        return false;
    }
}

function getConfiguration() {
    const password = process.env.ADMIN_PASSWORD;
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!password || password.length < 8 || !secret || secret.length < 32) {
        throw new Error(
            "ADMIN_PASSWORD must be at least 8 characters and ADMIN_SESSION_SECRET at least 32 characters."
        );
    }

    return { password, secret };
}

function createSession(secret) {
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
    const signature = crypto
        .createHmac("sha256", secret)
        .update(String(expiresAt))
        .digest("base64url");

    return `${expiresAt}.${signature}`;
}

function hasValidSession(req) {
    const { secret } = getConfiguration();
    const [expiresAtText, signature] = getCookie(req, COOKIE_NAME).split(".");
    const expiresAt = Number(expiresAtText);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature) {
        return false;
    }

    const expected = crypto
        .createHmac("sha256", secret)
        .update(expiresAtText)
        .digest("base64url");

    return safeEqual(signature, expected);
}

function setSessionCookie(res, session) {
    const secure = process.env.VERCEL === "1" ? "; Secure" : "";
    res.setHeader(
        "Set-Cookie",
        `${COOKIE_NAME}=${encodeURIComponent(session)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${SESSION_MAX_AGE}${secure}`
    );
}

function clearSessionCookie(res) {
    const secure = process.env.VERCEL === "1" ? "; Secure" : "";
    res.setHeader(
        "Set-Cookie",
        `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`
    );
}

module.exports = {
    clearSessionCookie,
    createSession,
    getConfiguration,
    hasValidSession,
    isSameOrigin,
    safeEqual,
    setSessionCookie
};
