const path = require('path');
const { from, forkJoin } = require('rxjs');

const { JsonValidator } = require('./validator');
const {
    log, misc, readJson, promiseExec, getRef, getType
} = require('./utils');


function getFilePath(target, parentRef, prefix = 'filepath$') {
    return (parentRef && target.startsWith(prefix)) ? target.replace(prefix, path.dirname(parentRef)) : target;
}


/**
 * Create JSON output given the input data and associated schema.
 */
class JsonItemWriter {
    static create(data, schema) {
        return new JsonItemWriter(data, schema);
    }

    constructor(data, schema) {
        this.data = data;
        this.schema = schema;
    }

    // Create the output, complex schema can be validated by including schema database as input parameter
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

/**
 * Input data field may actually contain reference to the actual JSON as file path. Thus,
 * the class handles mapping from the file reference to the actual data. The file reference
 * may be a string or object which contains the reference. The following options are supported:
 *
 * {
 *     foo: "<file-path-to-foo-data.json"
 * }
 * This reads data for field 'foo' from specified path.
 *
 * {
 *     foo: {
 *         filepath$: ["<file-path-to-foo-data.json"]
 *     }
 * }
 * This reads data for field 'foo' from foo.filepath$[0].
 *
 * {
 *     foo: {
 *         filepath$: [
 *             "<file-path-to-foo-base-data.json",
 *             "<file-path-to-foo-data.json"
 *         ]
 *     }
 * }
 * The data for field 'foo' is a combination of data read from foo.filepath$[0]$ and foo.filepath$[1].
 *
 * {
 *     foo: {
 *         filepath$: ["<file-path-to-foo-data.json"],
 *         data$: {foo: 'bar'}
 *     }
 * }
 * The data for field 'foo' is a combination of data read from foo.filepath$ and foo.data$.
 *
 * The parentRef parameter contains the file path where the field data was originally specified.
 */
class DataFieldReader {
    constructor(data, field, fieldType, parentRef) {
        this.data = data;
        this.field = field;
        this.fieldType = fieldType;
        this.parentRef = parentRef;
    }

    // Return true if target data contains file reference field
    get hasFileRefInObject() {
        const data = this.data[this.field];
        return (this.fieldType === 'object' && misc.isObject(data) && data.filepath$);
    }

    // Return true if target data contains data$ reference field
    get hasData$() {
        return (this.hasFileRefInObject && this.data[this.field].data$);
    }

    // Return true if target data should be treated as reference to a JSON file
    get mustRead() {
        if (this.hasFileRefInObject) {
            return true;
        }

        return misc.isString(this.data[this.field]);
    }

    // Return file path that references the JSON file
    get targetPaths() {
        return this.hasFileRefInObject ? this.data[this.field].filepath$ : [this.data[this.field]];
    }

    /**
     * Return the name of the file which included the data for the specified field.
     * The name may change from input parentRef in case the data contains reference
     * to base data. In that case the name is changed to the filepath of the base
     * data as that data may contain file references that are specific to that
     * data.
     */
    get fileRef() {
        const paths = this.targetPaths;
        return getFilePath(paths[paths.length - 1], this.parentRef);
    }

    // Add target data reading to list of promises, if any
    read(keys, promises, refs) {
        if (this.mustRead) {
            keys.push(this.field);
            refs.push(this.fileRef);
            promises.push(this._readImpl());
        }
    }

    // Read JSON data from file reference(s)
    async _readImpl() {
        let i = 0;

        let json = {};

        /* eslint-disable no-restricted-syntax */
        /* eslint-disable no-await-in-loop */
        // Extract data from file references
        const paths = this.targetPaths;
        for (const targetPath of paths) {
            // Resolve path and read the data
            const filePath = getFilePath(targetPath, this.parentRef);
            const data = await readJson(filePath);

            // Either assign initial data or extend the previous data
            if (i === 0) {
                json = data;
            } else {
                json = { ...json, ...data };
            }

            i++;
        }
        /* eslint-enable no-await-in-loop */
        /* eslint-enable no-restricted-syntax */

        // And finally customized data on top
        if (this.hasData$) {
            json = { ...json, ...this.data[this.field].data$ };
        }

        return json;
    }
}

class SchemaParser {
    static create(manifest, schemaDb, schema, depth = -1) {
        return new SchemaParser(manifest, schemaDb, schema, depth);
    }

    constructor(manifest, schemaDb, schema, depth) {
        this.ref = '';
        this.manifest = manifest;
        this.schemaDb = schemaDb;
        this.schema = schema;
        this.depth = depth + 1;
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

    async processObjectReferenceData(data, schema, ref) {
        const keys = [];
        const refs = [];
        const promises = [];

        // Read objects and arrays from file if target is string
        schema.required.forEach((key) => {
            const property = schema.properties[key];

            if (!property) {
                throw new Error(`Properties '${key}' not found from schema ${schema.id}`);
            }

            const fieldType = this.getFieldType(property);
            if (fieldType === 'array' || fieldType === 'object') {
                const reader = new DataFieldReader(data, key, fieldType, ref);
                reader.read(keys, promises, refs);
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
                promises.push(this.processObjectReferenceData(data[key], this.schemaDb[getRef(property)], refs[index]));
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
            await this.processObjectReferenceData(this.manifest, schema, this.ref);

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

        if (this.depth === 0) {
            // Add final data stripper/validator here
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
                    const schema = this.schemaDb[getRef(property.items)];

                    jsonOutput[field] = [];

                    const observables = [];
                    data[field].forEach((filePath) => {
                        const promise = SchemaParser.create(filePath, this.schemaDb, schema, this.depth).write();
                        observables.push(from(promise));
                    });

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
                    const schema = this.schemaDb[getRef(property)];
                    const promise = SchemaParser.create(data[field], this.schemaDb, schema, this.depth).write();
                    const response = await promiseExec(promise);
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
        return getType(property) || getType(this.schemaDb[getRef(property)]) || 'unknown';
    }
}

module.exports = {
    JsonItemWriter,
    SchemaParser
};
