import { UserInfo } from "../types/userInfo";
import { GitHubIcon, LinkIcon } from "../utils/IconLibrary";

export function DefaultResumeTemplate({ userInfo }: { userInfo: UserInfo }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <style>{`
          @page {
            size: Letter;
            margin: 0.5in 0.5in 0.5in 0.5in;
          }

        @font-face {
            font-family: "Times New Roman Custom";
            src: url("https://fonts.cdnfonts.com/s/14645/TimesNewRoman.woff") format("woff");
            font-weight: normal;
            font-style: normal;
        }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: black;
            font-family: "Times New Roman", Times, Georgia, serif;
            font-size: 11px;
            line-height: 1.25;
          }

          .page {
            width: 100%;
          }

          .header {
            margin-bottom: 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .name {
            font-size: 26px;
            font-weight: 700;
            line-height: 1.1;
            color: black;
            margin: 0 0 4px 0;
            letter-spacing: 0.2px;
          }

          .contact {
            font-size: 11px;
            line-height: 1.5;
            display: flex;
            align-items:center;
            justify-content: center;
            gap: 6px;
          }

          .section {
            margin-top: 14px;
          }

          .section-title {
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            margin: 0 0 10px 0;
            padding-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 12px;
            white-space: nowrap;
            border-bottom: 0.5px solid #2d2d2d;
        }

          .entry {
            margin-bottom: 8px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .entry-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 2px;
          }

          .entry-title {
            font-size: 12px;
            font-weight: 700;
            color: black;
            margin: 0;
          }

          .entry-date {
            white-space: nowrap;
            text-align: right;
            font-style: italic;
          }

          .entry-subtitle {
            font-size: 10px;
            color: #4b5563;
            margin: 0 0 5px 0;
            font-weight: 500;
          }

          .entry-meta {
            color: #6b7280;
          }

          ul {
            margin: 6px 0 0 18px;
            padding: 0;
            list-style-type: square;
          }

          li {
            margin-bottom: 4px;
          }

          .skills-list {
            color: #374151;
          }

          .education-details
           {
            color: #4b5563;
            margin-top: 2px;
          }

          .muted {
            color: #6b7280;
          }

          .contact a {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .project-title {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 700;
            color: black;
            margin: 0;
        }

        .project-title a {
            display: inline-flex;
            align-items: center;
        }

            .project-title svg {
            display: block;
        }
        `}</style>
      </head>
      <body>
        <div className="page">
          <header className="header">
            <h1 className="name">{userInfo.name}</h1>

            {(userInfo.current_company || userInfo.current_position) && (
              <div>
                {[userInfo.current_position, userInfo.current_company]
                  .filter(Boolean)
                  .join(" · ")
                  .toUpperCase()}
              </div>
            )}

            <div className="contact">
              {userInfo.current_address && (
                <>
                  {userInfo.current_address}
                  {" | "}
                </>
              )}
              {userInfo.phone_number && (
                <>
                  <a
                    href={`tel:${userInfo.phone_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {userInfo.phone_number}
                  </a>
                  {" | "}
                </>
              )}
              {userInfo.email && (
                <>
                  <a
                    href={`mailto:${userInfo.email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {userInfo.email}
                  </a>
                  {" | "}
                </>
              )}
              {userInfo.github_url && (
                <>
                  <a
                    href={userInfo.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                  {" | "}
                </>
              )}
              {userInfo.linkedin_url && (
                <>
                  <a
                    href={userInfo.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn
                  </a>
                </>
              )}
            </div>
          </header>

          {userInfo.education.length > 0 && (
            <section className="section">
              <div className="section-title">Education</div>

              {userInfo.education.map((edu, i) => (
                <div className="entry" key={i}>
                  <div className="entry-top">
                    <div>
                      <div className="entry-title">{edu.institution}</div>
                      <div className="entry-subtitle">
                        {[
                          edu.degree,
                          ...edu.majors,
                          ...edu.minors,
                          `GPA: ${edu.gpa}`,
                          ...edu.awards,
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </div>
                    </div>
                    <div className="entry-date">
                      {edu.year_start} - {edu.year_end ?? "Present"}
                    </div>
                  </div>
                  {edu.courses.length > 0 && (
                    <ul>
                      <li>
                        {edu.courses.map((c) => c.description).join(", ")}
                      </li>
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {userInfo.experiences.length > 0 && (
            <section className="section">
              <div className="section-title">Work Experience</div>

              {userInfo.experiences.map((exp, i) => (
                <div className="entry" key={i}>
                  <div className="entry-top">
                    <div>
                      <div className="entry-title">{exp.company}</div>
                      <div className="entry-subtitle">{exp.job_title}</div>
                    </div>
                    <div className="entry-date">
                      {exp.date_start} - {exp.date_end ?? "Present"}
                    </div>
                  </div>

                  {exp.job_description.length > 0 && (
                    <ul>
                      {exp.job_description
                        .split(". ")
                        .map((description) => description.trim())
                        .filter(Boolean)
                        .map((description, i) => (
                          <li key={i}>
                            {description.endsWith(".")
                              ? description
                              : `${description}.`}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {userInfo.projects.length > 0 && (
            <section className="section">
              <div className="section-title">Projects</div>

              {userInfo.projects.map((project, i) => (
                <div className="entry" key={i}>
                  <div className="entry-top">
                    <div>
                      <div className="project-title">
                        {project.name}
                        {project.github_url && (
                          <a
                            href={project.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <GitHubIcon size={18} />
                          </a>
                        )}
                        {project.demo_url && (
                          <a
                            href={project.demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <LinkIcon size={18} />
                          </a>
                        )}
                      </div>
                      <div className="entry-subtitle">
                        {project.languages_used?.join(" | ")}
                        {project.frameworks_used?.join(" | ")}
                        {project.technologies_used?.join(" | ")}
                      </div>
                    </div>
                    <div className="entry-date">
                      {project.date_start} - {project.date_end ?? "Present"}
                    </div>
                  </div>

                  {project.description.length > 0 && (
                    <ul>
                      {project.description
                        .split(". ")
                        .map((description) => description.trim())
                        .filter(Boolean)
                        .map((description, i) => (
                          <li key={i}>
                            {description.endsWith(".")
                              ? description
                              : `${description}.`}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {userInfo.skills.length > 0 && (
            <section className="section">
              <div className="section-title">Skills</div>
              <div className="skills-list">
                {userInfo.skills.map((s) => s.name).join(", ")}
              </div>
            </section>
          )}
        </div>
      </body>
    </html>
  );
}
