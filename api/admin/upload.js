"use strict";

const crypto = require("node:crypto");
const { put } = require("@vercel/blob");
const { hasValidSession, isSameOrigin } = require("../../lib/admin-auth");

const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function respond(res, statusCode, payload) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(statusCode).json(payload);
}

function hasValidImageSignature(buffer, contentType) {
    if (contentType === "image/jpeg") {
        return buffer.length >= 3 &&
            buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (contentType === "image/png") {
        return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    if (contentType === "image/webp") {
        return buffer.length >= 12 &&
            buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP";
    }
    return false;
}

module.exports = async function uploadImage(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return respond(res, 405, { message: "Method not allowed." });
    }

    if (!isSameOrigin(req)) {
        return respond(res, 403, { message: "Request origin is not allowed." });
    }

    try {
        if (!hasValidSession(req)) {
            return respond(res, 401, { message: "Sign in to upload project images." });
        }
    } catch (error) {
        console.error("Admin authentication is not configured:", error.message);
        return respond(res, 503, { message: "Admin sign-in is not configured." });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const encodedImage = typeof body.image === "string" ? body.image : "";
    const imageBuffer = Buffer.from(encodedImage, "base64");

    if (!allowedTypes.has(contentType) || !encodedImage || imageBuffer.length > MAX_IMAGE_BYTES ||
        !hasValidImageSignature(imageBuffer, contentType)) {
        return respond(res, 400, {
            message: "Choose a valid JPEG, PNG, or WebP image no larger than 2.5 MB."
        });
    }

    try {
        const extension = contentType === "image/jpeg" ? "jpg" :
            contentType === "image/png" ? "png" : "webp";
        const blob = await put(
            `brickbuilders/project-images/${crypto.randomUUID()}.${extension}`,
            imageBuffer,
            {
                access: "public",
                addRandomSuffix: false,
                contentType,
                cacheControlMaxAge: 31536000
            }
        );
        return respond(res, 201, { url: blob.url });
    } catch (error) {
        console.error("Unable to upload project image:", error);
        return respond(res, 502, {
            message: "Image upload failed. Check that Vercel Blob storage is configured."
        });
    }
};

module.exports.config = {
    api: {
        bodyParser: {
            sizeLimit: "4.2mb"
        }
    }
};
