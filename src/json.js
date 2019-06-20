const {
    writeJson, promiseExec, log
} = require('./utils');
const SchemaLoader = require('./loader');
const { SchemaParser } = require('./writer');
const { JsonValidator } = require('./validator');


// Schema that the manifest for the JsonWriter must follow
const INPUT_SCHEMA = {
    id: '/input-schema',
    type: 'object',
    properties: {
        output: { type: 'string' },
        target: { type: 'string' },
        schemaDb: { type: 'string' }
    },
    required: ['output', 'target', 'schemaDb']
};


/**
 * Validate and create JSON bundle output. The manifest data must follow input schema definition.
 * @see INPUT_SCHEMA
 */
class JsonWriter {
    static create(manifest, env) {
        const instance = new JsonWriter(manifest, env);
        return instance.write();
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
        const errors = JsonValidator.create().validate(data, schema);
        if (errors && errors.length) {
            errors.forEach(error => log.logError(error));
            throw new Error(`JSON schema validation failed for environment: ${this.env}`);
        }
    }
}

module.exports = {
    JsonWriter
};
