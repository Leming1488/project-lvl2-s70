/* @flow */

import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import Ini from 'ini';
import Yaml from 'yamljs';
import renderTree from './render';

const encoding = 'utf8';

const formats = {
  '.ini': Ini,
  '.yaml': Yaml,
  '.yml': Yaml,
  '.json': JSON,
};

const readData = filePath => ({
  body: fs.readFileSync(filePath, encoding),
  ext: path.parse(filePath).ext });
const parsingData = data => formats[data.ext].parse(data.body);
const buildTree = (before, after) => Object.keys({ ...before, ...after }).reduce((acc, key) => {
  if (_.has(before, key) && _.has(after, key)) {
    if (_.isEqual(before[key], after[key])) {
      return acc.add({ state: 'same', key, value: before[key] });
    } else if (typeof before[key] === 'object') {
      return acc.add({ state: 'same', key, value: buildTree(before[key], after[key]) });
    }
    return acc.add({ state: 'new', key, value: after[key] }).add({ state: 'delete', key, value: before[key] });
  }
  return (_.has(before, key) ?
          acc.add({ state: 'delete', key, value: before[key] }) :
          acc.add({ state: 'new', key, value: after[key] }));
}, new Set());

export default (path1: string, path2: string) => {
  try {
    const dataFromFile1 = readData(path1);
    const dataFromFile2 = readData(path2);

    const parsedData1 = parsingData(dataFromFile1);
    const parsedData2 = parsingData(dataFromFile2);

    const treeFromMerge = buildTree(parsedData1, parsedData2);
    const diffFromMerge = renderTree(treeFromMerge);

    return diffFromMerge;
  } catch (err) {
    switch (err.code) {
      case 'ENOENT':
        throw new Error('File not found');
      default:
        throw new Error('Error');
    }
  }
};
