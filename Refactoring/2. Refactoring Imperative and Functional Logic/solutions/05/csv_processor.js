'use strict';

const async = require('async');
const fs = require('fs');

class CSVProcessor {
    static combineFiles (pathsToFiles, pathToOutput, headers, callback) {
        CSVProcessor.controlFlow(fs, pathsToFiles, pathToOutput, headers, callback);
    }

    static controlFlow (fs, pathsToFiles, pathToOutput, headers, callback) {
        if (!(pathsToFiles instanceof Array) || pathsToFiles.length === 0) {
            return callback(new Error('path to files must be a non-empty array'));
        }

        if (typeof pathToOutput !== 'string' || pathToOutput.indexOf('.csv') === -1) {
            return callback(new Error('path to output should be a csv file'));
        }

        if (!(headers instanceof Array) || headers.length === 0) {
            return callback(new Error('headers must be a non empty array'));
        }

        for (let header of headers) {
            if (typeof header !== 'string') {
                return callback(new Error('all headers must be strings'));
            }
        }

        CSVProcessor.readFiles(fs, pathsToFiles, function (err, files) {
            if (err) {
                return callback(err);
            }

            const result = CSVProcessor.buildCombinedFile(headers, files);

            CSVProcessor.writeOutput(fs, pathToOutput, result, callback);
        });
    }

    static readFiles (fs, pathsToFiles, next) {
        let index = 0;
        let files = [];

        async.whilst(() => index < pathsToFiles.length, (next) => {
            let pathToFile = pathsToFiles[index];

            if (pathToFile.indexOf('.csv') === -1) {
                index += 1;

                return next();
            }

            fs.readFile(pathToFile, (err, file) => {
                if (err) {
                    return next(err);
                }

                files.push(file.toString());

                index += 1;

                next();
            });
        }, (err) => {
            if (err) {
                return next(err);
            }

            next(null, files);
        });
    }

    static buildCombinedFile (headers, files) {
        return files.reduce((combinedLines, file) => {
            let fileLines = file.split('\n');

            if (fileLines.length <= 1) {
                return combinedLines;
            }

            let fileHeaders = fileLines[0].split(',').map(fileHeader => fileHeader.trim());
            let headerMap = {};

            for (let header of headers) {
                headerMap[header] = fileHeaders.indexOf(header);
            }

            for (let fileLine of fileLines.slice(1)) {
                let lineElements = fileLine.split(',').map(fileElement => fileElement.trim());
                let newLine = [];

                for (let header in headerMap) {
                    if (headerMap[header] > -1) {
                        newLine.push(lineElements[headerMap[header]]);
                    } else {
                        newLine.push(undefined);
                    }
                }

                combinedLines.push(newLine.join(','));
            }

            return combinedLines;
        }, [headers.join(',')]);
    }

    static writeOutput (fs, pathToOutput, result, callback) {
        fs.mkdir(pathToOutput.substring(0, pathToOutput.lastIndexOf('/')), { recursive: true }, (err) => {
            if (err && err.code !== 'EEXIST') {
                return callback(err);
            }

            fs.writeFile(pathToOutput, result.join('\n'), callback);
        });
    }
}

module.exports = CSVProcessor;
