// Handles multipart data, which in this case would be JSON data first followed by the actual binary data (likely files).

// Mime types suitable for a preview.
module.exports.PREVIEW_MIME_TYPES = new Set(["image/apng", "image/gif", "image/jpeg", "image/png", "image/webp"]);

module.exports.multipartHook = async (request, response) => {
    if (!request.isMultipart()) return;

    const parts = request.parts();
    const part = (await parts.next()).value;

    // First part should be an object describing the message.
    try {
        request.body = JSON.parse(part?.value);
    } catch(e) {
        const error = new Error()
        error.statusCode = 400;
        return error;
    }

    request.incomingParts = parts;
}