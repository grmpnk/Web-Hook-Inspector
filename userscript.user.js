// ==UserScript==
// @name         Web Hook Inspector
// @name:ja      Web Hook Inspector
// @namespace    https://github.com/grmpnk
// @version      0.2
// @description  Hook page functions and properties via checkboxes, and log the source, arguments, result, and stack trace to the console.
// @description:ja  ページ上の関数・プロパティをチェックボックスで選んでフックし、呼び出し元・引数・戻り値・スタックをコンソールに記録します。
// @author       grmpneko
// @match        http*://*/*
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMxYTIzMzgiLz48cGF0aCBkPSJNMjIgMTRMMTIgMzJsMTAgMThNNDIgMTRsMTAgMThMNDIgNTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzRmZDFjNSIgc3Ryb2tlLXdpZHRoPSI3IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSI3IiBmaWxsPSIjZmZiNzAzIi8+PC9zdmc+
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      raw.githubusercontent.com
// @connect      *
// @run-at       document-start
// @license      MIT
// ==/UserScript==
// ==========================================
// Utils
// ==========================================
let w=typeof unsafeWindow!=='undefined'?unsafeWindow:window,d=document,l=console.log,$S=s=>document.querySelector(s),$SA=s=>document.querySelectorAll(s),$C=(tag,{attrs={},props={},styles={},on={}}={})=>{const el=document.createElement(tag);for(const [name,value] of Object.entries(attrs)){if(value===false||value==null)continue;if(value===true)el.setAttribute(name,"");else el.setAttribute(name,String(value));}Object.assign(el,props);Object.assign(el.style,styles);for(const [ev,handler] of Object.entries(on)){if(typeof handler==="function")el.addEventListener(ev,handler);}return el;};
// ==========================================
// Main
// ==========================================
const JSON_URLS = [];
const PREPOP = {
    other: [
        'XHR', 'fetch', 'WebSocket', 'JSON', 'Worker', 'requestIdleCallback', 'setInterval', 'setTimeout', 'clearInterval', 'clearTimeout', 'Event', 'Response',
        'apply', 'bind', 'call', 'localStorage', 'Reflect', 'CustomEvent', 'captureEvents', 'Map', 'Promise', 'Set', 'WebAssembly', 'gtag', 'MutationObserver',
        'requestAnimationFrame', 'eval', 'postMessage', 'URLSearchParams', 'caches', 'BroadcastChannel', 'Crypto', 'Date', 'Symbol', 'Trusted', 'structuredClone', 'fetchLater', 'RegExp'
    ],
    HTML: ['HTMLCanvasElement', 'HTMLCollection', 'HTMLMediaElement', 'HTMLVideoElement'],
    Canvas: [
        'GPUCanvasContext', 'OffscreenCanvasRenderingContext2D', 'OffscreenCanvas', 'CanvasRenderingContext2D', 'CanvasPattern', 'CanvasGradient', 'CanvasCaptureMediaStreamTrack'
    ],
    Event: ['addEventListener', 'dispatchEvent', 'removeEventListener', 'originalEvent'],
    Dom: [
        'after', 'attachShadow', 'before', 'prepend', 'append', 'insertAdjacentHTML', 'setAttribute', 'remove',
        'appendChild', 'cloneNode', 'insertBefore',
        'write', 'querySelector', 'querySelectorAll',
        'createElement'
    ],
    WebGL: ['WebGLRenderingContext', 'WebGL2RenderingContext'],
    Arr: [
        'every', 'fill', 'filter', 'find', 'findIndex', 'flat', 'flatMap', 'forEach', 'map', 'pop', 'push', 'reduce', 'reduceRight',
        'reverse', 'shift', 'some', 'sort', 'splice', 'unshift', 'with', 'copyWithin',
        'at', 'concat', 'includes', 'indexOf', 'lastIndexOf', 'slice'
    ],
    Str: [
        'endsWith', 'link', 'match', 'matchAll', 'replace', 'replaceAll', 'search', 'split', 'startsWith', 'substring',
        'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase', 'toString', 'toUpperCase', 'trim', 'valueOf',
        'at', 'concat', 'includes', 'indexOf', 'lastIndexOf', 'slice'
    ],
    Object: [
        'assign', 'create', 'defineProperties', 'defineProperty', 'entries', 'freeze', 'preventExtensions', 'setPrototypeOf', 'seal',
        'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors', 'getOwnPropertyNames', 'getOwnPropertySymbols', 'fromEntries', 'getPrototypeOf'
    ],
    Math: [
        'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil', 'clz32', 'cos', 'cosh', 'exp', 'expm1', 'f16round', 'floor', 'fround', 'hypot', 'imul', 'log',
        'log1p', 'log2', 'log10', 'max', 'min', 'pow', 'random', 'round', 'sign', 'sin', 'sinh', 'sqrt', 'sumPrecise', 'tan', 'tanh', 'trunc'
    ]
};

