export type JobStatus = "draft" | "open" | "paused" | "closed";
export type ApplicantStatus = "new" | "reviewing" | "shortlisted" | "interview" | "accepted" | "rejected";

export type Product = { name: string; slug: string; eyebrow: string; description: string; longDescription: string; status: string; platform: string[]; color: string; featured?: boolean };
export type Job = { id: string; title: string; slug: string; department: string; description: string; responsibilities: string[]; requirements: string[]; niceToHave: string[]; location: string; workMode: string; employmentType: string; duration: string; compensationType: string; compensationText: string; skills: string[]; publishedAt: string; deadline?: string; status: JobStatus };
export type Application = { id: string; name: string; email: string; phone?: string; country: string; location: string; linkedin?: string; github?: string; portfolio?: string; role: string; experience: string; technologies: string; whyJoin: string; whyFit: string; availability: string; startDate: string; additionalMessage?: string; cvName: string; jobId: string; jobTitle: string; status: ApplicantStatus; createdAt: string; note?: string };
