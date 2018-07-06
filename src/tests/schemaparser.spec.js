const SchemaLoader = require('../loader');
const { SchemaParser } = require('../writer');


const REF_OUTPUT = {
    products: [
        {
            name: 'device-foo',
            components: 7,
            bom: 3,
            factories: [
                'USA',
                'China'
            ],
            info: {
                price: 700
            }
        },
        {
            name: 'device-bar',
            components: 9,
            bom: 5,
            factories: [
                'Vietnam',
                'Taiwan'
            ],
            info: {
                price: 900
            }
        }
    ],
    about: {
        version: '1.0'
    },
    version: '1.0.1'
};


describe('SchemaParser', () => {
    let schemaDb = null;

    beforeAll((done) => {
        SchemaLoader('test/fixtures/specs/schema/database').then((data) => {
            schemaDb = data;
            done();
        });
    });

    it('no schema DB specified', (done) => {
        SchemaParser.create().write().catch((err) => {
            expect(err.message.startsWith('No schema DB')).toBeTruthy();
            done();
        });
    });

    it('manifest is invalid file path', (done) => {
        const manifest = 'test/fixtures/specs/manifest/does-not-exist.json';
        SchemaParser.create(manifest).write().catch((result) => {
            expect(result.message.length).toBeGreaterThan(0);
            done();
        });
    });

    it('manifest is a file reference', (done) => {
        const manifest = 'test/fixtures/specs/manifest/verification.json';
        SchemaParser.create(manifest, schemaDb).write().then((json) => {
            console.log(JSON.stringify(json, null, 4));
            expect(json).toEqual(REF_OUTPUT);
            done();
        }).catch(err => console.log(err));
    });

    it('manifest schema$ is invalid', (done) => {
        const manifest = {
            schema$: 'invalid.json'
        };
        SchemaParser.create(manifest, schemaDb).write().catch((err) => {
            expect(err.message.startsWith('Unable to read schema file :invalid.json')).toBeTruthy();
            done();
        });
    });

    it('manifest datafile$ is incomplete, part 1', (done) => {
        const manifest = {
            schema$: 'test/fixtures/specs/schema/database/deliverable.json',
            datafile$: {
                products: [
                    'test/fixtures/specs/database/product-a.json',
                    'test/fixtures/specs/database/product-b.json'
                ]
            }
        };

        SchemaParser.create(manifest, schemaDb).write().catch((result) => {
            expect(result.message.startsWith('No \'about\' field present in')).toBeTruthy();
            done();
        });
    });

    it('manifest datafile$ is incomplete, part 2', (done) => {
        const manifest = {
            schema$: 'test/fixtures/specs/schema/database/deliverable.json',
            datafile$: {
                about: 'test/fixtures/specs/database/about.json'
            }
        };

        SchemaParser.create(manifest, schemaDb).write().catch((result) => {
            expect(result.message.startsWith('No \'products\' field present in')).toBeTruthy();
            done();
        });
    });

    it('array reference file path does not exist', (done) => {
        const manifest = 'test/fixtures/specs/manifest/verification-2.json';
        SchemaParser.create(manifest, schemaDb).write().catch((err) => {
            expect(err.message.startsWith('ENOENT: no such file or directory, open')).toBeTruthy();
            done();
        });
    });

    it('object reference file path does not exist', (done) => {
        const manifest = 'test/fixtures/specs/manifest/verification-3.json';
        SchemaParser.create(manifest, schemaDb).write().catch((err) => {
            expect(err.message.startsWith('Unable to read file about-does-not-exist.json')).toBeTruthy();
            done();
        });
    });

    it('unsupported field type is used for datafile$', (done) => {
        const manifest = {
            schema: {
                id: '/foo',
                type: 'object',
                properties: {
                    unsupported: {type: 'string'}
                },
                required: ['unsupported']
            },
            datafile$: {
                unsupported: ''
            }
        };

        SchemaParser.create(manifest, schemaDb).parseDataFileField('unsupported', {}).catch((err) => {
            expect(err.message.startsWith('Unsupported parser type (string) present in :datafile$:unsupported')).toBeTruthy();
            done();
        });
    });
});
