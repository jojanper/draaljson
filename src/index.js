const { JsonWriter } = require('./json');
const { readJson, promiseExec, log } = require('./utils');


/**
 * High level interface for creating JSON bundle.
 */
class JsonBundler {
    /**
     * Factory interface.
     *
     * @param {array} envs List of target environments for which JSON bundle should be created.
     * @param {string} manifestName Manifest file that contains the environment definition.
     */
    static create(envs, manifestName) {
        return new JsonBundler(envs, manifestName);
    }

    constructor(envs, manifestName) {
        this.envs = envs;
        this.manifestName = manifestName;
    }

    async write() {
        // Read the high-level bundle manifest
        const [err, manifest] = await promiseExec(readJson(this.manifestName));
        if (err) {
            log.logError(err);
            return [];
        }

        // Make sure targets are available
        let abort = false;
        this.envs.forEach((env) => {
            if (!manifest.bundles[env]) {
                log.logError(`No '${env}' bundle target found from ${this.manifestName}`);
                abort = true;
            }
        });

        if (abort) {
            return [];
        }

        /*
         * Create the JSON bundle for all pecified environments. Since we are using Promise.all
         * to execute the bundle creation for all environments, the return value will be
         * an array that describes which of the environments succeeded.
         */
        const promises = [];
        this.envs.forEach(env => promises.push(JsonWriter.create(manifest.bundles[env], env)));
        const response = await promiseExec(Promise.all(promises));

        // Include only environments that succeeded as output
        return response[1].filter(env => env);
    }
}

module.exports = {
    JsonBundler
};
