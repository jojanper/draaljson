const utils = require('..');


describe('utils interface', () => {
    it('supports readJson', () => {
        expect(utils.readJson).toBeDefined();
    });

    it('supports promiseExec', () => {
        expect(utils.promiseExec).toBeDefined();
    });
});

describe('JSON reader', () => {
    it('JSON file is read', async (done) => {
        const [err, data] = await utils.promiseExec(utils.readJson('jasmine.json'));

        expect(err).toBeNull();
        expect(Object.prototype.hasOwnProperty.call(data, 'spec_dir')).toBeTruthy();
        done();
    });

    it('Invalid file is read', async (done) => {
        const [err, data] = await utils.promiseExec(utils.readJson('jasmine2.json'));

        expect(data).toBeUndefined();
        expect(err.message.startsWith('ENOENT: no such file or directory')).toBeTruthy();
        done();
    });
});
