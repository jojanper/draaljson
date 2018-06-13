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

module.exports = {
    isObject
};
