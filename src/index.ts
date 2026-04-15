import yargs from 'yargs';
import { FORMATS, Format, parse, convertToSpace, serialize, detectFormat } from './converters.js';

const argv = await yargs(process.argv.slice(2))
  .usage('$0 <color> [options]')
  .positional('color', {
    type: 'string',
    description: 'Input color value',
  })
  .option('from', {
    alias: 'f',
    type: 'string',
    description: 'Input format (auto-detected if omitted)',
    choices: FORMATS,
  })
  .option('to', {
    alias: 't',
    type: 'string',
    description: 'Output format',
    choices: FORMATS,
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .parseAsync();

const color = argv._[0] as string | undefined;
if (!color) {
  console.error('Missing required argument: color');
  process.exit(1);
}

try {
  const from = (argv.from as Format) ?? detectFormat(color);
  const { values, hasAlpha } = parse(color, from);
  const converted = convertToSpace(values, argv.to as Format);
  const output = serialize(converted, argv.to as Format, hasAlpha);
  console.log(output);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
