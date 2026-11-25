import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanUserInfo } from "../utils/cleanUserInfo";
import { AwesomeCVResumeTemplate } from "../templates/AwesomeCVResumeTemplate";
import { DefaultResumeTemplate } from "../templates/DefaultResumeTemplate";
import { UserInfo } from "../types/userInfo";

//  mock data
export const mockUserInfo: UserInfo = {
  bio: "I'm a rising senior at Boston University pursuing a master's degree in Computer Science. I'm interested in computer systems, web and game development, and machine learning!",
  name: "Eric Nohara-LeClair",
  email: "ernohara@bu.edu",
  x_url: "",

  skills: [
    {
      name: "AWS",
      proficiency: 8,
      years_of_experience: 3,
    },
    {
      name: "Azure",
      proficiency: 7,
      years_of_experience: 1,
    },
    {
      name: "C",
      proficiency: 8,
      years_of_experience: 4,
    },
    {
      name: "C#",
      proficiency: 9,
      years_of_experience: 2,
    },
    {
      name: "Confluence",
      proficiency: 8,
      years_of_experience: 1,
    },
    {
      name: "Express.js",
      proficiency: 7,
      years_of_experience: 2,
    },
    {
      name: "Firebase",
      proficiency: 8,
      years_of_experience: 2,
    },
    {
      name: "Git",
      proficiency: 9,
      years_of_experience: 5,
    },
    {
      name: "GitHub",
      proficiency: 9,
      years_of_experience: 5,
    },
    {
      name: "GitHub CI/CD",
      proficiency: 8,
      years_of_experience: 1,
    },
    {
      name: "Grafana",
      proficiency: 8,
      years_of_experience: 1,
    },
    {
      name: "Handlebars",
      proficiency: 8,
      years_of_experience: 2,
    },
    {
      name: "HTML + CSS",
      proficiency: 9,
      years_of_experience: 4,
    },
    {
      name: "Integration Testing",
      proficiency: 7,
      years_of_experience: 1,
    },
    {
      name: "Java",
      proficiency: 9,
      years_of_experience: 5,
    },
    {
      name: "JavaScript",
      proficiency: 8,
      years_of_experience: 4,
    },
    {
      name: "Jira",
      proficiency: 9,
      years_of_experience: 1,
    },
    {
      name: "K6 Load Testing",
      proficiency: 8,
      years_of_experience: 1,
    },
    {
      name: "Linux",
      proficiency: 8,
      years_of_experience: 3,
    },
    {
      name: "MongoDB",
      proficiency: 8,
      years_of_experience: 2,
    },
    {
      name: "MSSQL Server",
      proficiency: 8,
      years_of_experience: 1,
    },
    {
      name: ".NET",
      proficiency: 8,
      years_of_experience: 1,
    },
    {
      name: "Next.js",
      proficiency: 10,
      years_of_experience: 3,
    },
    {
      name: "Node.js",
      proficiency: 9,
      years_of_experience: 3,
    },
    {
      name: "OCaml",
      proficiency: 6,
      years_of_experience: 1,
    },
    {
      name: "PostgreSQL",
      proficiency: 8,
      years_of_experience: 1,
    },
    {
      name: "Python",
      proficiency: 8,
      years_of_experience: 5,
    },
    {
      name: "React.js",
      proficiency: 8,
      years_of_experience: 3,
    },
    {
      name: "SQL",
      proficiency: 9,
      years_of_experience: 3,
    },
    {
      name: "SQLite",
      proficiency: 9,
      years_of_experience: 2,
    },
    {
      name: "Supabase",
      proficiency: 8,
      years_of_experience: 3,
    },
    {
      name: "Tailwind",
      proficiency: 7,
      years_of_experience: 1,
    },
    {
      name: "TypeScript",
      proficiency: 8,
      years_of_experience: 2,
    },
    {
      name: "Unit Testing",
      proficiency: 7,
      years_of_experience: 1,
    },
    {
      name: "Windows",
      proficiency: 10,
      years_of_experience: 8,
    },
    {
      name: "XML",
      proficiency: 8,
      years_of_experience: 2,
    },
    {
      name: "YAML",
      proficiency: 8,
      years_of_experience: 1,
    },
  ],

  projects: [
    {
      name: "Event Echo",
      date_end: "2025-12-29",
      demo_url:
        "https://drive.google.com/drive/folders/15LC87y1itksHIRGUsOX4qBqt_M4nZjGB?usp=sharing",
      date_start: "2025-09-01",
      github_url: "https://github.com/EricNohara/Event-Echo",
      description:
        "Event Echo is a memory-sharing map app for real-world events.\nAfter attending an event (concert, festival, lecture, etc.), users can create an event room (if one doesn’t already exist) and post one photo and one short reflection about their experience. Other attendees can join the same event room and add their own “echo” — a photo and thought — building a community-generated timeline and memory wall for that event. Over time, each event’s location becomes a shared memory space, where users can relive collective experiences and see different perspectives. Additionally, users can upvote or downvote contributions, with the best ones being pinned to the top and earning contributor points.",
      languages_used: ["Kotlin"],
      frameworks_used: ["Jetpack Compose"],
      technologies_used: [
        "Android",
        "Android Studio",
        "Ticketmaster",
        "Google Maps",
        "Cloud Firestore",
        "Firebase",
      ],
    },
    {
      name: "FFOracle",
      date_end: "2025-12-21",
      date_start: "2025-09-01",
      github_url: "https://github.com/EricNohara/FFOracle-Frontend",
      description:
        "A full-stack fantasy football analytics platform that provides AI-driven start/sit recommendations, player comparisons, and league performance tracking. The backend integrates real-time NFL data (NFLVerse, ESPN), custom league scoring settings, betting lines, game environments, defensive matchups, and more to generate personalized roster advice through a RESTful ASP.NET Core API. Built with .NET 8, C#, and PostgreSQL (and Supabase), with secure JWT authentication and Stripe payment integration. Deployed on Azure App Service, with the frontend deployed on Vercel and background workers deployed on AWS.",
      languages_used: ["C#", "Python", "TypeScript", "PostgreSQL"],
      frameworks_used: ["ASP.Net Core", "next.js", "Supabase"],
      technologies_used: [
        "Amazon Web Services (AWS)",
        "Microsoft Azure",
        "Vercel",
      ],
    },
    {
      name: "Managed Portfolio Website",
      date_end: "2025-06-26",
      date_start: "2025-05-19",
      github_url: "https://github.com/EricNohara/Managed-Portfolio-Website",
      description:
        "Portfolio website built with Next.js and integrated with my Portfolio Website Manager's built in API to display important and relevant information for my portfolio website. Built to display content dynamically, allowing me to make changes in the portfolio editor and view those changes in my deployed portfolio website without having to change a single line of code.",
      languages_used: ["TypeScript", "CSS"],
      frameworks_used: ["Next.js", "Tailwind"],
      technologies_used: ["MUI", "Portfolio Website Manager"],
    },
    {
      name: "Course Admin Grading App",
      date_end: "2025-05-10",
      date_start: "2025-04-20",
      github_url: "https://github.com/EricNohara/CS-611-FINAL-PROJECT",
      description:
        "Created a comprehensive Java-based grading and course management system designed for college professors. It features a robust backend using SQLite for data storage and supports user roles such as students, teachers, graders, and admins. The system enables teachers to manage courses, assignments, and grading templates efficiently, with support for copying course structures across semesters. It provides a user-friendly Swing-based UI for managing users, courses, assignments, submissions, and grades, as well as tools for grade statistics and file uploads. The application includes utilities for database backup and restoration, email notifications, and secure password handling. Extensive testing was performed on database operations, UI functionality, and file management to ensure reliability.",
      languages_used: ["Java"],
      frameworks_used: ["Swing (GUI)"],
      technologies_used: ["SQLite", "SMTP"],
    },
    {
      name: "Nukleio",
      date_end: "2026-03-29",
      demo_url: "https://www.nukleio.com",
      date_start: "2024-10-31",
      github_url:
        "https://github.com/EricNohara/Portfolio-Website-Editor-Supabase",
      description:
        "Created an all-in-one solution for portfolio website management, enabling users to update their portfolios without modifying any source code. It features a UI for adding, editing, or deleting user information and provides a robust API for requesting user data in one place. Designed for seamless integration with existing portfolios, the platform allows developers to fetch up-to-date information with a single request, eliminating manual updates and ensuring that changes are automatically pushed to sites connected to the API. It uses a custom AWS lambda function to bypass the Supabase free tier by calling the public endpoint on a periodic time trigger.",
      languages_used: ["TypeScript", "Python", "CSS"],
      frameworks_used: ["Next.js", "Node.js"],
      technologies_used: ["Vercel", "Supabase", "AWS Lambda", "Redis"],
    },
    {
      name: "TripSync",
      date_end: "2024-08-11",
      demo_url: "https://tripsync-zh42.onrender.com/",
      date_start: "2024-07-01",
      github_url: "https://github.com/EricNohara/TripSync",
      description:
        "Implemented REST API backend using Node.js with Express, stored user data using MongoDB, integrated cloud storage with AWS (S3), handled authentication with JWT, and utilized Handlebars for server-side rendering. Supports registration, sign in, 2 factor auth, file storage and sharing with similar functionality to Google Drive.",
      languages_used: ["JavaScript"],
      frameworks_used: ["Node.js", "Express.js", "Handlebars"],
      technologies_used: ["MongoDB", "AWS"],
    },
    {
      name: "Webserver Integrated Arduino Attendance Tracker",
      date_end: "2024-05-10",
      demo_url:
        "https://drive.google.com/drive/folders/1SGPjzqW3uOtwZvEsnllC91_HD7ibE_Vc?usp=sharing",
      date_start: "2024-01-10",
      github_url:
        "https://github.com/EricNohara/Webserver-Integrated-Arduino-Attendance-Tracker",
      description:
        "Simple webserver written in C using socket library interface. Handles HTTP requests, HTML error codes, and can run server side CGI scripts. Hardware is an Arduino driven device using ultrasonic sensors that tracks the current attendance in a room and communicates with the webserver via serial communication, sending or receiving data from the client side. Supports async data handling, real-time data plotting utilizing AJAX requests, and email sending via the SMTP protocol.",
      languages_used: ["C", "Python", "Javascript", "HTML", "CSS", "Perl"],
      frameworks_used: ["C Socket Interface"],
      technologies_used: ["Arduino"],
    },
    {
      name: "Daily Workout SMS Sender",
      date_end: "2024-01-01",
      date_start: "2023-12-01",
      github_url: "https://github.com/EricNohara/Python-SMS-Workout_Sender",
      description:
        "Python script which makes use of smtplib to send SMS messages to my phone and pandas library to read data from a public google sheets file with data about my workouts. Script will locate the current workout for the day and send it to my phone with an accompanying image. Set up with Windows Task Scheduler to send daily updates. More details and usage guide available on GitHub page.",
      languages_used: ["Python"],
      frameworks_used: ["Pandas", "smtplib"],
    },
  ],

  education: [
    {
      gpa: "3.93",
      awards: ["Dean's List 2022 - 2025"],
      degree: "BA + MS",
      majors: ["Computer Science"],
      minors: [],
      courses: [
        {
          name: "CS 654",
          grade: "A",
          description: "Embedded programming",
        },
        {
          name: "CS 506",
          grade: "A",
          description: "Data science application",
        },
        {
          name: "CS 599 X1",
          grade: "A",
          description: "AI agent programming",
        },
        {
          name: "CS 611",
          grade: "A",
          description: "OOP applications",
        },
        {
          name: "CS 132",
          grade: "A",
          description: "Linear Algebra",
        },
        {
          name: "CS 210",
          grade: "A",
          description: "Computer Systems",
        },
        {
          name: "CS 237",
          grade: "A",
          description: "Probability in computing",
        },
        {
          name: "CS 330",
          grade: "A",
          description: "Algorithm design",
        },
        {
          name: "CS 350",
          grade: "A",
          description: "Distributed systems",
        },
        {
          name: "CS 391",
          grade: "A",
          description: "React.js and Next.js",
        },
        {
          name: "CS 392",
          grade: "A",
          description: "Advanced algorithms",
        },
        {
          name: "CS 392 P2",
          grade: "A",
          description: "Advanced algorithms 2",
        },
        {
          name: "CS 410",
          grade: "A",
          description: "Systems programming",
        },
        {
          name: "CS 440",
          grade: "A",
          description: "AI agent programming",
        },
        {
          name: "CS 460",
          grade: "A",
          description: "Databases",
        },
        {
          name: "CS 501 E1",
          grade: "A",
          description: "Mobile development",
        },
        {
          name: "CS 501 S1",
          grade: "A",
          description: ".NET programming",
        },
        {
          name: "CS 131",
          grade: "A-",
          description: "Discrete math + combinatorics",
        },
        {
          name: "CS 112",
          grade: "A-",
          description: "Data structures + algorithms",
        },
        {
          name: "CS 320",
          grade: "A-",
          description: "Compiler design",
        },
      ],
      year_end: 2026,
      year_start: 2022,
      institution: "Boston University",
    },
    {
      gpa: "3.8",
      awards: ["High honors"],
      degree: "High School",
      majors: [],
      minors: [],
      courses: [],
      year_end: 2022,
      year_start: 2018,
      institution: "MICDS",
    },
  ],

  github_url: "https://github.com/EricNohara",
  resume_url:
    "https://jfsetifsqcpkwdtcrhdt.supabase.co/storage/v1/object/public/resumes/d206d86e-88d3-4f9d-986c-40352f4e952f-Eric%20Resume.pdf",

  experiences: [
    {
      company: "Dot Foods",
      job_title: "Robotic Process Automation Developer",
      date_start: "2025-09-01",
      job_description:
        "Developed and deployed automation solutions using UiPath, VB.NET, and .NET to streamline workflows across departments and partner companies. Automated virtual tasks to improve efficiency and reduce manual effort of consumers. Collaborated closely with business teams to identify automation opportunities and ensure reliable, maintainable solutions. Assisted in updating legacy processes and providing QA to other team members.",
    },
    {
      company: "Dot Foods",
      date_end: "2025-08-20",
      job_title: "Software Engineer Intern",
      date_start: "2025-05-19",
      job_description:
        "Collaborated within an Agile team environment, participating in daily standups and iterative development cycles. Developed and maintained backend applications using C#, .NET, and Azure Function Apps. Wrote and optimized SQL queries for Microsoft SQL Server databases. Contributed to the team’s DevOps culture by building a Grafana dashboard to visualize DORA metrics and support data-driven decision-making.",
    },
    {
      company: "Boston University",
      date_end: "2025-05-10",
      job_title: "CS 237 Course Assistant",
      date_start: "2024-01-10",
      job_description:
        "Assisted in facilitating the Spring 2024 CS 237 Course (Probability in Computing). Attended instructor meetings, addressed student inquiries, held office hours, formulated problem set solutions, and diligently contributed to grading.",
    },
    {
      company: "Kappa Theta Pi Fraternity",
      job_title: "Website Coordinator Leader",
      date_start: "2023-09-01",
      job_description:
        "Lead team of developers to build and maintain the Kappa Theta Pi official website utilizing React.js to create an efficient website design with all necessary information about the organization.",
    },
  ],

  linkedin_url: "https://www.linkedin.com/in/eric-nohara-leclair-189298291/",
  phone_number: "6363179533",
  portrait_url:
    "https://jfsetifsqcpkwdtcrhdt.supabase.co/storage/v1/object/public/portraits/d206d86e-88d3-4f9d-986c-40352f4e952f-professional-headshot.jpg",
  instagram_url: "https://www.instagram.com/eric.nohara/",
  transcript_url:
    "https://jfsetifsqcpkwdtcrhdt.supabase.co/storage/v1/object/public/transcripts/d206d86e-88d3-4f9d-986c-40352f4e952f-Unofficial%20Transcript.pdf",
  current_address: "75 Sandy Ridge Court",
  current_company: "Dot Foods",
  current_position: "Software developer",
};

// normalize
const userInfo = cleanUserInfo(mockUserInfo);

// render HTML
const html =
  "<!DOCTYPE html>" +
  renderToStaticMarkup(<DefaultResumeTemplate userInfo={userInfo} />);

// write file
const filePath = path.join(process.cwd(), "preview.html");
fs.writeFileSync(filePath, html);

console.log("Preview generated at:", filePath);
