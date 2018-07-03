const { JsonValidator } = require('./validator');

const { log } = require('./utils');


class JsonItemWriter {
    constructor(data, schema) {
        this.data = data;
        this.schema = schema;
    }

    write() {
        const errors = JsonValidator.create().validate(this.data, this.schema);
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


class SchemaDataHandler {
    constructor(data) {
        this.data = data;
    }

    write() {
        return new JsonItemWriter(this.data.data$, this.data.schema$).write();
    }
}

class SchemaParser {
    static async create(manifest) {
        return new SchemaParser(manifest);
    }

    constructor(manifest) {
        this.manifest = manifest;
    }
}

module.exports = {
    JsonItemWriter,
    SchemaDataHandler,
    SchemaParser
};
