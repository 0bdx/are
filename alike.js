/**
 * https://www.npmjs.com/package/@0bdx/alike
 * @version 0.0.1
 * @license Copyright (c) 2023 0bdx <0@0bdx.com> (0bdx.com)
 * SPDX-License-Identifier: MIT
 */
import narrowAintas, { aintaNumber, aintaString, aintaArray, aintaObject } from '@0bdx/ainta';

// Define an enum for validating `kind`.
const validKind = [ 'ARRAY', 'BOOLNUM', 'DOM', 'ERROR', 'EXCEPTION',
    'FUNCTION', 'NULLISH', 'OBJECT', 'STRING', 'SYMBOL' ];

/** ### A single 'stroke of the highlighter pen' when rendering JS values.
 *
 * - __Consistent:__ related data in different properties always agrees
 * - __Frozen:__ all properties are read-only, and no methods ever change them
 * - __Sealed:__ properties aren't reconfigurable, new properties can't be added
 * - __Valid:__ all properties are validated during instantiation
 */
class Highlight {

    /** How the value should be rendered.
     * - Booleans and numbers highlight the same way
     * - A `BigInt` is a number rendered with the `"n"` suffix
     * - A `RegExp` highlights like an `Object` but looks like `/a/` not `{}` */
    kind;

    /** A non-negative integer. The position that highlighting starts. */
    start;

    /** A non-zero integer greater than `start`, where highlighting stops. */
    stop;

    /** ### Creates a `Highlight` instance from the supplied arguments.
     * 
     * @param {'ARRAY'|'BOOLNUM'|'DOM'|'ERROR'|'EXCEPTION'|
     *         'FUNCTION'|'NULLISH'|'OBJECT'|'STRING'|'SYMBOL'} kind
     *    How the value should be rendered.
     *    - Booleans and numbers highlight the same way
     *    - A `BigInt` is a number rendered with the `"n"` suffix
     *    - A `RegExp` highlights like an `Object` but looks like `/a/` not `{}`
     * @param {number} start
     *    A non-negative integer. The position that highlighting starts.
     * @param {number} stop
     *    A non-zero integer greater than `start`, where highlighting stops.
     * @throws
     *    Throws an `Error` if any of the arguments are invalid.
     */
    constructor(
        kind,
        start,
        stop,
    ) {
        const begin = 'new Highlight()';

        // Validate each argument.
        const [ aResults, aNum, aStr ] = narrowAintas(
            { begin, mod:1 },
            aintaNumber, aintaString);
        aStr(kind, 'kind', { is:validKind });
        aNum(start, 'start', { gte:0, lte:Number.MAX_SAFE_INTEGER - 1 });
        aNum(stop, 'stop', { gte:1, lte:Number.MAX_SAFE_INTEGER });
        if (aResults.length) throw Error(aResults.join('\n'));

        // Check that the stop position is after the start position.
        const aStop = aintaNumber(stop, 'stop', { begin, gte:start + 1 });
        if (aStop) throw Error(aStop);

        // Store the validated arguments as properties.
        this.kind = kind;
        this.start = start;
        this.stop = stop;

        // Prevent this instance from being modified.
        Object.freeze(this);
    }

}

/** ### Prepares arguments for a new `Renderable`, from any JavaScript value.
 *
 * @param {any} value
 *    The JavaScript value which needs rendering.
 * @returns {{highlights:Highlight[],text:string}}
 *    Arguments ready to pass into `new Renderable()`.
 */
