#!/usr/bin/env node

const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const execSync = require('child_process').execSync;
const { Parser } = require('json2csv');

const program = new Command();

program
  .option('-c, --column <columnName>', 'CSV column for stack traces', 'blob')
  .requiredOption('-i, --inputFile <file>', 'Input CSV')
  .requiredOption('-o, --outputFile <file>', 'Output CSV')
  .requiredOption('-s, --sourceMap <file>', 'Sourcemap file');

program.parse(process.argv);

const inputFile = path.resolve(__dirname, program.inputFile);
const outputFile = path.resolve(__dirname, program.outputFile);
const sourceMap = path.resolve(__dirname, program.sourceMap);

const inputRows = [];

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (row) => {
    inputRows.push(row);
  })
  .on('end', () => {
    inputRows.forEach((row, idx) => {
      console.log(`Converting Row ${idx + 1}/${inputRows.length}`);

      if (row[program.column]) {
        const cleanStack = row[program.column]
          .split('\n')
          .filter((o) => o.indexOf('<anonymous>') === -1)
          .join('\n');

        const stackBeautifierBinPath = path.resolve(
          __dirname,
          'node_modules',
          '.bin',
          'stack-beautifier',
        );

        const command = `echo "${cleanStack}" | ${stackBeautifierBinPath} ${sourceMap}`;

        try {
          const result = execSync(command);
          row[program.column] = result.toString();
        } catch (e) {
          console.log('failed:');
          console.log(command);
        }
      } else {
        throw new Error(`Nothing found in column "${program.column}"`);
      }
    });

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(inputRows);
    fs.writeFileSync(outputFile, csv);

    console.log(`Done! Parsed CSV is located at ${outputFile}`);
  });
