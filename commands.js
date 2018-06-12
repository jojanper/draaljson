const program = require('commander');

program
    .command('create-json-bundle')
    .description('Create JSON bundle')
    .option(
        '-f, --env <environment>',
        'Comma separated list of target environments',
        'dev'
    )
    .action((options) => {
        console.log(options);
    });


program.on('command:*', () => {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
});

program.parse(process.argv);
