/**
 * Check if specified item is object.
 *
 * @param {any} obj Target item.
 *
 * @return true if object, false otherwise.
 */
function isObject(obj) {
    return (typeof obj === 'object' && obj !== null) || typeof obj === 'function';
}

/**
 * Check if specified item is string.
 *
 * @param {any} obj Target item.
 *
 * @return true if string, false otherwise.
 */
function isString(obj) {
    return (typeof obj === 'string' || obj instanceof String);
}

module.exports = {
    isObject,
    isString
};
