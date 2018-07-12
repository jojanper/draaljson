const path = require('path');
const { from, forkJoin } = require('rxjs');

const { JsonValidator } = require('./validator');
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
        const errors = JsonValidator.create().addSchemas(schemaDb).validate(this.data, this.schema);
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

    async readManifest() {
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
    }

    async readDataModel() {
        // Read the data model (i.e., schema)
        if (misc.isString(this.manifest.schema$)) {
            const response = await promiseExec(readJson(this.manifest.schema$));
            if (response[0]) {
                throw new Error(`Unable to read schema file ${this.ref}:${this.manifest.schema$}\n${response[0]}`);
            }

            [, this.manifest.schema] = response;
        }
    }

    async processData$() {
        const json = {};

        // Data is located in the data$ property within the manifest
        if (this.manifest.data$) {
            this.manifest.schema.required.forEach((key) => {
                if (Object.prototype.hasOwnProperty.call(this.manifest.data$, key)) {
                    json[key] = this.manifest.data$[key];
                }
            });
        }

        return json;
    }

    async processDatafile$(json) {
        // Data is located within the file system, not within the manifest itself
        if (this.manifest.datafile$) {
            const fields = this.manifest.schema.required;

            // Get the promises that fetch the actual data for each field
            const promises = [];
            fields.forEach((field) => {
                // Field value may have been assigned already by data$ property
                if (!Object.prototype.hasOwnProperty.call(json, field)) {
                    promises.push(this.parseDataFileField(field, json));
                }
            });

            // Execute all promises
            const response = await promiseExec(Promise.all(promises));
            if (response[0]) {
                throw response[0];
            }
        }

        return json;
    }

    async processObjectReferenceData(data, schema) {
        const keys = [];
        const promises = [];

        // Read objects and arrays from file if target is string
        schema.required.forEach((key) => {
            const property = schema.properties[key];

            if (!property) {
                throw new Error(`Properties '${key}' not found from schema ${schema.id}`);
            }

            const fieldType = this.getFieldType(property);
            if (fieldType === 'array' || fieldType === 'object') {
                if (misc.isString(data[key])) {
                    // File path is referenced with respect to parent manifest path
                    const filePath = (this.ref && data[key].startsWith('filepath$')) ?
                        data[key].replace('filepath$', path.dirname(this.ref)) :
                        data[key];

                    keys.push(key);
                    promises.push(readJson(filePath));
                }
            }
        });

        const [err, manifestData] = await promiseExec(Promise.all(promises));
        if (err) {
            throw err;
        }

        promises.splice(0, promises.length);

        // Assign data values for needed fields
        keys.forEach((key, index) => {
            data[key] = manifestData[index];

            // Recursively check if object fields contain file path references
            const property = schema.properties[key];
            const fieldType = this.getFieldType(property);
            if (fieldType === 'object') {
                promises.push(this.processObjectReferenceData(data[key], this.schemaDb[property.$ref]));
            }
        });

        const response = await promiseExec(Promise.all(promises));
        if (response[0]) {
            throw response[0];
        }
    }

    async write() {
        // Schema database must be available
        if (!this.schemaDb) {
            throw new Error('No schema DB specified');
        }

        // Read the actual manifest
        await this.readManifest();

        // Read the optional schema
        await this.readDataModel();

        // Process data$ directive, if any
        let jsonOutput = await this.processData$();

        // Process $datafile directive, if any
        jsonOutput = await this.processDatafile$(jsonOutput);

        const schema = this.schema || this.manifest.schema;

        // Does the manifest contain schema directives or it plain data object
        if (!this.manifest.schema$ && !this.manifest.datafile$) {
            // Manifest may contain file references, process those before creating the JSON output
            await this.processObjectReferenceData(this.manifest, schema);

            // Manifest is actually the JSON data, validate and create the output based on specified scheme
            jsonOutput = {
                ...jsonOutput,
                ...JsonItemWriter.create(this.manifest, schema).write(this.schemaDb)
            };
        } else {
            // Manifest is plain data object
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

            if (!Object.prototype.hasOwnProperty.call(data, field)) {
                return reject(new Error(`No '${field}' field present in ${this.ref}:datafile$`));
            }

            const fieldType = this.getFieldType(property);

            switch (fieldType) {
            case 'array': {
                const schema = this.schemaDb[property.items.$ref];

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
                const schema = this.schemaDb[property.$ref];
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

    getFieldType(property) {
        return property.type || this.schemaDb[property.$ref].type || 'unknown';
    }
}

module.exports = {
    JsonItemWriter,
    SchemaParser
};
