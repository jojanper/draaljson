const { SpecReporter } = require('jasmine-spec-reporter');

// Remove default reporter logs
jasmine.getEnv().clearReporters();

// Add jasmine-spec-reporter
jasmine.getEnv().addReporter(new SpecReporter({
    spec: {
        displayPending: true,
    },
    summary: {
        displayDuration: false,
    }
}));
