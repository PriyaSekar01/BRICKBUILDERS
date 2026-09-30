"use strict";

const imageSlides = (names) => names.map((name) => `/images/${name}`);
const videoSlides = (names) => names.map((name) => `/images/${name}`);

module.exports = [
    {
        id: "project-1",
        title: "Project 1",
        imageUrls: imageSlides([
            "first_project_image_01.jpeg",
            "first_project_image_02.jpeg",
            "first_project_image_03.jpeg",
            "first_project_image_04.jpeg",
            "first_project_image_05.jpeg",
            "first_project_image_06.jpeg",
            "first_project_image_07.jpeg",
            "first_project_image_08.jpeg"
        ]),
        videoUrls: []
    },
    {
        id: "project-2",
        title: "Project 2",
        imageUrls: imageSlides([
            "second_project_01.jpeg",
            "second_project_02.jpeg",
            "second_project_03.jpeg",
            "second_project_04.jpeg",
            "second_project_05.jpeg",
            "second_project_07.jpeg"
        ]),
        videoUrls: videoSlides(["second_project_03.mp4"])
    },
    {
        id: "project-3",
        title: "Project 3",
        imageUrls: imageSlides([
            "third_project_01.jpeg",
            "third_project_02.jpeg",
            "third_project_03.jpeg",
            "third_project_04.jpeg"
        ]),
        videoUrls: []
    },
    {
        id: "project-4",
        title: "Project 4",
        imageUrls: imageSlides(["forth_project_01.jpeg"]),
        videoUrls: videoSlides([
            "forth_project_02.mp4",
            "forth_project_03.mp4",
            "forth_project_04.mp4",
            "forth_project_05.mp4"
        ])
    }
];
