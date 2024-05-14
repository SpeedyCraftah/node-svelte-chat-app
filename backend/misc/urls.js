// Contains functions for creating consistent URLs for resources.

const CDN_ROOT_URL = "http://localhost:8000";

module.exports.getResourceURL = (resource) => {
    return CDN_ROOT_URL + `/cdn/${resource.category}/${resource.resource_id}/${resource.id}/${resource.name}`;
};