const { Validator } = require('jsonschema');

const {
    readJson, writeJson, promiseExec, log
} = require('./utils');


class JsonWriter {
    static create(manifest, env) {
        const instance = new JsonWriter(manifest.environments[env], env);
        return instance.write().catch(err => log.logError(err.message || err));
    }

    constructor(manifest, env) {
        this.manifest = manifest;
        this.env = env;
    }

    async write() {
        // Read the high level manifest file
        let response = await promiseExec(readJson(this.manifest.path));
        if (response[0]) {
            throw new Error(`Unable to read environment file ${this.manifest.path}:\n${response[0]}`);
        }
        const data = response[1];

        // Read the schema for the manifest
        response = await promiseExec(readJson(this.manifest.inputSchema));
        if (response[0]) {
            const msg = `Unable to read input schema ${this.manifest.inputSchema} for environment: ${this.env}\n${response[0]}`;
            throw new Error(msg);
        }

        // Manifest definition must match the schema
        this._validateJson(data, response[1]);

        const bundle = {};
        bundle.version = data.version;

        // Create targets

        // Read the schema for the output json
        response = await promiseExec(readJson(this.manifest.outputSchema));
        if (response[0]) {
            const msg = `Unable to read output schema ${this.manifest.outputSchema} for environment: ${this.env}\n${response[0]}`;
            throw new Error(msg);
        }

        // Output object must match the specified schema
        this._validateJson(bundle, response[1]);

        // Bundle ready, write to file
        await promiseExec(writeJson(data.output, bundle));

        return this.env;
    }

    _validateJson(data, schema) {
        const validator = new Validator();
        const result = validator.validate(data, schema);
        if (result.errors.length) {
            result.errors.forEach(error => log.logError(error));
            throw new Error(`JSON schema validation failed for environment: ${this.env}`);
        }
    }
}

module.exports = {
    JsonWriter
};
