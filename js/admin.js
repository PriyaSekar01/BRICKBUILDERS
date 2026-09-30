"use strict";

const loginForm = document.getElementById("adminLoginForm");
const dashboard = document.getElementById("adminDashboard");
const projectForm = document.getElementById("projectUploadForm");
const statusMessage = document.getElementById("adminStatus");
const titleInput = document.getElementById("projectTitle");
const imageInput = document.getElementById("projectImages");
const preview = document.getElementById("imagePreview");
const addProjectButton = document.getElementById("addProjectButton");
const addPhotosForm = document.getElementById("addPhotosForm");
const existingProjectSelect = document.getElementById("existingProjectSelect");
const additionalImagesInput = document.getElementById("additionalImages");
const additionalPreview = document.getElementById("additionalImagePreview");
const addPhotosButton = document.getElementById("addPhotosButton");
const existingProjectHelp = document.getElementById("existingProjectHelp");
const existingProjectTitle = document.getElementById("existingProjectTitle");
const renameProjectForm = document.getElementById("renameProjectForm");
const renameProjectButton = document.getElementById("renameProjectButton");
const deleteProjectButton = document.getElementById("deleteProjectButton");
const existingMediaList = document.getElementById("existingMediaList");
const logoutButton = document.getElementById("adminLogout");
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_IMAGES = 12;
let previewUrls = [];
let additionalPreviewUrls = [];
let uploadedProjects = [];

function setStatus(message, isError = false, isSuccess = false) {
    statusMessage.textContent = message;
    statusMessage.dataset.error = String(isError);
    statusMessage.dataset.success = String(isSuccess);
}

async function readResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "The request failed.");
    }
    return data;
}

async function requestSession() {
    const response = await fetch("/api/admin/session", { cache: "no-store" });
    return readResponse(response);
}

function showAdmin(authenticated) {
    loginForm.hidden = authenticated;
    dashboard.hidden = !authenticated;
}

function renderPreviews(input, container, objectUrls) {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.length = 0;
    container.replaceChildren();
    const files = [...input.files];
    files.forEach((file) => {
        const figure = document.createElement("figure");
        const image = document.createElement("img");
        const caption = document.createElement("figcaption");
        const url = URL.createObjectURL(file);
        objectUrls.push(url);
        image.src = url;
        image.alt = "";
        caption.textContent = file.name;
        figure.append(image, caption);
        container.append(figure);
    });
}

function renderPreview() {
    renderPreviews(imageInput, preview, previewUrls);
}

function renderAdditionalPreview() {
    renderPreviews(additionalImagesInput, additionalPreview, additionalPreviewUrls);
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("The selected image could not be processed."));
        }, type, quality);
    });
}

async function prepareImage(file) {
    if (file.size <= MAX_IMAGE_BYTES) return file;
    if (!file.type.startsWith("image/")) {
        throw new Error(`${file.name} is not a supported image.`);
    }

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / bitmap.width, 1600 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
        bitmap.close();
        throw new Error("Your browser couldn't resize the selected image.");
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    let quality = 0.84;
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    while (blob.size > MAX_IMAGE_BYTES && quality > 0.45) {
        quality -= 0.1;
        blob = await canvasToBlob(canvas, "image/webp", quality);
    }
    if (blob.size > MAX_IMAGE_BYTES) {
        throw new Error(`${file.name} is still too large after resizing.`);
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

async function uploadImage(file) {
    const prepared = await prepareImage(file);
    const bytes = new Uint8Array(await prepared.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }

    const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
            contentType: prepared.type,
            image: btoa(binary)
        })
    });
    const data = await readResponse(response);
    return data.url;
}

async function handleLogin(event) {
    event.preventDefault();
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setStatus("Signing in…");

    try {
        const response = await fetch("/api/admin/session", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ password: new FormData(loginForm).get("password") })
        });
        await readResponse(response);
        loginForm.reset();
        showAdmin(true);
        await setNextProjectTitle();
        setStatus("");
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        submitButton.disabled = false;
    }
}

async function setNextProjectTitle() {
    await refreshUploadedProjects();
    setNextProjectTitleFromList();
}

function setNextProjectTitleFromList() {
    const projectNumbers = uploadedProjects
        .map((project) => /^Project\s+(\d+)$/i.exec(project.title)?.[1])
        .filter(Boolean)
        .map(Number);
    titleInput.value = `Project ${Math.max(0, ...projectNumbers) + 1}`;
}

async function refreshUploadedProjects() {
    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = await readResponse(response);
    uploadedProjects = data.projects;
    renderProjectOptions();
}

