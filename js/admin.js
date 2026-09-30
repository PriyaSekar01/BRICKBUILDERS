"use strict";

const loginForm = document.getElementById("adminLoginForm");
const dashboard = document.getElementById("adminDashboard");
const projectForm = document.getElementById("projectUploadForm");
const statusMessage = document.getElementById("adminStatus");
const titleInput = document.getElementById("projectTitle");
const imageInput = document.getElementById("projectImages");
const preview = document.getElementById("imagePreview");
const addProjectButton = document.getElementById("addProjectButton");
const logoutButton = document.getElementById("adminLogout");
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_IMAGES = 12;
const STATIC_PROJECT_COUNT = 4;
let previewUrls = [];

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.dataset.error = String(isError);
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

function renderPreview() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = [];
    preview.replaceChildren();
    const files = [...imageInput.files];
    files.forEach((file) => {
        const figure = document.createElement("figure");
        const image = document.createElement("img");
        const caption = document.createElement("figcaption");
        const url = URL.createObjectURL(file);
        previewUrls.push(url);
        image.src = url;
        image.alt = "";
        caption.textContent = file.name;
        figure.append(image, caption);
        preview.append(figure);
    });
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
    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = await readResponse(response);
    titleInput.value = `Project ${STATIC_PROJECT_COUNT + data.projects.length + 1}`;
}

async function handleProjectSubmit(event) {
    event.preventDefault();
    const files = [...imageInput.files];
    if (!files.length || files.length > MAX_IMAGES) {
        setStatus(`Choose between 1 and ${MAX_IMAGES} photos.`, true);
        return;
    }

    addProjectButton.disabled = true;
    const imageUrls = [];

    try {
        for (let index = 0; index < files.length; index += 1) {
            setStatus(`Uploading photo ${index + 1} of ${files.length}…`);
            imageUrls.push(await uploadImage(files[index]));
        }

        setStatus("Saving project…");
        const response = await fetch("/api/admin/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ title: titleInput.value, imageUrls })
        });
        await readResponse(response);
        projectForm.reset();
        renderPreview();
        await setNextProjectTitle();
        setStatus("Project added to the website gallery.");
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        addProjectButton.disabled = false;
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
    logoutButton.addEventListener("click", handleLogout);
    imageInput.addEventListener("change", renderPreview);

    try {
        const session = await requestSession();
        showAdmin(session.authenticated === true);
        if (session.authenticated) await setNextProjectTitle();
    } catch (error) {
        setStatus(error.message, true);
    }
}

init();
