// ==UserScript==
// @name         Web Hook Inspector
// @name:ja      Web Hook Inspector
// @namespace    https://github.com/grmpnk
// @version      0.1.1
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
const cfg = { hooks: {}, props: {}, custom: { fn: [], prop: [] }, logOnKey: false, key: '', rate: 10 };
const slots = new Map();
const propSlots = new Map();
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
    if(group === 'other' || !Object.hasOwn(TARGETS, group)) return other(real);
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
    try{ extra(info, phase); }catch{ return; }
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

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const cleanFlags = v => isObj(v) ? Object.fromEntries(Object.entries(v).filter(([, on]) => on === true)) : {};
const cleanNames = v => Array.isArray(v) ? [...new Set(v.filter(n => typeof n === 'string' && n && !/\s/.test(n)))] : [];

const normalize = data => {
    const o = isObj(data) ? data : {};
    const c = isObj(o.custom) ? o.custom : {};
    return {
        fnHooks: cleanFlags(o.fnHooks),
        props: cleanFlags(o.props),
        custom: { fn: cleanNames(c.fn), prop: cleanNames(c.prop) },
        logOnKey: o.logOnKey === true,
        logKey: typeof o.logKey === 'string' ? o.logKey : '',
        rate: Number.isFinite(o.rate) && o.rate >= 0 ? Math.floor(o.rate) : 10
    };
};

const loadSettings = async () => normalize({
    fnHooks: await GM.getValue('fnHooks', {}),
    props: await GM.getValue('props', {}),
    custom: await GM.getValue('custom', {}),
    logOnKey: await GM.getValue('logOnKey', false),
    logKey: await GM.getValue('logKey', ''),
    rate: await GM.getValue('rate', 10)
});

const storeSettings = s => Promise.all([
    GM.setValue('fnHooks', s.fnHooks),
    GM.setValue('props', s.props),
    GM.setValue('custom', s.custom),
    GM.setValue('logOnKey', s.logOnKey),
    GM.setValue('logKey', s.logKey),
    GM.setValue('rate', s.rate)
]);

const useSettings = s => {
    cfg.hooks = s.fnHooks;
    cfg.props = s.props;
    cfg.custom = s.custom;
    cfg.logOnKey = s.logOnKey;
    cfg.key = s.logKey;
    cfg.rate = s.rate;
};

const persist = () => storeSettings({
    fnHooks: cfg.hooks, props: cfg.props, custom: cfg.custom, logOnKey: cfg.logOnKey, logKey: cfg.key, rate: cfg.rate
});

const rebuild = async tab => {
    silent(() => $S('#uh-root')?.remove());
    panel = propsReady.then(p => buildPanel(p, tab));
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

const buildCustom = (page, baseProps) => {
    let editing = null;
    const flagsOf = type => type === 'fn' ? cfg.hooks : cfg.props;
    const keyOf = (type, name) => type === 'fn' ? `Custom.${name}` : name;
    const sharedProp = name => Object.values(baseProps).some(ns => ns.includes(name));
    const typeSel = $C('select');
    typeSel.append(
        $C('option', { attrs: { value: 'fn' }, props: { textContent: 'Functions (Tab A)' } }),
        $C('option', { attrs: { value: 'prop' }, props: { textContent: 'Properties (Tab B)' } })
    );
    const nameIn = $C('input', { attrs: { type: 'text', placeholder: 'name' }, styles: { width: '220px' } });
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

const buildPanel = (baseProps, tab = 0) => silent(() => {
    const base = Object.fromEntries(Object.entries(baseProps).filter(([g]) => g !== 'Custom'));
    const cat = { Custom: cfg.custom.fn.slice(), ...catalog() };
    const propCat = { Custom: cfg.custom.prop.slice(), ...base };
    let current = tab;
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
    const pageC = $C('div');
    const pageD = $C('div');
    const pages = [pageA, pageB, pageC, pageD];
    const buttons = ['Functions', 'Properties', 'Globals', 'Custom'].map((text, i) => $C('button', {
        props: { textContent: text },
        styles: { cursor: 'pointer' },
        on: { click: () => show(i) }
    }));
    const show = i => {
        current = i;
        pages.forEach((p, j) => {
            p.style.display = i === j ? 'block' : 'none';
            buttons[j].style.fontWeight = i === j ? 'bold' : 'normal';
        });
        if(i === 2) renderGlobals(pageC);
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
    head.append($C('b', { props: { textContent: 'Hook Manager' } }), ...buttons, close);
    fillGroups(pageA, cat, cfg.hooks, 'fnHooks', (g, n) => `${g}.${n}`, (id, on) => { if(on) hook(id); else unhook(id); });
    fillGroups(pageB, propCat, cfg.props, 'props', (g, n) => n, (k, on) => { if(on) hookProp(k); else unhookProp(k); });
    buildCustom(pageD, base);
    const body = $C('div', { styles: { overflowY: 'auto', padding: '6px', flex: '1' } });
    body.append(pageA, pageB, pageC, pageD);
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

const togglePanel = async () => {
    panel ??= propsReady.then(buildPanel);
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
