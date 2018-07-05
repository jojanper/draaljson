const { Validator } = require('jsonschema');


class JsonValidator {
    static create(allSchema) {
        return new JsonValidator(allSchema);
    }

    constructor(schemas) {
        this.validator = new Validator();
        if (schemas) {
            Object.keys(schemas).forEach(key =>
                this.validator.addSchema(schemas[key], schemas[key].id));
        }
    }

    validate(data, schema) {
        const result = this.validator.validate(data, schema);
        const hasErrors = result.errors.length;
        return (hasErrors) ? result.errors : null;
    }
}

module.exports = {
    JsonValidator
};
