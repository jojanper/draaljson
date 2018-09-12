const { Validator } = require('jsonschema');


class JsonValidator {
    static create() {
        return new JsonValidator();
    }

    constructor() {
        this.validator = new Validator();
    }

    addSchemas(schemas) {
        if (schemas) {
            Object.keys(schemas).forEach(key => this.validator.addSchema(schemas[key], schemas[key].id));
        }

        return this;
    }

    validate(data, schema) {
        const result = this.validator.validate(data, schema, {nestedErrors: true});
        const hasErrors = result.errors.length;
        return (hasErrors) ? result.errors : null;
    }
}

module.exports = {
    JsonValidator
};
