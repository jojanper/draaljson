const { JsonBundler } = require('..');
const { log } = require('../utils');

const MANIFEST_PATH = 'test/fixtures/draaljson.json';

describe('JsonBundler', () => {
    beforeEach(() => {
        spyOn(log, 'logError');
    });

    it('supports create', () => {
        expect(JsonBundler.create()).toBeDefined();
    });

    it('init fails due to invalid input manifest path', (done) => {
        const obj = JsonBundler.create(['dev'], 'foo');

        obj.write().then((createdEnvs) => {
            expect(createdEnvs.length).toEqual(0);
            expect(log.logError).toHaveBeenCalledTimes(1);
            done();
        });
    });

    it('init fails due to invalid environment targets', (done) => {
        const envs = ['foo', 'bar'];
        const obj = JsonBundler.create(envs, MANIFEST_PATH);

        obj.write().then((createdEnvs) => {
            expect(createdEnvs.length).toEqual(0);
            expect(log.logError).toHaveBeenCalledTimes(2);
            done();
        });
    });

    it('init succeeds', (done) => {
        const envs = ['dev'];
        const obj = JsonBundler.create(envs, MANIFEST_PATH);

        obj.write().then((createdEnvs) => {
            expect(createdEnvs.length).toEqual(1);
            expect(envs).toEqual(envs);

            expect(log.logError).toHaveBeenCalledTimes(0);
            done();
        });
    });
});
