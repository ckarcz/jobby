/**
 * Internal flat representation used during parsing before building
 * the final nested JobDetails shape.
 */
export interface ParsedJobDetailsData {
  jobUrl: string | undefined;
  title: string | undefined;
  location: string | undefined;
  company: string | undefined;
  companyPage: string | undefined;
  companyLogo: string | undefined;
  companySlug: string | undefined;
  salary: string | undefined;
  postedDate: string | undefined;
  postedTimeAgo: string | undefined;
  expirationDate: string | undefined;
  description: string | undefined;
  workplaceType: string | undefined;
  employmentType: string | undefined;
  seniorityLevel: string | undefined;
  applicantCount: string | undefined;
  industry: string | undefined;
  jobFunction: string | undefined;
  experienceRequired: string | undefined;
  educationRequired: string | undefined;
  applyUrl: string | undefined;
  applyText: string | undefined;
  shortDescription: string | undefined;
  sharingImageUrl: string | undefined;
  benefitsInfo: string | undefined;
  incentiveInfo: string | undefined;
}
