const RUNTIME_PUBLIC_PATH = "server/chunks/[turbopack]_runtime.js";
const RELATIVE_ROOT_PATH = "../../..";
const ASSET_PREFIX = "/";
/**
 * This file contains runtime types and functions that are shared between all
 * TurboPack ECMAScript runtimes.
 *
 * It will be prepended to the runtime code of each runtime.
 */ /* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-types.d.ts" />
const REEXPORTED_OBJECTS = new WeakMap();
/**
 * Constructs the `__turbopack_context__` object for a module.
 */ function Context(module, exports) {
    this.m = module;
    // We need to store this here instead of accessing it from the module object to:
    // 1. Make it available to factories directly, since we rewrite `this` to
    //    `__turbopack_context__.e` in CJS modules.
    // 2. Support async modules which rewrite `module.exports` to a promise, so we
    //    can still access the original exports object from functions like
    //    `esmExport`
    // Ideally we could find a new approach for async modules and drop this property altogether.
    this.e = exports;
}
const contextPrototype = Context.prototype;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag;
function defineProp(obj, name, options) {
    if (!hasOwnProperty.call(obj, name)) Object.defineProperty(obj, name, options);
}
function getOverwrittenModule(moduleCache, id) {
    let module = moduleCache[id];
    if (!module) {
        // This is invoked when a module is merged into another module, thus it wasn't invoked via
        // instantiateModule and the cache entry wasn't created yet.
        module = createModuleObject(id);
        moduleCache[id] = module;
    }
    return module;
}
/**
 * Creates the module object. Only done here to ensure all module objects have the same shape.
 */ function createModuleObject(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined
    };
}
const BindingTag_Value = 0;
/**
 * Adds the getters to the exports object.
 */ function esm(exports, bindings) {
    defineProp(exports, '__esModule', {
        value: true
    });
    if (toStringTag) defineProp(exports, toStringTag, {
        value: 'Module'
    });
    let i = 0;
    while(i < bindings.length){
        const propName = bindings[i++];
        const tagOrFunction = bindings[i++];
        if (typeof tagOrFunction === 'number') {
            if (tagOrFunction === BindingTag_Value) {
                defineProp(exports, propName, {
                    value: bindings[i++],
                    enumerable: true,
                    writable: false
                });
            } else {
                throw new Error(`unexpected tag: ${tagOrFunction}`);
            }
        } else {
            const getterFn = tagOrFunction;
            if (typeof bindings[i] === 'function') {
                const setterFn = bindings[i++];
                defineProp(exports, propName, {
                    get: getterFn,
                    set: setterFn,
                    enumerable: true
                });
            } else {
                defineProp(exports, propName, {
                    get: getterFn,
                    enumerable: true
                });
            }
        }
    }
    Object.seal(exports);
}
/**
 * Makes the module an ESM with exports
 */ function esmExport(bindings, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    module.namespaceObject = exports;
    esm(exports, bindings);
}
contextPrototype.s = esmExport;
function ensureDynamicExports(module, exports) {
    let reexportedObjects = REEXPORTED_OBJECTS.get(module);
    if (!reexportedObjects) {
        REEXPORTED_OBJECTS.set(module, reexportedObjects = []);
        module.exports = module.namespaceObject = new Proxy(exports, {
            get (target, prop) {
                if (hasOwnProperty.call(target, prop) || prop === 'default' || prop === '__esModule') {
                    return Reflect.get(target, prop);
                }
                for (const obj of reexportedObjects){
                    const value = Reflect.get(obj, prop);
                    if (value !== undefined) return value;
                }
                return undefined;
            },
            ownKeys (target) {
                const keys = Reflect.ownKeys(target);
                for (const obj of reexportedObjects){
                    for (const key of Reflect.ownKeys(obj)){
                        if (key !== 'default' && !keys.includes(key)) keys.push(key);
                    }
                }
                return keys;
            }
        });
    }
    return reexportedObjects;
}
/**
 * Dynamically exports properties from an object
 */ function dynamicExport(object, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    const reexportedObjects = ensureDynamicExports(module, exports);
    if (typeof object === 'object' && object !== null) {
        reexportedObjects.push(object);
    }
}
contextPrototype.j = dynamicExport;
function exportValue(value, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = value;
}
contextPrototype.v = exportValue;
function exportNamespace(namespace, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = module.namespaceObject = namespace;
}
contextPrototype.n = exportNamespace;
function createGetter(obj, key) {
    return ()=>obj[key];
}
/**
 * @returns prototype of the object
 */ const getProto = Object.getPrototypeOf ? (obj)=>Object.getPrototypeOf(obj) : (obj)=>obj.__proto__;
