const fs = require('fs');
const util = require('util');


const log = require('./log');
const misc = require('./misc');

/**
 * Utility function that receives a promise and then resolves the success
 * response to an array with the return data as second item. The error
 * received from catch response appears as the first item.
 *
 * Example usage (to be used in async function):
 *
 * const [err, data] = await promiseExec(promise);
 *
 * @param {object} promise Promise.
 *
 * @return {array} Error data as first item, success data as second item.
 */
const promiseExec = promise => promise.then(data => [null, data]).catch(err => [err]);


/**
 * Read json file.
 *
 * @param {string} filepath JSON file path.
 *
 * @return {promise} Promise that resolves to JSON object.
 */
const readJson = async (filepath) => {
    const readFn = util.promisify(fs.readFile);
    const [err, data] = await promiseExec(readFn(filepath));
    if (err) {
        throw new Error(`${filepath}: ${err.message}`);
    }

    try {
        return JSON.parse(data);
    } catch (err) {
        throw new Error(`${filepath}: ${err.message}`);
    }
};


/**
 * Write data as json to a file.
 *
 * @param {string} filename JSON file name.
 * @param {object} json JSON object.
 *
 * @return {object} Promise.
 */
const writeJson = (fileName, json) => {
    const writeFn = util.promisify(fs.writeFile);
    return writeFn(fileName, JSON.stringify(json, null, 4), 'utf8');
};


/**
 * Extract json reference from field property object.
 *
 * @param {object} property Field property.
 *
 * @return {string} Reference.
 */
const getRef = property => property.$ref || property.oneOf[0].$ref;


/**
 * Extract data type from field property object.
 *
 * @param {object} property Field property.
 *
 * @return {string} Type.
 */
const getType = property => property.type || (property.oneOf ? property.oneOf[0].type : undefined) || undefined;


module.exports = {
    getRef,
    getType,
    promiseExec,
    readJson,
    writeJson,
    log,
    misc
};
