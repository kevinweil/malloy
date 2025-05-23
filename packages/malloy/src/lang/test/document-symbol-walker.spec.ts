/*
 * Copyright 2023 Google LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import type {MarkedSource} from './test-translator';
import {TestTranslator, markSource} from './test-translator';
import type {DocumentSymbol} from '../parse-tree-walkers/document-symbol-walker';

class MalloyExplore extends TestTranslator {
  constructor(src: string) {
    super(src);
  }

  get symbols(): DocumentSymbol[] {
    const md = this.metadata();
    return md.symbols || [];
  }
}

function testSymbol(
  source: MarkedSource,
  name: string,
  type: string,
  path: number[]
) {
  const doc = new MalloyExplore(source.code);
  let current = {children: doc.symbols};
  path.forEach(segment => {
    current = current.children[segment];
  });
  expect(doc.logger.getLog().map(m => m.message)).toEqual([]);
  expect(current).toMatchObject({
    name,
    range: source.locations[0].range,
    type,
  });
}

function testLens(source: MarkedSource, path: number[]) {
  const doc = new MalloyExplore(source.code);
  let current: Partial<DocumentSymbol> & {children: DocumentSymbol[]} = {
    children: doc.symbols,
  };
  path.forEach(segment => {
    current = current.children[segment];
  });
  expect(doc.logger.getLog().map(m => m.message)).toEqual([]);
  const expectedLensRange = source.locations[0].range;
  const expected =
    'lensRange' in current && current.lensRange !== undefined
      ? {lensRange: expectedLensRange}
      : {range: expectedLensRange};
  expect(current).toMatchObject(expected);
}

test('source symbols are included', () => {
  testSymbol(
    markSource`source: ${"flights is DB.table('my.table.flights')"}`,
    'flights',
    'explore',
    [0]
  );
});

test('query symbols are included', () => {
  testSymbol(
    markSource`query: ${'flights_by_carrier is flights -> by_carrier'}`,
    'flights_by_carrier',
    'query',
    [0]
  );
});

test('run (def) symbols are included', () => {
  testSymbol(
    markSource`run: ${'flights -> by_carrier'}`,
    'unnamed_query',
    'unnamed_query',
    [0]
  );
});

test('run (ref) symbols are included', () => {
  testSymbol(
    markSource`query: by_carrier is flights -> by_carrier
    run: ${'by_carrier'}`,
    'unnamed_query',
    'unnamed_query',
    [1]
  );
});

test('expression field defs are included', () => {
  testSymbol(
    markSource`
      source: flights is DB.table('my.table.flights') extend {
        dimension: ${'one is 1'}
      }
    `,
    'one',
    'field',
    [0, 0]
  );
});

test('renamed fields are included', () => {
  testSymbol(
    markSource`
      source: flights is DB.table('my.table.flights') extend {
        rename: ${'field_two is field_2'}
      }
    `,
    'field_two',
    'field',
    [0, 0]
  );
});

test('name only fields are included', () => {
  testSymbol(
    markSource`
      source: flights is DB.table('my.table.flights') extend {
        dimension: ${'field_two is field_2'}
      }
    `,
    'field_two',
    'field',
    [0, 0]
  );
});

test('turtle fields are included', () => {
  testSymbol(
    markSource`
      source: flights is DB.table('my.table.flights') extend {
        view: ${'my_turtle is { group_by: a }'}
      }
    `,
    'my_turtle',
    'query',
    [0, 0]
  );
});

test('turtle children fields are included', () => {
  testSymbol(
    markSource`
      source: flights is DB.table('my.table.flights') extend {
        view: my_turtle is { group_by: ${'a'} }
      }
    `,
    'a',
    'field',
    [0, 0, 0]
  );
});

test('turtle children turtles are included', () => {
  testSymbol(
    markSource`
      source: flights is DB.table('my.table.flights') extend {
        view: my_turtle is { nest: ${'inner_turtle is { group_by: a }'} }
      }
    `,
    'inner_turtle',
    'query',
    [0, 0, 0]
  );
});

test('refinement chain gets name correctly', () => {
  testSymbol(
    markSource`
      source: flights is DB.table('my.table.flights') extend {
        view: my_turtle is { nest: ${'something + something_else'} }
      }
    `,
    'something',
    'query',
    [0, 0, 0]
  );
});

test('arrow in nest infers name correctly', () => {
  testSymbol(
    markSource`
      source: flights is DB.table('my.table.flights') extend {
        view: my_turtle is { nest: ${'thingy -> something + something_else'} }
      }
    `,
    'something',
    'query',
    [0, 0, 0]
  );
});

test('join withs are included', () => {
  testSymbol(
    markSource`
      source: flights is DB.table('my.table.flights') extend {
        join_one: ${'a is b with c'}
      }
    `,
    'a',
    'join',
    [0, 0]
  );
});

test('join ons are included', () => {
  testSymbol(
    markSource`
      source: flights is DB.table('my.table.flights') extend {
        join_one: ${'a is b on c'}
      }
    `,
    'a',
    'join',
    [0, 0]
  );
});

test('source lenses go before block annotations when one source', () => {
  testLens(
    markSource`${`# tag
    # tag2
    source:
    # tag3
    flights is DB.table('my.table.flights')`}`,
    [0]
  );
});

test('source lenses go before individual annotations when more than one source', () => {
  testLens(
    markSource`# tag
    source:
      ${`# tag2
      flights is DB.table('my.table.flights')`}

      flights2 is DB.table('my.table.flights')`,
    [0]
  );
});

test('query lenses go before block annotations when one source', () => {
  testLens(
    markSource`${`# tag
    # tag2
    query:
    # tag3
    q is flights -> by_carrier`}`,
    [0]
  );
});

test('query lenses go before individual annotations when more than one source', () => {
  testLens(
    markSource`# tag
    query:
      ${`# tag2
      q is flights -> by_carrier`}

      q2 is flights -> by_carrier`,
    [0]
  );
});

test('run lenses go before block annotations', () => {
  testLens(
    markSource`${`# tag
    # tag2
    run:
    # tag3
    flights -> by_carrier`}`,
    [0]
  );
});

test('multiline unnamed queries include last line', () => {
  // The trailing } being in column 0 is significant
  testLens(
    markSource`${`run: flights -> {
  group_by: carrier
}`}`,
    [0]
  );
});

test('multiline named queries include last line', () => {
  // The trailing } being in column 0 is significant
  testLens(
    markSource`${`query: by_carrier is flights -> {
  group_by: carrier
}`}`,
    [0]
  );
});

test('(regression) query does not use source block range', () => {
  testLens(
    markSource`source: a is DB.table('b') extend {
      view:
        ${'x is {select: *}'}
        y is {select: *}
    }`,
    [0, 0]
  );
});
