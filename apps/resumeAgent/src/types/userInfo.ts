import { z } from "zod";
import { userInfoSchema } from "../schemas/userInfoSchema";

export type UserInfo = z.infer<typeof userInfoSchema>;

export type UserSkill = NonNullable<UserInfo["skills"]>[number];

export type UserExperience = NonNullable<UserInfo["experiences"]>[number];

export type UserProject = NonNullable<UserInfo["projects"]>[number];

export type UserEducation = NonNullable<UserInfo["education"]>[number];

export type UserCourse = NonNullable<UserEducation["courses"]>[number];
