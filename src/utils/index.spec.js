const utils = require('.');

describe('utils interface', () => {
    it('supports readJson', () => {
        expect(utils.readJson).toBeDefined();
    });

    it('supports promiseExec', () => {
        expect(utils.promiseExec).toBeDefined();
    });
});