function renderableFrom(value) {

    // Deal with `null`, which might otherwise be confused with an object.
    if (value === null) return { highlights:
        [ new Highlight('NULLISH', 0, 4) ], text:'null'};

    // Deal with a straightforward value: boolean, number or undefined.
    const type = typeof value;
    switch (type) {
        case 'boolean':
            return value
                ? { highlights:[ new Highlight('BOOLNUM', 0, 4) ], text:'true' }
                : { highlights:[ new Highlight('BOOLNUM', 0, 5) ], text:'false' };
        case 'number': // treat `NaN` like a regular number
            const text = value.toString();
            return { highlights:[ new Highlight('BOOLNUM', 0, text.length) ], text};
        case 'undefined':
            return { highlights:[ new Highlight('NULLISH', 0, 9) ], text:'undefined' };
    }

    // Deal with a string.
    if (type === 'string') {

        // If the string contains double-quotes but no single-quotes, wrap it
        // in single-quotes.
        if (value.includes('"') && !value.includes("'")) return { highlights:
            [ new Highlight('STRING', 0, value.length+2) ], text:`'${value}'` };

        // Otherwise, `JSON.stringify()` will escape any double-quotes
        // (plus backslashes), and then wrap it in double-quotes.
        const text = JSON.stringify(value);
        return { highlights: [ new Highlight('STRING', 0, text.length) ], text }
    }

    return { highlights:[], text:'@TODO' };
}

/** ### A representation of a JavaScript value, ready to render.
 *
 * - __Consistent:__ related data in different properties always agrees
 * - __Dereferenced:__ object arguments are deep-cloned, to avoid back-refs
 * - __Frozen:__ both properties are read-only, and no methods ever change them
 * - __Sealed:__ properties aren't reconfigurable, new properties can't be added
 * - __Valid:__ both properties are validated during instantiation
 */
class Renderable {

    /** Zero or more 'strokes of the highlighter pen' on `text`. */
    highlights;

    /** A string representation of the value.
     * - 1 to 65535 unicode characters (about 10,000 lorem ipsum words) */
    text;

    /** ### Creates a `Renderable` instance from the supplied arguments.
     * 
     * @param {Highlight[]} highlights
     *    Zero or more 'strokes of the highlighter pen' on `text`.
     * @param {string} text
     *    A string representation of the value.
     *     - 1 to 65535 unicode characters (about 10,000 lorem ipsum words)
     * @throws
     *    Throws an `Error` if any of the arguments are invalid.
     */
    constructor(
        highlights,
        text,
    ) {
        const begin = 'new Renderable()';

        // Validate each argument.
        const [ aResults, aArr, aStr ] =
            narrowAintas({ begin }, aintaArray, aintaString);
        aArr(highlights, 'highlights', { is:[Highlight] });
        aStr(text, 'text', { min:1, max:65535 });
        if (aResults.length) throw Error(aResults.join('\n'));

        // @TODO check that none of the Highlights overlap
        // @TODO and that they don't extend beyond the end of `text`

        // Store the validated arguments as properties.
        this.highlights = highlights;
        this.text = text;

        // Prevent this instance from being modified.
        Object.freeze(this);
    }

    /** ### Determines whether the full value could be rendered on one line.
     *
     * The maximum line length is 120 characters, which may begin "actually: "
     * or "expected: ", leaving 110 characters for the value.
     * 
     * @returns {boolean}
     *    Returns `true` if this instance is short enough to render on one line.
     */
    isShort() {
        return this.text.length <= 110;
    }

    /** ### The value as a plain string, for a test-result overview.
     * 
     * An overview which passes will be one line:
     * ```
     * PASS: actually: 123
     * ```
     * 
     * An overview which fails will be two lines:
     * ```
     * FAIL: actually: 123
     *       expected: 546
     * ```
     *
     * The maximum line length is 120 characters, so `this.text` may need to be
     * truncated to 104 characters. @TODO truncate
     *
     * @returns {string}
     *    Xx.
     */
    get overview() {
        const c0 = this.text[0];
        return c0 === "'" || c0 === '"'
            ? this.text
            : `\`${this.text}\``;
    }

    /** ### Creates a new `Renderable` instance from any JavaScript value.
     *
     * @param {any} value
     *    The JavaScript value which needs rendering.
     * @returns {Renderable}
     *    A `Renderable` instance, ready for rendering.
     */
    static from(value) {
        const { highlights, text } = renderableFrom(value);
        return new Renderable(highlights, text);
    }

}

// Define a regular expression for validating each item in `notes`.
const noteRx$1 = /^[ -\[\]-~]*$/;
noteRx$1.toString = () => "'Printable ASCII characters except backslashes'";

