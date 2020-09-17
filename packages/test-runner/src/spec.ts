/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Test, Suite } from './test';
import { installTransform } from './transform';
import { SuiteDeclaration, TestDeclaration } from './declarations';

Error.stackTraceLimit = 15;

let currentItImpl;
let currentDescribeImpl;

export const it = (...args) => {
  currentItImpl('default', ...args);
};
it.skip = (...args) => currentItImpl('skip', ...args);
it.only = (...args) => currentItImpl('only', ...args);

export const describe = (...args) => {
  currentDescribeImpl('default', ...args);
};
describe.skip = (...args) => currentDescribeImpl('skip', ...args);
describe.only = (...args) => currentDescribeImpl('only', ...args);

// Run specs ------------------------------------------------------------------

let currentRunSuites: Suite[];

export const beforeEach = currentRunSuites[0] ? fn => currentRunSuites[0]._addHook('beforeEach', fn) : () => {};
export const afterEach = currentRunSuites[0] ? fn => currentRunSuites[0]._addHook('afterEach', fn) : () => {};
export const beforeAll = currentRunSuites[0] ? fn => currentRunSuites[0]._addHook('beforeAll', fn) : () => {};
export const afterAll = currentRunSuites[0] ? fn => currentRunSuites[0]._addHook('afterAll', fn) : () => {};

export function runSpec(suite: Suite, timeout: number, parameters: any): () => void {
  const suites = [suite];
  currentRunSuites = suites;

  currentItImpl = (spec: 'default' | 'skip' | 'only', title: string, metaFn: (test: Test, parameters: any) => void | Function, fn?: Function) => {
    const suite = suites[0];
    if (typeof fn !== 'function') {
      fn = metaFn;
      metaFn = null;
    }
    const test = new Test(title, fn);
    if (metaFn && parameters)
      metaFn(test, parameters);
    test.file = suite.file;
    test.location = extractLocation(new Error());
    test._timeout = timeout;
    if (spec === 'only')
      test._only = true;
    if (spec === 'skip')
      test._skipped = true;
    suite._addTest(test);
    return test;
  };

  currentDescribeImpl = (spec: 'describe' | 'skip' | 'only', title: string, metaFn: (suite: Suite, parameters: any) => void | Function, fn?: Function) => {
    if (typeof fn !== 'function') {
      fn = metaFn;
      metaFn = null;
    }
    const child = new Suite(title, suites[0]);
    if (metaFn && parameters)
      metaFn(child, parameters);
    suites[0]._addSuite(child);
    child.file = suite.file;
    child.location = extractLocation(new Error());
    if (spec === 'only')
      child._only = true;
    if (spec === 'skip')
      child._skipped = true;
    suites.unshift(child);
    fn();
    suites.shift();
  };

  return installTransform();
}

// Declare specs ------------------------------------------------------------------

export function declarationSpec(suite: SuiteDeclaration): () => void {
  const suites = [suite];

  currentItImpl = (spec: 'default' | 'skip' | 'only', title: string, metaFn: any | Function, fn?: Function) => {
    const suite = suites[0];
    fn = fn || metaFn;
    const test = new TestDeclaration(title, fn);
    test.file = suite.file;
    test.location = extractLocation(new Error());
    return test;
  };

  currentDescribeImpl = (spec: 'describe' | 'skip' | 'only', title: string, metaFn: (suite: SuiteDeclaration, parameters: any) => void | Function, fn?: Function) => {
    fn = fn || metaFn;
    const child = new SuiteDeclaration(title, suites[0]);
    suites[0]._addSuite(child);
    child.file = suite.file;
    child.location = extractLocation(new Error());
    suites.unshift(child);
    fn();
    suites.shift();
  };

  return installTransform();
}

function extractLocation(error: Error): string {
  const location = error.stack.split('\n')[3];
  const match = location.match(/Object.<anonymous> \((.*)\)/);
  if (match)
    return match[1];
  return '';
}
