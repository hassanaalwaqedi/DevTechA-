const urlPattern = /^https?:\/\/[^\s]+$/i;
const allowedExtensions = ["pdf", "docx"];
const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export function optionalUrl(value: unknown, field: string) {
  if (!value) return null;
  if (typeof value !== "string" || !urlPattern.test(value)) throw new Error(`${field} must be a valid http(s) URL.`);
  return value;
}

export function validateCv(file: File) {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (!allowedExtensions.includes(extension) || !allowedTypes.includes(file.type)) throw new Error("CV must be a PDF or DOCX file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("CV must be smaller than 10 MB.");
}

export function requiredText(value: FormDataEntryValue | null, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}
