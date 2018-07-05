const { JsonWriter } = require('../json');
const { log } = require('../utils');


describe('JsonWriter', () => {
    beforeEach(() => {
        spyOn(log, 'logError');
        spyOn(log, 'logWarning');
    });

    function runTest(manifest, env, done) {
        JsonWriter.create(manifest, env).then((response) => {
            expect(response).toBeUndefined();
            expect(log.logError).toHaveBeenCalledTimes(1);
            done();
        });
    }

    it('write fails due to invalid schema DB path', (done) => {
        const manifest = {
            environments: {
                dev: {
                    schemaDb: 'test/fixtures/specs/schema/database2'
                }
            }
        };

        runTest(manifest, 'dev', () => {
            expect(log.logWarning).toHaveBeenCalledTimes(1);
            done();
        });
    });

    it('write fails due to invalid manifest path', (done) => {
        const manifest = {
            environments: {
                dev: {
                    path: 'foo',
                    schemaDb: 'test/fixtures/specs/schema/database'
                }
            }
        };

        runTest(manifest, 'dev', done);
    });

    it('write fails due to invalid input schema path', (done) => {
        const manifest = {
            environments: {
                dev: {
                    path: 'test/fixtures/environments/dev/manifest.json',
                    inputSchema: 'test/fixtures/schema/input-schema-invalid.json',
                    schemaDb: 'test/fixtures/specs/schema/database'
                }
            }
        };

        runTest(manifest, 'dev', done);
    });
});