// Define an enum for validating `status`.
const validStatus = [ 'FAIL', 'PASS', 'PENDING', 'UNEXPECTED_EXCEPTION' ];

/** ### Records the outcome of one test.
 *
 * - __Dereferenced:__ object arguments are deep-cloned, to avoid back-refs
 * - __Frozen:__ all properties are read-only, and no methods ever change them
 * - __Sealed:__ properties aren't reconfigurable, new properties can't be added
 * - __Valid:__ all properties are validated during instantiation
 */
class Result {

    /** A representation of the value that the test actually got, ready to
     * render. This could be the representation of an unexpected exception. */
    actually;

    /** A representation of the value that the test expected, ready to render. */
    expected;

    /** A description of the test, as a single string of newline-delimited lines.
     * - 0 to 100 newline-delimited lines
     * - 0 to 120 printable ASCII characters (except the backslash `"\"`) per line
     * - An empty array `[]` means that no notes have been supplied */
    notes;

    /** The index of the `Section` that the test belongs to. Zero if it should
     * be rendered before the first section, or if there are no sections. */
    sectionIndex;

    /** A string (effectively an enum) which can be one of four values:
     * - `"FAIL"` if the test failed (but not by `"UNEXPECTED_EXCEPTION"`)
     * - `"PASS"` if the test passed
     * - `"PENDING"` if the test has not completed yet
     * - `"UNEXPECTED_EXCEPTION"` if the test threw an unexpected exception */
    status;

    /** ### Creates a `Result` instance from the supplied arguments.
     * 
     * @param {Renderable} actually
     *    A representation of the value that the test actually got, ready to
     *    render. This could be the representation of an unexpected exception.
     * @param {Renderable} expected
     *    A representation of the value that the test expected, ready to render.
     * @param {string[]} notes
     *    A description of the test, as an array of strings.
     *    - 0 to 100 items, where each item is a line
     *    - 0 to 120 printable ASCII characters (except the backslash `"\"`) per line
     *    - An empty array `[]` means that no notes have been supplied
     * @param {number} sectionIndex
     *    The index of the `Section` that the test belongs to. Zero if it should
     *    be rendered before the first section, or if there are no sections.
     * @param {'FAIL'|'PASS'|'PENDING'|'UNEXPECTED_EXCEPTION'} status
     *    A string (effectively an enum) which can be one of four values:
     *    - `"FAIL"` if the test failed (but not by `"UNEXPECTED_EXCEPTION"`)
     *    - `"PASS"` if the test passed
     *    - `"PENDING"` if the test has not completed yet
     *    - `"UNEXPECTED_EXCEPTION"` if the test threw an unexpected exception
     * @throws
     *    Throws an `Error` if any of the arguments are invalid.
     */
    constructor(
        actually,
        expected,
        notes,
        sectionIndex,
        status,
    ) {
        const begin = 'new Result()';

        // Validate each argument.
        const [ aResults, aArr, aObj, aNum, aStr ] = narrowAintas({ begin },
            aintaArray, aintaObject, aintaNumber, aintaString);
        aObj(actually, 'actually', { is:[Renderable], open:true });
        aObj(expected, 'expected', { is:[Renderable], open:true });
        aArr(notes, 'notes', { most:100, max:120, pass:true, rx:noteRx$1, types:['string'] });
        aNum(sectionIndex, 'sectionIndex', {
            gte:0, lte:Number.MAX_SAFE_INTEGER, mod:1 });
        aStr(status, 'status', { is:validStatus });
        if (aResults.length) throw Error(aResults.join('\n'));

        // Store the validated arguments as properties.
        this.actually = actually;
        this.expected = expected;
        this.notes = notes.join('\n');
        this.sectionIndex = sectionIndex;
        this.status = status;

        // Prevent this instance from being modified.
        Object.freeze(this);
    }
}

// Define a regular expression for validating `subtitle`.
const subtitleRx = /^[ -\[\]-~]*$/;
subtitleRx.toString = () => "'Printable ASCII characters except backslashes'";

