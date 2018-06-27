const { JsonWriter } = require('../json');
const { log } = require('../utils');

describe('JsonWriter', () => {
    beforeEach(() => {
        spyOn(log, 'logError');
    });

    it('write fails due to invalid manifest path', (done) => {
        const manifest = {
            environments: {
                dev: {
                    path: 'foo'
                }
            }
        };

        JsonWriter.create(manifest, 'dev').then((response) => {
            expect(response).toBeUndefined();
            expect(log.logError).toHaveBeenCalledTimes(1);
            done();
        });
    });
});