const PROPS = {
    login: ['login', 'isLoggedIn', 'isLogin', 'loginStatus', 'loginState', 'loginFlag', 'loginSession'],
    mail: ['email', 'userEmail', 'emailAddress', 'isEmailValid', 'emailValid']
};
const ALIAS = new Map([['XHR', 'XMLHttpRequest']]);
const aliased = new Set(ALIAS.values());
const IFACE = new Set(['HTML', 'Canvas', 'WebGL', 'Interface']);
const TARGET_PATHS = {
    Dom: [['Element', 'prototype'], ['Node', 'prototype'], ['Document', 'prototype'], ['DocumentFragment', 'prototype'], ['CharacterData', 'prototype']],
    Event: [['EventTarget', 'prototype']],
    Arr: [['Array', 'prototype']],
    Str: [['String', 'prototype']],
    Object: [['Object']],
    Math: [['Math']],
    Element: [['Element', 'prototype']],
    Node: [['Node', 'prototype']],
    Document: [['Document', 'prototype']],
    Window: [[]]
};
const walkPath = path => path.reduce((o, k) => k === '__proto__' ? Object.getPrototypeOf(o) : o[k], w);
const fnKey = id => `fn:${id.slice(id.indexOf('.') + 1)}`;
const dict = () => Object.create(null);
const cfg = { hooks: dict(), props: dict(), custom: { fn: [], prop: [] }, overrides: [], logOnKey: false, key: '', rate: 10 };
const slots = new Map();
const propSlots = new Map();
const xhrMeta = new WeakMap();
const remote = { urls: [], data: {} };
const compiled = new Map();
const rApply = Reflect.apply, rConstruct = Reflect.construct, fnToString = Function.prototype.toString;
let held = false, sent = 0, stamp = 0, busy = false, panel = null, remoteOv = [];
const syncRemoteOv = () => { remoteOv = Object.values(remote.data).flatMap(x => x.overrides ?? []); };
const silent = fn => {
    const prev = busy;
    busy = true;
    try{ return fn(); }finally{ busy = prev; }
};
const own = (o, k) => Object.getOwnPropertyDescriptor(o, k);
const isFn = v => typeof v === 'function';
const peek = (o, k) => {
    const s = slots.get(o)?.get(k);
    return s ? s.orig : own(o, k)?.value;
};
const fnNames = o => Object.getOwnPropertyNames(o).filter(k => k !== 'constructor' && isFn(peek(o, k)));
const ownFns = (o, path) => fnNames(o).map(key => ({ obj: o, key, path }));
const isNative = f => /\[native code\]/.test(rApply(fnToString, f, []));
const tag = (id, key) => id.endsWith(`.${key}`) ? id : `${id} › ${key}`;
const isCustomEvent = a => {
    const t = typeof a[0] === 'string' ? a[0] : a[0]?.type;
    return typeof t === 'string' && !(`on${t}` in w) && !(`on${t}` in d);
};
const members = (o, path) => {
    const out = [];
    let steps = [];
    for(let p = o; p && p !== w.Object.prototype; p = Object.getPrototypeOf(p)){
        out.push(...ownFns(p, path && [...path, ...steps]));
        steps = [...steps, '__proto__'];
    }
    return out;
};
const iface = name => {
    const c = peek(w, name);
    return isFn(c) && c.prototype ? ownFns(c.prototype, [name, 'prototype']) : [];
};
const other = name => {
    const c = peek(w, name);
    if(isFn(c)){
        const extra = /^[A-Z]/.test(name) && name !== 'Worker'
            ? [...(c.prototype ? ownFns(c.prototype, [name, 'prototype']) : []), ...ownFns(c, [name])]
            : [];
        return [{ obj: w, key: name, path: [] }, ...extra];
    }
    if(isFn(peek(w.Function.prototype, name))) return [{ obj: w.Function.prototype, key: name, path: ['Function', 'prototype'] }];
    let v;
    try{ v = w[name]; }catch{ v = null; }
    if(v && typeof v === 'object') return members(v, [name]);
    return Object.getOwnPropertyNames(w).filter(k => k.startsWith(name) && isFn(peek(w, k))).flatMap(k => iface(k));
};
const parsePath = s => {
    const out = [], re = /\.?([^.\[\]]+)|\[\s*(?:"([^"]*)"|'([^']*)'|(\d+))\s*\]/g;
    let m, end = 0;
    while((m = re.exec(s))){
        if(m.index !== end) return null;
        end = re.lastIndex;
        out.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
    }
    return end === s.length && out.length ? out : null;
};
const pathOwner = path => {
    let o = w;
    for(const k of path.slice(0, -1)){
        try{ o = o[k]; }catch{ return []; }
        if(o === null || (typeof o !== 'object' && !isFn(o))) return [];
    }
    const key = path[path.length - 1];
    let steps = [];
    for(let p = o; p && p !== w.Object.prototype; p = Object.getPrototypeOf(p)){
        if(isFn(peek(p, key))) return [{ obj: p, key, path: [...path.slice(0, -1), ...steps] }];
        steps = [...steps, '__proto__'];
    }
    return [];
};
const viaPath = name => {
    const path = parsePath(name);
    return path && path.length > 1 ? pathOwner(path) : other(path ? path[0] : name);
};
const resolve = (group, name) => {
    if(group === 'Event' && name === 'originalEvent'){
        return ['addEventListener', 'removeEventListener', 'dispatchEvent']
            .map(key => ({ obj: w.EventTarget.prototype, key, path: ['EventTarget', 'prototype'], filter: isCustomEvent }));
    }
    const real = ALIAS.get(name) ?? name;
    if(IFACE.has(group)) return iface(real);
    if(group === 'other' || !Object.hasOwn(TARGET_PATHS, group)) return viaPath(real);
    return TARGET_PATHS[group]
        .map(path => ({ path, obj: walkPath(path) }))
        .filter(t => isFn(peek(t.obj, real)))
        .map(t => ({ obj: t.obj, key: real, path: t.path }));
};
const canLog = () => {
    if(cfg.logOnKey && !held) return false;
    if(cfg.rate === 0) return true;
    const now = Date.now();
    if(now - stamp >= 1000){ stamp = now; sent = 0; }
    if(sent >= cfg.rate) return false;
    sent++;
    return true;
};
const emit = (label, values, stack) => {
    if(!canLog()) return;
    console.groupCollapsed(label, ...values);
    l(stack ?? (new Error()).stack);
    console.groupEnd();
};
const xhrOpen = (info, phase) => {
    if(phase !== 'after') return;
    xhrMeta.set(info.source, { method: info.args[0], url: String(info.args[1]) });
};
const xhrSend = (info, phase) => {
    if(phase !== 'before') return;
    const xhr = info.source, stack = (new Error()).stack;
    xhr.addEventListener('loadend', () => silent(() => {
        const meta = xhrMeta.get(xhr);
        let response;
        try{ response = xhr.responseText; }catch{ response = xhr.response; }
        emit('XHR done', [{ method: meta?.method, url: meta?.url, status: xhr.status, response }], stack);
    }), { once: true });
};
const fetchParsed = (info, phase) => {
    const p = info.result;
    if(phase !== 'after' || !p || !isFn(p.then)) return;
    const stack = (new Error()).stack;
    p.then(res => silent(() => {
        if(res.status === 204 || res.status === 205) return;
        return res.clone().text().then(text => silent(() => {
            let data = text;
            try{ data = JSON.parse(text); }catch{ data = text; }
            emit('fetch parsed', ['url:', res.url, 'status:', res.status, 'parsed:', data], stack);
        }));
    }), () => {}).catch(() => {});
};
const socketMessage = (info, phase) => {
    const ws = info.result;
    if(phase !== 'after' || !ws || !isFn(ws.addEventListener)) return;
    const stack = (new Error()).stack;
    ws.addEventListener('message', e => silent(() => emit('WebSocket message', ['url:', ws.url, 'data:', e.data, 'event:', e], stack)));
};
const workerSpawn = (info, phase) => {
    const worker = info.result;
    if(phase !== 'after' || !worker || !isFn(worker.postMessage)) return;
    const post = worker.postMessage;
    worker.postMessage = function(...args){
        const slot = slots.get(w)?.get('Worker');
        if(!slot) return rApply(post, this, args);
        return traced(
            () => {
                const ids = [...slot.ids.keys()];
                return { label: ids.map(id => tag(id, 'postMessage')).join(' | '), keys: ids.map(fnKey) };
            },
            this,
            args,
            (a, s) => rApply(post, s, a)
        );
    };
};
const extraFor = (obj, key) => {
    if(obj === w.XMLHttpRequest?.prototype && key === 'open') return xhrOpen;
    if(obj === w.XMLHttpRequest?.prototype && key === 'send') return xhrSend;
    if(obj === w && key === 'fetch') return fetchParsed;
    if(obj === w && key === 'WebSocket') return socketMessage;
    if(obj === w && key === 'Worker') return workerSpawn;
    return null;
};
const side = (extra, info, phase) => {
    if(!extra) return;
    try{ extra(info, phase); }catch{ return; }
};
const compile = code => {
    if(!compiled.has(code)){
        let fn = null;
        try{ fn = new Function('source', 'args', 'result', 'w', 'console', `${code}\n;return [source, args, result];`); }catch{ fn = null; }
        compiled.set(code, fn);
    }
    return compiled.get(code);
};
// Override内のconsole出力も "Max logs / sec" と "Log during keydown key" の対象にする
const LIMITED = new Set(['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir', 'dirxml', 'table']);
const limitedConsole = new Proxy(console, {
    get(t, k){
        const v = t[k];
        return isFn(v) ? (...a) => { if(!LIMITED.has(k) || canLog()) return rApply(v, t, a); } : v;
    }
});
const override = (info, phase) => {
    const list = remoteOv.length ? cfg.overrides.concat(remoteOv) : cfg.overrides;
    for(const o of list){
        if(o.phase !== phase || !info.keys.includes(o.key)) continue;
        const fn = compile(o.code);
        if(!fn) continue;
        try{
            const [source, args, result] = rApply(fn, null, [info.source, info.args, info.result, w, limitedConsole]);
            if(info.source !== null) info.source = source;
            info.args = Array.isArray(args) ? args : [args];
            if(phase === 'after') info.result = result;
        }catch{
            continue;
        }
    }
};
const touch = (info, phase) => {
    override(info, phase);
    if(!isFn(w.__rewrite)) return;
    const args = info.args;
    info.phase = phase;
    try{ rApply(w.__rewrite, null, [info]); }catch{ info.args = args; }
    if(!Array.isArray(info.args)) info.args = args;
};
const traced = (describe, source, args, call, extra) => {
    if(busy) return call(args, source);
    const info = { label: '', keys: [], source, args, result: undefined, threw: false, phase: '' };
    silent(() => {
        const desc = describe(args);
        info.label = desc.label;
        info.keys = desc.keys;
        if(!info.label) return;
        w.__orig = source;
        touch(info, 'before');
        side(extra, info, 'before');
    });
    try{
        info.result = call(info.args, info.source);
    }catch(e){
        info.threw = true;
        info.result = e;
    }
    if(info.label){
        silent(() => {
            if(!info.threw){
                touch(info, 'after');
                side(extra, info, 'after');
            }
            emit(info.label, ['source:', info.source, 'args:', info.args, info.threw ? 'throws:' : 'result:', info.result]);
        });
    }
    if(info.threw) throw info.result;
    return info.result;
};
const invoke = (slot, th, args, nt) => traced(
    a => {
        const ids = [...slot.ids].filter(([, f]) => !f || f(a)).map(([id]) => id);
        return { label: ids.map(id => tag(id, slot.key)).join(' | '), keys: ids.map(fnKey) };
    },
    nt ? null : th,
    args,
    (a, s) => nt ? rConstruct(slot.orig, a, nt) : rApply(slot.orig, s, a),
    slot.extra
);
const workerGlobal = s => {
    const wrapped = function(url, options){
        return invoke(s, null, [url, options], new.target);
    };
    wrapped.prototype = s.orig.prototype;
    return wrapped;
};
const install = (obj, key, id, filter) => {
    let keys = slots.get(obj);
    if(!keys){
        keys = new Map();
        slots.set(obj, keys);
    }
    let slot = keys.get(key);
    if(!slot){
        const desc = own(obj, key);
        if(!desc || !isFn(desc.value)) return;
        slot = { desc, orig: desc.value, ids: new Map(), key, extra: extraFor(obj, key) };
        const s = slot;
        slot.proxy = obj === w && key === 'Worker' ? workerGlobal(s) : new Proxy(s.orig, {
            apply: (t, th, a) => invoke(s, th, a, null),
            construct: (t, a, nt) => invoke(s, null, a, nt)
        });
        try{
            Object.defineProperty(obj, key, { ...desc, value: slot.proxy });
        }catch{
            return;
        }
        keys.set(key, slot);
    }
    slot.ids.set(id, filter);
};
const hook = id => silent(() => {
    const i = id.indexOf('.');
    for(const e of resolve(id.slice(0, i), id.slice(i + 1))) install(e.obj, e.key, id, e.filter);
});
const unhook = id => silent(() => {
    for(const [obj, keys] of slots){
        for(const [key, slot] of keys){
            if(!slot.ids.has(id)) continue;
            slot.ids.delete(id);
            if(slot.ids.size) continue;
            if(own(obj, key)?.value === slot.proxy) Object.defineProperty(obj, key, slot.desc);
            keys.delete(key);
        }
    }
});
const propTargets = () => [w, w.Object.prototype, w.Array.prototype, w.Function.prototype];
const hookProp = name => silent(() => {
    if(propSlots.has(name)) return;
    const list = [];
    for(const obj of propTargets()){
        const prev = own(obj, name);
        if(prev && !prev.configurable) continue;
        const values = new WeakMap();
        const keyOf = t => (t !== null && (typeof t === 'object' || isFn(t))) ? t : obj;
        try{
            Object.defineProperty(obj, name, {
                configurable: true, enumerable: false,
                get(){
                    const k = keyOf(this);
                    return traced(() => ({ label: `get "${name}"`, keys: [`prop:${name}`] }), this, [], (a, s) => {
                        if(values.has(k)) return values.get(k);
                        if(!prev) return undefined;
                        return prev.get ? rApply(prev.get, s, []) : prev.value;
                    });
                },
                set(v){
                    const k = keyOf(this);
                    traced(() => ({ label: `set "${name}"`, keys: [`prop:${name}`] }), this, [v], (a, s) => {
                        if(prev?.set && !values.has(k)) return rApply(prev.set, s, a);
                        values.set(k, a[0]);
                    });
                }
            });
            list.push({ obj, prev });
        }catch{
            continue;
        }
    }
    propSlots.set(name, list);
});
const unhookProp = name => silent(() => {
    for(const { obj, prev } of propSlots.get(name) ?? []){
        if(prev) Object.defineProperty(obj, name, prev); else Reflect.deleteProperty(obj, name);
    }
    propSlots.delete(name);
});
const fetchJson = url => new Promise(resolveJson => {
    GM_xmlhttpRequest({
        method: 'GET',
        url,
        timeout: 10000,
        onload: r => {
            try{ resolveJson(JSON.parse(r.responseText)); }catch{ resolveJson(null); }
        },
        onerror: () => resolveJson(null),
        ontimeout: () => resolveJson(null)
    });
});
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const cleanFlags = v => {
    const out = dict();
    if(isObj(v)){
        for(const [k, on] of Object.entries(v)){
            if(on === true) out[k] = true;
        }
    }
    return out;
};
const cleanNames = v => Array.isArray(v) ? [...new Set(v.filter(n => typeof n === 'string' && n && !/\s/.test(n)))] : [];
const cleanOverrides = v => Array.isArray(v)
    ? v.filter(o => isObj(o) && typeof o.key === 'string' && /^(fn|prop):./.test(o.key) && (o.phase === 'before' || o.phase === 'after') && typeof o.code === 'string' && o.code.trim())
        .map(o => ({ key: o.key, phase: o.phase, code: o.code, name: typeof o.name === 'string' ? o.name : '' }))
    : [];
