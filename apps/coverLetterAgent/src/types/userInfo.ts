import { z } from "zod";
import { userInfoSchema } from "../schemas/userInfoSchema";

export type UserInfo = z.infer<typeof userInfoSchema>;

export type UserExperience = NonNullable<UserInfo["experiences"]>[number];

export type UserProject = NonNullable<UserInfo["projects"]>[number];

export type UserEducation = NonNullable<UserInfo["education"]>[number];
