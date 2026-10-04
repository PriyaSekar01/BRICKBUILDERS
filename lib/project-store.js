"use strict";

const { list, put } = require("@vercel/blob");
const crypto = require("node:crypto");
const defaultProjects = require("./default-projects");

const LEGACY_PROJECTS_PATH = "brickbuilders/projects.json";
const PROJECT_DATA_PREFIX = "brickbuilders/project-data/";
const MAX_PROJECTS = 100;
const MAX_IMAGES_PER_PROJECT = 12;

async function readLatestProjectSnapshot() {
    const snapshots = [];
    let cursor;

    do {
        const page = await list({
            prefix: PROJECT_DATA_PREFIX,
            limit: 1000,
            ...(cursor ? { cursor } : {})
        });
        snapshots.push(...page.blobs);
        cursor = page.hasMore ? page.cursor : undefined;
        if (page.hasMore && !cursor) {
            throw new Error("Unable to continue reading project data snapshots.");
        }
    } while (cursor);

    snapshots.sort((left, right) => right.pathname.localeCompare(left.pathname));
    if (snapshots.length) return snapshots[0];

    const { blobs } = await list({ prefix: LEGACY_PROJECTS_PATH, limit: 1 });
    return blobs[0];
}

async function readProjectData() {
    const snapshot = await readLatestProjectSnapshot();
    if (!snapshot) {
        return { projects: defaultProjects, deletedIds: [] };
    }

    const response = await fetch(snapshot.url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Unable to read project data (HTTP ${response.status}).`);
    }

    const storedData = await response.json();
    const storedProjects = Array.isArray(storedData)
        ? storedData
        : storedData && typeof storedData === "object"
            ? storedData.projects
            : null;
    const deletedIds = storedData && Array.isArray(storedData.deletedIds)
        ? storedData.deletedIds
        : [];
    if (!Array.isArray(storedProjects) || !deletedIds.every((id) => typeof id === "string")) {
        throw new Error("Stored project data has an invalid format.");
    }

    const projectsById = new Map(
        defaultProjects
            .filter((project) => !deletedIds.includes(project.id))
            .map((project) => [project.id, project])
    );
    storedProjects.forEach((project) => {
        if (!project || typeof project.id !== "string") {
            throw new Error("Stored project data contains an invalid project.");
        }
        const defaultProject = projectsById.get(project.id);
        projectsById.set(project.id, defaultProject
            ? {
                ...defaultProject,
                ...project,
                videoUrls: project.videoUrls || defaultProject.videoUrls || []
            }
            : project);
    });

    return { projects: [...projectsById.values()], deletedIds };
}

async function readProjects() {
    return (await readProjectData()).projects;
}

async function saveProjectData(data) {
    const version = `${Date.now().toString().padStart(13, "0")}-${crypto.randomUUID()}`;
    await put(`${PROJECT_DATA_PREFIX}projects-${version}.json`, JSON.stringify(data), {
        access: "public",
        addRandomSuffix: false,
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
    defaultProjects,
    readProjectData,
    readProjects,
    saveProjectData,
    validateProject
};