/** Prototypes that are not expanded for exports */ const LEAF_PROTOTYPES = [
    null,
    getProto({}),
    getProto([]),
    getProto(getProto)
];
/**
 * @param raw
 * @param ns
 * @param allowExportDefault
 *   * `false`: will have the raw module as default export
 *   * `true`: will have the default property as default export
 */ function interopEsm(raw, ns, allowExportDefault) {
    const bindings = [];
    let defaultLocation = -1;
    for(let current = raw; (typeof current === 'object' || typeof current === 'function') && !LEAF_PROTOTYPES.includes(current); current = getProto(current)){
        for (const key of Object.getOwnPropertyNames(current)){
            bindings.push(key, createGetter(raw, key));
            if (defaultLocation === -1 && key === 'default') {
                defaultLocation = bindings.length - 1;
            }
        }
    }
    // this is not really correct
    // we should set the `default` getter if the imported module is a `.cjs file`
    if (!(allowExportDefault && defaultLocation >= 0)) {
        // Replace the binding with one for the namespace itself in order to preserve iteration order.
        if (defaultLocation >= 0) {
            // Replace the getter with the value
            bindings.splice(defaultLocation, 1, BindingTag_Value, raw);
        } else {
            bindings.push('default', BindingTag_Value, raw);
        }
    }
    esm(ns, bindings);
    return ns;
}
function createNS(raw) {
    if (typeof raw === 'function') {
        return function(...args) {
            return raw.apply(this, args);
        };
    } else {
        return Object.create(null);
    }
}
function esmImport(id) {
    const module = getOrInstantiateModuleFromParent(id, this.m);
    // any ES module has to have `module.namespaceObject` defined.
    if (module.namespaceObject) return module.namespaceObject;
    // only ESM can be an async module, so we don't need to worry about exports being a promise here.
    const raw = module.exports;
    return module.namespaceObject = interopEsm(raw, createNS(raw), raw && raw.__esModule);
}
contextPrototype.i = esmImport;
function asyncLoader(moduleId) {
    const loader = this.r(moduleId);
    return loader(esmImport.bind(this));
}
contextPrototype.A = asyncLoader;
// Add a simple runtime require so that environments without one can still pass
// `typeof require` CommonJS checks so that exports are correctly registered.
const runtimeRequire = // @ts-ignore
typeof require === 'function' ? require : function require1() {
    throw new Error('Unexpected use of runtime require');
};
contextPrototype.t = runtimeRequire;
function commonJsRequire(id) {
    return getOrInstantiateModuleFromParent(id, this.m).exports;
}
contextPrototype.r = commonJsRequire;
/**
 * Remove fragments and query parameters since they are never part of the context map keys
 *
 * This matches how we parse patterns at resolving time.  Arguably we should only do this for
 * strings passed to `import` but the resolve does it for `import` and `require` and so we do
 * here as well.
 */ function parseRequest(request) {
    // Per the URI spec fragments can contain `?` characters, so we should trim it off first
    // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
    const hashIndex = request.indexOf('#');
    if (hashIndex !== -1) {
        request = request.substring(0, hashIndex);
    }
    const queryIndex = request.indexOf('?');
    if (queryIndex !== -1) {
        request = request.substring(0, queryIndex);
    }
    return request;
}
/**
 * `require.context` and require/import expression runtime.
 */ function moduleContext(map) {
    function moduleContext(id) {
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].module();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    }
    moduleContext.keys = ()=>{
        return Object.keys(map);
    };
    moduleContext.resolve = (id)=>{
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].id();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    };
    moduleContext.import = async (id)=>{
        return await moduleContext(id);
    };
    return moduleContext;
}
contextPrototype.f = moduleContext;
/**
 * Returns the path of a chunk defined by its data.
 */ function getChunkPath(chunkData) {
    return typeof chunkData === 'string' ? chunkData : chunkData.path;
}
function isPromise(maybePromise) {
    return maybePromise != null && typeof maybePromise === 'object' && 'then' in maybePromise && typeof maybePromise.then === 'function';
}
function isAsyncModuleExt(obj) {
    return turbopackQueues in obj;
}
function createPromise() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej)=>{
        reject = rej;
        resolve = res;
    });
    return {
        promise,
        resolve: resolve,
        reject: reject
    };
}
// Load the CompressedmoduleFactories of a chunk into the `moduleFactories` Map.
// The CompressedModuleFactories format is
// - 1 or more module ids
// - a module factory function
// So walking this is a little complex but the flat structure is also fast to
// traverse, we can use `typeof` operators to distinguish the two cases.
function installCompressedModuleFactories(chunkModules, offset, moduleFactories, newModuleId) {
    let i = offset;
    while(i < chunkModules.length){
        let moduleId = chunkModules[i];
        let end = i + 1;
        // Find our factory function
        while(end < chunkModules.length && typeof chunkModules[end] !== 'function'){
            end++;
        }
        if (end === chunkModules.length) {
            throw new Error('malformed chunk format, expected a factory function');
        }
        // Each chunk item has a 'primary id' and optional additional ids. If the primary id is already
        // present we know all the additional ids are also present, so we don't need to check.
        if (!moduleFactories.has(moduleId)) {
            const moduleFactoryFn = chunkModules[end];
            applyModuleFactoryName(moduleFactoryFn);
            newModuleId?.(moduleId);
            for(; i < end; i++){
                moduleId = chunkModules[i];
                moduleFactories.set(moduleId, moduleFactoryFn);
            }
        }
        i = end + 1; // end is pointing at the last factory advance to the next id or the end of the array.
    }
}
// everything below is adapted from webpack
// https://github.com/webpack/webpack/blob/6be4065ade1e252c1d8dcba4af0f43e32af1bdc1/lib/runtime/AsyncModuleRuntimeModule.js#L13
const turbopackQueues = Symbol('turbopack queues');
const turbopackExports = Symbol('turbopack exports');
const turbopackError = Symbol('turbopack error');
function resolveQueue(queue) {
    if (queue && queue.status !== 1) {
        queue.status = 1;
        queue.forEach((fn)=>fn.queueCount--);
        queue.forEach((fn)=>fn.queueCount-- ? fn.queueCount++ : fn());
    }
}
function wrapDeps(deps) {
    return deps.map((dep)=>{
        if (dep !== null && typeof dep === 'object') {
            if (isAsyncModuleExt(dep)) return dep;
            if (isPromise(dep)) {
                const queue = Object.assign([], {
                    status: 0
                });
                const obj = {
                    [turbopackExports]: {},
                    [turbopackQueues]: (fn)=>fn(queue)
                };
                dep.then((res)=>{
                    obj[turbopackExports] = res;
                    resolveQueue(queue);
                }, (err)=>{
                    obj[turbopackError] = err;
                    resolveQueue(queue);
                });
                return obj;
            }
        }
        return {
            [turbopackExports]: dep,
            [turbopackQueues]: ()=>{}
        };
    });
}
function asyncModule(body, hasAwait) {
    const module = this.m;
    const queue = hasAwait ? Object.assign([], {
        status: -1
    }) : undefined;
    const depQueues = new Set();
    const { resolve, reject, promise: rawPromise } = createPromise();
    const promise = Object.assign(rawPromise, {
        [turbopackExports]: module.exports,
        [turbopackQueues]: (fn)=>{
            queue && fn(queue);
            depQueues.forEach(fn);
            promise['catch'](()=>{});
        }
    });
    const attributes = {
        get () {
            return promise;
        },
        set (v) {
            // Calling `esmExport` leads to this.
            if (v !== promise) {
                promise[turbopackExports] = v;
            }
        }
    };
    Object.defineProperty(module, 'exports', attributes);
    Object.defineProperty(module, 'namespaceObject', attributes);
    function handleAsyncDependencies(deps) {
        const currentDeps = wrapDeps(deps);
        const getResult = ()=>currentDeps.map((d)=>{
                if (d[turbopackError]) throw d[turbopackError];
                return d[turbopackExports];
            });
        const { promise, resolve } = createPromise();
        const fn = Object.assign(()=>resolve(getResult), {
            queueCount: 0
        });
        function fnQueue(q) {
            if (q !== queue && !depQueues.has(q)) {
                depQueues.add(q);
                if (q && q.status === 0) {
                    fn.queueCount++;
                    q.push(fn);
                }
            }
        }
        currentDeps.map((dep)=>dep[turbopackQueues](fnQueue));
        return fn.queueCount ? promise : getResult();
    }
    function asyncResult(err) {
        if (err) {
            reject(promise[turbopackError] = err);
        } else {
            resolve(promise[turbopackExports]);
        }
        resolveQueue(queue);
    }
    body(handleAsyncDependencies, asyncResult);
    if (queue && queue.status === -1) {
        queue.status = 0;
    }
}
contextPrototype.a = asyncModule;
/**
 * A pseudo "fake" URL object to resolve to its relative path.
 *
 * When UrlRewriteBehavior is set to relative, calls to the `new URL()` will construct url without base using this
 * runtime function to generate context-agnostic urls between different rendering context, i.e ssr / client to avoid
 * hydration mismatch.
 *
 * This is based on webpack's existing implementation:
 * https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/runtime/RelativeUrlRuntimeModule.js
 */ const relativeURL = function relativeURL(inputUrl) {
    const realUrl = new URL(inputUrl, 'x:/');
    const values = {};
    for(const key in realUrl)values[key] = realUrl[key];
    values.href = inputUrl;
    values.pathname = inputUrl.replace(/[?#].*/, '');
    values.origin = values.protocol = '';
    values.toString = values.toJSON = (..._args)=>inputUrl;
    for(const key in values)Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        value: values[key]
    });
};
relativeURL.prototype = URL.prototype;
contextPrototype.U = relativeURL;
/**
 * Utility function to ensure all variants of an enum are handled.
 */ function invariant(never, computeMessage) {
    throw new Error(`Invariant: ${computeMessage(never)}`);
}
/**
 * A stub function to make `require` available but non-functional in ESM.
 */ function requireStub(_moduleId) {
    throw new Error('dynamic usage of require is not supported');
}
contextPrototype.z = requireStub;
// Make `globalThis` available to the module in a way that cannot be shadowed by a local variable.
contextPrototype.g = globalThis;
function applyModuleFactoryName(factory) {
    // Give the module factory a nice name to improve stack traces.
    Object.defineProperty(factory, 'name', {
        value: 'module evaluation'
    });
}
/// <reference path="../shared/runtime-utils.ts" />
/// A 'base' utilities to support runtime can have externals.
/// Currently this is for node.js / edge runtime both.
/// If a fn requires node.js specific behavior, it should be placed in `node-external-utils` instead.
async function externalImport(id) {
    let raw;
    try {
        switch (id) {
  case "next/dist/compiled/@vercel/og/index.node.js":
    raw = await import("next/dist/compiled/@vercel/og/index.edge.js");
    break;
  default:
    raw = await import(id);
};
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (raw && raw.__esModule && raw.default && 'default' in raw.default) {
        return interopEsm(raw.default, createNS(raw), true);
    }
    return raw;
}
contextPrototype.y = externalImport;
function externalRequire(id, thunk, esm = false) {
    let raw;
    try {
        raw = thunk();
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (!esm || raw.__esModule) {
        return raw;
    }
    return interopEsm(raw, createNS(raw), true);
}
externalRequire.resolve = (id, options)=>{
    return require.resolve(id, options);
};
contextPrototype.x = externalRequire;
/* eslint-disable @typescript-eslint/no-unused-vars */ const path = require('path');
const relativePathToRuntimeRoot = path.relative(RUNTIME_PUBLIC_PATH, '.');
// Compute the relative path to the `distDir`.
const relativePathToDistRoot = path.join(relativePathToRuntimeRoot, RELATIVE_ROOT_PATH);
const RUNTIME_ROOT = path.resolve(__filename, relativePathToRuntimeRoot);
// Compute the absolute path to the root, by stripping distDir from the absolute path to this file.
const ABSOLUTE_ROOT = path.resolve(__filename, relativePathToDistRoot);
/**
 * Returns an absolute path to the given module path.
 * Module path should be relative, either path to a file or a directory.
 *
 * This fn allows to calculate an absolute path for some global static values, such as
 * `__dirname` or `import.meta.url` that Turbopack will not embeds in compile time.
 * See ImportMetaBinding::code_generation for the usage.
 */ function resolveAbsolutePath(modulePath) {
    if (modulePath) {
        return path.join(ABSOLUTE_ROOT, modulePath);
    }
    return ABSOLUTE_ROOT;
}
Context.prototype.P = resolveAbsolutePath;
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../shared/runtime-utils.ts" />
function readWebAssemblyAsResponse(path) {
    const { createReadStream } = require('fs');
    const { Readable } = require('stream');
    const stream = createReadStream(path);
    // @ts-ignore unfortunately there's a slight type mismatch with the stream.
    return new Response(Readable.toWeb(stream), {
        headers: {
            'content-type': 'application/wasm'
        }
    });
}
async function compileWebAssemblyFromPath(path) {
    const response = readWebAssemblyAsResponse(path);
    return await WebAssembly.compileStreaming(response);
}
async function instantiateWebAssemblyFromPath(path, importsObj) {
    const response = readWebAssemblyAsResponse(path);
    const { instance } = await WebAssembly.instantiateStreaming(response, importsObj);
    return instance.exports;
}
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../shared/runtime-utils.ts" />
/// <reference path="../shared-node/base-externals-utils.ts" />
/// <reference path="../shared-node/node-externals-utils.ts" />
/// <reference path="../shared-node/node-wasm-utils.ts" />
var SourceType = /*#__PURE__*/ function(SourceType) {
    /**
   * The module was instantiated because it was included in an evaluated chunk's
   * runtime.
   * SourceData is a ChunkPath.
   */ SourceType[SourceType["Runtime"] = 0] = "Runtime";
    /**
   * The module was instantiated because a parent module imported it.
   * SourceData is a ModuleId.
   */ SourceType[SourceType["Parent"] = 1] = "Parent";
    return SourceType;
}(SourceType || {});
process.env.TURBOPACK = '1';
const nodeContextPrototype = Context.prototype;
const url = require('url');
const moduleFactories = new Map();
nodeContextPrototype.M = moduleFactories;
const moduleCache = Object.create(null);
nodeContextPrototype.c = moduleCache;
/**
 * Returns an absolute path to the given module's id.
 */ function resolvePathFromModule(moduleId) {
    const exported = this.r(moduleId);
    const exportedPath = exported?.default ?? exported;
    if (typeof exportedPath !== 'string') {
        return exported;
    }
    const strippedAssetPrefix = exportedPath.slice(ASSET_PREFIX.length);
    const resolved = path.resolve(RUNTIME_ROOT, strippedAssetPrefix);
    return url.pathToFileURL(resolved).href;
}
nodeContextPrototype.R = resolvePathFromModule;
function loadRuntimeChunk(sourcePath, chunkData) {
    if (typeof chunkData === 'string') {
        loadRuntimeChunkPath(sourcePath, chunkData);
    } else {
        loadRuntimeChunkPath(sourcePath, chunkData.path);
    }
}
const loadedChunks = new Set();
const unsupportedLoadChunk = Promise.resolve(undefined);
const loadedChunk = Promise.resolve(undefined);
const chunkCache = new Map();
function clearChunkCache() {
    chunkCache.clear();
}
function loadRuntimeChunkPath(sourcePath, chunkPath) {
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return;
    }
    if (loadedChunks.has(chunkPath)) {
        return;
    }
    try {
        const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
        const chunkModules = requireChunk(chunkPath);
        installCompressedModuleFactories(chunkModules, 0, moduleFactories);
        loadedChunks.add(chunkPath);
    } catch (cause) {
        let errorMessage = `Failed to load chunk ${chunkPath}`;
        if (sourcePath) {
            errorMessage += ` from runtime for chunk ${sourcePath}`;
        }
        const error = new Error(errorMessage, {
            cause
        });
        error.name = 'ChunkLoadError';
        throw error;
    }
}
function loadChunkAsync(chunkData) {
    const chunkPath = typeof chunkData === 'string' ? chunkData : chunkData.path;
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return unsupportedLoadChunk;
    }
    let entry = chunkCache.get(chunkPath);
    if (entry === undefined) {
        try {
            // resolve to an absolute path to simplify `require` handling
            const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
            // TODO: consider switching to `import()` to enable concurrent chunk loading and async file io
            // However this is incompatible with hot reloading (since `import` doesn't use the require cache)
            const chunkModules = requireChunk(chunkPath);
            installCompressedModuleFactories(chunkModules, 0, moduleFactories);
            entry = loadedChunk;
        } catch (cause) {
            const errorMessage = `Failed to load chunk ${chunkPath} from module ${this.m.id}`;
            const error = new Error(errorMessage, {
                cause
            });
            error.name = 'ChunkLoadError';
            // Cache the failure promise, future requests will also get this same rejection
            entry = Promise.reject(error);
        }
        chunkCache.set(chunkPath, entry);
    }
    // TODO: Return an instrumented Promise that React can use instead of relying on referential equality.
    return entry;
}
contextPrototype.l = loadChunkAsync;
function loadChunkAsyncByUrl(chunkUrl) {
    const path1 = url.fileURLToPath(new URL(chunkUrl, RUNTIME_ROOT));
    return loadChunkAsync.call(this, path1);
}
contextPrototype.L = loadChunkAsyncByUrl;
function loadWebAssembly(chunkPath, _edgeModule, imports) {
    const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
    return instantiateWebAssemblyFromPath(resolved, imports);
}
contextPrototype.w = loadWebAssembly;
function loadWebAssemblyModule(chunkPath, _edgeModule) {
    const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
    return compileWebAssemblyFromPath(resolved);
}
contextPrototype.u = loadWebAssemblyModule;
function getWorkerBlobURL(_chunks) {
    throw new Error('Worker blobs are not implemented yet for Node.js');
}
nodeContextPrototype.b = getWorkerBlobURL;
function instantiateModule(id, sourceType, sourceData) {
    const moduleFactory = moduleFactories.get(id);
    if (typeof moduleFactory !== 'function') {
        // This can happen if modules incorrectly handle HMR disposes/updates,
        // e.g. when they keep a `setTimeout` around which still executes old code
        // and contains e.g. a `require("something")` call.
        let instantiationReason;
        switch(sourceType){
            case 0:
                instantiationReason = `as a runtime entry of chunk ${sourceData}`;
                break;
            case 1:
                instantiationReason = `because it was required from module ${sourceData}`;
                break;
            default:
                invariant(sourceType, (sourceType)=>`Unknown source type: ${sourceType}`);
        }
        throw new Error(`Module ${id} was instantiated ${instantiationReason}, but the module factory is not available.`);
    }
    const module1 = createModuleObject(id);
    const exports = module1.exports;
    moduleCache[id] = module1;
    const context = new Context(module1, exports);
    // NOTE(alexkirsz) This can fail when the module encounters a runtime error.
    try {
        moduleFactory(context, module1, exports);
    } catch (error) {
        module1.error = error;
        throw error;
    }
    module1.loaded = true;
    if (module1.namespaceObject && module1.exports !== module1.namespaceObject) {
        // in case of a circular dependency: cjs1 -> esm2 -> cjs1
        interopEsm(module1.exports, module1.namespaceObject);
    }
    return module1;
}
/**
 * Retrieves a module from the cache, or instantiate it if it is not cached.
 */ // @ts-ignore
