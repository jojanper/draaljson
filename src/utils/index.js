const fs = require('fs');
const util = require('util');


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
 * @return {promise} Promise resolves to JSON object.
 */
const readJson = async (filepath) => {
    const readFn = util.promisify(fs.readFile);
    const [err, data] = await promiseExec(readFn(filepath));
    if (err) {
        throw err;
    }

    return data ? JSON.parse(data) : {};
};


module.exports = {
    promiseExec,
    readJson
};
