const { JsonItemWriter } = require('../writer');
const { log } = require('../utils');
const { PRODUCT } = require('./testSchemaFixture');


describe('JsonItemWriter', () => {
    beforeEach(() => {
        spyOn(log, 'logError');
    });

    it('json creation succeeds', () => {
        const data = {
            name: 'device-a',
            components: 7,
            bom: 3
        };

        const obj = new JsonItemWriter(data, PRODUCT);

        expect(obj.write()).toBeDefined();
    });

    it('json creation fails', () => {
        const data = {
            name: ['device-a'], // Invalid
            components: 7.1, // Invalid
            bom: '3' // Invalid
        };

        const obj = new JsonItemWriter(data, PRODUCT);

        try {
            obj.write();
        } catch (err) {
            expect(err).toBeDefined();
        }

        expect(log.logError).toHaveBeenCalledTimes(3);
    });
});
