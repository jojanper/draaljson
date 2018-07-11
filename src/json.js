const { Validator } = require('jsonschema');

const {
    writeJson, promiseExec, log
} = require('./utils');
const SchemaLoader = require('./loader');
const { SchemaParser } = require('./writer');


// Schema that the manifest for the JsonWriter must follow
const INPUT_SCHEMA = {
    id: '/input-schema',
    type: 'object',
    properties: {
        output: {type: 'string'},
        target: {type: 'string'},
        schemaDb: {type: 'string'}
    },
    required: ['output', 'target', 'schemaDb']
};


class JsonWriter {
    static create(manifest, env) {
        const instance = new JsonWriter(manifest.environments[env], env);
        return instance.write().catch((err) => {
            log.logError(err.message, {trace: true});
        });
    }

    constructor(manifest, env) {
        this.manifest = manifest;
        this.env = env;
    }

    async write() {
        // Manifest definition must match the schema
        this._validateJson(this.manifest, INPUT_SCHEMA);

        // Read the schema DB
        const [err, schemaDB] = await promiseExec(SchemaLoader(this.manifest.schemaDb));
        if (err) {
            throw new Error(`Unable to read schema DB file ${this.manifest.schemaDb}:\n${err}`);
        } else if (!Object.keys(schemaDB).length) {
            throw new Error(`Empty schema DB: ${this.manifest.schemaDb}`);
        }

        // Create target JSON
        const [err2, bundle] = await promiseExec(SchemaParser.create(this.manifest.target, schemaDB).write());
        if (err2) {
            throw err2;
        }

        // Bundle ready, write to file
        await promiseExec(writeJson(this.manifest.output, bundle));

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
