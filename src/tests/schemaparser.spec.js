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
                price: 700,
                package: 'black',
                manual: false
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
                price: 900,
                package: 'pink',
                manual: true
            }
        }
    ],
    about: {
        version: '1.0'
    },
    version: '1.0.1'
};

const DATABASE = {
    '/product': {
        id: '/product',
        type: 'object',
        properties: {
            factories: {
                type: 'array',
                items: {type: 'string'}
            }
        },
        required: ['factories']
    },
    '/parent': {
        id: '/parent',
        type: 'object',
        properties: {
            product: {
                $ref: '/product'
            }
        },
        required: ['product']
    }
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
            const expectedMsg = 'does-not-exist.json: ENOENT: no such file or directory, open';

            expect(err.message.startsWith(expectedMsg)).toBeTruthy();
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
                unsupported: '' // Field of type string cannot be included to datafile$
            }
        };

        SchemaParser.create(manifest, schemaDb).parseDataFileField('unsupported', {}).catch((err) => {
            expect(err.message.startsWith('Unsupported parser type (string) present in :datafile$:unsupported')).toBeTruthy();
            done();
        });
    });

    it('properties field is missing required definition', (done) => {
        const schema = {
            id: '/test',
            properties: {}, // foobar field should be present here
            required: ['foobar']
        };

        const obj = new SchemaParser(null, null, null);

        obj.processObjectReferenceData({}, schema).catch((err) => {
            const expectedMsg = 'Properties \'foobar\' not found from schema /test';
            expect(err.message).toEqual(expectedMsg);
            done();
        });
    });

    it('object data is read recursively', (done) => {
        const data = {
            product: 'test/fixtures/specs/database/product-a.json'
        };

        const obj = new SchemaParser(null, DATABASE, null);
        obj.processObjectReferenceData(data, DATABASE['/parent']).then(() => {
            expect(data.product.factories.length).toEqual(2);
            done();
        });
    });

    it('recursive object data read fails', (done) => {
        const data = {
            product: 'test/fixtures/specs/database/product-a.json'
        };

        const db = Object.assign({}, DATABASE);
        delete db['/product'].properties.factories;

        const obj = new SchemaParser(null, db, null);
        obj.processObjectReferenceData(data, db['/parent']).catch((err) => {
            const expectedMsg = 'Properties \'factories\' not found from schema /product';
            expect(err.message).toEqual(expectedMsg);
            done();
        });
    });
});
