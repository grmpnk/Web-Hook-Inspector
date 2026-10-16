// ==UserScript==
// @name         Web Hook Inspector
// @name:ja      Web Hook Inspector
// @namespace    https://github.com/grmpnk
// @version      0.1
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
// @connect      raw.githubusercontent.com
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
const JSON_URLS = [
];
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
        'after', 'attachShadow', 'before', 'prepend', 'ElAppend', 'insertAdjacentHTML', 'setAttribute', 'remove',
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
        'assign', 'create', 'defineProperties', 'defineProperty', 'ObjEntries', 'freeze', 'preventExtensions', 'setPrototypeOf', 'seal',
        'PropDescriptor', 'PropDescriptors', 'PropNames', 'PropSymbols', 'fromEntries', 'getPrototypeOf'
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
const ALIAS = new Map([
    ['XHR', 'XMLHttpRequest'], ['ElAppend', 'append'], ['ObjEntries', 'entries'],
    ['PropDescriptor', 'getOwnPropertyDescriptor'], ['PropDescriptors', 'getOwnPropertyDescriptors'],
    ['PropNames', 'getOwnPropertyNames'], ['PropSymbols', 'getOwnPropertySymbols']
]);
const aliased = new Set(ALIAS.values());
const IFACE = new Set(['HTML', 'Canvas', 'WebGL', 'Interface']);
const TARGETS = {
    Dom: () => [w.Element.prototype, w.Node.prototype, w.Document.prototype, w.DocumentFragment.prototype, w.CharacterData.prototype],
    Event: () => [w.EventTarget.prototype],
    Arr: () => [w.Array.prototype],
    Str: () => [w.String.prototype],
    Object: () => [w.Object],
    Math: () => [w.Math],
    Element: () => [w.Element.prototype],
    Node: () => [w.Node.prototype],
    Document: () => [w.Document.prototype],
    Window: () => [w],
    original: () => [w]
};
const cfg = { hooks: {}, props: {}, logOnKey: false, key: '', rate: 10 };
const slots = new Map();
const xhrMeta = new WeakMap();
const rApply = Reflect.apply, rConstruct = Reflect.construct, fnToString = Function.prototype.toString;
let held = false, sent = 0, stamp = 0, busy = false, panel = null;

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
const ownFns = o => fnNames(o).map(key => ({ obj: o, key }));
const isNative = f => /\[native code\]/.test(rApply(fnToString, f, []));
const tag = (id, key) => id.endsWith(`.${key}`) ? id : `${id} › ${key}`;

const isCustomEvent = a => {
    const t = typeof a[0] === 'string' ? a[0] : a[0]?.type;
    return typeof t === 'string' && !(`on${t}` in w) && !(`on${t}` in d);
};

const members = o => {
    const out = [];
    for(let p = o; p && p !== w.Object.prototype; p = Object.getPrototypeOf(p)){
        out.push(...ownFns(p));
    }
    return out;
};

const iface = name => {
    const c = peek(w, name);
    return isFn(c) && c.prototype ? ownFns(c.prototype) : [];
};

const other = name => {
    const c = peek(w, name);
    if(isFn(c)){
        const extra = /^[A-Z]/.test(name) ? [...(c.prototype ? ownFns(c.prototype) : []), ...ownFns(c)] : [];
        return [{ obj: w, key: name }, ...extra];
    }
    if(isFn(peek(w.Function.prototype, name))) return [{ obj: w.Function.prototype, key: name }];
    let v;
    try{ v = w[name]; }catch{ v = null; }
    if(v && typeof v === 'object') return members(v);
    return Object.getOwnPropertyNames(w).filter(k => k.startsWith(name) && isFn(peek(w, k))).flatMap(k => iface(k));
};

