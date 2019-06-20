const { JsonWriter } = require('../json');
const { log } = require('../utils');


describe('JsonWriter', () => {
    beforeEach(() => {
        spyOn(log, 'logError');
        spyOn(log, 'logWarning');
    });

    function runTest(manifest, env, done) {
        JsonWriter.create(manifest, env).catch(done);
    }

    it('write fails due to invalid schema DB path', (done) => {
        const manifest = {
            output: 'foo',
            target: 'bar',
            schemaDb: 'test/fixtures/specs/schema/database2'
        };

        runTest(manifest, 'dev', (err) => {
            expect(err.message.startsWith('Empty schema DB')).toBeTruthy();
            done();
        });
    });

    it('write fails due to invalid JSON file in schema DB path', (done) => {
        const manifest = {
            output: 'foo',
            target: 'bar',
            schemaDb: 'test/fixtures/specs/schema/errorneous'
        };

        runTest(manifest, 'dev', (err) => {
            expect(err.message.startsWith('Unable to read schema DB file')).toBeTruthy();
            done();
        });
    });

    it('write fails due to input schema validation errors', (done) => {
        const manifest = {
            output0: 'foo',
            target: 'bar',
            schemaDb: 'test/fixtures/specs/schema/database'
        };

        runTest(manifest, 'dev', (err) => {
            const errMsg = log.logError.calls.all()[0].args[0].message;
            expect(errMsg.startsWith('requires property "output"')).toBeTruthy();
            expect(err.message).toEqual('JSON schema validation failed for environment: dev');
            done();
        });
    });

    it('write fails due to bundle schema validation errors', (done) => {
        const manifest = {
            output: 'build/release.json',
            target: 'test/fixtures/specs/manifest/verification-2.json',
            schemaDb: 'test/fixtures/specs/schema/database'
        };

        runTest(manifest, 'dev', (err) => {
            const msg = 'does-not-exist.json: ENOENT: no such file or directory, open \'does-not-exist.json\'';

            expect(err.message).toEqual(msg);
            done();
        });
    });
});
