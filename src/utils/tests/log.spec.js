const { log } = require('..');


describe('log interface', () => {
    it('supports logError', () => {
        expect(log.logError).toBeDefined();
    });
});

describe('log', () => {
    beforeEach(() => {
        spyOn(console, 'log');
        spyOn(console, 'trace');
    });

    it('logError', () => {
        log.logError('foo');
        log.logError({ foo: 'bar' });
        expect(console.log).toHaveBeenCalledTimes(3);
    });

    it('logError with trace', () => {
        const trace = true;

        log.logError('foo', { trace });
        log.logError({ foo: 'bar' }, { trace });
        expect(console.trace).toHaveBeenCalledTimes(2);
    });

    it('logWarning', () => {
        log.logWarning('foo');
        log.logWarning({ foo: 'bar' });
        expect(console.log).toHaveBeenCalledTimes(3);
    });
});
