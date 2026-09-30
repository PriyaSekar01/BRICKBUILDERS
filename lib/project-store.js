"use strict";

const { list, put } = require("@vercel/blob");

const PROJECTS_PATH = "brickbuilders/projects.json";
const MAX_PROJECTS = 100;
const MAX_IMAGES_PER_PROJECT = 12;

async function readProjects() {
    const { blobs } = await list({ prefix: PROJECTS_PATH, limit: 1 });
    if (!blobs.length) return [];

    const response = await fetch(blobs[0].url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Unable to read project data (HTTP ${response.status}).`);
    }

    const projects = await response.json();
    if (!Array.isArray(projects)) {
        throw new Error("Stored project data has an invalid format.");
    }
    return projects;
}

async function saveProjects(projects) {
    await put(PROJECTS_PATH, JSON.stringify(projects), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60
    });
}

function validateProject(title, imageUrls) {
    if (typeof title !== "string" || !title.trim() || title.trim().length > 80) {
        return "Enter a project title of 1 to 80 characters.";
    }
    if (!Array.isArray(imageUrls) || imageUrls.length < 1 || imageUrls.length > MAX_IMAGES_PER_PROJECT) {
        return `Choose between 1 and ${MAX_IMAGES_PER_PROJECT} project images.`;
    }

    const allValid = imageUrls.every((imageUrl) => {
        if (typeof imageUrl !== "string") return false;
        try {
            const url = new URL(imageUrl);
            return url.protocol === "https:" &&
                url.hostname.endsWith(".public.blob.vercel-storage.com");
        } catch {
            return false;
        }
    });

    return allValid ? "" : "One or more uploaded image URLs are invalid.";
}

module.exports = {
    MAX_IMAGES_PER_PROJECT,
    MAX_PROJECTS,
    readProjects,
    saveProjects,
    validateProject
};
