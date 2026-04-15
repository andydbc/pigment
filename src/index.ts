import yargs from 'yargs';
import { FORMATS, Format, parse, convertToSpace, serialize } from './converters.js';

const argv = await yargs(process.argv.slice(2))
  .option('color', {
    alias: 'c',
    type: 'string',
    description: 'Input color value',
    demandOption: true,
  })
  .option('from', {
    alias: 'f',
    type: 'string',
    description: 'Input format',
    choices: FORMATS,
    demandOption: true,
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

try {
  const { values, hasAlpha } = parse(argv.color, argv.from as Format);
  const converted = convertToSpace(values, argv.to as Format);
  const output = serialize(converted, argv.to as Format, hasAlpha);
  console.log(output);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
