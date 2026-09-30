"use strict";

const { hasValidSession, isSameOrigin } = require("../../lib/admin-auth");
const {
    MAX_PROJECTS,
    readProjects,
    saveProjects,
    validateProject
} = require("../../lib/project-store");

function respond(res, statusCode, payload) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(statusCode).json(payload);
}

module.exports = async function adminProjects(req, res) {
    if (req.method !== "POST" && req.method !== "PATCH") {
        res.setHeader("Allow", "POST, PATCH");
        return respond(res, 405, { message: "Method not allowed." });
    }

    if (!isSameOrigin(req)) {
        return respond(res, 403, { message: "Request origin is not allowed." });
    }

    try {
        if (!hasValidSession(req)) {
            return respond(res, 401, { message: "Sign in to add a project." });
        }
    } catch (error) {
        console.error("Admin authentication is not configured:", error.message);
        return respond(res, 503, { message: "Admin sign-in is not configured." });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const imageUrls = body.imageUrls;
    const validationError = validateProject(
        req.method === "PATCH" ? "Existing project" : title,
        imageUrls
    );
    if (validationError) {
        return respond(res, 400, { message: validationError });
    }

    try {
        const projects = await readProjects();
        if (req.method === "PATCH") {
            const id = typeof body.id === "string" ? body.id : "";
            const projectIndex = projects.findIndex((project) => project.id === id);
            if (projectIndex < 0) {
                return respond(res, 404, { message: "That project could not be found." });
            }

            const project = projects[projectIndex];
            if (project.imageUrls.length + imageUrls.length > 12) {
                return respond(res, 400, {
                    message: "A project can have up to 12 photos. Choose fewer additional photos."
                });
            }

            const updatedProject = {
                ...project,
                imageUrls: [...project.imageUrls, ...imageUrls]
            };
            const updatedProjects = [...projects];
            updatedProjects[projectIndex] = updatedProject;
            await saveProjects(updatedProjects);
            return respond(res, 200, { project: updatedProject });
        }

        if (projects.length >= MAX_PROJECTS) {
            return respond(res, 400, { message: "The project gallery has reached its limit." });
        }

        const project = {
            id: require("node:crypto").randomUUID(),
            title,
            imageUrls,
            createdAt: new Date().toISOString()
        };
        await saveProjects([...projects, project]);
        return respond(res, 201, { project });
    } catch (error) {
        console.error("Unable to save gallery project:", error);
        return respond(res, 500, { message: "Unable to save the project. Please try again." });
    }
};