function renderProjectOptions() {
    const selectedId = existingProjectSelect.value;
    existingProjectSelect.replaceChildren(new Option("Choose a project", ""));

    uploadedProjects.forEach((project) => {
        const mediaCount = getProjectMedia(project).length;
        const option = new Option(
            `${project.title} (${mediaCount}/12 slides)`,
            project.id
        );
        existingProjectSelect.add(option);
    });

    if (uploadedProjects.some((project) => project.id === selectedId)) {
        existingProjectSelect.value = selectedId;
    }
    deleteProjectButton.disabled = !existingProjectSelect.value;
    renderExistingProject();
    updateAdditionalPhotoLimit();
}

function updateProjectInList(updatedProject) {
    uploadedProjects = uploadedProjects.map((project) =>
        project.id === updatedProject.id ? updatedProject : project
    );
    existingProjectSelect.value = updatedProject.id;
    renderProjectOptions();
}

function getProjectMedia(project) {
    return [
        ...project.imageUrls.map((url) => ({ url, type: "image" })),
        ...(project.videoUrls || []).map((url) => ({ url, type: "video" }))
    ];
}

function renderExistingProject() {
    const project = uploadedProjects.find(
        (item) => item.id === existingProjectSelect.value
    );
    existingMediaList.replaceChildren();
    existingProjectTitle.value = project?.title || "";

    if (!project) {
        existingMediaList.textContent = "Choose a project to manage its slides.";
        existingMediaList.className = "admin-media-list admin-empty-media";
        return;
    }

    existingMediaList.className = "admin-media-list";
    getProjectMedia(project).forEach(({ url, type }) => {
        const item = document.createElement("div");
        item.className = "admin-media-item";
        if (type === "image") {
            const image = document.createElement("img");
            image.src = url;
            image.alt = "";
            item.append(image);
        } else {
            const videoLabel = document.createElement("span");
            videoLabel.className = "admin-media-placeholder";
            videoLabel.textContent = "VIDEO";
            item.append(videoLabel);
        }

        const name = document.createElement("span");
        name.className = "admin-media-name";
        name.textContent = url.split("/").pop() || type;
        const remove = document.createElement("button");
        remove.className = "admin-delete-media";
        remove.type = "button";
        remove.dataset.removeMedia = url;
        remove.textContent = "Delete";
        remove.setAttribute("aria-label", `Delete ${type} slide`);
        item.append(name, remove);
        existingMediaList.append(item);
    });
}

function updateAdditionalPhotoLimit() {
    const project = uploadedProjects.find(
        (item) => item.id === existingProjectSelect.value
    );
    const remaining = project
        ? Math.max(0, 12 - getProjectMedia(project).length)
        : 12;
    additionalImagesInput.max = String(remaining);
    additionalImagesInput.disabled = remaining === 0;
    addPhotosButton.disabled = remaining === 0;
    existingProjectHelp.textContent = project
        ? remaining
            ? `Choose up to ${remaining} additional JPEG, PNG, or WebP photos. They will be added as slides.`
            : "This project already has the maximum of 12 photos."
        : "Choose a project first. Up to 12 photos can be added at once.";
}

async function uploadFiles(files, setProgress) {
    const imageUrls = [];
    for (let index = 0; index < files.length; index += 1) {
        setProgress(`Uploading photo ${index + 1} of ${files.length}…`);
        imageUrls.push(await uploadImage(files[index]));
    }
    return imageUrls;
}

async function handleProjectSubmit(event) {
    event.preventDefault();
    const files = [...imageInput.files];
    if (!files.length || files.length > MAX_IMAGES) {
        setStatus(`Choose between 1 and ${MAX_IMAGES} photos.`, true);
        return;
    }

    const projectTitle = titleInput.value.trim();
    addProjectButton.disabled = true;
    try {
        const imageUrls = await uploadFiles(files, setStatus);
        setStatus("Saving project…");
        const response = await fetch("/api/admin/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ title: projectTitle, imageUrls })
        });
        await readResponse(response);
        projectForm.reset();
        renderPreview();
        await setNextProjectTitle();
        setStatus(
            `Success! ${files.length} photo${files.length === 1 ? "" : "s"} uploaded and ${projectTitle} was added to the website gallery.`,
            false,
            true
        );
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        addProjectButton.disabled = false;
    }
}

