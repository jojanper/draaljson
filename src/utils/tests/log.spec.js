const { log } = require('..');


describe('log interface', () => {
    it('supports logError', () => {
        expect(log.logError).toBeDefined();
    });
});

describe('log', () => {
    it('logError', () => {
        spyOn(console, 'log');
        log.logError('foo');
        log.logError({foo: 'bar'});
        expect(console.log).toHaveBeenCalledTimes(3);
    });
});
