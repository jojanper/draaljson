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

        return this.data;
    }
}

module.exports = {
    JsonItemWriter
};
