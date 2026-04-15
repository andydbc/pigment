import yargs from 'yargs';
import { FORMATS, Format, parse, convertToSpace, serialize, detectFormat } from './converters.js';

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

try {
  const from = (argv.from as Format) ?? detectFormat(argv.color);
  const { values, hasAlpha } = parse(argv.color, from);
  const converted = convertToSpace(values, argv.to as Format);
  const output = serialize(converted, argv.to as Format, hasAlpha);
  console.log(output);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
