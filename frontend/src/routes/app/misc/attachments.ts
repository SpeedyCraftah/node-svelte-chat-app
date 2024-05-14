export const STATIC_PREVIEW_MIME_TYPES = new Set(["image/png", "image/apng", "image/jpeg", "image/gif", "image/avif", "image/webp"]);
export const GENERIC_FILE_PREVIEW_URL = "/logos/file-generic.png";

export function readClientImageAsB64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function() {
            // @ts-ignore
            resolve(reader.result);
        }

        reader.onerror = function() {
            reject();
        }

        reader.readAsDataURL(file);
    });
}