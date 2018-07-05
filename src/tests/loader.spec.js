const SchemaLoader = require('../loader');
const { log } = require('../utils');


describe('SchemaLoader', () => {
    beforeEach(() => {
        spyOn(log, 'logWarning');
    });

    it('schema loading succeeds', async () => {
        const schema = await SchemaLoader('test/fixtures/specs/schema/database');
        expect(Object.keys(schema).length > 0).toBeTruthy();
    });

    it('schema loading logs warning message for invalid folder path', async () => {
        await SchemaLoader('test/fixtures/schema/database2');
        expect(log.logWarning).toHaveBeenCalledTimes(1);

        const { args } = log.logWarning.calls.first();
        expect(args.length).toEqual(1);
        expect(args[0].indexOf('No schema found') > -1).toBeTruthy();
    });

    it('schema loading fails for invalid json', async () => {
        let hasError = false;

        try {
            await SchemaLoader('test/fixtures/specs/schema/errorneous');
        } catch (err) {
            hasError = true;
        }

        expect(hasError).toBeTruthy();
        expect(log.logWarning).toHaveBeenCalledTimes(0);
    });
});
