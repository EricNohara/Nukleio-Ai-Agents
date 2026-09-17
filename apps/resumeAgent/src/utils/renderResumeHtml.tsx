import { renderToStaticMarkup } from "react-dom/server";
import { getResumeTemplate } from "./getResumeTemplate";
import { UserInfo } from "../types/userInfo";

export function renderResumeHtml(
  userInfo: UserInfo,
  templateId?: string
): string {
  const Template = getResumeTemplate(templateId);
  return (
    "<!DOCTYPE html>" + renderToStaticMarkup(<Template userInfo={userInfo} />)
  );
}
