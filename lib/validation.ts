const urlPattern = /^https?:\/\/[^\s]+$/i;
const allowedExtensions = ["pdf", "docx"];
const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export function optionalUrl(value: unknown, field: string) {
  if (!value) return null;
  if (typeof value !== "string" || !urlPattern.test(value)) throw new Error(`${field} must be a valid http(s) URL.`);
  return value;
}

export function validateDocument(file: File, label: string, maxSize = 10 * 1024 * 1024) {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (!allowedExtensions.includes(extension) || !allowedTypes.includes(file.type)) throw new Error(`${label} must be a PDF or DOCX file.`);
  if (file.size > maxSize) throw new Error(`${label} must be smaller than ${Math.round(maxSize / 1024 / 1024)} MB.`);
}

export function validateCv(file: File) { validateDocument(file, "CV"); }

export function requiredChoice(value: FormDataEntryValue | null, field: string, choices: string[]) {
  const text = requiredText(value, field);
  if (!choices.includes(text)) throw new Error(`${field} is invalid.`);
  return text;
}

export function requiredText(value: FormDataEntryValue | null, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}
