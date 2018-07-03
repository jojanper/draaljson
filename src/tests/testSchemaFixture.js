const { PRODUCTS_DATA } = require('./testDataFixture');


const PRODUCT = {
    id: '/product',
    type: 'object',
    properties: {
        name: {type: 'string'},
        components: {type: 'integer'},
        bom: {type: 'integer'}
    },
    required: ['name', 'components', 'bom']
};

const PRODUCTS = {
    id: '/products',
    type: 'object',
    properties: {
        products: {
            type: 'array',
            items: {$ref: '/product'},
            minItems: 1,
            uniqueItems: true
        }
    },
    required: ['products']
};

const PRODUCTS_MANIFEST_DATA = {
    schema$: PRODUCTS,
    data$: PRODUCTS_DATA
};

const PRODUCTS_MANIFEST_FILE = {
    schema$: 'test/fixtures/schema/database/products.json',
    datafile$: {
        products: [
            'test/fixtures/specs/database/product-a.json',
            'test/fixtures/specs/database/product-b.json'
        ]
    }
};

// Also combination of data$ and datafile$ to be supported

module.exports = {
    PRODUCT,
    PRODUCTS,

    PRODUCTS_MANIFEST_DATA,
    PRODUCTS_MANIFEST_FILE
};
