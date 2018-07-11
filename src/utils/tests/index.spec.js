const fs = require('fs');

const utils = require('..');


describe('utils interface', () => {
    it('supports readJson', () => {
        expect(utils.readJson).toBeDefined();
    });

    it('supports promiseExec', () => {
        expect(utils.promiseExec).toBeDefined();
    });
});

describe('utils.misc interface', () => {
    it('supports isObject', () => {
        expect(utils.misc.isObject({foo: 'bar'})).toBeTruthy();
        expect(utils.misc.isObject('foo')).toBeFalsy();
    });

    it('supports isString', () => {
        expect(utils.misc.isString({foo: 'bar'})).toBeFalsy();
        expect(utils.misc.isString('foo')).toBeTruthy();
    });
});

describe('File handling', () => {
    it('JSON file is read', async (done) => {
        const [err, data] = await utils.promiseExec(utils.readJson('jasmine.json'));

        expect(err).toBeNull();
        expect(Object.prototype.hasOwnProperty.call(data, 'spec_dir')).toBeTruthy();
        done();
    });

    it('Invalid file is read', async (done) => {
        const expectedMsg = 'jasmine2.json: ENOENT: no such file or directory';

        const [err, data] = await utils.promiseExec(utils.readJson('jasmine2.json'));

        expect(data).toBeUndefined();
        expect(err.message.startsWith(expectedMsg)).toBeTruthy();
        done();
    });

    it('JSON file is created', async (done) => {
        spyOn(fs, 'writeFile').and.callFake((file, data, options, cb) => {
            cb();
        });

        const [err, data] = await utils.promiseExec(utils.writeJson('build/jasmine.json', {}));

        expect(err).toBeNull();
        expect(data).toBeUndefined();
        expect(fs.writeFile).toHaveBeenCalled();
        done();
    });
});
