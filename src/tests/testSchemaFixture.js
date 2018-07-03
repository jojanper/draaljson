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

module.exports = {
    PRODUCT,
    PRODUCTS
};
