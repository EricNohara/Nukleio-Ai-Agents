import { UserInfo } from "../types/userInfo";

export function UNCResumeTemplate({ userInfo }: { userInfo: UserInfo }) {
  // return (
  //     <html>
  //         <head>
  //             <meta charSet="utf-8" />
  //             <style>{`
  //       @page {
  //         size: Letter;
  //         margin: 0.6in 0.7in;
  //       }

  //       body {
  //         font-family: "Times New Roman", Times, serif;
  //         font-size: 12px;
  //         line-height: 1.35;
  //         color: #111;
  //       }

  //       h1 {
  //         text-align: center;
  //         font-size: 26px;
  //         margin-bottom: 4px;
  //       }

  //       .contact {
  //         text-align: center;
  //         font-size: 12px;
  //         margin-bottom: 10px;
  //       }

  //       .section {
  //         margin-top: 14px;
  //       }

  //       .section-title {
  //         font-weight: bold;
  //         font-size: 13px;
  //         border-bottom: 1px solid #000;
  //         padding-bottom: 2px;
  //         margin-bottom: 6px;
  //       }

  //       .entry {
  //         margin-bottom: 8px;
  //         page-break-inside: avoid;
  //       }

  //       .entry-header {
  //         display: flex;
  //         justify-content: space-between;
  //         font-weight: bold;
  //       }

  //       .subheader {
  //         font-style: italic;
  //         margin-top: 2px;
  //       }

  //       ul {
  //         margin: 4px 0 0 18px;
  //         padding: 0;
  //       }

  //       li {
  //         margin-bottom: 2px;
  //       }

  //       .skills-line {
  //         margin-bottom: 2px;
  //       }
  //     `}</style>
  //         </head>

  //         <body>
  //             {/* NAME */}
  //             <h1>{resume.contact.name}</h1>

  //             {/* CONTACT */}
  //             <div className="contact">
  //                 {[
  //                     resume.contact.phone,
  //                     resume.contact.email,
  //                     resume.contact.address,
  //                 ]
  //                     .filter(Boolean)
  //                     .join(" | ")}
  //             </div>

  //             {/* EDUCATION */}
  //             {resume.education.length > 0 && (
  //                 <div className="section">
  //                     <div className="section-title">EDUCATION</div>

  //                     {resume.education.map((edu, i) => (
  //                         <div className="entry" key={i}>
  //                             <div className="entry-header">
  //                                 <span>
  //                                     {edu.institution}
  //                                 </span>
  //                                 <span>
  //                                     {edu.endYear}
  //                                 </span>
  //                             </div>

  //                             <div className="subheader">
  //                                 {edu.degree}
  //                             </div>

  //                             {edu.details.length > 0 && (
  //                                 <ul>
  //                                     {edu.details.map((detail, j) => (
  //                                         <li key={j}>{detail}</li>
  //                                     ))}
  //                                 </ul>
  //                             )}
  //                         </div>
  //                     ))}
  //                 </div>
  //             )}

  //             {/* SKILLS */}
  //             {resume.skills.length > 0 && (
  //                 <div className="section">
  //                     <div className="section-title">TECHNICAL SKILLS</div>

  //                     <div className="skills-line">
  //                         {resume.skills.join(", ")}
  //                     </div>
  //                 </div>
  //             )}

  //             {/* EXPERIENCE */}
  //             {resume.experience.length > 0 && (
  //                 <div className="section">
  //                     <div className="section-title">RELEVANT EXPERIENCE</div>

  //                     {resume.experience.map((exp, i) => (
  //                         <div className="entry" key={i}>
  //                             <div className="entry-header">
  //                                 <span>
  //                                     {exp.company}
  //                                 </span>
  //                                 <span>
  //                                     {exp.startDate} - {exp.endDate}
  //                                 </span>
  //                             </div>

  //                             <div className="subheader">{exp.title}</div>

  //                             {exp.bullets.length > 0 && (
  //                                 <ul>
  //                                     {exp.bullets.map((bullet, j) => (
  //                                         <li key={j}>{bullet}</li>
  //                                     ))}
  //                                 </ul>
  //                             )}
  //                         </div>
  //                     ))}
  //                 </div>
  //             )}

  //             {/* PROJECTS */}
  //             {resume.projects.length > 0 && (
  //                 <div className="section">
  //                     <div className="section-title">PROJECTS</div>

  //                     {resume.projects.map((proj, i) => (
  //                         <div className="entry" key={i}>
  //                             <div className="entry-header">
  //                                 <span>
  //                                     {proj.name}
  //                                     {proj.subtitle ? ` | ${proj.subtitle}` : ""}
  //                                 </span>
  //                             </div>

  //                             {proj.bullets.length > 0 && (
  //                                 <ul>
  //                                     {proj.bullets.map((bullet, j) => (
  //                                         <li key={j}>{bullet}</li>
  //                                     ))}
  //                                 </ul>
  //                             )}
  //                         </div>
  //                     ))}
  //                 </div>
  //             )}
  //         </body>
  //     </html>
  // );
  return <></>;
}
