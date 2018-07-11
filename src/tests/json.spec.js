const { JsonWriter } = require('../json');
const { log } = require('../utils');


describe('JsonWriter', () => {
    beforeEach(() => {
        spyOn(log, 'logError');
        spyOn(log, 'logWarning');
    });

    function runTest(manifest, env, done, callCount = 1) {
        JsonWriter.create(manifest, env).then((response) => {
            expect(response).toBeUndefined();
            expect(log.logError).toHaveBeenCalledTimes(callCount);
            done();
        });
    }

    it('write fails due to invalid schema DB path', (done) => {
        const manifest = {
            environments: {
                dev: {
                    output: 'foo',
                    target: 'bar',
                    schemaDb: 'test/fixtures/specs/schema/database2'
                }
            }
        };

        runTest(manifest, 'dev', () => {
            expect(log.logWarning).toHaveBeenCalledTimes(1);
            const err = log.logError.calls.all()[0].args[0];
            expect(err.startsWith('Empty schema DB')).toBeTruthy();
            done();
        });
    });

    it('write fails due to invalid JSON file in schema DB path', (done) => {
        const manifest = {
            environments: {
                dev: {
                    output: 'foo',
                    target: 'bar',
                    schemaDb: 'test/fixtures/specs/schema/errorneous'
                }
            }
        };

        runTest(manifest, 'dev', () => {
            const err = log.logError.calls.all()[0].args[0];
            expect(err.startsWith('Unable to read schema DB file')).toBeTruthy();
            done();
        });
    });

    it('write fails due to input schema validation errors', (done) => {
        const manifest = {
            environments: {
                dev: {
                    output0: 'foo',
                    target: 'bar',
                    schemaDb: 'test/fixtures/specs/schema/database'
                }
            }
        };

        runTest(manifest, 'dev', () => {
            const err = log.logError.calls.all()[0].args[0].message;
            expect(err.startsWith('requires property "output"')).toBeTruthy();
            done();
        }, 2);
    });

    it('write fails due to bundle schema validation errors', (done) => {
        const manifest = {
            environments: {
                dev: {
                    output: 'build/release.json',
                    target: 'test/fixtures/specs/manifest/verification-2.json',
                    schemaDb: 'test/fixtures/specs/schema/database'
                }
            }
        };

        runTest(manifest, 'dev', () => {
            const err = log.logError.calls.all()[0].args[0];
            const msg = 'does-not-exist.json: ENOENT: no such file or directory, open \'does-not-exist.json\'';

            expect(err).toEqual(msg);
            done();
        });
    });
});