function getOrInstantiateModuleFromParent(id, sourceModule) {
    const module1 = moduleCache[id];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateModule(id, 1, sourceModule.id);
}
/**
 * Instantiates a runtime module.
 */ function instantiateRuntimeModule(chunkPath, moduleId) {
    return instantiateModule(moduleId, 0, chunkPath);
}
/**
 * Retrieves a module from the cache, or instantiate it as a runtime module if it is not cached.
 */ // @ts-ignore TypeScript doesn't separate this module space from the browser runtime
function getOrInstantiateRuntimeModule(chunkPath, moduleId) {
    const module1 = moduleCache[moduleId];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateRuntimeModule(chunkPath, moduleId);
}
const regexJsUrl = /\.js(?:\?[^#]*)?(?:#.*)?$/;
/**
 * Checks if a given path/URL ends with .js, optionally followed by ?query or #fragment.
 */ function isJs(chunkUrlOrPath) {
    return regexJsUrl.test(chunkUrlOrPath);
}
module.exports = (sourcePath)=>({
        m: (id)=>getOrInstantiateRuntimeModule(sourcePath, id),
        c: (chunkData)=>loadRuntimeChunk(sourcePath, chunkData)
    });


//# sourceMappingURL=%5Bturbopack%5D_runtime.js.map

  function requireChunk(chunkPath) {
    switch(chunkPath) {
      case "server/chunks/[externals]_node:inspector_7a4283c6._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[externals]_node:inspector_7a4283c6._.js");
      case "server/chunks/[root-of-the-server]__07013415._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[root-of-the-server]__07013415._.js");
      case "server/chunks/[root-of-the-server]__72f31da3._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[root-of-the-server]__72f31da3._.js");
      case "server/chunks/[root-of-the-server]__892d8251._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[root-of-the-server]__892d8251._.js");
      case "server/chunks/[root-of-the-server]__b98579e1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[root-of-the-server]__b98579e1._.js");
      case "server/chunks/[root-of-the-server]__e2344485._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[root-of-the-server]__e2344485._.js");
      case "server/chunks/[turbopack]_runtime.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[turbopack]_runtime.js");
      case "server/chunks/_25ecb7f0._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/_25ecb7f0._.js");
      case "server/chunks/apps_app_4666531c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/apps_app_4666531c._.js");
      case "server/chunks/node_modules__pnpm_5b41a877._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/node_modules__pnpm_5b41a877._.js");
      case "server/chunks/ssr/0d99c_@opentelemetry_resources_build_esm_detectors_platform_node_machine-id_3e23029a._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0d99c_@opentelemetry_resources_build_esm_detectors_platform_node_machine-id_3e23029a._.js");
      case "server/chunks/ssr/0d99c_@opentelemetry_resources_build_esm_detectors_platform_node_machine-id_70f1a112._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0d99c_@opentelemetry_resources_build_esm_detectors_platform_node_machine-id_70f1a112._.js");
      case "server/chunks/ssr/0d99c_@opentelemetry_resources_build_esm_detectors_platform_node_machine-id_8530c1e7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0d99c_@opentelemetry_resources_build_esm_detectors_platform_node_machine-id_8530c1e7._.js");
      case "server/chunks/ssr/50d1e_date-fns_461820bf._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/50d1e_date-fns_461820bf._.js");
      case "server/chunks/ssr/90400_next_a31d2d99._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_a31d2d99._.js");
      case "server/chunks/ssr/90400_next_dist_4a24c8ba._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_dist_4a24c8ba._.js");
      case "server/chunks/ssr/90400_next_dist_624dde9d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_dist_624dde9d._.js");
      case "server/chunks/ssr/90400_next_dist_c8918525._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_dist_c8918525._.js");
      case "server/chunks/ssr/90400_next_dist_client_components_3489cd9a._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_dist_client_components_3489cd9a._.js");
      case "server/chunks/ssr/90400_next_dist_esm_build_templates_app-page_61a0b83f.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_dist_esm_build_templates_app-page_61a0b83f.js");
      case "server/chunks/ssr/90400_next_dist_esm_c92a1cac._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_dist_esm_c92a1cac._.js");
      case "server/chunks/ssr/90400_next_f807004a._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_f807004a._.js");
      case "server/chunks/ssr/96dea_@radix-ui_react-popper_dist_index_mjs_a7409b6c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/96dea_@radix-ui_react-popper_dist_index_mjs_a7409b6c._.js");
      case "server/chunks/ssr/[externals]_next_dist_compiled_@vercel_og_index_node_055f47ab.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[externals]_next_dist_compiled_@vercel_og_index_node_055f47ab.js");
      case "server/chunks/ssr/[externals]_node:inspector_7a4283c6._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[externals]_node:inspector_7a4283c6._.js");
      case "server/chunks/ssr/[root-of-the-server]__15c03af0._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__15c03af0._.js");
      case "server/chunks/ssr/[root-of-the-server]__1d9cc657._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__1d9cc657._.js");
      case "server/chunks/ssr/[root-of-the-server]__4e44ce65._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__4e44ce65._.js");
      case "server/chunks/ssr/[root-of-the-server]__53a29f60._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__53a29f60._.js");
      case "server/chunks/ssr/[root-of-the-server]__85947275._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__85947275._.js");
      case "server/chunks/ssr/[root-of-the-server]__88664157._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__88664157._.js");
      case "server/chunks/ssr/[root-of-the-server]__8a022b63._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__8a022b63._.js");
      case "server/chunks/ssr/[root-of-the-server]__e74e1f44._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__e74e1f44._.js");
      case "server/chunks/ssr/[turbopack]_runtime.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[turbopack]_runtime.js");
      case "server/chunks/ssr/_029556ca._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_029556ca._.js");
      case "server/chunks/ssr/_0d63eb88._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_0d63eb88._.js");
      case "server/chunks/ssr/_4ba66a4e._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_4ba66a4e._.js");
      case "server/chunks/ssr/_4e0ea16a._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_4e0ea16a._.js");
      case "server/chunks/ssr/_87f01b9e._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_87f01b9e._.js");
      case "server/chunks/ssr/_b6a7e937._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_b6a7e937._.js");
      case "server/chunks/ssr/_ba6db834._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_ba6db834._.js");
      case "server/chunks/ssr/_c4779c1d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_c4779c1d._.js");
      case "server/chunks/ssr/_cd9d5c83._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_cd9d5c83._.js");
      case "server/chunks/ssr/_daf0b0a5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_daf0b0a5._.js");
      case "server/chunks/ssr/abfd6_build_esm_detectors_platform_node_machine-id_getMachineId-linux_270009eb.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/abfd6_build_esm_detectors_platform_node_machine-id_getMachineId-linux_270009eb.js");
      case "server/chunks/ssr/abfd6_build_esm_detectors_platform_node_machine-id_getMachineId-unsupported_a03752f9.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/abfd6_build_esm_detectors_platform_node_machine-id_getMachineId-unsupported_a03752f9.js");
      case "server/chunks/ssr/apps_app_3a38bcec._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_3a38bcec._.js");
      case "server/chunks/ssr/apps_app_617f8d72._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_617f8d72._.js");
      case "server/chunks/ssr/apps_app_7cbb1373._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_7cbb1373._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app__not-found_page_actions_e4bd8ec2.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app__not-found_page_actions_e4bd8ec2.js");
      case "server/chunks/ssr/apps_app_app_apple-icon--metadata_5c4787a7.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_apple-icon--metadata_5c4787a7.js");
      case "server/chunks/ssr/apps_app_app_global-error_tsx_1ba05d61._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_global-error_tsx_1ba05d61._.js");
      case "server/chunks/ssr/b0b0f_sonner_dist_index_mjs_bf87a059._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/b0b0f_sonner_dist_index_mjs_bf87a059._.js");
      case "server/chunks/ssr/d8f01_web-vitals_dist_web-vitals_79025709.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/d8f01_web-vitals_dist_web-vitals_79025709.js");
      case "server/chunks/ssr/node_modules__pnpm_113b86b5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/node_modules__pnpm_113b86b5._.js");
      case "server/chunks/ssr/node_modules__pnpm_95111226._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/node_modules__pnpm_95111226._.js");
      case "server/chunks/ssr/node_modules__pnpm_df9ac8a1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/node_modules__pnpm_df9ac8a1._.js");
      case "server/chunks/ssr/node_modules__pnpm_eb330dcb._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/node_modules__pnpm_eb330dcb._.js");
      case "server/chunks/ssr/node_modules__pnpm_eb821892._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/node_modules__pnpm_eb821892._.js");
      case "server/chunks/ssr/node_modules__pnpm_fe552f33._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/node_modules__pnpm_fe552f33._.js");
      case "server/chunks/ssr/packages_ui_src_components_scroll-area_tsx_2ff3720e._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/packages_ui_src_components_scroll-area_tsx_2ff3720e._.js");
      case "server/chunks/ssr/packages_ui_src_lib_utils_ts_259f88e4._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/packages_ui_src_lib_utils_ts_259f88e4._.js");
      case "server/chunks/ssr/packages_ui_src_lib_utils_ts_c47f8e19._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/packages_ui_src_lib_utils_ts_c47f8e19._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_ai-assistant_page_actions_d47fe84e.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_ai-assistant_page_actions_d47fe84e.js");
      case "server/chunks/ssr/90400_next_dist_client_components_builtin_unauthorized_7ed0bdf7.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_dist_client_components_builtin_unauthorized_7ed0bdf7.js");
      case "server/chunks/ssr/[root-of-the-server]__58a46303._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__58a46303._.js");
      case "server/chunks/ssr/_0c7c83f9._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_0c7c83f9._.js");
      case "server/chunks/ssr/_44babf2e._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_44babf2e._.js");
      case "server/chunks/ssr/_4843cf5d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_4843cf5d._.js");
      case "server/chunks/ssr/_6b017822._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_6b017822._.js");
      case "server/chunks/ssr/_879ea7db._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_879ea7db._.js");
      case "server/chunks/ssr/_e218589c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_e218589c._.js");
      case "server/chunks/ssr/_eb84770f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_eb84770f._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_ai-assistant_error_tsx_dee1724d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_ai-assistant_error_tsx_dee1724d._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_ai-assistant_loading_tsx_1b2c94ce._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_ai-assistant_loading_tsx_1b2c94ce._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_ai-assistant_page_tsx_1f1f6554._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_ai-assistant_page_tsx_1f1f6554._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_error_tsx_ae17a504._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_error_tsx_ae17a504._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_layout_tsx_5b6b287f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_layout_tsx_5b6b287f._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_layout_tsx_b9dc73a1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_layout_tsx_b9dc73a1._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_not-found_tsx_dd5a5b13._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_not-found_tsx_dd5a5b13._.js");
      case "server/chunks/ssr/[root-of-the-server]__2fded6bb._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__2fded6bb._.js");
      case "server/chunks/ssr/_5615d21b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_5615d21b._.js");
      case "server/chunks/ssr/_8b379666._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_8b379666._.js");
      case "server/chunks/ssr/_c38dcb0d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_c38dcb0d._.js");
      case "server/chunks/ssr/_e2c4a610._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_e2c4a610._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_analytics_page_actions_72cddff9.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_analytics_page_actions_72cddff9.js");
      case "server/chunks/ssr/apps_app_app_(protected)_analytics_error_tsx_f6a87987._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_analytics_error_tsx_f6a87987._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_analytics_loading_tsx_5e71caec._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_analytics_loading_tsx_5e71caec._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_appointments_page_actions_50327652.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_appointments_page_actions_50327652.js");
      case "server/chunks/ssr/[root-of-the-server]__3e834595._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__3e834595._.js");
      case "server/chunks/ssr/_48ecd877._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_48ecd877._.js");
      case "server/chunks/ssr/_5eab9f40._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_5eab9f40._.js");
      case "server/chunks/ssr/_93b147ca._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_93b147ca._.js");
      case "server/chunks/ssr/_b36d13ac._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_b36d13ac._.js");
      case "server/chunks/ssr/_e9da89b7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_e9da89b7._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_appointments_error_tsx_272e14ef._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_appointments_error_tsx_272e14ef._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_appointments_layout_tsx_8be5fb3a._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_appointments_layout_tsx_8be5fb3a._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_appointments_loading_tsx_4e3515cd._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_appointments_loading_tsx_4e3515cd._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_appointments_page_tsx_f9204f8d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_appointments_page_tsx_f9204f8d._.js");
      case "server/chunks/ssr/node_modules__pnpm_51687bd7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/node_modules__pnpm_51687bd7._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_coding-queue_page_actions_5a14d055.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_coding-queue_page_actions_5a14d055.js");
      case "server/chunks/ssr/[root-of-the-server]__96461213._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__96461213._.js");
      case "server/chunks/ssr/_4f9821f7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_4f9821f7._.js");
      case "server/chunks/ssr/_8a44d0d3._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_8a44d0d3._.js");
      case "server/chunks/ssr/_ac86423b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_ac86423b._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_coding-queue_error_tsx_afcf9168._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_coding-queue_error_tsx_afcf9168._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_coding-queue_loading_tsx_6b6fe918._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_coding-queue_loading_tsx_6b6fe918._.js");
      case "server/chunks/ssr/[root-of-the-server]__8cf9f453._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__8cf9f453._.js");
      case "server/chunks/ssr/_05a0967b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_05a0967b._.js");
      case "server/chunks/ssr/_191a6309._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_191a6309._.js");
      case "server/chunks/ssr/_46ad2cab._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_46ad2cab._.js");
      case "server/chunks/ssr/_6f307d8e._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_6f307d8e._.js");
      case "server/chunks/ssr/_a1047c69._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_a1047c69._.js");
      case "server/chunks/ssr/_bd12fcbb._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_bd12fcbb._.js");
      case "server/chunks/ssr/a6004__next-internal_server_app_(protected)_consultation_[id]_page_actions_49006f24.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/a6004__next-internal_server_app_(protected)_consultation_[id]_page_actions_49006f24.js");
      case "server/chunks/ssr/apps_app_app_(protected)_consultation_[id]_page_tsx_015a59ba._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_consultation_[id]_page_tsx_015a59ba._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_consultation_error_tsx_5c1eafab._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_consultation_error_tsx_5c1eafab._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_consultation_layout_tsx_c2b2d3f5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_consultation_layout_tsx_c2b2d3f5._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_consultation_layout_tsx_f57f67b3._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_consultation_layout_tsx_f57f67b3._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_consultation_loading_tsx_16b632ad._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_consultation_loading_tsx_16b632ad._.js");
      case "server/chunks/ssr/apps_app_features_36290fb1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_features_36290fb1._.js");
      case "server/chunks/ssr/apps_app_features__shared_components_patient-history_1adedea4._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_features__shared_components_patient-history_1adedea4._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_consultation_page_actions_a27ac921.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_consultation_page_actions_a27ac921.js");
      case "server/chunks/ssr/[root-of-the-server]__8c75382d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__8c75382d._.js");
      case "server/chunks/ssr/_715d5524._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_715d5524._.js");
      case "server/chunks/ssr/_aa205977._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_aa205977._.js");
      case "server/chunks/ssr/[root-of-the-server]__51115760._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__51115760._.js");
      case "server/chunks/ssr/_163e2ec1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_163e2ec1._.js");
      case "server/chunks/ssr/_e6bb6704._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_e6bb6704._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_dashboard_page_actions_08c2b067.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_dashboard_page_actions_08c2b067.js");
      case "server/chunks/ssr/apps_app_app_(protected)_dashboard_layout_tsx_97231e72._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_dashboard_layout_tsx_97231e72._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_dashboard_page_tsx_40049352._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_dashboard_page_tsx_40049352._.js");
      case "server/chunks/ssr/[root-of-the-server]__e911534a._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__e911534a._.js");
      case "server/chunks/ssr/_84ab2c5f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_84ab2c5f._.js");
      case "server/chunks/ssr/_b05d6b5f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_b05d6b5f._.js");
      case "server/chunks/ssr/_fe571e8b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_fe571e8b._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_documents_page_actions_70ca9095.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_documents_page_actions_70ca9095.js");
      case "server/chunks/ssr/apps_app_app_(protected)_documents_error_tsx_b6399ce1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_documents_error_tsx_b6399ce1._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_documents_loading_tsx_c9fdfa22._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_documents_loading_tsx_c9fdfa22._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_hospital_beds_page_actions_bf6aa48f.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_hospital_beds_page_actions_bf6aa48f.js");
      case "server/chunks/ssr/[root-of-the-server]__506169e8._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__506169e8._.js");
      case "server/chunks/ssr/_96cf6f3c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_96cf6f3c._.js");
      case "server/chunks/ssr/_b622d108._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_b622d108._.js");
      case "server/chunks/ssr/_f8b691c5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_f8b691c5._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_hospital_beds_error_tsx_05d4358d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_hospital_beds_error_tsx_05d4358d._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_hospital_beds_loading_tsx_a86ab749._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_hospital_beds_loading_tsx_a86ab749._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_hospital_beds_page_tsx_b4efe5ef._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_hospital_beds_page_tsx_b4efe5ef._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_import_excel_page_actions_362158ff.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_import_excel_page_actions_362158ff.js");
      case "server/chunks/ssr/[root-of-the-server]__7af1a21e._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__7af1a21e._.js");
      case "server/chunks/ssr/_32066220._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_32066220._.js");
      case "server/chunks/ssr/_56cb5c88._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_56cb5c88._.js");
      case "server/chunks/ssr/_eb770288._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_eb770288._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_import_error_tsx_742f0346._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_import_error_tsx_742f0346._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_import_excel_page_tsx_07ce6185._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_import_excel_page_tsx_07ce6185._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_import_loading_tsx_9b505665._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_import_loading_tsx_9b505665._.js");
      case "server/chunks/ssr/7226d_qrcode_react_lib_esm_index_0e7af68e.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/7226d_qrcode_react_lib_esm_index_0e7af68e.js");
      case "server/chunks/ssr/90400_next_5876a8e3._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_5876a8e3._.js");
      case "server/chunks/ssr/[root-of-the-server]__f5c1422b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__f5c1422b._.js");
      case "server/chunks/ssr/_1f572122._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_1f572122._.js");
      case "server/chunks/ssr/_5af407a7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_5af407a7._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_import_ocr_page_actions_1956b8b4.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_import_ocr_page_actions_1956b8b4.js");
      case "server/chunks/ssr/apps_app_app_(protected)_import_ocr_page_tsx_c6435115._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_import_ocr_page_tsx_c6435115._.js");
      case "server/chunks/ssr/[root-of-the-server]__067280e5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__067280e5._.js");
      case "server/chunks/ssr/_65b07835._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_65b07835._.js");
      case "server/chunks/ssr/_e0ed26e8._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_e0ed26e8._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_import_page_actions_97a78d86.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_import_page_actions_97a78d86.js");
      case "server/chunks/ssr/apps_app_app_(protected)_import_page_tsx_57bc7f0a._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_import_page_tsx_57bc7f0a._.js");
      case "server/chunks/ssr/[root-of-the-server]__b8c40ffc._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__b8c40ffc._.js");
      case "server/chunks/ssr/_1f1dbc42._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_1f1dbc42._.js");
      case "server/chunks/ssr/_23812a6e._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_23812a6e._.js");
      case "server/chunks/ssr/_9b8e1142._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_9b8e1142._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_inventory_page_actions_75548fca.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_inventory_page_actions_75548fca.js");
      case "server/chunks/ssr/apps_app_app_(protected)_inventory_error_tsx_e9e018d6._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_inventory_error_tsx_e9e018d6._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_inventory_loading_tsx_a135fc44._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_inventory_loading_tsx_a135fc44._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_inventory_page_tsx_d1d30c87._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_inventory_page_tsx_d1d30c87._.js");
      case "server/chunks/ssr/[root-of-the-server]__53de0553._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__53de0553._.js");
      case "server/chunks/ssr/_17666e80._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_17666e80._.js");
      case "server/chunks/ssr/_5795bdd6._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_5795bdd6._.js");
      case "server/chunks/ssr/_7f637c1b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_7f637c1b._.js");
      case "server/chunks/ssr/_8b7dbec1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_8b7dbec1._.js");
      case "server/chunks/ssr/_9ebfa819._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_9ebfa819._.js");
      case "server/chunks/ssr/a6004__next-internal_server_app_(protected)_invoices_[id]_edit_page_actions_7ebb3691.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/a6004__next-internal_server_app_(protected)_invoices_[id]_edit_page_actions_7ebb3691.js");
      case "server/chunks/ssr/apps_app_app_(protected)_invoices_error_tsx_ae88f41c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_invoices_error_tsx_ae88f41c._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_invoices_loading_tsx_85b3b9a7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_invoices_loading_tsx_85b3b9a7._.js");
      case "server/chunks/ssr/apps_app_features_invoices_fe88b553._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_features_invoices_fe88b553._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_invoices_[id]_page_actions_ac29a7e7.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_invoices_[id]_page_actions_ac29a7e7.js");
      case "server/chunks/ssr/[root-of-the-server]__322434a1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__322434a1._.js");
      case "server/chunks/ssr/_d043e16c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_d043e16c._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_invoices_new_page_actions_e03b6842.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_invoices_new_page_actions_e03b6842.js");
      case "server/chunks/ssr/[root-of-the-server]__631b2b4c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__631b2b4c._.js");
      case "server/chunks/ssr/_7253253b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_7253253b._.js");
      case "server/chunks/ssr/[root-of-the-server]__7b9bc43f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__7b9bc43f._.js");
      case "server/chunks/ssr/_2e4b36da._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_2e4b36da._.js");
      case "server/chunks/ssr/_949dd451._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_949dd451._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_invoices_page_actions_c8669f85.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_invoices_page_actions_c8669f85.js");
      case "server/chunks/ssr/[root-of-the-server]__0fe227a5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__0fe227a5._.js");
      case "server/chunks/ssr/_45d7deb4._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_45d7deb4._.js");
      case "server/chunks/ssr/_69628f48._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_69628f48._.js");
      case "server/chunks/ssr/_a0b6efad._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_a0b6efad._.js");
      case "server/chunks/ssr/_ba29dae7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_ba29dae7._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_lab-tests_page_actions_c962d86a.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_lab-tests_page_actions_c962d86a.js");
      case "server/chunks/ssr/apps_app_app_(protected)_lab-tests_error_tsx_6b5978d4._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_lab-tests_error_tsx_6b5978d4._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_lab-tests_loading_tsx_68de4092._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_lab-tests_loading_tsx_68de4092._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_lab-tests_page_tsx_bbd0ac54._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_lab-tests_page_tsx_bbd0ac54._.js");
      case "server/chunks/ssr/9f6ff_server_app_(protected)_patients_[id]_history_page_actions_00c15fd6.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/9f6ff_server_app_(protected)_patients_[id]_history_page_actions_00c15fd6.js");
      case "server/chunks/ssr/[root-of-the-server]__4f8b8061._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__4f8b8061._.js");
      case "server/chunks/ssr/_79b17bf8._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_79b17bf8._.js");
      case "server/chunks/ssr/_85ab0cd7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_85ab0cd7._.js");
      case "server/chunks/ssr/_dc1b62f3._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_dc1b62f3._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_patients_error_tsx_ddba1124._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_patients_error_tsx_ddba1124._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_patients_layout_tsx_e5bf4132._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_patients_layout_tsx_e5bf4132._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_patients_loading_tsx_1938cf92._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_patients_loading_tsx_1938cf92._.js");
      case "server/chunks/ssr/apps_app_features__shared_components_patient-history_c3bbacb1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_features__shared_components_patient-history_c3bbacb1._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_patients_[id]_page_actions_3ebe907c.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_patients_[id]_page_actions_3ebe907c.js");
      case "server/chunks/ssr/[root-of-the-server]__296425d5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__296425d5._.js");
      case "server/chunks/ssr/_5bf70ebf._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_5bf70ebf._.js");
      case "server/chunks/ssr/_8bb9f194._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_8bb9f194._.js");
      case "server/chunks/ssr/_d25031cd._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_d25031cd._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_patients_[id]_page_tsx_f3208013._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_patients_[id]_page_tsx_f3208013._.js");
      case "server/chunks/ssr/apps_app_features_b35265f8._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_features_b35265f8._.js");
      case "server/chunks/ssr/[root-of-the-server]__bf290e17._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__bf290e17._.js");
      case "server/chunks/ssr/_3e1d5fee._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_3e1d5fee._.js");
      case "server/chunks/ssr/_b5b61162._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_b5b61162._.js");
      case "server/chunks/ssr/_ea73ac60._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_ea73ac60._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_patients_page_actions_e54b43e7.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_patients_page_actions_e54b43e7.js");
      case "server/chunks/ssr/[root-of-the-server]__bd0701b9._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__bd0701b9._.js");
      case "server/chunks/ssr/_16a725fd._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_16a725fd._.js");
      case "server/chunks/ssr/_ad7f5675._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_ad7f5675._.js");
      case "server/chunks/ssr/_c1f64958._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_c1f64958._.js");
      case "server/chunks/ssr/a6004__next-internal_server_app_(protected)_prescriptions_[id]_page_actions_e300e3c6.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/a6004__next-internal_server_app_(protected)_prescriptions_[id]_page_actions_e300e3c6.js");
      case "server/chunks/ssr/apps_app_app_(protected)_prescriptions_[id]_page_tsx_9edec87b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_prescriptions_[id]_page_tsx_9edec87b._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_prescriptions_error_tsx_939104a1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_prescriptions_error_tsx_939104a1._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_prescriptions_loading_tsx_2e63a3db._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_prescriptions_loading_tsx_2e63a3db._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_prescriptions_page_actions_0612824d.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_(protected)_prescriptions_page_actions_0612824d.js");
      case "server/chunks/ssr/[root-of-the-server]__6a21696b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__6a21696b._.js");
      case "server/chunks/ssr/_4b9d97de._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_4b9d97de._.js");
      case "server/chunks/ssr/_c75d714c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_c75d714c._.js");
      case "server/chunks/ssr/[root-of-the-server]__6956aec9._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__6956aec9._.js");
      case "server/chunks/ssr/_5d3f3c0f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_5d3f3c0f._.js");
      case "server/chunks/ssr/_848c26d5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_848c26d5._.js");
      case "server/chunks/ssr/_d708f1ac._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_d708f1ac._.js");
      case "server/chunks/ssr/_e4cac8ad._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_e4cac8ad._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_profile_page_actions_1945f455.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_profile_page_actions_1945f455.js");
      case "server/chunks/ssr/apps_app_app_(protected)_profile_error_tsx_568a61d6._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_profile_error_tsx_568a61d6._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_profile_loading_tsx_150a4a08._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_profile_loading_tsx_150a4a08._.js");
      case "server/chunks/ssr/apps_app_c730c5c6._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_c730c5c6._.js");
      case "server/chunks/ssr/apps_app_features_settings_components_index_ts_731b150d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_features_settings_components_index_ts_731b150d._.js");
      case "server/chunks/ssr/[root-of-the-server]__9b2679b3._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__9b2679b3._.js");
      case "server/chunks/ssr/_2de97193._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_2de97193._.js");
      case "server/chunks/ssr/_355594aa._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_355594aa._.js");
      case "server/chunks/ssr/_84aa5013._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_84aa5013._.js");
      case "server/chunks/ssr/a6004__next-internal_server_app_(protected)_settings_compliance_page_actions_9a4c3075.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/a6004__next-internal_server_app_(protected)_settings_compliance_page_actions_9a4c3075.js");
      case "server/chunks/ssr/apps_app_app_(protected)_settings_error_tsx_03de11ea._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_settings_error_tsx_03de11ea._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_settings_loading_tsx_8916c2f0._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_settings_loading_tsx_8916c2f0._.js");
      case "server/chunks/ssr/[root-of-the-server]__4d3edff8._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__4d3edff8._.js");
      case "server/chunks/ssr/_af9ea178._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_af9ea178._.js");
      case "server/chunks/ssr/_d4a724c9._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_d4a724c9._.js");
      case "server/chunks/ssr/_da84adb7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_da84adb7._.js");
      case "server/chunks/ssr/apps_app_7e7b0edc._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_7e7b0edc._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_settings_page_actions_7f7ca0e1.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_settings_page_actions_7f7ca0e1.js");
      case "server/chunks/ssr/9f6ff_server_app_(protected)_specialty_dental-charts_page_actions_33a111d4.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/9f6ff_server_app_(protected)_specialty_dental-charts_page_actions_33a111d4.js");
      case "server/chunks/ssr/[root-of-the-server]__28fc33d6._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__28fc33d6._.js");
      case "server/chunks/ssr/_19e80273._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_19e80273._.js");
      case "server/chunks/ssr/_8960f867._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_8960f867._.js");
      case "server/chunks/ssr/_e9742dcf._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_e9742dcf._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_dental-charts_error_tsx_d3faa0ec._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_dental-charts_error_tsx_d3faa0ec._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_dental-charts_loading_tsx_ef26a362._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_dental-charts_loading_tsx_ef26a362._.js");
      case "server/chunks/ssr/9f6ff_server_app_(protected)_specialty_ecg-monitoring_page_actions_9cd18be2.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/9f6ff_server_app_(protected)_specialty_ecg-monitoring_page_actions_9cd18be2.js");
      case "server/chunks/ssr/[root-of-the-server]__e7ccedbf._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__e7ccedbf._.js");
      case "server/chunks/ssr/_0f60c34d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_0f60c34d._.js");
      case "server/chunks/ssr/_4d179855._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_4d179855._.js");
      case "server/chunks/ssr/_82ca5f3b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_82ca5f3b._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_ecg-monitoring_error_tsx_68f9d3fb._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_ecg-monitoring_error_tsx_68f9d3fb._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_ecg-monitoring_loading_tsx_83b2e1a0._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_ecg-monitoring_loading_tsx_83b2e1a0._.js");
      case "server/chunks/ssr/9f6ff_server_app_(protected)_specialty_growth-charts_page_actions_217b21eb.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/9f6ff_server_app_(protected)_specialty_growth-charts_page_actions_217b21eb.js");
      case "server/chunks/ssr/[root-of-the-server]__b8375a7b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__b8375a7b._.js");
      case "server/chunks/ssr/_0b859815._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_0b859815._.js");
      case "server/chunks/ssr/_3279f871._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_3279f871._.js");
      case "server/chunks/ssr/_bc1b1abf._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_bc1b1abf._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_growth-charts_error_tsx_fb793de0._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_growth-charts_error_tsx_fb793de0._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_growth-charts_loading_tsx_73b8fd78._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_growth-charts_loading_tsx_73b8fd78._.js");
      case "server/chunks/ssr/9f6ff_server_app_(protected)_specialty_mental-health_page_actions_00c92655.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/9f6ff_server_app_(protected)_specialty_mental-health_page_actions_00c92655.js");
      case "server/chunks/ssr/[root-of-the-server]__7022d8dd._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__7022d8dd._.js");
      case "server/chunks/ssr/_0982c00b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_0982c00b._.js");
      case "server/chunks/ssr/_c4c8e7b9._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_c4c8e7b9._.js");
      case "server/chunks/ssr/_ec1d35e7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_ec1d35e7._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_mental-health_error_tsx_234c82ba._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_mental-health_error_tsx_234c82ba._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_mental-health_loading_tsx_e08e906d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_mental-health_loading_tsx_e08e906d._.js");
      case "server/chunks/ssr/9f6ff_server_app_(protected)_specialty_prenatal-care_page_actions_22e6a631.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/9f6ff_server_app_(protected)_specialty_prenatal-care_page_actions_22e6a631.js");
      case "server/chunks/ssr/[root-of-the-server]__65558c84._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__65558c84._.js");
      case "server/chunks/ssr/_845c1d86._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_845c1d86._.js");
      case "server/chunks/ssr/_8b6f028d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_8b6f028d._.js");
      case "server/chunks/ssr/_deb9f428._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_deb9f428._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_prenatal-care_error_tsx_d5d85ff5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_prenatal-care_error_tsx_d5d85ff5._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_prenatal-care_loading_tsx_c6926052._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_prenatal-care_loading_tsx_c6926052._.js");
      case "server/chunks/ssr/9f6ff_server_app_(protected)_specialty_vision-tests_page_actions_2ee6fc27.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/9f6ff_server_app_(protected)_specialty_vision-tests_page_actions_2ee6fc27.js");
      case "server/chunks/ssr/[root-of-the-server]__ddaaba57._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__ddaaba57._.js");
      case "server/chunks/ssr/_1f9063ea._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_1f9063ea._.js");
      case "server/chunks/ssr/_4ce2b0e8._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_4ce2b0e8._.js");
      case "server/chunks/ssr/_b3ab5c25._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_b3ab5c25._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_vision-tests_error_tsx_f78386e2._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_vision-tests_error_tsx_f78386e2._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_specialty_vision-tests_loading_tsx_4efe18b3._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_specialty_vision-tests_loading_tsx_4efe18b3._.js");
      case "server/chunks/ssr/[root-of-the-server]__8b86cd45._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__8b86cd45._.js");
      case "server/chunks/ssr/_1ae91ee1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_1ae91ee1._.js");
      case "server/chunks/ssr/_56cba2ba._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_56cba2ba._.js");
      case "server/chunks/ssr/_c7e25903._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_c7e25903._.js");
      case "server/chunks/ssr/_dc32f049._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_dc32f049._.js");
      case "server/chunks/ssr/_de8e73c3._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_de8e73c3._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_upgrade_page_actions_0de7dfa7.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_upgrade_page_actions_0de7dfa7.js");
      case "server/chunks/ssr/apps_app_app_(protected)_upgrade_error_tsx_5e8b2ea1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_upgrade_error_tsx_5e8b2ea1._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_upgrade_loading_tsx_49aef3d5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_upgrade_loading_tsx_49aef3d5._.js");
      case "server/chunks/ssr/apps_app_c8c0ab17._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_c8c0ab17._.js");
      case "server/chunks/ssr/[root-of-the-server]__fb6008df._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__fb6008df._.js");
      case "server/chunks/ssr/_1723d349._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_1723d349._.js");
      case "server/chunks/ssr/_2586c451._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_2586c451._.js");
      case "server/chunks/ssr/_e94ece46._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_e94ece46._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_(protected)_whatsapp_page_actions_57ff6b72.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_(protected)_whatsapp_page_actions_57ff6b72.js");
      case "server/chunks/ssr/apps_app_app_(protected)_whatsapp_error_tsx_e2ace350._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_whatsapp_error_tsx_e2ace350._.js");
      case "server/chunks/ssr/apps_app_app_(protected)_whatsapp_loading_tsx_32bbcd77._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_(protected)_whatsapp_loading_tsx_32bbcd77._.js");
      case "server/chunks/ssr/90400_next_dist_3bfb7d4b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/90400_next_dist_3bfb7d4b._.js");
      case "server/chunks/ssr/[root-of-the-server]__16f18029._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__16f18029._.js");
      case "server/chunks/ssr/[root-of-the-server]__6e3fc125._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__6e3fc125._.js");
      case "server/chunks/ssr/[root-of-the-server]__706c9f74._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__706c9f74._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app__global-error_page_actions_ed0ebdcf.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app__global-error_page_actions_ed0ebdcf.js");
      case "server/chunks/[externals]_next_dist_compiled_@vercel_og_index_node_055f47ab.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[externals]_next_dist_compiled_@vercel_og_index_node_055f47ab.js");
      case "server/chunks/[root-of-the-server]__3004055b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[root-of-the-server]__3004055b._.js");
      case "server/chunks/[root-of-the-server]__c02c295a._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[root-of-the-server]__c02c295a._.js");
      case "server/chunks/apps_app__next-internal_server_app_apple-icon_route_actions_9da4962b.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/apps_app__next-internal_server_app_apple-icon_route_actions_9da4962b.js");
      case "server/chunks/ssr/[root-of-the-server]__af8e91d4._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__af8e91d4._.js");
      case "server/chunks/ssr/_14dc2577._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_14dc2577._.js");
      case "server/chunks/ssr/_90c301b5._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_90c301b5._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_choose-path_page_actions_f4fcf6ee.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_choose-path_page_actions_f4fcf6ee.js");
      case "server/chunks/ssr/[root-of-the-server]__714b2a76._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__714b2a76._.js");
      case "server/chunks/ssr/_7700299b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_7700299b._.js");
      case "server/chunks/ssr/_8163b98e._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_8163b98e._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_clinic-selection_page_actions_8571d1f8.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_clinic-selection_page_actions_8571d1f8.js");
      case "server/chunks/ssr/[root-of-the-server]__f965a9fa._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__f965a9fa._.js");
      case "server/chunks/ssr/_43664c24._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_43664c24._.js");
      case "server/chunks/ssr/_4c9623cb._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_4c9623cb._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_forgot-password_page_actions_2ac673ca.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_forgot-password_page_actions_2ac673ca.js");
      case "server/chunks/[root-of-the-server]__e7014f12._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[root-of-the-server]__e7014f12._.js");
      case "server/chunks/apps_app__next-internal_server_app_icon_route_actions_e5dc6e3e.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/apps_app__next-internal_server_app_icon_route_actions_e5dc6e3e.js");
      case "server/chunks/ssr/[root-of-the-server]__3373f03f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__3373f03f._.js");
      case "server/chunks/ssr/_0a481493._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_0a481493._.js");
      case "server/chunks/ssr/_bc8da160._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_bc8da160._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_join-clinic_page_actions_469016aa.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_join-clinic_page_actions_469016aa.js");
      case "server/chunks/ssr/[root-of-the-server]__884ac22f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__884ac22f._.js");
      case "server/chunks/ssr/_2bad9570._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_2bad9570._.js");
      case "server/chunks/ssr/_eac387ad._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_eac387ad._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_join-request-status_page_actions_fa454215.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_join-request-status_page_actions_fa454215.js");
      case "server/chunks/ssr/[root-of-the-server]__128dad61._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__128dad61._.js");
      case "server/chunks/ssr/_7643d1e4._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_7643d1e4._.js");
      case "server/chunks/ssr/_a72f5f56._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_a72f5f56._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_login_page_actions_c3f1e855.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_login_page_actions_c3f1e855.js");
      case "server/chunks/ssr/apps_app_app_login_layout_tsx_af701ee3._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_login_layout_tsx_af701ee3._.js");
      case "server/chunks/ssr/apps_app_app_login_page_tsx_3b383f3a._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_login_page_tsx_3b383f3a._.js");
      case "server/chunks/[root-of-the-server]__bca319f0._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/[root-of-the-server]__bca319f0._.js");
      case "server/chunks/apps_app__next-internal_server_app_manifest_webmanifest_route_actions_f496b8b7.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/apps_app__next-internal_server_app_manifest_webmanifest_route_actions_f496b8b7.js");
      case "server/chunks/ssr/[root-of-the-server]__7791a4dd._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__7791a4dd._.js");
      case "server/chunks/ssr/_30c39619._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_30c39619._.js");
      case "server/chunks/ssr/_406bf2be._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_406bf2be._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_mobile-upload_[id]_page_actions_ecc8ddce.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_mobile-upload_[id]_page_actions_ecc8ddce.js");
      case "server/chunks/ssr/[root-of-the-server]__2573795f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__2573795f._.js");
      case "server/chunks/ssr/_4f425f41._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_4f425f41._.js");
      case "server/chunks/ssr/_7aef56db._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_7aef56db._.js");
      case "server/chunks/ssr/_cbdc385d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_cbdc385d._.js");
      case "server/chunks/ssr/_cd6b7bce._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_cd6b7bce._.js");
      case "server/chunks/ssr/_ec40ff49._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_ec40ff49._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_onboarding_page_actions_b852deba.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_onboarding_page_actions_b852deba.js");
      case "server/chunks/ssr/apps_app_app_onboarding_layout_tsx_d9022b38._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_onboarding_layout_tsx_d9022b38._.js");
      case "server/chunks/ssr/apps_app_features_onboarding_components_index_ts_168fe3b8._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_features_onboarding_components_index_ts_168fe3b8._.js");
      case "server/chunks/ssr/[root-of-the-server]__6f692507._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__6f692507._.js");
      case "server/chunks/ssr/_a4d45868._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_a4d45868._.js");
      case "server/chunks/ssr/_a9c95357._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_a9c95357._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_page_actions_d81d9634.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_page_actions_d81d9634.js");
      case "server/chunks/ssr/[root-of-the-server]__08ca3a8d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__08ca3a8d._.js");
      case "server/chunks/ssr/_3bd22a9c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_3bd22a9c._.js");
      case "server/chunks/ssr/_5aa221ae._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_5aa221ae._.js");
      case "server/chunks/ssr/_bf772872._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_bf772872._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_portal_appointments_page_actions_0e5db5cd.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_portal_appointments_page_actions_0e5db5cd.js");
      case "server/chunks/ssr/apps_app_app_portal_appointments_page_tsx_cff342d2._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_portal_appointments_page_tsx_cff342d2._.js");
      case "server/chunks/ssr/apps_app_features_patient-portal_8b99fd70._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_features_patient-portal_8b99fd70._.js");
      case "server/chunks/ssr/apps_app_features_patient-portal_components_views_portal-metrics-ui_tsx_784780ef._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_features_patient-portal_components_views_portal-metrics-ui_tsx_784780ef._.js");
      case "server/chunks/ssr/[root-of-the-server]__78cb92ee._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__78cb92ee._.js");
      case "server/chunks/ssr/_a8759f85._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_a8759f85._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_portal_billing_page_actions_bce681e0.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_portal_billing_page_actions_bce681e0.js");
      case "server/chunks/ssr/apps_app_app_portal_billing_page_tsx_9117a6a0._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_portal_billing_page_tsx_9117a6a0._.js");
      case "server/chunks/ssr/[root-of-the-server]__77970622._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__77970622._.js");
      case "server/chunks/ssr/_1a63a764._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_1a63a764._.js");
      case "server/chunks/ssr/_38da536b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_38da536b._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_portal_history_page_actions_04412c04.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_portal_history_page_actions_04412c04.js");
      case "server/chunks/ssr/[root-of-the-server]__bd9a9116._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__bd9a9116._.js");
      case "server/chunks/ssr/_90ca364e._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_90ca364e._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_portal_login_page_actions_0aa204d4.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_portal_login_page_actions_0aa204d4.js");
      case "server/chunks/ssr/[root-of-the-server]__173b92d8._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__173b92d8._.js");
      case "server/chunks/ssr/_19d87421._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_19d87421._.js");
      case "server/chunks/ssr/_cb312af7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_cb312af7._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_portal_medications_page_actions_5646fde3.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_portal_medications_page_actions_5646fde3.js");
      case "server/chunks/ssr/[root-of-the-server]__8139efd4._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__8139efd4._.js");
      case "server/chunks/ssr/_c6336735._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_c6336735._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_portal_metrics_page_actions_35659268.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_portal_metrics_page_actions_35659268.js");
      case "server/chunks/ssr/[root-of-the-server]__345778ca._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__345778ca._.js");
      case "server/chunks/ssr/_8c98c800._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_8c98c800._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_portal_page_actions_d4886ff2.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_portal_page_actions_d4886ff2.js");
      case "server/chunks/ssr/apps_app_app_portal_page_tsx_733998a7._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_portal_page_tsx_733998a7._.js");
      case "server/chunks/ssr/[root-of-the-server]__5911456a._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__5911456a._.js");
      case "server/chunks/ssr/_c90e1fdd._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_c90e1fdd._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_portal_prescriptions_page_actions_e7bb88a4.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_portal_prescriptions_page_actions_e7bb88a4.js");
      case "server/chunks/ssr/apps_app_app_portal_prescriptions_page_tsx_32f8291c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app_app_portal_prescriptions_page_tsx_32f8291c._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_portal_profile_consent-form_page_actions_736f59b3.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_portal_profile_consent-form_page_actions_736f59b3.js");
      case "server/chunks/ssr/[root-of-the-server]__930dd04f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__930dd04f._.js");
      case "server/chunks/ssr/_0a0db68d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_0a0db68d._.js");
      case "server/chunks/ssr/_7907040d._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_7907040d._.js");
      case "server/chunks/ssr/[root-of-the-server]__21a0b99b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__21a0b99b._.js");
      case "server/chunks/ssr/_a29d3dd2._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_a29d3dd2._.js");
      case "server/chunks/ssr/_f6d65696._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_f6d65696._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_portal_profile_page_actions_cee64ae3.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_portal_profile_page_actions_cee64ae3.js");
      case "server/chunks/ssr/[root-of-the-server]__785b7b84._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__785b7b84._.js");
      case "server/chunks/ssr/_01ec9906._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_01ec9906._.js");
      case "server/chunks/ssr/_6602d113._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_6602d113._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_reset-password_page_actions_2f21480c.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_reset-password_page_actions_2f21480c.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_settings_team_join-requests_page_actions_627760fd.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_settings_team_join-requests_page_actions_627760fd.js");
      case "server/chunks/ssr/[root-of-the-server]__6c00d830._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__6c00d830._.js");
      case "server/chunks/ssr/_0a51f833._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_0a51f833._.js");
      case "server/chunks/ssr/_c5eba250._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_c5eba250._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_upload-signature_[token]_page_actions_16748cae.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_upload-signature_[token]_page_actions_16748cae.js");
      case "server/chunks/ssr/[root-of-the-server]__71a31a4c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__71a31a4c._.js");
      case "server/chunks/ssr/_4a96db9b._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_4a96db9b._.js");
      case "server/chunks/ssr/_ab60b288._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_ab60b288._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_upload-signature_onboarding_page_actions_cdaee2d6.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_upload-signature_onboarding_page_actions_cdaee2d6.js");
      case "server/chunks/ssr/[root-of-the-server]__6937b9e9._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__6937b9e9._.js");
      case "server/chunks/ssr/_78644be1._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_78644be1._.js");
      case "server/chunks/ssr/_e2850d50._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_e2850d50._.js");
      case "server/chunks/ssr/[root-of-the-server]__ead364df._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__ead364df._.js");
      case "server/chunks/ssr/_9b86d18f._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_9b86d18f._.js");
      case "server/chunks/ssr/_eda3967c._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_eda3967c._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_verify-doctor_page_actions_bcae6fd0.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_verify-doctor_page_actions_bcae6fd0.js");
      case "server/chunks/ssr/[root-of-the-server]__152a8276._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__152a8276._.js");
      case "server/chunks/ssr/_31920249._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_31920249._.js");
      case "server/chunks/ssr/apps_app__next-internal_server_app_visual-test_stats-card_page_actions_abbad1a6.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/apps_app__next-internal_server_app_visual-test_stats-card_page_actions_abbad1a6.js");
      case "server/chunks/ssr/packages_ui_src_components_stats-card_tsx_4e42b52e._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/packages_ui_src_components_stats-card_tsx_4e42b52e._.js");
      case "server/chunks/ssr/0da96_app__next-internal_server_app_visual-test_status-badge_page_actions_d82d7519.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/0da96_app__next-internal_server_app_visual-test_status-badge_page_actions_d82d7519.js");
      case "server/chunks/ssr/[root-of-the-server]__6224bf26._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/[root-of-the-server]__6224bf26._.js");
      case "server/chunks/ssr/_e51f1873._.js": return require("/Users/vamsikrishnachandaluri/repos/docita/apps/app/.open-next/server-functions/default/apps/app/.next/server/chunks/ssr/_e51f1873._.js");
      default:
        throw new Error(`Not found ${chunkPath}`);
    }
  }
