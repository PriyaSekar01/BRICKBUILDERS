"use strict";

const { hasValidSession, isSameOrigin } = require("../../lib/admin-auth");
const { del } = require("@vercel/blob");
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
    try {
        const projects = await readProjects();
        if (req.method === "PATCH") {
            const id = typeof body.id === "string" ? body.id : "";
            const projectIndex = projects.findIndex((project) => project.id === id);
            if (projectIndex < 0) {
                return respond(res, 404, { message: "That project could not be found." });
            }

            const project = projects[projectIndex];
            let updatedProject;
            if (body.action === "rename") {
                const title = typeof body.title === "string" ? body.title.trim() : "";
                if (!title || title.length > 80) {
                    return respond(res, 400, { message: "Enter a project name of 1 to 80 characters." });
                }
                updatedProject = { ...project, title };
            } else if (body.action === "add-images") {
                const imageUrls = body.imageUrls;
                const validationError = validateProject(project.title, imageUrls);
                if (validationError) return respond(res, 400, { message: validationError });
                const mediaCount = project.imageUrls.length + (project.videoUrls || []).length;
                if (mediaCount + imageUrls.length > 12) {
                    return respond(res, 400, {
                        message: "A project can have up to 12 photos or videos. Choose fewer additional photos."
                    });
                }
                updatedProject = { ...project, imageUrls: [...project.imageUrls, ...imageUrls] };
            } else if (body.action === "remove-media") {
                const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl : "";
                const isImage = project.imageUrls.includes(mediaUrl);
                const isVideo = (project.videoUrls || []).includes(mediaUrl);
                if (!isImage && !isVideo) {
                    return respond(res, 404, { message: "That project photo or video was not found." });
                }
                const remainingImages = isImage
                    ? project.imageUrls.filter((url) => url !== mediaUrl)
                    : project.imageUrls;
                const remainingVideos = isVideo
                    ? project.videoUrls.filter((url) => url !== mediaUrl)
                    : project.videoUrls || [];
                if (!remainingImages.length && !remainingVideos.length) {
                    return respond(res, 400, { message: "A project must keep at least one photo or video." });
                }
                updatedProject = {
                    ...project,
                    imageUrls: remainingImages,
                    videoUrls: remainingVideos
                };
            } else {
                return respond(res, 400, { message: "Choose a supported project change." });
            }

            const updatedProjects = [...projects];
            updatedProjects[projectIndex] = updatedProject;
            await saveProjects(updatedProjects);

            if (body.action === "remove-media" &&
                typeof body.mediaUrl === "string" &&
                body.mediaUrl.includes(".public.blob.vercel-storage.com/")) {
                try {
                    await del(body.mediaUrl);
                } catch (error) {
                    console.error("Project slide removed but stored image cleanup failed:", error);
                    return respond(res, 502, {
                        message: "The slide was removed from the gallery, but its stored image could not be deleted."
                    });
                }
            }
            return respond(res, 200, { project: updatedProject });
        }

        const title = typeof body.title === "string" ? body.title.trim() : "";
        const imageUrls = body.imageUrls;
        const validationError = validateProject(title, imageUrls);
        if (validationError) return respond(res, 400, { message: validationError });

        if (projects.length >= MAX_PROJECTS) {
            return respond(res, 400, { message: "The project gallery has reached its limit." });
        }

        const project = {
            id: require("node:crypto").randomUUID(),
            title,
            imageUrls,
            videoUrls: [],
            createdAt: new Date().toISOString()
        };
        await saveProjects([...projects, project]);
        return respond(res, 201, { project });
    } catch (error) {
        console.error("Unable to save gallery project:", error);
        return respond(res, 500, { message: "Unable to save the project. Please try again." });
    }
};
