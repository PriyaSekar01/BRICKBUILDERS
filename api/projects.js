"use strict";

const { readProjects } = require("../lib/project-store");

module.exports = async function projects(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ message: "Method not allowed." });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
        const items = await readProjects();
        return res.status(200).json({ projects: items });
    } catch (error) {
        console.error("Unable to load gallery projects:", error);
        return res.status(500).json({ message: "Unable to load gallery projects." });
    }
};
