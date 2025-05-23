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

import type {QueryBuilder} from './query-builder';

export enum QueryClass {
  Index = 'index',
  Project = 'project',
  Grouping = 'grouping',
}

/**
 * A QueryProperty can have these responses to appearing in a refinement
 *   Head -- Legal in all queries, apply it to the first segment
 *   Tail -- Legal in all queries,, apply it to the last segment
 *   Single -- Only legal in queries with exactly one segment
 *   undefined -- Not legal in a refinement
 */
export enum LegalRefinementStage {
  Single,
  Head,
  Tail,
}

export interface QueryPropertyInterface {
  queryRefinementStage: LegalRefinementStage | undefined;
  forceQueryClass: QueryClass | undefined;
  // Edge case for `calculate:`, which needs a grouping or
  // project to decide what kind of query it is
  needsExplicitQueryClass?: boolean;
  queryExecute?: (executeFor: QueryBuilder) => void;
}
