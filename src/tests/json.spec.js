const { JsonWriter } = require('../json');
const { log } = require('../utils');


describe('JsonWriter', () => {
    beforeEach(() => {
        spyOn(log, 'logError');
    });

    function runTest(manifest, env, done) {
        JsonWriter.create(manifest, env).then((response) => {
            expect(response).toBeUndefined();
            expect(log.logError).toHaveBeenCalledTimes(1);
            done();
        });
    }

    it('write fails due to invalid manifest path', (done) => {
        const manifest = {
            environments: {
                dev: {
                    path: 'foo'
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
                    outputSchema: 'test/fixtures/schema/output-schema.json'
                }
            }
        };

        runTest(manifest, 'dev', done);
    });

    it('write fails due to invalid output schema path', (done) => {
        const manifest = {
            environments: {
                dev: {
                    path: 'test/fixtures/environments/dev/manifest.json',
                    inputSchema: 'test/fixtures/schema/input-schema.json',
                    outputSchema: 'test/fixtures/schema/output-schema-invalid.json'
                }
            }
        };

        runTest(manifest, 'dev', done);
    });
});