const resolve = (group, name) => {
    if(group === 'Event' && name === 'originalEvent'){
        return ['addEventListener', 'removeEventListener', 'dispatchEvent'].map(key => ({ obj: w.EventTarget.prototype, key, filter: isCustomEvent }));
    }
    const real = ALIAS.get(name) ?? name;
    if(IFACE.has(group)) return iface(real);
    if(group === 'other') return other(real);
    if(!Object.hasOwn(TARGETS, group)) return [];
    return TARGETS[group]().filter(t => isFn(peek(t, real))).map(obj => ({ obj, key: real }));
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

const extraFor = (obj, key) => {
    if(obj === w.XMLHttpRequest?.prototype && key === 'open') return xhrOpen;
    if(obj === w.XMLHttpRequest?.prototype && key === 'send') return xhrSend;
    if(obj === w && key === 'fetch') return fetchParsed;
    if(obj === w && key === 'WebSocket') return socketMessage;
    return null;
};

const side = (extra, info, phase) => {
    if(!extra) return;
    try{ extra(info, phase); }catch{ info.phase = phase; }
};

const touch = (info, phase) => {
    if(!isFn(w.__rewrite)) return;
    const args = info.args;
    info.phase = phase;
    try{ rApply(w.__rewrite, null, [info]); }catch{ info.args = args; }
    if(!Array.isArray(info.args)) info.args = args;
};

const traced = (labelOf, source, args, call, extra) => {
    if(busy) return call(args);
    const info = { label: '', source, args, result: undefined, threw: false, phase: '' };
    silent(() => {
        info.label = labelOf(args);
        if(!info.label) return;
        w.__orig = source;
        touch(info, 'before');
        side(extra, info, 'before');
    });
    try{
        info.result = call(info.args);
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
    a => [...slot.ids].filter(([, f]) => !f || f(a)).map(([id]) => tag(id, slot.key)).join(' | '),
    nt ? null : th,
    args,
    a => nt ? rConstruct(slot.orig, a, nt) : rApply(slot.orig, th, a),
    slot.extra
);

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
        slot.proxy = new Proxy(s.orig, {
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

const propSlots = new Map();

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
                    return traced(() => `get "${name}"`, this, [], () => {
                        if(values.has(k)) return values.get(k);
                        if(!prev) return undefined;
                        return prev.get ? rApply(prev.get, this, []) : prev.value;
                    });
                },
                set(v){
                    const k = keyOf(this);
                    traced(() => `set "${name}"`, this, [v], a => {
                        if(prev?.set && !values.has(k)) return rApply(prev.set, this, a);
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

const loadProps = async () => {
    const cat = Object.create(null);
    for(const [g, names] of Object.entries(PROPS)) cat[g] = names.slice();
    for(const data of await Promise.all(JSON_URLS.map(fetchJson))){
        if(!data || typeof data !== 'object') continue;
        for(const [g, names] of Object.entries(data)){
            if(!Array.isArray(names)) continue;
            cat[g] = [...new Set([...(cat[g] ?? []), ...names.filter(n => typeof n === 'string')])];
        }
    }
    return cat;
};

const propsReady = loadProps();

const catalog = () => {
    const cat = {};
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
    const found = {};
    for(const n of Object.getOwnPropertyNames(w)){
        const f = peek(w, n);
        if(!isFn(f) || known.has(n) || aliased.has(n)) continue;
        const g = !isNative(f) ? 'original'
            : /^HTML/.test(n) ? 'HTML'
                : /^WebGL/.test(n) ? 'WebGL'
                    : /Canvas/.test(n) ? 'Canvas'
                        : /^[A-Z]/.test(n) ? 'Interface'
                            : 'Window';
        (found[g] ??= []).push(n);
    }
    for(const [g, names] of Object.entries(found)) extend(g, names);
    return cat;
};

const sumChecked = (c, pick) => Object.entries(c).reduce((t, [g, ns]) => t + ns.filter(n => pick(g, n)).length, 0);

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

const resetAll = async () => {
    for(const id of Object.keys(cfg.hooks)) unhook(id);
    for(const name of [...propSlots.keys()]) unhookProp(name);
    cfg.hooks = {};
    cfg.props = {};
    cfg.logOnKey = false;
    cfg.key = '';
    cfg.rate = 10;
    held = false;
    await Promise.all([
        GM.setValue('fnHooks', {}),
        GM.setValue('props', {}),
        GM.setValue('logOnKey', false),
        GM.setValue('logKey', ''),
        GM.setValue('rate', 10)
    ]);
};

const buildPanel = propCat => silent(() => {
    const cat = catalog();
    const root = $C('div', {
        attrs: { id: 'uh-root' },
        styles: {
            position: 'fixed', top: '10vh', left: '10vw', width: '80vw', height: '80vh', display: 'none', flexDirection: 'column',
            zIndex: '2147483647', background: '#fff', color: '#222', border: '1px solid #888', borderRadius: '8px',
            font: '13px sans-serif', colorScheme: 'light', boxShadow: '0 8px 32px rgba(0,0,0,.5)'
        }
    });
    const pageA = $C('div');
    const pageB = $C('div');
    const pages = [pageA, pageB];
    const buttons = ['Functions', 'Properties'].map((text, i) => $C('button', {
        props: { textContent: text },
        styles: { cursor: 'pointer' },
        on: { click: () => show(i) }
    }));
    const show = i => {
        pages.forEach((p, j) => {
            p.style.display = i === j ? 'block' : 'none';
            buttons[j].style.fontWeight = i === j ? 'bold' : 'normal';
        });
    };
    const tally = () => {
        buttons[0].textContent = `Functions (${sumChecked(cat, (g, n) => cfg.hooks[`${g}.${n}`])})`;
        buttons[1].textContent = `Properties (${sumChecked(propCat, (g, n) => cfg.props[n])})`;
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
    head.append($C('b', { props: { textContent: 'Hook Manager' } }), ...buttons, close);
    for(const [group, names] of Object.entries(cat)){
        if(!names.length) continue;
        pageA.appendChild(groupBox(group, names, cfg.hooks, 'fnHooks', n => `${group}.${n}`, (id, on) => { if(on) hook(id); else unhook(id); }, tally));
    }
    for(const [group, names] of Object.entries(propCat)){
        if(!names.length) continue;
        pageB.appendChild(groupBox(group, names, cfg.props, 'props', n => n, (k, on) => { if(on) hookProp(k); else unhookProp(k); }, tally));
    }
    const body = $C('div', { styles: { overflowY: 'auto', padding: '6px', flex: '1' } });
    body.append(pageA, pageB);
    show(0);
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
    const reset = $C('button', {
        props: { textContent: 'Reset' },
        styles: { cursor: 'pointer', marginLeft: 'auto' },
        on: {
            click: async () => {
                await resetAll();
                root.remove();
                panel = null;
                togglePanel();
            }
        }
    });
    footer.append(keyLabel, rateLabel, reset);
    root.append(head, body, footer);
    d.documentElement.appendChild(root);
    return root;
});

const togglePanel = async () => {
    panel ??= propsReady.then(buildPanel);
    const el = await panel;
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
};

(async () => {
    cfg.hooks = await GM.getValue('fnHooks', {});
    cfg.props = await GM.getValue('props', {});
    cfg.logOnKey = await GM.getValue('logOnKey', false);
    cfg.key = await GM.getValue('logKey', '');
    cfg.rate = await GM.getValue('rate', 10);
    Object.defineProperty(w, '__orig', { value: null, writable: true, configurable: true, enumerable: false });

    d.addEventListener('keydown', e => { if(e.key === cfg.key) held = true; }, true);
    d.addEventListener('keyup', e => { if(e.key === cfg.key) held = false; }, true);
    addEventListener('blur', () => { held = false; });
    const applyAll = () => {
        for(const id of Object.keys(cfg.hooks)) hook(id);
        for(const name of Object.keys(cfg.props)) hookProp(name);
    };
    d.addEventListener('DOMContentLoaded', applyAll);
    addEventListener('load', applyAll);
    GM_registerMenuCommand('Hook Manager', togglePanel);
    applyAll();
})();