const reserved = new Set([...Object.keys(PREPOP), ...Object.keys(TARGET_PATHS), ...IFACE, 'other', 'Custom', 'Original']);
const groupOf = url => {
    const g = url.split(/[?#]/)[0].split('/').pop().replace(/^file:/, '').replace(/\.[^.]*$/, '').replace(/\./g, '') || 'json';
    return reserved.has(g) ? `${g}_json` : g;
};
const cleanGroups = (v, name) => {
    const out = dict();
    const src = Array.isArray(v) ? { [name]: v } : v;
    if(!isObj(src)) return out;
    for(const [g, ns] of Object.entries(src)){
        const names = cleanNames(ns);
        if(g !== 'Custom' && !g.includes('.') && names.length) out[g] = names;
    }
    return out;
};
// JSON形式: { "fn": [...], "prop": [...], "override": [{ key, phase, code }] }
const normalizeRemote = (data, url) => {
    const g = groupOf(url);
    return {
        fnHooks: cleanGroups(data?.fn ?? data?.fnHooks, g),
        props: cleanGroups(data?.prop ?? data?.props, g),
        overrides: cleanOverrides(data?.override ?? data?.overrides)
    };
};
const mergeGroups = (...srcs) => {
    const out = dict();
    for(const src of srcs){
        for(const [g, ns] of Object.entries(src)) out[g] = [...new Set([...(out[g] ?? []), ...ns])];
    }
    return out;
};
const remoteGroups = kind => mergeGroups(...Object.values(remote.data).map(x => x[kind]));
const saveRemote = () => Promise.all([GM.setValue('jsonUrls', remote.urls), GM.setValue('jsonData', remote.data)]);
const loadRemote = async () => {
    const stored = await GM.getValue('jsonUrls', null);
    const cached = await GM.getValue('jsonData', {});
    remote.urls = Array.isArray(stored) ? [...new Set(stored.filter(u => typeof u === 'string' && u))] : JSON_URLS.slice();
    const fetched = await Promise.all(remote.urls.map(fetchJson));
    remote.urls.forEach((u, i) => {
        remote.data[u] = normalizeRemote(fetched[i] ?? (isObj(cached) ? cached[u] : null), u);
    });
    syncRemoteOv();
    await saveRemote();
};
const catalog = () => {
    const cat = dict();
    for(const [g, names] of Object.entries(PREPOP)) cat[g] = names.slice();
    const extend = (g, names) => {
        cat[g] = [...new Set([...(cat[g] ?? []), ...names.sort()])];
    };
    extend('Arr', fnNames(w.Array.prototype));
    extend('Str', fnNames(w.String.prototype));
    extend('Object', fnNames(w.Object).filter(n => !aliased.has(n)));
    extend('Math', fnNames(w.Math));
    extend('Event', fnNames(w.EventTarget.prototype));
    const dom = new Set(PREPOP.Dom);
    extend('Element', fnNames(w.Element.prototype).filter(n => !dom.has(n)));
    extend('Node', fnNames(w.Node.prototype).filter(n => !dom.has(n)));
    extend('Document', fnNames(w.Document.prototype).filter(n => !dom.has(n)));
    const known = new Set(Object.values(PREPOP).flat());
    const found = dict();
    for(const n of Object.getOwnPropertyNames(w)){
        const f = peek(w, n);
        if(!isFn(f) || known.has(n) || aliased.has(n)) continue;
        const g = !isNative(f) ? 'Original'
: /^HTML/.test(n) ? 'HTML'
: /^WebGL/.test(n) ? 'WebGL'
: /Canvas/.test(n) ? 'Canvas'
: /^[A-Z]/.test(n) ? 'Interface'
: 'Window';
        (found[g] ??= []).push(n);
    }
    for(const [g, names] of Object.entries(found)) extend(g, names);
    // サイト固有のオブジェクト/関数のメソッドも Original に追加 (例: Game.Has, jQuery.ajax)
    const site = [];
    for(const n of Object.getOwnPropertyNames(w)){
        if(known.has(n) || aliased.has(n) || !/^[^\s.\[\]]+$/.test(n)) continue;
        const desc = own(w, n);
        if(!desc || !('value' in desc)) continue;
        const v = peek(w, n);
        let list;
        if(isFn(v)){
            if(isNative(v)) continue;
            list = ownFns(v);
        }else if(v !== null && typeof v === 'object' && !Array.isArray(v) && desc.enumerable){
            list = members(v);
        }else{
            continue;
        }
        for(const e of list){
            if(!/^[^\s.\[\]]+$/.test(e.key) || isNative(peek(e.obj, e.key))) continue;
            site.push(`${n}.${e.key}`);
        }
    }
    if(site.length) extend('Original', site);
    return cat;
};
const sumChecked = (c, pick) => Object.entries(c).reduce((t, [g, ns]) => t + ns.filter(n => pick(g, n)).length, 0);
const globalPreview = v => {
    if(Array.isArray(v)) return `Array(${v.length})`;
    if(v !== null && typeof v === 'object') return v.constructor?.name ?? 'Object';
    if(typeof v === 'string') return JSON.stringify(v.length > 80 ? `${v.slice(0, 80)}…` : v);
    return String(v);
};
const globalCatalog = () => {
    const cat = { Variable: [], Object: [], Array: [] };
    for(const name of Object.getOwnPropertyNames(w).sort()){
        let v, text;
        try{ v = w[name]; }catch{ continue; }
        if(isFn(v)) continue;
        try{ text = globalPreview(v); }catch{ text = '(unreadable)'; }
        const g = Array.isArray(v) ? 'Array' : (v !== null && typeof v === 'object') ? 'Object' : 'Variable';
        cat[g].push([name, text]);
    }
    return cat;
};
const cell = (content, tagName = 'td') => {
    const el = $C(tagName, {
        styles: {
            border: '1px solid #ccc', padding: '2px 6px', textAlign: 'left', verticalAlign: 'top',
            wordBreak: 'break-all', background: tagName === 'th' ? '#f5f5f5' : ''
        }
    });
    el.append(content);
    return el;
};
const tableOf = (heads, rows) => {
    const table = $C('table', { styles: { borderCollapse: 'collapse', width: '100%', font: '12px monospace' } });
    for(const [cells, tagName] of [[heads, 'th'], ...rows.map(r => [r, 'td'])]){
        const tr = $C('tr');
        tr.append(...cells.map(c => cell(c, tagName)));
        table.appendChild(tr);
    }
    return table;
};
const logGlobal = name => silent(() => {
    try{ l(name, w[name]); }catch(e){ l(name, e); }
});
const nameCell = name => $C('span', {
    props: { textContent: name },
    attrs: { title: 'Click to log to console' },
    styles: { cursor: 'pointer', color: '#06c', textDecoration: 'underline' },
    on: { click: () => logGlobal(name) }
});
const renderGlobals = page => silent(() => {
    page.replaceChildren();
    for(const [group, items] of Object.entries(globalCatalog())){
        const box = $C('details', { styles: { margin: '4px 0', border: '1px solid #ccc', borderRadius: '4px' } });
        box.appendChild($C('summary', {
            props: { textContent: `${group} (${items.length})` },
            styles: { cursor: 'pointer', fontWeight: 'bold', background: '#eee', padding: '3px 6px' }
        }));
        const wrap = $C('div', { styles: { padding: '6px', overflowX: 'auto' } });
        wrap.appendChild(tableOf(['Name', 'Value'], items.map(([name, text]) => [nameCell(name), text])));
        box.appendChild(wrap);
        page.appendChild(box);
    }
});
const groupBox = (group, names, store, storeName, keyOf, apply, onChange) => {
    const box = $C('details', { styles: { margin: '4px 0', border: '1px solid #ccc', borderRadius: '4px' } });
    const head = $C('summary', { styles: { cursor: 'pointer', fontWeight: 'bold', background: '#eee', padding: '3px 6px' } });
    const refresh = () => {
        head.textContent = `${group} (${names.filter(n => store[keyOf(n)]).length} / ${names.length})`;
    };
    box.appendChild(head);
    const grid = $C('div', {
        styles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '2px 8px', padding: '6px' }
    });
    for(const name of names){
        const k = keyOf(name);
        const label = $C('label', { styles: { cursor: 'pointer', wordBreak: 'break-all' } });
        const cb = $C('input', {
            attrs: { type: 'checkbox' },
            props: { checked: !!store[k] },
            on: {
                change: () => {
                    if(cb.checked) store[k] = true; else delete store[k];
                    GM.setValue(storeName, store);
                    apply?.(k, cb.checked);
                    refresh();
                    onChange();
                }
            }
        });
        label.append(cb, ` ${name}`);
        grid.appendChild(label);
    }
    box.appendChild(grid);
    refresh();
    return box;
};
const renameOriginal = flags => {
    const out = dict();
    for(const k of Object.keys(flags)) out[k.startsWith('original.') ? `Original.${k.slice(9)}` : k] = true;
    return out;
};
const normalize = data => {
    const o = isObj(data) ? data : {};
    const c = isObj(o.custom) ? o.custom : {};
    return {
        fnHooks: renameOriginal(cleanFlags(o.fnHooks)),
        props: cleanFlags(o.props),
        custom: { fn: cleanNames(c.fn), prop: cleanNames(c.prop) },
        overrides: cleanOverrides(o.overrides),
        logOnKey: o.logOnKey === true,
        logKey: typeof o.logKey === 'string' ? o.logKey : '',
        rate: Number.isFinite(o.rate) && o.rate >= 0 ? Math.floor(o.rate) : 10
    };
};
const loadSettings = async () => normalize({
    fnHooks: await GM.getValue('fnHooks', {}),
    props: await GM.getValue('props', {}),
    custom: await GM.getValue('custom', {}),
    overrides: await GM.getValue('overrides', []),
    logOnKey: await GM.getValue('logOnKey', false),
    logKey: await GM.getValue('logKey', ''),
    rate: await GM.getValue('rate', 10)
});
const storeSettings = s => Promise.all([
    GM.setValue('fnHooks', s.fnHooks),
    GM.setValue('props', s.props),
    GM.setValue('custom', s.custom),
    GM.setValue('overrides', s.overrides),
    GM.setValue('logOnKey', s.logOnKey),
    GM.setValue('logKey', s.logKey),
    GM.setValue('rate', s.rate)
]);
const useSettings = s => {
    cfg.hooks = s.fnHooks;
    cfg.props = s.props;
    cfg.custom = s.custom;
    cfg.overrides = s.overrides;
    cfg.logOnKey = s.logOnKey;
    cfg.key = s.logKey;
    cfg.rate = s.rate;
};
const persist = () => storeSettings({
    fnHooks: cfg.hooks, props: cfg.props, custom: cfg.custom, overrides: cfg.overrides, logOnKey: cfg.logOnKey, logKey: cfg.key, rate: cfg.rate
});
const rebuild = async tab => {
    silent(() => $S('#uh-root')?.remove());
    panel = remoteReady.then(() => buildPanel(tab));
    (await panel).style.display = 'flex';
};
const commit = async tab => {
    await persist();
    await rebuild(tab);
};
const unhookAll = () => {
    for(const id of Object.keys(cfg.hooks)) unhook(id);
    for(const name of [...propSlots.keys()]) unhookProp(name);
};
const hookAll = () => {
    for(const id of Object.keys(cfg.hooks)) hook(id);
    for(const name of Object.keys(cfg.props)) hookProp(name);
};
const resetAll = async () => {
    unhookAll();
    held = false;
    useSettings(normalize({}));
    await persist();
};
const exportSettings = async () => {
    const text = JSON.stringify(await loadSettings(), null, 2);
    silent(() => {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = $C('a', { attrs: { href: url, download: 'web-hook-inspector-settings.json' } });
        d.documentElement.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
};
const importSettings = async text => {
    const s = silent(() => {
        try{
            const data = JSON.parse(text);
            return isObj(data) ? normalize(data) : null;
        }catch{
            return null;
        }
    });
    if(!s) return false;
    unhookAll();
    held = false;
    useSettings(s);
    await storeSettings(s);
    hookAll();
    return true;
};
const dropRemote = async urls => {
    const dropped = new Set();
    for(const url of urls){
        const gone = remote.data[url];
        if(!gone) continue;
        remote.urls = remote.urls.filter(u => u !== url);
        delete remote.data[url];
        const fnLeft = mergeGroups(silent(catalog), remoteGroups('fnHooks'));
        const propLeft = Object.values(mergeGroups(PROPS, remoteGroups('props'))).flat();
        for(const [g, ns] of Object.entries(gone.fnHooks)){
            for(const n of ns){
                if(fnLeft[g]?.includes(n)) continue;
                const id = `${g}.${n}`;
                unhook(id);
                delete cfg.hooks[id];
                dropped.add(fnKey(id));
            }
        }
        for(const n of Object.values(gone.props).flat()){
            if(propLeft.includes(n) || cfg.custom.prop.includes(n)) continue;
            unhookProp(n);
            delete cfg.props[n];
            dropped.add(`prop:${n}`);
        }
    }
    syncRemoteOv();
    cfg.overrides = cfg.overrides.filter(o => !dropped.has(o.key));
    await persist();
    await saveRemote();
    await rebuild(5);
};
const buildCustom = (page, baseProps) => {
    let editing = null;
    const flagsOf = type => type === 'fn' ? cfg.hooks : cfg.props;
    const keyOf = (type, name) => type === 'fn' ? `Custom.${name}` : name;
    const sharedProp = name => Object.values(baseProps).some(ns => ns.includes(name));
    const typeSel = $C('select');
    typeSel.append(
        $C('option', { attrs: { value: 'fn' }, props: { textContent: 'Functions' } }),
        $C('option', { attrs: { value: 'prop' }, props: { textContent: 'Properties' } })
    );
    const nameIn = $C('input', { attrs: { type: 'text', placeholder: "Add unregistered Fn/Props" }, styles: { width: '260px' } });
    const msg = $C('span', { styles: { color: '#c00' } });
    const clear = () => {
        editing = null;
        nameIn.value = '';
        msg.textContent = '';
        submitBtn.textContent = 'Add';
        cancelBtn.style.display = 'none';
    };
    const drop = (type, name) => {
        cfg.custom[type] = cfg.custom[type].filter(n => n !== name);
        if(type === 'prop' && sharedProp(name)) return false;
        const key = keyOf(type, name), flags = flagsOf(type), on = !!flags[key];
        if(type === 'fn') unhook(key); else unhookProp(key);
        delete flags[key];
        return on;
    };
    const submit = async () => {
        const type = typeSel.value, name = nameIn.value.trim();
        if(!name){
            msg.textContent = 'Name is required.';
            return;
        }
        if(/\s/.test(name)){
            msg.textContent = 'Name must not contain spaces.';
            return;
        }
        if(type === 'fn' && !parsePath(name)){
            msg.textContent = 'Invalid path.';
            return;
        }
        const same = editing && editing.type === type && editing.name === name;
        if(!same && (cfg.custom[type].includes(name) || (type === 'prop' && sharedProp(name)))){
            msg.textContent = 'Already listed.';
            return;
        }
        const on = editing ? drop(editing.type, editing.name) : false;
        cfg.custom[type].push(name);
        if(on){
            const key = keyOf(type, name);
            flagsOf(type)[key] = true;
            if(type === 'fn') hook(key); else hookProp(key);
        }
        await commit(3);
    };
    const submitBtn = $C('button', { props: { textContent: 'Add' }, styles: { cursor: 'pointer' }, on: { click: submit } });
    const cancelBtn = $C('button', { props: { textContent: 'Cancel' }, styles: { cursor: 'pointer', display: 'none' }, on: { click: clear } });
    const form = $C('div', { styles: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '8px' } });
    form.append(typeSel, nameIn, submitBtn, cancelBtn, msg);
    const rows = [];
    for(const type of ['fn', 'prop']){
        for(const name of cfg.custom[type]){
            const actions = $C('span', { styles: { display: 'flex', gap: '4px' } });
            actions.append(
                $C('button', {
                    props: { textContent: 'Edit' },
                    styles: { cursor: 'pointer' },
                    on: {
                        click: () => {
                            editing = { type, name };
                            typeSel.value = type;
                            nameIn.value = name;
                            msg.textContent = '';
                            submitBtn.textContent = 'Save';
                            cancelBtn.style.display = '';
                        }
                    }
                }),
                $C('button', {
                    props: { textContent: 'Delete' },
                    styles: { cursor: 'pointer' },
                    on: { click: async () => { drop(type, name); await commit(3); } }
                })
            );
            rows.push([type === 'fn' ? 'Functions' : 'Properties', name, actions]);
        }
    }
    page.append(form, rows.length ? tableOf(['Target', 'Name', ''], rows) : 'No custom entries.');
};
const targetLabel = key => key.slice(key.indexOf(':') + 1);
const typeOf = key => key.startsWith('prop:') ? 'prop' : 'fn';

// ---- Copy用: 他のscriptにそのまま貼れるスニペット生成 ----
const snippetRuntime = (cfg, run) => {
    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const rApply = Reflect.apply, rConstruct = Reflect.construct;
    const isFn = v => typeof v === 'function';
    const mine = new WeakSet();
    let busy = false, propDone = false;
    const apply = (source, args, result) => {
        busy = true;
        try{
            const r = rApply(run, null, [source, args, result, w]);
            return [r[0], Array.isArray(r[1]) ? r[1] : [r[1]], r[2]];
        }catch{
            return [source, args, result];
        }finally{
            busy = false;
        }
    };
    const trace = (source, args, call, filter) => {
        if(busy || (filter && !filter(args))) return call(args, source);
        let src = source, a = args;
        if(cfg.phase === 'before'){
            const r = apply(src, a, undefined);
            if(src !== null) src = r[0];
            a = r[1];
        }
        let res = call(a, src);
        if(cfg.phase === 'after') res = apply(src, a, res)[2];
        return res;
    };
    const isCustomEvent = a => {
        const t = typeof a[0] === 'string' ? a[0] : a[0]?.type;
        return typeof t === 'string' && !('on' + t in w) && !('on' + t in document);
    };
    const walk = path => {
        let o = w;
        for(const k of path){
            try{ o = k === '__proto__' ? Object.getPrototypeOf(o) : o[k]; }catch{ return null; }
            if(o === null || o === undefined) return null;
        }
        return o;
    };
    const install = (obj, key, filter) => {
        const desc = Object.getOwnPropertyDescriptor(obj, key);
        if(!desc || !isFn(desc.value) || mine.has(desc.value)) return;
        const orig = desc.value;
        const proxy = new Proxy(orig, {
            apply: (t, th, a) => trace(th, a, (x, s) => rApply(orig, s, x), filter),
            construct: (t, a, nt) => trace(null, a, x => rConstruct(orig, x, nt), filter)
        });
        mine.add(proxy);
        try{ Object.defineProperty(obj, key, { ...desc, value: proxy }); }catch{}
    };
    const hookFn = () => {
        for(const s of cfg.specs){
            const base = walk(s.path);
            if(base === null) continue;
            for(const key of s.keys){
                if(!s.chain){ install(base, key, s.custom ? isCustomEvent : null); continue; }
                for(let p = base; p && p !== w.Object.prototype; p = Object.getPrototypeOf(p)){
                    if(isFn(Object.getOwnPropertyDescriptor(p, key)?.value)){ install(p, key, null); break; }
                }
            }
        }
    };
    const hookProp = () => {
        if(propDone) return;
        propDone = true;
        const name = cfg.name;
        for(const obj of [w, w.Object.prototype, w.Array.prototype, w.Function.prototype]){
            const prev = Object.getOwnPropertyDescriptor(obj, name);
            if(prev && !prev.configurable) continue;
            const values = new WeakMap();
            const keyOf = t => (t !== null && (typeof t === 'object' || isFn(t))) ? t : obj;
            try{
                Object.defineProperty(obj, name, {
                    configurable: true, enumerable: false,
                    get(){
                        const k = keyOf(this);
                        return trace(this, [], (a, s) => {
                            if(values.has(k)) return values.get(k);
                            if(!prev) return undefined;
                            return prev.get ? rApply(prev.get, s, []) : prev.value;
                        });
                    },
                    set(v){
                        const k = keyOf(this);
                        trace(this, [v], (a, s) => {
                            if(prev?.set && !values.has(k)) return rApply(prev.set, s, a);
                            values.set(k, a[0]);
                        });
                    }
                });
            }catch{}
        }
    };
    if(cfg.type === 'fn') hookFn(); else hookProp();
};
const fnIds = key => {
    const on = Object.keys(cfg.hooks).filter(id => fnKey(id) === key);
    if(on.length) return on;
    const cat = mergeGroups({ Custom: cfg.custom.fn.slice() }, catalog(), remoteGroups('fnHooks'));
    const found = Object.entries(cat).flatMap(([g, ns]) => ns.filter(n => `fn:${n}` === key).map(n => `${g}.${n}`));
    return found.length ? found : [`Custom.${key.slice(3)}`];
};
const fnSpecs = key => silent(() => {
    const out = new Map();
    const add = (path, k, chain, custom) => {
        const id = JSON.stringify([path, chain, custom]);
        if(!out.has(id)) out.set(id, { path, keys: [], chain, custom });
        const s = out.get(id);
        if(!s.keys.includes(k)) s.keys.push(k);
    };
    for(const id of fnIds(key)){
        const i = id.indexOf('.'), group = id.slice(0, i), name = id.slice(i + 1);
        const path = parsePath(ALIAS.get(name) ?? name);
        const viaP = !IFACE.has(group) && (group === 'other' || !Object.hasOwn(TARGET_PATHS, group)) && path && path.length > 1;
        if(viaP){ add(path.slice(0, -1), path[path.length - 1], true, false); continue; }
        for(const e of resolve(group, name)){
            if(e.path) add(e.path, e.key, false, !!e.filter);
        }
    }
    return [...out.values()];
});
const snippetHead = `// Required in the destination script's meta block:\n// @run-at      document-start\n// @grant       unsafeWindow\n`;
const snippetOf = list => {
    const parts = [];
    for(const o of list){
        if(!compile(o.code)) continue;
        const isProp = o.key.startsWith('prop:');
        const conf = isProp
            ? { type: 'prop', phase: o.phase, name: targetLabel(o.key) }
            : { type: 'fn', phase: o.phase, specs: fnSpecs(o.key) };
        if(!isProp && !conf.specs.length) continue;
        parts.push(`// ${o.key} (${o.phase})\n__hook(${JSON.stringify(conf)}, function(source, args, result, w){\n${o.code}\n;return [source, args, result];\n});\n`);
    }
    if(!parts.length) return null;
    return { ok: parts.length, text: `${snippetHead}// Web Hook Inspector\n{\nconst __hook = ${rApply(fnToString, snippetRuntime, [])};\n${parts.join('')}}\n` };
};
const makeSnippet = o => snippetOf([o])?.text ?? null;
const copyText = async text => {
    try{
        if(typeof GM_setClipboard === 'function'){ GM_setClipboard(text, 'text'); return true; }
    }catch{}
    try{ await navigator.clipboard.writeText(text); return true; }catch{}
    return silent(() => {
        const ta = $C('textarea', { props: { value: text }, styles: { position: 'fixed', opacity: '0' } });
        d.documentElement.appendChild(ta);
        ta.select();
        let ok = false;
        try{ ok = document.execCommand('copy'); }catch{}
        ta.remove();
        return ok;
    });
};
const copyBtn = o => {
    const b = $C('button', { props: { textContent: 'Copy' }, styles: { cursor: 'pointer' } });
    b.addEventListener('click', async () => {
        const text = makeSnippet(o);
        b.textContent = text && await copyText(text) ? 'Copied' : 'Failed';
        setTimeout(() => { b.textContent = 'Copy'; }, 1200);
    });
    return b;
};

// 同じ(obj,key)を二重にHookしないよう、候補idを絞る
const pickIds = key => {
    const seen = new Map(), out = [];
    for(const id of fnIds(key)){
        const i = id.indexOf('.');
        const es = silent(() => resolve(id.slice(0, i), id.slice(i + 1)));
        if(es.length && es.every(e => seen.get(e.obj)?.has(e.key))) continue;
        for(const e of es){
            if(!seen.has(e.obj)) seen.set(e.obj, new Set());
            seen.get(e.obj).add(e.key);
        }
        out.push(id);
    }
    return out;
};
const targetEnabled = key => key.startsWith('prop:')
    ? !!cfg.props[targetLabel(key)]
    : Object.keys(cfg.hooks).some(id => fnKey(id) === key);
// TargetのHook/unHookだけを行う (Overrideの有効/無効には触れない)
const setTarget = async (key, on) => {
    if(key.startsWith('prop:')){
        const n = targetLabel(key);
        if(on){
            const known = Object.values(mergeGroups(PROPS, remoteGroups('props'))).flat();
            if(!known.includes(n) && !cfg.custom.prop.includes(n)) cfg.custom.prop.push(n);
            cfg.props[n] = true;
            hookProp(n);
        }else{
            delete cfg.props[n];
            unhookProp(n);
        }
    }else if(on){
        for(const id of pickIds(key)){
            const name = id.slice(id.indexOf('.') + 1);
            if(id.startsWith('Custom.') && !cfg.custom.fn.includes(name)) cfg.custom.fn.push(name);
            cfg.hooks[id] = true;
            hook(id);
        }
    }else{
        for(const id of Object.keys(cfg.hooks).filter(id => fnKey(id) === key)){
            unhook(id);
            delete cfg.hooks[id];
        }
    }
    await persist();
};
const allOverrides = () => [...cfg.overrides, ...remote.urls.flatMap(u => remote.data[u].overrides)];
const overrideJson = list => {
    const fn = [], prop = [];
    for(const o of list){
        const arr = typeOf(o.key) === 'prop' ? prop : fn;
        const n = targetLabel(o.key);
        if(!arr.includes(n)) arr.push(n);
    }
    const out = {};
    if(fn.length) out.fn = fn;
    if(prop.length) out.prop = prop;
    out.override = list.map(o => ({ key: o.key, phase: o.phase, code: o.code, name: o.name ?? '' }));
    return JSON.stringify(out, null, 2);
};
const downloadText = (name, text) => silent(() => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = $C('a', { attrs: { href: url, download: name } });
    d.documentElement.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const flash = (b, label, text) => {
    b.textContent = text;
    setTimeout(() => { b.textContent = label; }, 1500);
};
const jsonBtn = o => $C('button', {
    props: { textContent: 'JSON' },
    attrs: { title: 'Save this override as JSON' },
    styles: { cursor: 'pointer' },
    on: { click: () => downloadText(`override-${(o.name || targetLabel(o.key)).replace(/[^\w.-]+/g, '_')}.json`, overrideJson([o])) }
});
const copyAllBtn = () => {
    const b = $C('button', { props: { textContent: 'Copy All' }, attrs: { title: 'Copy a snippet that hooks every target and applies every override' }, styles: { cursor: 'pointer' } });
    b.addEventListener('click', async () => {
        const list = allOverrides();
        const r = snippetOf(list);
        flash(b, 'Copy All', r && await copyText(r.text) ? `Copied ${r.ok}/${list.length}` : 'Failed');
    });
    return b;
};
const jsonAllBtn = () => {
    const b = $C('button', { props: { textContent: 'JSON All' }, attrs: { title: 'Save all overrides as JSON' }, styles: { cursor: 'pointer' } });
    b.addEventListener('click', () => {
        const list = allOverrides();
        if(!list.length){ flash(b, 'JSON All', 'Empty'); return; }
        downloadText('web-hook-inspector-overrides.json', overrideJson(list));
    });
    return b;
};
const buildOverride = page => {
    page.replaceChildren();
    let editing = -1;
    const keys = [...new Set([
        ...Object.keys(cfg.hooks).map(fnKey),
        ...Object.keys(cfg.props).map(n => `prop:${n}`),
        ...cfg.overrides.map(o => o.key)
    ])];
    const nameIn = $C('input', { attrs: { type: 'text', placeholder: 'Name' }, styles: { width: '160px' } });
    const targetSel = $C('select', { styles: { maxWidth: '280px' } });
    targetSel.append(...keys.map(k => $C('option', { attrs: { value: k }, props: { textContent: `${typeOf(k)}: ${targetLabel(k)}` } })));
    const phaseSel = $C('select');
    phaseSel.append(
        $C('option', { attrs: { value: 'before' }, props: { textContent: 'before call (source, args)' } }),
        $C('option', { attrs: { value: 'after' }, props: { textContent: 'after call (source, args, result)' } })
    );
    const codeIn = $C('textarea', {
        attrs: { rows: 3, placeholder: 'source.Hp=30   /   args = 100  ' },
        styles: { width: '100%', boxSizing: 'border-box', font: '12px monospace' }
    });
    const msg = $C('span', { styles: { color: '#c00' } });
    const clear = () => {
        editing = -1;
        nameIn.value = '';
        codeIn.value = '';
        msg.textContent = '';
        submitBtn.textContent = 'Add';
        cancelBtn.style.display = 'none';
    };
    const submit = async () => {
        const key = targetSel.value, code = codeIn.value;
        if(!key){
            msg.textContent = 'Enable a hook first.';
            return;
        }
        if(!code.trim()){
            msg.textContent = 'Code is required.';
            return;
        }
        if(!compile(code)){
            msg.textContent = 'Syntax error in code.';
            return;
        }
        const entry = { key, phase: phaseSel.value, code, name: nameIn.value.trim() };
        if(editing >= 0) cfg.overrides[editing] = entry; else cfg.overrides.push(entry);
        await commit(4);
    };
    const submitBtn = $C('button', { props: { textContent: 'Add' }, styles: { cursor: 'pointer' }, on: { click: submit } });
    const cancelBtn = $C('button', { props: { textContent: 'Cancel' }, styles: { cursor: 'pointer', display: 'none' }, on: { click: clear } });
    const form = $C('div', { styles: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '8px' } });
    form.append(nameIn, targetSel, phaseSel, submitBtn, cancelBtn, msg);
    const hint = $C('div', {
        props: { textContent: 'Variables: source, args (array), result. A non-array args is wrapped as [args]. result is applied in the after phase. Copy: copies a standalone snippet (hook + override) for new scripts. It hooks immediately, so the target script needs // @run-at document-start and // @grant unsafeWindow.' },
        styles: { margin: '4px 0', color: '#555' }
    });
    const byKey = new Map();
    const targetCell = (key, text) => {
        const cb = $C('input', { attrs: { type: 'checkbox', title: 'Hook / unhook this target' }, props: { checked: targetEnabled(key) } });
        if(!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(cb);
        cb.addEventListener('change', async () => {
            await setTarget(key, cb.checked);
            const on = targetEnabled(key);
            for(const c of byKey.get(key)) c.checked = on;
        });
        const label = $C('label', { styles: { cursor: 'pointer' } });
        label.append(cb, ` ${text}`);
        return label;
    };
    const codeCell = o => $C('span', { props: { textContent: o.code }, styles: { whiteSpace: 'pre-wrap' } });
    const rows = cfg.overrides.map((o, i) => {
        const actions = $C('span', { styles: { display: 'flex', gap: '4px' } });
        actions.append(
            $C('button', {
                props: { textContent: 'Edit' },
                styles: { cursor: 'pointer' },
                on: {
                    click: () => {
                        editing = i;
                        nameIn.value = o.name || '';
                        targetSel.value = o.key;
                        phaseSel.value = o.phase;
                        codeIn.value = o.code;
                        msg.textContent = '';
                        submitBtn.textContent = 'Save';
                        cancelBtn.style.display = '';
                    }
                }
            }),
            $C('button', {
                props: { textContent: 'Delete' },
                styles: { cursor: 'pointer' },
                on: { click: async () => { cfg.overrides.splice(i, 1); await commit(4); } }
            }),
            copyBtn(o),
            jsonBtn(o)
        );
        return [typeOf(o.key), o.name || '', targetCell(o.key, targetLabel(o.key)), o.phase, codeCell(o), actions];
    });
    // Manageタブで追加したJSON由来のOverride (編集・削除はManageタブから)
    for(const url of remote.urls){
        for(const o of remote.data[url].overrides){
            const actions = $C('span', { styles: { display: 'flex', gap: '4px' } });
            actions.append(copyBtn(o), jsonBtn(o));
            rows.push([typeOf(o.key), o.name || '', targetCell(o.key, `${targetLabel(o.key)} (${groupOf(url)})`), o.phase, codeCell(o), actions]);
        }
    }
    const bar = $C('div', { styles: { display: 'flex', gap: '8px', marginBottom: '8px' } });
    bar.append(copyAllBtn(), jsonAllBtn());
    page.append(bar, form, codeIn, hint, rows.length ? tableOf(['Type', 'Name', 'Target', 'Phase', 'Code', ''], rows) : 'No overrides.');
};
let manageNote = '';
const buildManage = page => {
    const selected = new Set();
    const urlIn = $C('input', { attrs: { type: 'text', placeholder: 'https://example.com/hooks.json' }, styles: { width: '420px', maxWidth: '100%' } });
    const msg = $C('span', { styles: { color: '#c00' }, props: { textContent: manageNote } });
    manageNote = '';
    const count = g => Object.values(g).reduce((t, ns) => t + ns.length, 0);
    // github.com/.../blob/... は raw.githubusercontent.com に変換
    const toRaw = u => u.replace(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i, 'https://raw.githubusercontent.com/$1/$2/$3');
    // 追加できたらtrue。失敗時は理由をnotesに積む
    const register = (key, raw, notes) => {
        if(raw === null){
            notes.push(`${key}: failed to load JSON`);
            return false;
        }
        const data = normalizeRemote(raw, key);
        if(!count(data.fnHooks) && !count(data.props) && !data.overrides.length){
            notes.push(`${key}: no valid fn / prop / override found`);
            return false;
        }
        remote.urls.push(key);
        remote.data[key] = data;
        return true;
    };
    const finish = async (added, notes) => {
        if(added){
            syncRemoteOv();
            await saveRemote();
            manageNote = notes.join(' / ');
            await rebuild(5);
        }else{
            msg.textContent = notes.join(' / ');
        }
    };
    const add = async () => {
        const url = toRaw(urlIn.value.trim());
        if(!/^https?:\/\/\S+$/i.test(url)){
            msg.textContent = 'Enter a valid http(s) URL.';
            return;
        }
        if(remote.urls.includes(url)){
            msg.textContent = 'Already listed.';
            return;
        }
        msg.textContent = 'Loading...';
        const notes = [];
        await finish(register(url, await fetchJson(url), notes), notes);
    };
    const addFiles = async files => {
        const notes = [];
        let added = false;
        for(const file of files){
            const key = `file:${file.name}`;
            if(remote.urls.includes(key)){
                notes.push(`${file.name}: already listed`);
                continue;
            }
            let raw = null;
            try{ raw = JSON.parse(await file.text()); }catch{ raw = null; }
            if(register(key, raw, notes)) added = true;
        }
        await finish(added, notes);
    };
    const fileIn = $C('input', {
        attrs: { type: 'file', accept: '.json,application/json', multiple: true },
        styles: { display: 'none' },
        on: {
            change: async () => {
                const files = [...fileIn.files];
                fileIn.value = '';
                if(files.length) await addFiles(files);
            }
        }
    });
    const drop = $C('div', {
        props: { textContent: 'Drop JSON files here (or click to select)' },
        styles: { border: '2px dashed #888', borderRadius: '6px', padding: '14px', textAlign: 'center', color: '#555', cursor: 'pointer', marginBottom: '8px'},
        on: {
            click: () => fileIn.click(),
            dragover: e => { e.preventDefault(); e.stopPropagation(); drop.style.background = '#e8f4ff'; },
            dragleave: () => { drop.style.background = ''; },
            drop: async e => {
                e.preventDefault();
                e.stopPropagation();
                drop.style.background = '';
                const files = [...(e.dataTransfer?.files ?? [])];
                if(files.length) await addFiles(files);
            }
        }
    });
    const delSelected = async () => {
        if(!selected.size){
            msg.textContent = 'Select entries to delete.';
            return;
        }
        await dropRemote([...selected]);
    };
    const form = $C('div', { styles: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '8px' } });
    form.append(
        urlIn,
        $C('button', { props: { textContent: 'Add URL' }, styles: { cursor: 'pointer' }, on: { click: add } }),
        $C('button', { props: { textContent: 'Delete selected' }, styles: { cursor: 'pointer' }, on: { click: delSelected } }),
        msg, fileIn
    );
    const hint = $C('div', {
        props: { textContent: '{ "fn": ["Game","item"], "prop": ["cookies"], "override": [{ "key": "prop:cookies", "phase": "before", "code": "args=10000", "name": "CookieAmount" }] }    “fn” will be added to “Functions,”“prop”to“Properties,”and override’to“Overrides.”' },
        styles: { margin: '4px 0 8px', color: '#555', font: '12px monospace', wordBreak: 'break-all' }
    });
    const boxes = [];
    const rows = remote.urls.map(url => {
        const cb = $C('input', {
            attrs: { type: 'checkbox' },
            on: { change: () => { if(cb.checked) selected.add(url); else selected.delete(url); } }
        });
        boxes.push(cb);
        return [
            cb, url,
            `Functions: ${count(remote.data[url].fnHooks)} / Properties: ${count(remote.data[url].props)} / Overrides: ${remote.data[url].overrides.length}`
        ];
    });
    const all = $C('input', {
        attrs: { type: 'checkbox', title: 'Select all' },
        on: {
            change: () => {
                boxes.forEach((cb, i) => {
                    cb.checked = all.checked;
                    if(all.checked) selected.add(remote.urls[i]); else selected.delete(remote.urls[i]);
                });
            }
        }
    });
    page.append(drop, form, hint, rows.length ? tableOf([all, 'URL / File', 'Names'], rows) : 'No JSON URLs.');
};
const buildOptions = page => {
    const note = $C('span', { styles: { color: '#555' } });
    const row = (label, run) => {
        const line = $C('div', { styles: { display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' } });
        line.append($C('button', { props: { textContent: label }, styles: { cursor: 'pointer' }, on: { click: run } }));
        return line;
    };
    const clearFns = async () => {
        const n = Object.keys(cfg.hooks).length;
        if(!confirm(`Delete saved Functions data (${n} checked)? Hooks will be removed.`)) return;
        for(const id of Object.keys(cfg.hooks)) unhook(id);
        cfg.hooks = dict();
        await persist();
        await rebuild(6);
    };
    const clearProps = async () => {
        const n = Object.keys(cfg.props).length;
        if(!confirm(`Delete saved Properties data (${n} checked)? Hooks will be removed.`)) return;
        for(const name of Object.keys(cfg.props)) unhookProp(name);
        cfg.props = dict();
        await persist();
        await rebuild(6);
    };
    page.append(
        row(`Delete saved Functions data (${Object.keys(cfg.hooks).length})`, clearFns),
        row(`Delete saved Properties data (${Object.keys(cfg.props).length})`, clearProps),
        note
    );
};
// 保存データを読み直して(他のタブ/ページでの変更も反映)、指定タブで再構築する
const reloadSaved = async () => {
    const s = await loadSettings();
    for(const id of Object.keys(cfg.hooks)) if(!s.fnHooks[id]) unhook(id);
    for(const n of Object.keys(cfg.props)) if(!s.props[n]) unhookProp(n);
    useSettings(s);
    hookAll();
    const urls = await GM.getValue('jsonUrls', null);
    const cached = await GM.getValue('jsonData', {});
    if(Array.isArray(urls)){
        remote.urls = [...new Set(urls.filter(u => typeof u === 'string' && u))];
        remote.data = {};
        remote.urls.forEach(u => { remote.data[u] = normalizeRemote(isObj(cached) ? cached[u] : null, u); });
        syncRemoteOv();
    }
};
const refreshTab = async i => {
    await reloadSaved();
    await rebuild(i);
};
const buildPanel = (tab = 0) => silent(() => {
    const cat = mergeGroups({ Custom: cfg.custom.fn.slice(), Original: [] }, catalog(), remoteGroups('fnHooks'));
    const propBase = mergeGroups(PROPS, remoteGroups('props'));
    const propCat = mergeGroups({ Custom: cfg.custom.prop.slice() }, propBase);
    let current = tab;
    const root = $C('div', {
        attrs: { id: 'uh-root' },
        styles: {
            position: 'fixed', top: '10vh', left: '10vw', width: '80vw', height: '80vh', display: 'none', flexDirection: 'column',
            zIndex: '2147483647', background: '#fff', color: '#222', border: '1px solid #888', borderRadius: '8px',
            font: '13px sans-serif', colorScheme: 'light', boxShadow: '0 8px 32px rgba(0,0,0,.5)'
        }
    });
    const pages = Array.from({ length: 7 }, () => $C('div'));
    const [pageA, pageB, pageC, pageD, pageE, pageF, pageG] = pages;
    const buttons = ['Functions', 'Properties', 'Globals', 'Custom', 'Overrides', 'Manage', 'Options'].map((text, i) => $C('button', {
        props: { textContent: text },
        styles: { cursor: 'pointer' },
        on: { click: () => refreshTab(i) }
    }));
    const show = i => {
        current = i;
        pages.forEach((p, j) => {
            p.style.display = i === j ? 'block' : 'none';
            buttons[j].style.fontWeight = i === j ? 'bold' : 'normal';
        });
        if(i === 2) renderGlobals(pageC);
        if(i === 4) silent(() => buildOverride(pageE));
    };
    const tally = () => {
        buttons[0].textContent = `Functions (${sumChecked(cat, (g, n) => cfg.hooks[`${g}.${n}`])})`;
        buttons[1].textContent = `Properties (${sumChecked(propCat, (g, n) => cfg.props[n])})`;
    };
    const fillGroups = (page, groups, store, storeName, keyOf, apply) => {
        for(const [group, names] of Object.entries(groups)){
            if(!names.length && group !== 'Custom') continue;
            const box = groupBox(group, names, store, storeName, n => keyOf(group, n), apply, tally);
            page.appendChild(box);
        }
    };
    const close = $C('button', {
        props: { textContent: '×' },
        styles: { cursor: 'pointer', marginLeft: 'auto' },
        on: { click: () => { root.style.display = 'none'; } }
    });
    const head = $C('div', {
        styles: {
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
            borderBottom: '1px solid #888', background: '#eee'
        }
    });
    head.append($C('b'), ...buttons, close);
    fillGroups(pageA, cat, cfg.hooks, 'fnHooks', (g, n) => `${g}.${n}`, (id, on) => { if(on) hook(id); else unhook(id); });
    fillGroups(pageB, propCat, cfg.props, 'props', (g, n) => n, (k, on) => { if(on) hookProp(k); else unhookProp(k); });
    buildCustom(pageD, propBase);
    buildManage(pageF);
    buildOptions(pageG);
    const body = $C('div', { styles: { overflowY: 'auto', padding: '6px', flex: '1' } });
    body.append(...pages);
    show(tab);
    tally();
    const footer = $C('div', {
        styles: { borderTop: '1px solid #888', padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }
    });
    const keyLabel = $C('label', { styles: { display: 'flex', alignItems: 'center', gap: '4px' } });
    const keyCb = $C('input', {
        attrs: { type: 'checkbox' },
        props: { checked: cfg.logOnKey },
        on: {
            change: () => {
                cfg.logOnKey = keyCb.checked;
                GM.setValue('logOnKey', cfg.logOnKey);
            }
        }
    });
    const keyInput = $C('input', {
        attrs: { type: 'text', readonly: true, placeholder: 'press a key' },
        props: { value: cfg.key },
        styles: { width: '100px' },
        on: {
            keydown: e => {
                e.preventDefault();
                e.stopPropagation();
                cfg.key = e.key;
                keyInput.value = e.key;
                GM.setValue('logKey', cfg.key);
            }
        }
    });
    keyLabel.append(keyCb, 'Log during keydown key: ', keyInput);
    const rateLabel = $C('label', {
        attrs: { title: 'Set to 0 to remove the limit (unlimited logs per second).' },
        styles: { display: 'flex', alignItems: 'center', gap: '4px' }
    });
    const rateInput = $C('input', {
        attrs: { type: 'number', min: 0, step: 1 },
        props: { value: cfg.rate },
        styles: { width: '80px' },
        on: {
            change: () => {
                cfg.rate = Math.max(0, Math.floor(Number(rateInput.value)) || 0);
                rateInput.value = cfg.rate;
                GM.setValue('rate', cfg.rate);
            }
        }
    });
    rateLabel.append('Max logs / sec: ', rateInput);
    const status = $C('span', { styles: { color: '#c00' } });
    const fileIn = $C('input', {
        attrs: { type: 'file', accept: '.json,application/json' },
        styles: { display: 'none' },
        on: {
            change: async () => {
                const file = fileIn.files[0];
                fileIn.value = '';
                if(!file) return;
                if(await importSettings(await file.text())) await rebuild(current);
                else status.textContent = 'Import failed: invalid settings file.';
            }
        }
    });
    const importBtn = $C('button', {
        props: { textContent: 'Import' },
        styles: { cursor: 'pointer' },
        on: { click: () => silent(() => fileIn.click()) }
    });
    const exportBtn = $C('button', {
        props: { textContent: 'Export' },
        styles: { cursor: 'pointer' },
        on: { click: exportSettings }
    });
    const reset = $C('button', {
        props: { textContent: 'Reset' },
        styles: { cursor: 'pointer' },
        on: {
            click: async () => {
                if(!confirm('Reset all hooks, custom entries, overrides and settings?')) return;
                await resetAll();
                await rebuild(current);
            }
        }
    });
    const actions = $C('div', { styles: { marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' } });
    actions.append(status, importBtn, exportBtn, reset, fileIn);
    footer.append(keyLabel, rateLabel, actions);
    root.append(head, body, footer);
    d.documentElement.appendChild(root);
    return root;
});
const remoteReady = loadRemote();
const togglePanel = async () => {
    panel ??= remoteReady.then(() => buildPanel());
    const el = await panel;
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
};
(async () => {
    useSettings(await loadSettings());
    Object.defineProperty(w, '__orig', { value: null, writable: true, configurable: true, enumerable: false });
    d.addEventListener('keydown', e => { if(e.key === cfg.key) held = true; }, true);
    d.addEventListener('keyup', e => { if(e.key === cfg.key) held = false; }, true);
    addEventListener('blur', () => { held = false; });
    d.addEventListener('DOMContentLoaded', hookAll);
    addEventListener('load', hookAll);
    GM_registerMenuCommand('Hook Manager', togglePanel);
    hookAll();
})();
