const urlPattern = /^https?:\/\/[^\s]+$/i;
const allowedExtensions = ["pdf", "docx"];
const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export function optionalUrl(value: unknown, field: string) {
  if (!value) return null;
  if (typeof value !== "string" || !urlPattern.test(value)) throw new Error(`${field} must be a valid http(s) URL.`);
  return value;
}

export async function validateDocument(file: File, label: string, maxSize = 10 * 1024 * 1024) {
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (!allowedExtensions.includes(extension) || !allowedTypes.includes(file.type)) throw new Error(`${label} must be a PDF or DOCX file.`);
  if (file.size > maxSize) throw new Error(`${label} must be smaller than ${Math.round(maxSize / 1024 / 1024)} MB.`);
  const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isPdf = extension === "pdf" && String.fromCharCode(...signature) === "%PDF";
  const isDocx = extension === "docx" && signature[0] === 0x50 && signature[1] === 0x4b;
  if (!isPdf && !isDocx) throw new Error(`${label} content does not match a valid PDF or DOCX file.`);
}

export async function validateCv(file: File) { await validateDocument(file, "CV"); }

export function requiredChoice(value: FormDataEntryValue | null, field: string, choices: string[]) {
  const text = requiredText(value, field);
  if (!choices.includes(text)) throw new Error(`${field} is invalid.`);
  return text;
}

export function requiredText(value: FormDataEntryValue | null, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}
