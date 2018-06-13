const { JsonWriter } = require('./json');
const { readJson, promiseExec, log } = require('./utils');


class JsonBundler {
    static create(env, manifestName) {
        return new JsonBundler(env, manifestName);
    }

    constructor(env, manifestName) {
        this.env = env;
        this.manifestName = manifestName;
    }

    async init() {
        // Read the high-level bundle manifest
        const [err, manifest] = await promiseExec(readJson(this.manifestName));
        if (err) {
            log.logError(err);
            return;
        }

        // Make sure targets are available
        let abort = false;
        this.env.forEach((env) => {
            if (!manifest.environments[env]) {
                log.logError(`No '${env}' environment found from ${this.manifestName}`);
                abort = true;
            }
        });

        if (abort) {
            return;
        }

        /*
         * Create the JSON bundle for all environments. Since we are using Promise.all
         * to execute bundle creation for all environments, the return value will be
         * an array that describes the environments that succeeded.
         */
        const promises = [];
        this.env.forEach(env => promises.push(JsonWriter.create(manifest, env)));
        const response = await promiseExec(Promise.all(promises));
        return response[1].filter(env => env);
    }
}

module.exports = {
    JsonBundler
};
