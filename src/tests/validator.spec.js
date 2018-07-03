const { JsonValidator } = require('../validator');
const { PRODUCT, PRODUCTS } = require('./testSchemaFixture');


describe('JsonValidator', () => {
    it('validation errors are available for simple data validation', () => {
        const data = {
            name: 'device-a',
            components: 7,
            bom: '3'
        };

        const result = JsonValidator.create().validate(data, PRODUCT);
        expect(result.length).toEqual(1);
        expect(result[0].property).toEqual('instance.bom');
    });

    it('validation errors are available for complex data validation, part 1', () => {
        const data = [
            {
                name: 'device-a',
                components: 7,
                bom: 3
            }
        ];

        const result = JsonValidator.create([PRODUCT]).validate(data, PRODUCTS);
        expect(result.length).toEqual(1);
        expect(result[0].property).toEqual('instance');
    });

    it('validation errors are available for complex data validation, part 2', () => {
        const data = {
            products: [
                {
                    name: 'device-a',
                    components: '7',
                    bom: 3
                }
            ]
        };

        const result = JsonValidator.create([PRODUCT]).validate(data, PRODUCTS);
        expect(result.length).toEqual(1);
        expect(result[0].property).toEqual('instance.products[0].components');
    });

    it('validation succeeds', () => {
        const data = {
            products: [
                {
                    name: 'device-a',
                    components: 7,
                    bom: 3
                }
            ]
        };

        const result = JsonValidator.create([PRODUCT]).validate(data, PRODUCTS);
        expect(result).toBeNull();
    });
});
