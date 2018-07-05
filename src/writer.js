const { JsonValidator } = require('./validator');
const { from, forkJoin } = require('rxjs');

const {
    log, misc, readJson, promiseExec
} = require('./utils');


class JsonItemWriter {
    static create(data, schema) {
        return new JsonItemWriter(data, schema);
    }

    constructor(data, schema) {
        this.data = data;
        this.schema = schema;
    }

    write(schemaDb) {
        const errors = JsonValidator.create(schemaDb).validate(this.data, this.schema);
        if (errors && errors.length) {
            errors.forEach(error => log.logError(error));
            throw new Error(`JSON schema validation failed for ${this.schema.id}`);
        }

        const data = {};
        this.schema.required.forEach((key) => {
            data[key] = this.data[key];
        });

        return data;
    }
}

class SchemaParser {
    static create(manifest, schemaDb, schema) {
        return new SchemaParser(manifest, schemaDb, schema);
    }

    constructor(manifest, schemaDb, schema) {
        this.ref = '';
        this.manifest = manifest;
        this.schemaDb = schemaDb;
        this.schema = schema;
    }

    async write() {
        // Schema database must be available
        if (!this.schemaDb) {
            throw new Error('No schema DB specified');
        }

        // Manifest is file reference -> read the file and replace manifest with the file content
        if (misc.isString(this.manifest)) {
            // Save the file path for future reference
            this.ref = this.manifest;

            const response = await promiseExec(readJson(this.manifest));
            if (response[0]) {
                throw new Error(`Unable to read file ${this.manifest}\n${response[0]}`);
            }

            [, this.manifest] = response;
        }

        // Read the data model (i.e., schema)
        if (misc.isString(this.manifest.schema$)) {
            const response = await promiseExec(readJson(this.manifest.schema$));
            if (response[0]) {
                throw new Error(`Unable to read schema file ${this.ref}:${this.manifest.schema$}\n${response[0]}`);
            }

            [, this.manifest.schema] = response;
        }

        let jsonOutput = {};

        // Data is located within the file system, not within the manifest itself
        if (this.manifest.datafile$) {
            const fields = this.manifest.schema.required;

            // Get the promises that fetch the actual data for each field
            const promises = [];
            fields.forEach((field) => {
                promises.push(this.parseDataFileField(field, jsonOutput));
            });

            // Execute all promises
            const response = await promiseExec(Promise.all(promises));
            if (response[0]) {
                throw response[0];
            }
        }

        const schema = this.schema || this.manifest.schema;

        if (!this.manifest.schema$ && !this.manifest.datafile$) {
            const keys = [];
            const promises = [];

            // Read objects and arrays from file if target is string
            schema.required.forEach((key) => {
                const property = schema.properties[key];
                const fieldType = property.type || this.schemaDb[property.ref$].type || 'unknown';

                if (fieldType === 'array' || fieldType === 'object') {
                    if (misc.isString(this.manifest[key])) {
                        keys.push(key);
                        promises.push(readJson(this.manifest[key]));
                    }
                }
            });

            const [err, manifestData] = await promiseExec(Promise.all(promises));
            if (err) {
                throw err;
            }

            // Assign data values for needed fields
            let i = 0;
            keys.forEach((key) => {
                this.manifest[key] = manifestData[i++];
            });

            // Manifest is actually the JSON data, validate and create the output based on specified scheme
            jsonOutput = {
                ...jsonOutput,
                ...JsonItemWriter.create(this.manifest, schema).write(this.schemaDb)
            };
        } else {
            // Created JSON output should be validated based specified schema
            jsonOutput = {
                ...JsonItemWriter.create(jsonOutput, this.manifest.schema).write(this.schemaDb)
            };
        }

        return jsonOutput;
    }

    parseDataFileField(field, jsonOutput) {
        const data = this.manifest.datafile$;

        return new Promise(async (resolve, reject) => {
            const property = this.manifest.schema.properties[field];

            if (!data[field]) {
                return reject(new Error(`No ${field} field present in ${this.ref}:datafile$`));
            }

            let schema;
            const fieldType = property.type || this.schemaDb[property.ref$].type || 'unknown';

            switch (fieldType) {
            case 'array': {
                schema = this.schemaDb[property.items.$ref];

                jsonOutput[field] = [];

                const observables = [];
                data[field].forEach(filePath =>
                    observables.push(from(SchemaParser.create(filePath, this.schemaDb, schema).write())));

                forkJoin(observables)
                    .subscribe(
                        (results) => {
                            results.forEach(result => jsonOutput[field].push(result));
                            resolve(jsonOutput);
                        },
                        err => reject(err)
                    );
                break;
            }

            case 'object': {
                schema = this.schemaDb[property.ref$];
                const response = await promiseExec(SchemaParser.create(data[field], this.schemaDb, schema).write());
                if (response[0]) {
                    return reject(response[0]);
                }

                [, jsonOutput[field]] = response;
                resolve(jsonOutput);
                break;
            }

            default:
                return reject(new Error(`Unsupported parser type (${fieldType}) present in ${this.ref}:datafile$:${field}`));
            }
        });
    }
}

module.exports = {
    JsonItemWriter,
    SchemaParser
};