/** ### Marks the start of a new section in the test suite.
 *
 * - __Frozen:__ both properties are read-only, and no methods ever change them
 * - __Sealed:__ properties aren't reconfigurable, new properties can't be added
 * - __Valid:__ both properties are validated during instantiation
 */
class Section {

    /** A non-zero positive integer. The first Section is 1, the second is 2. */
    index;

    /** The section title, usually rendered as a sub-heading in the results.
     * - 0 to 64 printable ASCII characters, except the backslash `"\"`
     * - An empty string `""` means that a default should be used */
    subtitle;

    /** ### Creates a `Section` instance from the supplied arguments.
     * 
     * @param {number} index
     *    A non-zero positive integer. The first Section is 1, the second is 2.
     * @param {string} subtitle
     *    The section title, usually rendered as a sub-heading in the results.
     *    - 1 to 64 printable ASCII characters, except the backslash `"\"`
     * @throws
     *    Throws an `Error` if any of the arguments are invalid.
     */
    constructor(
        index,
        subtitle,
    ) {
        const begin = 'new Section()';

        // Validate each argument.
        const [ aResults, aNum, aStr ] =
            narrowAintas({ begin }, aintaNumber, aintaString);
        aNum(index, 'index', { gte:1, lte:Number.MAX_SAFE_INTEGER, mod:1 });
        aStr(subtitle, 'subtitle', { min:0, max:64, rx:subtitleRx });
        if (aResults.length) throw Error(aResults.join('\n'));

        // Store the validated arguments as properties.
        this.index = index;
        this.subtitle = subtitle;

        // Prevent this instance from being modified.
        Object.freeze(this);
    }

}

// Define a regular expression for validating `title`.
const titleRx = /^[ -\[\]-~]*$/;
titleRx.toString = () => "'Printable ASCII characters except backslashes'";

/** ### A container for test results.
 *
 * - __Consistent:__ related data in different properties always agrees
 * - __Dereferenced:__ object arguments are deep-cloned, to avoid back-refs
 * - __Frozen:__ all properties are read-only, and only change via method calls
 * - __Sealed:__ properties aren't reconfigurable, new properties can't be added
 * - __Valid:__ all properties are validated by instantiation and method calls
 */
class Suite {

    /** The test suite's title, usually rendered as a heading above the results.
     * - 0 to 64 printable ASCII characters, except the backslash `"\"`
     * - An empty string `""` means that a default should be used */
    title;

