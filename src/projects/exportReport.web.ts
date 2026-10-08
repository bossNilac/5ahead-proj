import { reportHtml, type Project, type Profile } from "./model";
export async function exportReport(project: Project, profile: Profile) {
  const report = window.open("", "_blank");
  if (!report)
    throw new Error("Allow pop-ups to print or save your PDF report.");
  report.document.open();
  report.document.write(reportHtml(project, profile));
  report.document.close();
  report.focus();
  report.print();
}
