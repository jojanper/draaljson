const path = require('path');
const shelljs = require('shelljs');

const { readJson, promiseExec, log } = require('./utils');


const loadSchema = async (folderPath) => {
    const promises = [];

    // Collect all files from folder
    shelljs.ls(folderPath).forEach(file =>
        promises.push({
            path: path.join(folderPath, file),
            exec: readJson(path.join(folderPath, file))
        }));

    // At the moment availability of no schema files is considered as non-fatal condition
    if (!promises.length) {
        log.logWarning(`No schema found from specified folder: ${folderPath}`);
    }

    /*
     * Read files and report any errors.
     * For-loop is used here to make sure failing target file is also reported as part
     * of the error message. Using Promises.all is all or nothing type of execution and
     * getting the exact file on which error occured is not trivial...
     */
    const schema = {};
    /* eslint-disable no-restricted-syntax */
    /* eslint-disable no-await-in-loop */
    for (const promise of promises) {
        const [err, data] = await promiseExec(promise.exec);
        if (err) {
            throw new Error(`Failed to read ${promise.path} as JSON\n${err}`);
        }

        schema[data.id] = data;
    }
    /* eslint-enable no-await-in-loop */
    /* eslint-enable no-restricted-syntax */

    return schema;
};

module.exports = loadSchema;