    /** ### A non-negative integer. The total number of failed tests.
     * @property {number} failTally */
    get failTally() { return this.#failTally };
    #failTally;

    /** ### A non-negative integer. The total number of passed tests.
     * @property {number} passTally */
    get passTally() { return this.#passTally };
    #passTally;

    /** ### A non-negative integer. The total number of tests not completed yet.
     * @property {number} pendingTally */
    get pendingTally() { return this.#pendingTally };
    #pendingTally;

    /** ### An array containing zero or more test results and sections.
     * @property {(Result|Section)[]} pendingTally */
    get resultsAndSections() { return [...this.#resultsAndSections] };
    #resultsAndSections;

    /** The current highest section index. Incremented by `addSection()`. */
    #currentSectionIndex;

    /** ### Creates an empty `Suite` instance with the supplied title.
     * 
     * @param {string} title
     *    The test suite's title, usually rendered as a heading above the results.
     *    - 0 to 64 printable ASCII characters, except the backslash `"\"`
     *    - An empty string `""` means that a default should be used
     * @throws
     *    Throws an `Error` if any of the arguments are invalid.
     */
    constructor(title) {
        const begin = 'new Suite()';

        // Validate the `title` argument, and then store it as a property.
        const aTitle = aintaString(title, 'title',
            { begin, min:0, max:64, rx:titleRx });
        if (aTitle) throw Error(aTitle);
        this.title = title;

        // Initialise the read-only properties.
        this.#currentSectionIndex = 0;
        this.#failTally = 0;
        this.#passTally = 0;
        this.#pendingTally = 0;
        this.#resultsAndSections = [];

        // Prevent this instance from being modified.
        Object.freeze(this);
    }

    /** ### Returns the suite's public properties as an object.
     *
     * JavaScript's `JSON.stringify()` looks for a function named `toJSON()` in
     * any object being serialized. If it exists, it serializes the return value
     * of `toJSON()`, instead of just writing "[object Object]".
     * 
     * @returns {{failTally:number, passTally:number, pendingTally:number,
     *           resultsAndSections:(Result|Section)[], title:string}}
     *    The public properties of `Suite`.
     */
    toJSON() {
        return ({
            failTally: this.failTally,
            passTally: this.passTally,
            pendingTally: this.pendingTally,
            resultsAndSections: this.resultsAndSections,
            title: this.title,
        });
    }

    /** ### Adds a new result to the test suite.
     * 
     * Note that the result will be automatically be assigned a section index,
     * based on the suite's current highest section index.
     * 
     * @param {Renderable} actually
     *    A representation of the value that the test actually got, ready to
     *    render. This could be the representation of an unexpected exception.
     * @param {Renderable} expected
     *    A representation of the value that the test expected, ready to render.
     * @param {string[]} notes
     *    A description of the test, as an array of strings.
     *    - 0 to 100 items, where each item is a line
     *    - 0 to 120 printable ASCII characters (except `"\"`) per line
     *    - An empty array `[]` means that no notes have been supplied
     * @param {'FAIL'|'PASS'|'PENDING'|'UNEXPECTED_EXCEPTION'} status
     *    A string (effectively an enum) which can be one of four values:
     *    - `"FAIL"` if the test failed (but not by `"UNEXPECTED_EXCEPTION"`)
     *    - `"PASS"` if the test passed
     *    - `"PENDING"` if the test has not completed yet
     *    - `"UNEXPECTED_EXCEPTION"` if the test threw an unexpected exception
     * @returns {void}
     *    Does not return anything.
     * @throws
     *    Throws an `Error` if any of the arguments are invalid.
     */
    addResult(
        actually,
        expected,
        notes,
        status,
    ) {
        // Try to instantiate a new `Result`. We want to throw an `Error` if any
        // of the arguments are invalid, before incrementing a tally.
        const result = new Result(
            actually,
            expected,
            notes,
            this.#currentSectionIndex, // sectionIndex
            status,
        );

        // Update one of the three tallies.
        switch (result.status) {
            case 'FAIL':
            case 'UNEXPECTED_EXCEPTION':
                this.#failTally += 1;
                break;
            case 'PASS':
                this.#passTally += 1;
                break;
            case 'PENDING':
                this.#pendingTally += 1;
                break;
        }

        // Add the new `Result` to the private `resultsAndSections` array.
        this.#resultsAndSections.push(result);
    }

    /** ### Adds a new section to the test suite.
     * 
     * @param {string} subtitle
     *    The section title, usually rendered as a sub-heading in the results.
     *    - 1 to 64 printable ASCII characters, except the backslash `"\"`
     * @returns {void}
     *    Does not return anything.
     * @throws
     *    Throws an `Error` if `subtitle` or the `this` context are invalid.
     */
    addSection(subtitle) {
        // Try to instantiate a new `Section`. We want to throw an `Error` if
        // `subtitle` is not valid, before incrementing `currentSectionIndex`.
        const section = new Section(
            this.#currentSectionIndex + 1,
            subtitle,
        );

        // Increment the current highest section index.
        this.#currentSectionIndex += 1;

        // Add the new `Section` to the private `resultsAndSections` array.
        this.#resultsAndSections.push(section);
    }
}

/** ### Binds various test tools to a shared `Suite` instance.
 * 
 * Takes an existing `Suite` or creates a new one, binds any number of functions
 * to it, and returns those functions in an array. Each function can then access
 * the shared `Suite` instance using the `this` keyword.
 *
 * This pattern of dependency injection allows lots of flexibility, and works
 * well with Rollup's tree shaking.
 *
 * @example
 * import bindAlikeTools, { addSection, areAlike, renderPlain }
 *     from '@0bdx/alike';
 *
 * // Give the test suite a title, and bind some functions to it.
 * const [ section,    areA,     render ] = bindAlikeTools('Mathsy Test Suite',
 *         addSection, areAlike, renderPlain);
 *
 * // Optionally, begin a new addSection.
 * section('Check that factorialise() works');
 *
 * // Run the tests. The third argument, `description`, is optional.
 * areA(factorialise(0), 1);
 * areA(factorialise(5), 120,
 *     'factorialise(5) // 5! = 5 * 4 * 3 * 2 * 1');
 *
 * // Output the test results to the console, as plain text.
 * console.log(render());
 *
 * function factorialise(n) {
 *     if (n === 0 || n === 1) return 1;
 *     for (let i=n-1; i>0; i--) n *= i;
 *     return n;
 * }
 *
 * @param {string|Suite} titleOrSuite
 *    A name for the group of tests, or else a suite from previous tests.
 * @param {...function} tools
 *    Any number of functions, which will be bound to a shared `Suite` instance.
 * @returns {function[]}
 *    The functions which were passed in, now bound to a shared `Suite` instance.
 * @throws
 *    Throws an `Error` if any of the arguments are invalid.
 */
function bindAlikeTools(titleOrSuite, ...tools) {
    const begin = 'bindAlikeTools():';

    // Validate the arguments.
    const [ aResults, aArr, aObj, aStr ] = narrowAintas({ begin },
        aintaArray, aintaObject, aintaString);
    const aTitle = aStr(titleOrSuite, 'titleOrSuite');
    const aSuite = aObj(titleOrSuite, 'titleOrSuite', { is:[Suite] });
    const aTools = aArr(tools, 'tools', { types:['function'] });
    if ((aTitle && aSuite) || aTools)
        throw Error(aTitle && aSuite ? aResults.join('\n') : aResults[1]);

    // If `titleOrSuite` is an object it must already be an instance of `Suite`,
    // so just use is as-is. Otherwise, create a new `Suite` instance.
    const suite = typeof titleOrSuite === 'object'
        ? titleOrSuite
        : new Suite(titleOrSuite || 'Untitled Test Suite');

    // Bind the `Suite` instance to each test tool.
    return tools.map(tool => tool.bind(suite));
}

/** ### Adds a new section to the test suite.
 * 
 * @param {string} subtitle
 *    The section title, usually rendered as a sub-heading in the results.
 *    - 1 to 64 printable ASCII characters, except the backslash `"\"`
 * @returns {void}
 *    Does not return anything.
 * @throws
 *    Throws an `Error` if `subtitle` or the `this` context are invalid.
 */
function addSection(subtitle) {
    const begin = 'addSection()';

    // Check that this function has been bound to a `Suite` instance.
    // @TODO cache this result for performance
    const aSuite = aintaObject(this, 'suite', { begin, is:[Suite], open:true });
    if (aSuite) throw Error(aSuite);

    // The brackets around `this` make JSDoc see `(this)` as a `Suite` instance.
    /** @type Suite */
    (this).addSection(subtitle);
}

/** ### Determines whether two arguments are alike.
 *
 * @private
 * @param {any} actually
 *    The value that the test actually got.
 * @param {any} expected
 *    The value that the test expected.
 * @param {number} [maxDepth=99]
 *    Prevents infinite recursion.
 * @returns {boolean}
 *    Returns `true` if the arguments are alike, and `false` if not.
 */
const determineWhetherAlike = (actually, expected, maxDepth=99) => {

    // If either argument is `null`, we can return `true` or `false` early.
    const actuallyIsNull = actually === null;
    const expectedIsNull = expected === null;
    if (actuallyIsNull && expectedIsNull) return true; // both `null`
    if (actuallyIsNull || expectedIsNull) return false; // only one is `null`

    // If either argument is `NaN`, we can return `true` or `false` early.
    const actuallyIsNaN = Number.isNaN(actually);
    const expectedIsNaN = Number.isNaN(expected);
    if (actuallyIsNaN && expectedIsNaN) return true; // both 'not-a-number'
    if (actuallyIsNaN || expectedIsNaN) return false; // only one is `NaN`

    // If the arguments are not the same type, `false`.
    const typeActually = typeof actually;
    const typeExpected = typeof expected;
    if (typeActually !== typeExpected) return false; // not the same type

    // They're the same type. If they're also scalar, return `true` or `false`.
    if ({ bigint:1, boolean:1, number:1, string:1, symbol:1, undefined:1
        }[typeActually]) return actually === expected;

    // The arguments are arrays, functions or objects. If they are references
    // to the same thing, return `true`.
    if (actually === expected) return true;

    // If the arguments are both functions, return `false`.
    // @TODO maybe compare static properties on a class
    if (typeActually === 'function' && typeExpected === 'function') return false;

    // If they are both arrays, compare each argument recursively.
    // @TODO improve cyclic reference detection, by passing down a `foundObjects` argument
    const actuallyIsArray = Array.isArray(actually);
    const expectedIsArray = Array.isArray(expected);
    if (actuallyIsArray && expectedIsArray) {
        if (maxDepth === 0) return true; // prevent infinite recursion
        const len = actually.length;
        if (expected.length !== len) return false;
        for (let i=0; i<len; i++) {
            if (!determineWhetherAlike(actually[i], expected[i], maxDepth - 1))
                return false;
        }
        return true;
    }

    // If one argument is an array but the other is an object, return `false`.
    if (actuallyIsArray || expectedIsArray) return false;

    // The arguments are both objects. Compare their constructors.
    if (actually.constructor !== expected.constructor) return false;

    // Check they have the same number of properties, ignoring non-enumerables.
    const actuallyKeys = Object.keys(actually);
    const expectedKeys = Object.keys(expected);
    if (actuallyKeys.length !== expectedKeys.length) return false;

    // Prevent infinite recursion.
    if (maxDepth === 0) return true;

    // Compare the two objects recursively, ignoring non-enumerable properties.
    // @TODO improve cyclic reference detection, by passing down a `foundObjects` argument
    for (const key of actuallyKeys) {
        if (!determineWhetherAlike(actually[key], expected[key], maxDepth - 1))
            return false;
    }
    return true;
};

/** ### Shortens text to a given length, by inserting `"..."` near the end.
 *
 * @private
 * @param {string} text
 *    Text to shorten.
 * @param {number} length
 *    The maximum allowed length of the truncated string.
 * @throws
 *    Throws an `Error` if `text` has no `length` property or `slice()` method.
 *    Also throws an `Error` if `length` is less than 12.
 */
const truncate = (text, length) => {
    if (length < 12) throw Error('truncate(): `length` ' + length + ' is < 12');
    const textLength = text.length;
    if (textLength <= length) return text;
    const postLen = Math.max(4, length - ~~(length * 0.7));
    const preLen = length - postLen - 3;
    return `${text.slice(0, preLen)}...${text.slice(-postLen)}`;
};

// Define a regular expression for validating each item in `notes`.
const noteRx = /^[ -\[\]-~]*$/;
noteRx.toString = () => "'Printable ASCII characters except backslashes'";

/** ### Compares two JavaScript values in a user-friendly way.
 * 
 * `areAlike()` operates in one of two modes:
 * 1. If it has been bound to an object with an `addResult()` method, it sends
 *    that method the full test results, and then returns an overview.
 * 2. Otherwise, it either throws an `Error` if the test fails, or returns
 *    an overview if the test passes.
 * 
 * @TODO finish the description, with examples
 *
 * @param {any} actually
 *    The value that the test actually got.
 * @param {any} expected
 *    The value that the test expected.
 * @param {string|string[]} [notes]
 *    An optional description of the test, as a string or array of strings.
 *    - A string is treated identically to an array containing just that string
 *    - 0 to 100 items, where each item is a line
 *    - 0 to 120 printable ASCII characters (except the backslash `"\"`) per line
 *    - An empty array `[]` means that no notes have been supplied
 *    - The first item (index 0), if present, is used for the overview
 * @returns {string}
 *    Returns an overview of the test result.
 * @throws
 *    Throws an `Error` if `notes` or the `this` context are invalid.
 *    Also throws an `Error` if the test fails.
 */
function areAlike(actually, expected, notes) {
    const begin = 'areAlike()';

    // Validate the `notes` argument. `this.addResult()`, if it exists, will
    // do some similar validation, but its error message would be confusing.
    const notesIsArray = Array.isArray(notes); // used again, further below
    const options = { begin, max:120, most:100, pass:true, rx:noteRx };
    const aNotes = notesIsArray // @TODO make ainta able to handle 'or' types
        ? aintaArray(notes, 'notes', { ...options, types:['string'] })
        : typeof notes !== 'undefined'
            ? aintaString(notes, 'notes', options)
            : ''; // no `notes` argument was passed in
    if (aNotes) throw Error(aNotes);

    // Determine whether `actually` and `expected` are alike.
    const didFail = !determineWhetherAlike(actually, expected);

    // Generate the overview which `areAlike()` will throw or return.
    const status = didFail ? 'FAIL' : 'PASS';
    const actuallyRenderable = Renderable.from(actually);
    const expectedRenderable = Renderable.from(expected);
    const overview = `${status}: ${notesIsArray
        ? (notes[0] ? `${truncate(notes[0],114)}\n    ` : '') // `notes` is an array
        : (notes ? `${truncate(notes,114)}\n    ` : '') // `notes` should be undefined or a string
    }\`actually\` is ${actuallyRenderable.overview}${didFail
        ? `\n    \`expected\` is ${expectedRenderable.overview}`
        : ' as expected'
    }`;

    // If there's no `this.addResult()`, throw or return the overview.
    if (typeof this?.addResult !== 'function') {
        if (didFail) throw Error(overview);
        return overview;
    }

    // Normalise the `notes` argument into an array.
    const notesArr = Array.isArray(notes)
        ? notes // was already an array
        : typeof notes === 'undefined'
            ? [] // no `notes` argument was passed in
            : [ notes ]; // hopefully a string, but that will be validated below

    // Prepare an array of strings to pass to the `addResult()` `notes` argument.
    // This array will end with some auto-generated notes about the test.
    const auto = !didFail
        ? [ '{{actually}} as expected' ]
        : actuallyRenderable.isShort() && expectedRenderable.isShort()
            ? [ 'actually: {{actually}}', 'expected: {{expected}}' ]
            : [ 'actually:', '{{actually}}', 'expected:', '{{expected}}' ];
    const notesPlusAuto = [ ...notesArr, ...auto ];

    // Add the test result to the object that this function has been bound to.
    this.addResult(
        actuallyRenderable,
        expectedRenderable,
        notesPlusAuto,
        status,
    );

    // Return an overview of the test result.
    return overview;
}

/** ### Renders a test suite without colours or typographic styling.
 * 
 * @TODO describe with examples
 *
 * @returns {string}
 *    Returns the test suite's title, followed by a summary of the test results.
 * @throws
 *    Throws an `Error` if the `this` context is invalid.
 */
function renderPlain() {
    const begin = 'renderPlain()';

    // Tell JSDoc that the `this` context is a `Suite` instance.
    /** @type Suite */
    const suite = this;

    // Check that this function has been bound to a `Suite` instance.
    // @TODO cache this result for performance
    const aSuite = aintaObject(suite, 'suite', { begin, is:[Suite], open:true });
    if (aSuite) throw Error(aSuite);

    // Get the number of tests which failed, passed, and have not completed yet.
    const fail = suite.failTally;
    const pass = suite.passTally;
    const pending = suite.pendingTally;
    const numTests = fail + pass + pending;

    // Return the test suite's title, followed by a summary of the test results.
    return `${'-'.repeat(suite.title.length)}\n` +
        `${suite.title}\n` +
        `${'='.repeat(suite.title.length)}\n\n${
        numTests === 0
            ? 'No tests were run.'
            : pending
                ? `${pending} test${pending === 1 ? '' : 's' } still pending.`
                : fail
                  ? '@TODO fails'
                  : pass === 1
                    ? 'The test passed.'
                    : pass === 2
                        ? 'Both tests passed.'
                        : `All ${pass} tests passed.`
    }\n`;
}

export { Renderable, Suite, addSection, areAlike, bindAlikeTools as default, renderPlain };
