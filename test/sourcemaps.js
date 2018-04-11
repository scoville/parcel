const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mapValidator = require('sourcemap-validator');
const {bundler, bundle, run, assertBundleTree} = require('./utils');

describe('sourcemaps', function() {
  it('should create a valid sourcemap as a child of a JS bundle', async function() {
    let b = bundler(__dirname + '/integration/sourcemap/index.js');
    let bu = await b.bundle();

    assertBundleTree(bu, {
      name: 'index.js',
      assets: ['index.js'],
      childBundles: [
        {
          name: 'index.map',
          type: 'map'
        }
      ]
    });

    let raw = fs
      .readFileSync(path.join(__dirname, '/dist/index.js'))
      .toString();
    let map = fs
      .readFileSync(path.join(__dirname, '/dist/index.map'))
      .toString();
    mapValidator(raw, map);
    let mapObject = JSON.parse(map);
    assert(
      mapObject.sourceRoot ===
        path.relative(b.options.outDir, b.options.rootDir),
      'sourceRoot should be the root of the source files, relative to the output directory.'
    );
    assert(
      fs.existsSync(
        path.resolve(
          b.options.outDir,
          mapObject.sourceRoot,
          mapObject.sources[0]
        )
      ),
      'combining sourceRoot and sources object should resolve to the original file'
    );

    let output = run(bu);
    assert.equal(typeof output, 'function');
    assert.equal(output(), 'hello world');
  });

  it('should create a valid sourcemap as a child of a TS bundle', async function() {
    let b = await bundle(
      __dirname + '/integration/sourcemap-typescript/index.ts'
    );

    assertBundleTree(b, {
      name: 'index.js',
      assets: ['index.ts'],
      childBundles: [
        {
          name: 'index.map',
          type: 'map'
        }
      ]
    });

    let raw = fs
      .readFileSync(path.join(__dirname, '/dist/index.js'))
      .toString();
    let map = fs
      .readFileSync(path.join(__dirname, '/dist/index.map'))
      .toString();
    mapValidator(raw, map);

    let output = run(b);
    assert.equal(typeof output.env, 'function');
    assert.equal(output.env(), process.env.NODE_ENV);
  });

  it('should create a valid sourcemap as a child of a nested TS bundle', async function() {
    let b = await bundle(
      __dirname + '/integration/sourcemap-typescript-nested/index.ts'
    );

    assertBundleTree(b, {
      name: 'index.js',
      assets: ['index.ts', 'local.ts'],
      childBundles: [
        {
          name: 'index.map',
          type: 'map'
        }
      ]
    });

    let raw = fs
      .readFileSync(path.join(__dirname, '/dist/index.js'))
      .toString();
    let map = fs
      .readFileSync(path.join(__dirname, '/dist/index.map'))
      .toString();
    mapValidator(raw, map);

    let output = run(b);
    assert.equal(typeof output.env, 'function');
    assert.equal(output.env(), process.env.NODE_ENV);
  });

  it('should create a valid sourcemap for a js file with requires', async function() {
    let b = await bundle(__dirname + '/integration/sourcemap-nested/index.js');

    assertBundleTree(b, {
      name: 'index.js',
      assets: ['index.js', 'local.js', 'util.js'],
      childBundles: [
        {
          name: 'index.map',
          type: 'map'
        }
      ]
    });

    let raw = fs
      .readFileSync(path.join(__dirname, '/dist/index.js'))
      .toString();
    let map = fs
      .readFileSync(path.join(__dirname, '/dist/index.map'))
      .toString();
    mapValidator(raw, map);

    let output = run(b);
    assert.equal(typeof output, 'function');
    assert.equal(output(), 14);
  });

  it('should create a valid sourcemap for a minified js bundle with requires', async function() {
    let b = await bundle(
      __dirname + '/integration/sourcemap-nested-minified/index.js',
      {
        minify: true
      }
    );

    assertBundleTree(b, {
      name: 'index.js',
      assets: ['index.js', 'local.js', 'util.js'],
      childBundles: [
        {
          name: 'index.map',
          type: 'map'
        }
      ]
    });

    let raw = fs
      .readFileSync(path.join(__dirname, '/dist/index.js'))
      .toString();
    let map = fs
      .readFileSync(path.join(__dirname, '/dist/index.map'))
      .toString();
    mapValidator(raw, map);

    let output = run(b);
    assert.equal(typeof output, 'function');
    assert.equal(output(), 14);
  });

  it('should create a valid sourcemap reference for a child bundle', async function() {
    let b = await bundle(
      __dirname + '/integration/sourcemap-reference/index.html'
    );

    assertBundleTree(b, {
      name: 'index.html',
      assets: ['index.html'],
      childBundles: [
        {
          type: 'js',
          assets: ['index.js', 'data.json'],
          childBundles: [
            {
              type: 'map'
            }
          ]
        }
      ]
    });

    let jsOutput = fs
      .readFileSync(Array.from(b.childBundles)[0].name)
      .toString();

    let sourcemapReference = path.join(
      __dirname,
      '/dist/',
      jsOutput.substring(jsOutput.lastIndexOf('//# sourceMappingURL') + 22)
    );
    assert(
      fs.existsSync(path.join(sourcemapReference)),
      'referenced sourcemap should exist'
    );

    let map = fs.readFileSync(path.join(sourcemapReference)).toString();
    mapValidator(jsOutput, map);
  });
});
