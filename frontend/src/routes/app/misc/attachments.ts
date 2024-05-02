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