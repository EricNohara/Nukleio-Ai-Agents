import { UserInfo } from "../types/userInfo.js";

function cleanString(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function cleanRequiredString(value: string): string {
  return value.trim();
}

function cleanStringArray(
  values: string[] | null | undefined
): string[] | undefined {
  if (!values) return undefined;

  const cleaned = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return cleaned.length > 0 ? cleaned : undefined;
}

function parseDateValue(value: string | null | undefined): number {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return Number.NEGATIVE_INFINITY;
  }

  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let date: Date;

  if (isoMatch) {
    const [, yearString, monthString, dayString] = isoMatch;

    date = new Date(
      Number(yearString),
      Number(monthString) - 1,
      Number(dayString)
    );
  } else {
    date = new Date(cleaned);
  }

  const timestamp = date.getTime();

  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function formatReadableDate(
  value: string | null | undefined
): string | undefined {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return undefined;
  }

  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let date: Date;

  if (isoMatch) {
    const [, yearString, monthString, dayString] = isoMatch;

    date = new Date(
      Number(yearString),
      Number(monthString) - 1,
      Number(dayString)
    );
  } else {
    date = new Date(cleaned);
  }

  if (Number.isNaN(date.getTime())) {
    return cleaned;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatRequiredReadableDate(value: string): string {
  const cleaned = cleanRequiredString(value);

  return formatReadableDate(cleaned) ?? cleaned;
}

function compareOptionalNumbersDescending(
  first: number | null | undefined,
  second: number | null | undefined
): number {
  const firstValue = first ?? Number.NEGATIVE_INFINITY;
  const secondValue = second ?? Number.NEGATIVE_INFINITY;

  return secondValue - firstValue;
}

function todayTimestamp(): number {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function getEffectiveEndDateValue(endDate: string | null | undefined): number {
  const cleaned = cleanString(endDate);

  // A missing end date means the position is current.
  if (!cleaned) {
    return todayTimestamp();
  }

  return parseDateValue(cleaned);
}

function compareByMostRecentEndDate(
  firstEnd: string | null | undefined,
  firstStart: string | null | undefined,
  secondEnd: string | null | undefined,
  secondStart: string | null | undefined
): number {
  const firstEndValue = getEffectiveEndDateValue(firstEnd);
  const secondEndValue = getEffectiveEndDateValue(secondEnd);

  if (secondEndValue !== firstEndValue) {
    return secondEndValue - firstEndValue;
  }

  const firstStartValue = parseDateValue(firstStart);
  const secondStartValue = parseDateValue(secondStart);

  if (secondStartValue !== firstStartValue) {
    return secondStartValue - firstStartValue;
  }

  return 0;
}

function educationRecencyValue(education: {
  year_start: number;
  year_end: number | undefined;
}): number {
  return education.year_end ?? education.year_start;
}

function gradeRank(grade: string | null | undefined): number {
  const cleaned = cleanString(grade);

  if (!cleaned) {
    return -1;
  }

  const numericGrade = Number(cleaned);

  if (!Number.isNaN(numericGrade)) {
    return numericGrade;
  }

  const normalized = cleaned.toUpperCase().replace(/\s+/g, "");

  const ranks: Record<string, number> = {
    "A+": 100,
    A: 95,
    "A-": 90,
    "B+": 87,
    B: 83,
    "B-": 80,
    "C+": 77,
    C: 73,
    "C-": 70,
    "D+": 67,
    D: 63,
    "D-": 60,
    F: 0,
  };

  return ranks[normalized] ?? -1;
}

export function cleanUserInfo(userInfo: UserInfo): UserInfo {
  return {
    email: cleanRequiredString(userInfo.email),
    name: cleanString(userInfo.name),
    bio: cleanString(userInfo.bio),
    phone_number: cleanString(userInfo.phone_number),
    current_address: cleanString(userInfo.current_address),
    current_position: cleanString(userInfo.current_position),
    current_company: cleanString(userInfo.current_company),
    github_url: cleanString(userInfo.github_url),
    linkedin_url: cleanString(userInfo.linkedin_url),
    portrait_url: cleanString(userInfo.portrait_url),
    resume_url: cleanString(userInfo.resume_url),
    transcript_url: cleanString(userInfo.transcript_url),
    facebook_url: cleanString(userInfo.facebook_url),
    instagram_url: cleanString(userInfo.instagram_url),
    x_url: cleanString(userInfo.x_url),

    skills: userInfo.skills
      .map((skill) => ({
        name: cleanRequiredString(skill.name),
        proficiency: skill.proficiency,
        years_of_experience: skill.years_of_experience,
      }))
      .filter((skill) => skill.name.length > 0)
      .sort((first, second) => {
        const proficiencyComparison = compareOptionalNumbersDescending(
          first.proficiency,
          second.proficiency
        );

        if (proficiencyComparison !== 0) {
          return proficiencyComparison;
        }

        const experienceComparison = compareOptionalNumbersDescending(
          first.years_of_experience,
          second.years_of_experience
        );

        if (experienceComparison !== 0) {
          return experienceComparison;
        }

        return first.name.localeCompare(second.name);
      }),

    experiences: userInfo.experiences
      .map((experience) => ({
        company: cleanRequiredString(experience.company),
        job_title: cleanRequiredString(experience.job_title),
        date_start: formatRequiredReadableDate(experience.date_start),
        date_end: formatReadableDate(experience.date_end),
        job_description: cleanRequiredString(experience.job_description),

        // Temporary values used only for sorting.
        _rawDateStart: cleanRequiredString(experience.date_start),
        _rawDateEnd: cleanString(experience.date_end),
      }))
      .filter(
        (experience) =>
          experience.company.length > 0 ||
          experience.job_title.length > 0 ||
          experience.job_description.length > 0
      )
      .sort((first, second) =>
        compareByMostRecentEndDate(
          first._rawDateEnd,
          first._rawDateStart,
          second._rawDateEnd,
          second._rawDateStart
        )
      )
      .map(({ _rawDateStart, _rawDateEnd, ...experience }) => experience),

    projects: userInfo.projects
      .map((project) => ({
        name: cleanRequiredString(project.name),
        date_start: formatRequiredReadableDate(project.date_start),
        date_end: formatRequiredReadableDate(project.date_end),
        languages_used: cleanStringArray(project.languages_used),
        frameworks_used: cleanStringArray(project.frameworks_used),
        technologies_used: cleanStringArray(project.technologies_used),
        description: cleanRequiredString(project.description),
        github_url: cleanString(project.github_url),
        demo_url: cleanString(project.demo_url),

        // Temporary values used only for sorting.
        _rawDateStart: cleanRequiredString(project.date_start),
        _rawDateEnd: cleanRequiredString(project.date_end),
      }))
      .filter(
        (project) => project.name.length > 0 || project.description.length > 0
      )
      .sort((first, second) =>
        compareByMostRecentEndDate(
          first._rawDateEnd,
          first._rawDateStart,
          second._rawDateEnd,
          second._rawDateStart
        )
      )
      .map(({ _rawDateStart, _rawDateEnd, ...project }) => project),

    education: userInfo.education
      .map((education) => ({
        degree: cleanRequiredString(education.degree),
        majors: education.majors
          .map((major) => major.trim())
          .filter((major) => major.length > 0),
        minors: education.minors
          .map((minor) => minor.trim())
          .filter((minor) => minor.length > 0),
        gpa: cleanString(education.gpa),
        institution: cleanRequiredString(education.institution),
        awards: education.awards
          .map((award) => award.trim())
          .filter((award) => award.length > 0),
        year_start: education.year_start,
        year_end: education.year_end,

        courses: education.courses
          .map((course) => ({
            name: cleanRequiredString(course.name),
            grade: cleanString(course.grade),
            description: cleanString(course.description),
          }))
          .filter(
            (course) =>
              course.name.length > 0 || course.description !== undefined
          )
          .sort((first, second) => {
            const gradeComparison =
              gradeRank(second.grade) - gradeRank(first.grade);

            if (gradeComparison !== 0) {
              return gradeComparison;
            }

            return first.name.localeCompare(second.name);
          }),
      }))
      .filter(
        (education) =>
          education.degree.length > 0 ||
          education.institution.length > 0 ||
          education.majors.length > 0
      )
      .sort((first, second) => {
        const recencyComparison =
          educationRecencyValue(second) - educationRecencyValue(first);

        if (recencyComparison !== 0) {
          return recencyComparison;
        }

        if (second.year_start !== first.year_start) {
          return second.year_start - first.year_start;
        }

        return first.institution.localeCompare(second.institution);
      }),
  };
}
