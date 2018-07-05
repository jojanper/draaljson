const { log } = require('..');


describe('log interface', () => {
    it('supports logError', () => {
        expect(log.logError).toBeDefined();
    });
});

describe('log', () => {
    beforeEach(() => {
        spyOn(console, 'log');
    });

    it('logError', () => {
        log.logError('foo');
        log.logError({foo: 'bar'});
        expect(console.log).toHaveBeenCalledTimes(3);
    });

    it('logWarning', () => {
        log.logWarning('foo');
        log.logWarning({foo: 'bar'});
        expect(console.log).toHaveBeenCalledTimes(3);
    });
});