async function handleAddPhotos(event) {
    event.preventDefault();
    const project = uploadedProjects.find(
        (item) => item.id === existingProjectSelect.value
    );
    const files = [...additionalImagesInput.files];

    if (!project) {
        setStatus("Choose a project first.", true);
        return;
    }
    const remaining = 12 - getProjectMedia(project).length;
    if (!files.length || files.length > remaining) {
        setStatus(`Choose 1 to ${remaining} additional photos.`, true);
        return;
    }

    addPhotosButton.disabled = true;
    addProjectButton.disabled = true;
    try {
        const newImageUrls = await uploadFiles(files, setStatus);
        setStatus("Adding photos to project…");
        const response = await fetch("/api/admin/projects", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ action: "add-images", id: project.id, imageUrls: newImageUrls })
        });
        const result = await readResponse(response);
        addPhotosForm.reset();
        renderAdditionalPreview();
        updateProjectInList(result.project);
        setStatus(
            `Success! ${files.length} photo${files.length === 1 ? "" : "s"} uploaded and added to ${project.title}.`,
            false,
            true
        );
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        addProjectButton.disabled = false;
        updateAdditionalPhotoLimit();
    }
}

async function handleRenameProject(event) {
    event.preventDefault();
    const project = uploadedProjects.find(
        (item) => item.id === existingProjectSelect.value
    );
    if (!project) {
        setStatus("Choose a project first.", true);
        return;
    }

    renameProjectButton.disabled = true;
    try {
        const response = await fetch("/api/admin/projects", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                action: "rename",
                id: project.id,
                title: existingProjectTitle.value
            })
        });
        const result = await readResponse(response);
        updateProjectInList(result.project);
        setStatus("Project name updated.");
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        renameProjectButton.disabled = false;
    }
}

async function handleRemoveMedia(mediaUrl, button) {
    const project = uploadedProjects.find(
        (item) => item.id === existingProjectSelect.value
    );
    if (!project) return;
    if (!window.confirm("Remove this slide from the project?")) return;

    button.disabled = true;
    setStatus("Removing slide…");
    try {
        const response = await fetch("/api/admin/projects", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                action: "remove-media",
                id: project.id,
                mediaUrl
            })
        });
        const result = await readResponse(response);
        updateProjectInList(result.project);
        setStatus("Project slide deleted.");
    } catch (error) {
        setStatus(error.message, true);
        button.disabled = false;
    }
}

async function handleDeleteProject() {
    const project = uploadedProjects.find(
        (item) => item.id === existingProjectSelect.value
    );
    if (!project) {
        setStatus("Choose a project first.", true);
        return;
    }
    if (!window.confirm(`Permanently delete ${project.title} and remove all its slides?`)) {
        return;
    }

    deleteProjectButton.disabled = true;
    setStatus(`Deleting ${project.title}…`);
    try {
        const response = await fetch("/api/admin/projects", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ id: project.id })
        });
        await readResponse(response);
        uploadedProjects = uploadedProjects.filter((item) => item.id !== project.id);
        existingProjectSelect.value = "";
        renderProjectOptions();
        setNextProjectTitleFromList();
        setStatus(`${project.title} was deleted from the gallery.`);
    } catch (error) {
        setStatus(error.message, true);
        deleteProjectButton.disabled = false;
    }
}

async function handleLogout() {
    logoutButton.disabled = true;
    try {
        const response = await fetch("/api/admin/session", { method: "DELETE" });
        await readResponse(response);
        showAdmin(false);
        setStatus("You have signed out.");
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        logoutButton.disabled = false;
    }
}

async function init() {
    showAdmin(false);
    loginForm.addEventListener("submit", handleLogin);
    projectForm.addEventListener("submit", handleProjectSubmit);
    addPhotosForm.addEventListener("submit", handleAddPhotos);
    renameProjectForm.addEventListener("submit", handleRenameProject);
    deleteProjectButton.addEventListener("click", handleDeleteProject);
    logoutButton.addEventListener("click", handleLogout);
    imageInput.addEventListener("change", renderPreview);
    additionalImagesInput.addEventListener("change", renderAdditionalPreview);
    existingProjectSelect.addEventListener("change", () => {
        deleteProjectButton.disabled = !existingProjectSelect.value;
        renderExistingProject();
        updateAdditionalPhotoLimit();
    });
    existingMediaList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-remove-media]");
        if (button) handleRemoveMedia(button.dataset.removeMedia, button);
    });

    try {
        const session = await requestSession();
        showAdmin(session.authenticated === true);
        if (session.authenticated) await setNextProjectTitle();
    } catch (error) {
        setStatus(error.message, true);
    }
}

init();
