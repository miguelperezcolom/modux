const ut = Symbol.for("yaml.alias"), tt = Symbol.for("yaml.document"), K = Symbol.for("yaml.map"), Gt = Symbol.for("yaml.pair"), $ = Symbol.for("yaml.scalar"), se = Symbol.for("yaml.seq"), R = Symbol.for("yaml.node.type"), re = (o) => !!o && typeof o == "object" && o[R] === ut, be = (o) => !!o && typeof o == "object" && o[R] === tt, ke = (o) => !!o && typeof o == "object" && o[R] === K, P = (o) => !!o && typeof o == "object" && o[R] === Gt, E = (o) => !!o && typeof o == "object" && o[R] === $, xe = (o) => !!o && typeof o == "object" && o[R] === se;
function M(o) {
  if (o && typeof o == "object")
    switch (o[R]) {
      case K:
      case se:
        return !0;
    }
  return !1;
}
function I(o) {
  if (o && typeof o == "object")
    switch (o[R]) {
      case ut:
      case K:
      case $:
      case se:
        return !0;
    }
  return !1;
}
const Kt = (o) => (E(o) || M(o)) && !!o.anchor, z = Symbol("break visit"), Lo = Symbol("skip children"), he = Symbol("remove node");
function le(o, e) {
  const t = Uo(e);
  be(o) ? Z(null, o.contents, t, Object.freeze([o])) === he && (o.contents = null) : Z(null, o, t, Object.freeze([]));
}
le.BREAK = z;
le.SKIP = Lo;
le.REMOVE = he;
function Z(o, e, t, a) {
  const n = Ro(o, e, t, a);
  if (I(n) || P(n))
    return jo(o, a, n), Z(o, n, t, a);
  if (typeof n != "symbol") {
    if (M(e)) {
      a = Object.freeze(a.concat(e));
      for (let i = 0; i < e.items.length; ++i) {
        const s = Z(i, e.items[i], t, a);
        if (typeof s == "number")
          i = s - 1;
        else {
          if (s === z)
            return z;
          s === he && (e.items.splice(i, 1), i -= 1);
        }
      }
    } else if (P(e)) {
      a = Object.freeze(a.concat(e));
      const i = Z("key", e.key, t, a);
      if (i === z)
        return z;
      i === he && (e.key = null);
      const s = Z("value", e.value, t, a);
      if (s === z)
        return z;
      s === he && (e.value = null);
    }
  }
  return n;
}
function Uo(o) {
  return typeof o == "object" && (o.Collection || o.Node || o.Value) ? Object.assign({
    Alias: o.Node,
    Map: o.Node,
    Scalar: o.Node,
    Seq: o.Node
  }, o.Value && {
    Map: o.Value,
    Scalar: o.Value,
    Seq: o.Value
  }, o.Collection && {
    Map: o.Collection,
    Seq: o.Collection
  }, o) : o;
}
function Ro(o, e, t, a) {
  var n, i, s, r, l;
  if (typeof t == "function")
    return t(o, e, a);
  if (ke(e))
    return (n = t.Map) == null ? void 0 : n.call(t, o, e, a);
  if (xe(e))
    return (i = t.Seq) == null ? void 0 : i.call(t, o, e, a);
  if (P(e))
    return (s = t.Pair) == null ? void 0 : s.call(t, o, e, a);
  if (E(e))
    return (r = t.Scalar) == null ? void 0 : r.call(t, o, e, a);
  if (re(e))
    return (l = t.Alias) == null ? void 0 : l.call(t, o, e, a);
}
function jo(o, e, t) {
  const a = e[e.length - 1];
  if (M(a))
    a.items[o] = t;
  else if (P(a))
    o === "key" ? a.key = t : a.value = t;
  else if (be(a))
    a.contents = t;
  else {
    const n = re(a) ? "alias" : "scalar";
    throw new Error(`Cannot replace node with ${n} parent`);
  }
}
const Bo = {
  "!": "%21",
  ",": "%2C",
  "[": "%5B",
  "]": "%5D",
  "{": "%7B",
  "}": "%7D"
}, Fo = (o) => o.replace(/[!,[\]{}]/g, (e) => Bo[e]);
class D {
  constructor(e, t) {
    this.docStart = null, this.docEnd = !1, this.yaml = Object.assign({}, D.defaultYaml, e), this.tags = Object.assign({}, D.defaultTags, t);
  }
  clone() {
    const e = new D(this.yaml, this.tags);
    return e.docStart = this.docStart, e;
  }
  /**
   * During parsing, get a Directives instance for the current document and
   * update the stream state according to the current version's spec.
   */
  atDocument() {
    const e = new D(this.yaml, this.tags);
    switch (this.yaml.version) {
      case "1.1":
        this.atNextDocument = !0;
        break;
      case "1.2":
        this.atNextDocument = !1, this.yaml = {
          explicit: D.defaultYaml.explicit,
          version: "1.2"
        }, this.tags = Object.assign({}, D.defaultTags);
        break;
    }
    return e;
  }
  /**
   * @param onError - May be called even if the action was successful
   * @returns `true` on success
   */
  add(e, t) {
    this.atNextDocument && (this.yaml = { explicit: D.defaultYaml.explicit, version: "1.1" }, this.tags = Object.assign({}, D.defaultTags), this.atNextDocument = !1);
    const a = e.trim().split(/[ \t]+/), n = a.shift();
    switch (n) {
      case "%TAG": {
        if (a.length !== 2 && (t(0, "%TAG directive should contain exactly two parts"), a.length < 2))
          return !1;
        const [i, s] = a;
        return this.tags[i] = s, !0;
      }
      case "%YAML": {
        if (this.yaml.explicit = !0, a.length !== 1)
          return t(0, "%YAML directive should contain exactly one part"), !1;
        const [i] = a;
        if (i === "1.1" || i === "1.2")
          return this.yaml.version = i, !0;
        {
          const s = /^\d+\.\d+$/.test(i);
          return t(6, `Unsupported YAML version ${i}`, s), !1;
        }
      }
      default:
        return t(0, `Unknown directive ${n}`, !0), !1;
    }
  }
  /**
   * Resolves a tag, matching handles to those defined in %TAG directives.
   *
   * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
   *   `'!local'` tag, or `null` if unresolvable.
   */
  tagName(e, t) {
    if (e === "!")
      return "!";
    if (e[0] !== "!")
      return t(`Not a valid tag: ${e}`), null;
    if (e[1] === "<") {
      const s = e.slice(2, -1);
      return s === "!" || s === "!!" ? (t(`Verbatim tags aren't resolved, so ${e} is invalid.`), null) : (e[e.length - 1] !== ">" && t("Verbatim tags must end with a >"), s);
    }
    const [, a, n] = e.match(/^(.*!)([^!]*)$/s);
    n || t(`The ${e} tag has no suffix`);
    const i = this.tags[a];
    if (i)
      try {
        return i + decodeURIComponent(n);
      } catch (s) {
        return t(String(s)), null;
      }
    return a === "!" ? e : (t(`Could not resolve tag: ${e}`), null);
  }
  /**
   * Given a fully resolved tag, returns its printable string form,
   * taking into account current tag prefixes and defaults.
   */
  tagString(e) {
    for (const [t, a] of Object.entries(this.tags))
      if (e.startsWith(a))
        return t + Fo(e.substring(a.length));
    return e[0] === "!" ? e : `!<${e}>`;
  }
  toString(e) {
    const t = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [], a = Object.entries(this.tags);
    let n;
    if (e && a.length > 0 && I(e.contents)) {
      const i = {};
      le(e.contents, (s, r) => {
        I(r) && r.tag && (i[r.tag] = !0);
      }), n = Object.keys(i);
    } else
      n = [];
    for (const [i, s] of a)
      i === "!!" && s === "tag:yaml.org,2002:" || (!e || n.some((r) => r.startsWith(s))) && t.push(`%TAG ${i} ${s}`);
    return t.join(`
`);
  }
}
D.defaultYaml = { explicit: !1, version: "1.2" };
D.defaultTags = { "!!": "tag:yaml.org,2002:" };
function zt(o) {
  if (/[\x00-\x19\s,[\]{}]/.test(o)) {
    const t = `Anchor must not contain whitespace or control characters: ${JSON.stringify(o)}`;
    throw new Error(t);
  }
  return !0;
}
function Wt(o) {
  const e = /* @__PURE__ */ new Set();
  return le(o, {
    Value(t, a) {
      a.anchor && e.add(a.anchor);
    }
  }), e;
}
function Qt(o, e) {
  for (let t = 1; ; ++t) {
    const a = `${o}${t}`;
    if (!e.has(a))
      return a;
  }
}
function qo(o, e) {
  const t = [], a = /* @__PURE__ */ new Map();
  let n = null;
  return {
    onAnchor: (i) => {
      t.push(i), n ?? (n = Wt(o));
      const s = Qt(e, n);
      return n.add(s), s;
    },
    /**
     * With circular references, the source node is only resolved after all
     * of its child nodes are. This is why anchors are set only after all of
     * the nodes have been created.
     */
    setAnchors: () => {
      for (const i of t) {
        const s = a.get(i);
        if (typeof s == "object" && s.anchor && (E(s.node) || M(s.node)))
          s.node.anchor = s.anchor;
        else {
          const r = new Error("Failed to resolve repeated object (this should not happen)");
          throw r.source = i, r;
        }
      }
    },
    sourceObjects: a
  };
}
function ee(o, e, t, a) {
  if (a && typeof a == "object")
    if (Array.isArray(a))
      for (let n = 0, i = a.length; n < i; ++n) {
        const s = a[n], r = ee(o, a, String(n), s);
        r === void 0 ? delete a[n] : r !== s && (a[n] = r);
      }
    else if (a instanceof Map)
      for (const n of Array.from(a.keys())) {
        const i = a.get(n), s = ee(o, a, n, i);
        s === void 0 ? a.delete(n) : s !== i && a.set(n, s);
      }
    else if (a instanceof Set)
      for (const n of Array.from(a)) {
        const i = ee(o, a, n, n);
        i === void 0 ? a.delete(n) : i !== n && (a.delete(n), a.add(i));
      }
    else
      for (const [n, i] of Object.entries(a)) {
        const s = ee(o, a, n, i);
        s === void 0 ? delete a[n] : s !== i && (a[n] = s);
      }
  return o.call(e, t, a);
}
function U(o, e, t) {
  if (Array.isArray(o))
    return o.map((a, n) => U(a, String(n), t));
  if (o && typeof o.toJSON == "function") {
    if (!t || !Kt(o))
      return o.toJSON(e, t);
    const a = { aliasCount: 0, count: 1, res: void 0 };
    t.anchors.set(o, a), t.onCreate = (i) => {
      a.res = i, delete t.onCreate;
    };
    const n = o.toJSON(e, t);
    return t.onCreate && t.onCreate(n), n;
  }
  return typeof o == "bigint" && !(t != null && t.keep) ? Number(o) : o;
}
class mt {
  constructor(e) {
    Object.defineProperty(this, R, { value: e });
  }
  /** Create a copy of this node.  */
  clone() {
    const e = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    return this.range && (e.range = this.range.slice()), e;
  }
  /** A plain JavaScript representation of this node. */
  toJS(e, { mapAsMap: t, maxAliasCount: a, onAnchor: n, reviver: i } = {}) {
    if (!be(e))
      throw new TypeError("A document argument is required");
    const s = {
      anchors: /* @__PURE__ */ new Map(),
      doc: e,
      keep: !0,
      mapAsMap: t === !0,
      mapKeyWarned: !1,
      maxAliasCount: typeof a == "number" ? a : 100
    }, r = U(this, "", s);
    if (typeof n == "function")
      for (const { count: l, res: c } of s.anchors.values())
        n(c, l);
    return typeof i == "function" ? ee(i, { "": r }, "", r) : r;
  }
}
class ht extends mt {
  constructor(e) {
    super(ut), this.source = e, Object.defineProperty(this, "tag", {
      set() {
        throw new Error("Alias nodes cannot have tags");
      }
    });
  }
  /**
   * Resolve the value of this alias within `doc`, finding the last
   * instance of the `source` anchor before this node.
   */
  resolve(e, t) {
    if ((t == null ? void 0 : t.maxAliasCount) === 0)
      throw new ReferenceError("Alias resolution is disabled");
    let a;
    t != null && t.aliasResolveCache ? a = t.aliasResolveCache : (a = [], le(e, {
      Node: (i, s) => {
        (re(s) || Kt(s)) && a.push(s);
      }
    }), t && (t.aliasResolveCache = a));
    let n;
    for (const i of a) {
      if (i === this)
        break;
      i.anchor === this.source && (n = i);
    }
    return n;
  }
  toJSON(e, t) {
    if (!t)
      return { source: this.source };
    const { anchors: a, doc: n, maxAliasCount: i } = t, s = this.resolve(n, t);
    if (!s) {
      const l = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
      throw new ReferenceError(l);
    }
    let r = a.get(s);
    if (r || (U(s, null, t), r = a.get(s)), (r == null ? void 0 : r.res) === void 0) {
      const l = "This should not happen: Alias anchor was not resolved?";
      throw new ReferenceError(l);
    }
    if (i >= 0 && (r.count += 1, r.aliasCount === 0 && (r.aliasCount = Ne(n, s, a)), r.count * r.aliasCount > i)) {
      const l = "Excessive alias count indicates a resource exhaustion attack";
      throw new ReferenceError(l);
    }
    return r.res;
  }
  toString(e, t, a) {
    const n = `*${this.source}`;
    if (e) {
      if (zt(this.source), e.options.verifyAliasOrder && !e.anchors.has(this.source)) {
        const i = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new Error(i);
      }
      if (e.implicitKey)
        return `${n} `;
    }
    return n;
  }
}
function Ne(o, e, t) {
  if (re(e)) {
    const a = e.resolve(o), n = t && a && t.get(a);
    return n ? n.count * n.aliasCount : 0;
  } else if (M(e)) {
    let a = 0;
    for (const n of e.items) {
      const i = Ne(o, n, t);
      i > a && (a = i);
    }
    return a;
  } else if (P(e)) {
    const a = Ne(o, e.key, t), n = Ne(o, e.value, t);
    return Math.max(a, n);
  }
  return 1;
}
const Yt = (o) => !o || typeof o != "function" && typeof o != "object";
class A extends mt {
  constructor(e) {
    super($), this.value = e;
  }
  toJSON(e, t) {
    return t != null && t.keep ? this.value : U(this.value, e, t);
  }
  toString() {
    return String(this.value);
  }
}
A.BLOCK_FOLDED = "BLOCK_FOLDED";
A.BLOCK_LITERAL = "BLOCK_LITERAL";
A.PLAIN = "PLAIN";
A.QUOTE_DOUBLE = "QUOTE_DOUBLE";
A.QUOTE_SINGLE = "QUOTE_SINGLE";
const $o = "tag:yaml.org,2002:";
function Ho(o, e, t) {
  if (e) {
    const a = t.filter((i) => i.tag === e), n = a.find((i) => !i.format) ?? a[0];
    if (!n)
      throw new Error(`Tag ${e} not found`);
    return n;
  }
  return t.find((a) => {
    var n;
    return ((n = a.identify) == null ? void 0 : n.call(a, o)) && !a.format;
  });
}
function fe(o, e, t) {
  var d, m, u;
  if (be(o) && (o = o.contents), I(o))
    return o;
  if (P(o)) {
    const f = (m = (d = t.schema[K]).createNode) == null ? void 0 : m.call(d, t.schema, null, t);
    return f.items.push(o), f;
  }
  (o instanceof String || o instanceof Number || o instanceof Boolean || typeof BigInt < "u" && o instanceof BigInt) && (o = o.valueOf());
  const { aliasDuplicateObjects: a, onAnchor: n, onTagObj: i, schema: s, sourceObjects: r } = t;
  let l;
  if (a && o && typeof o == "object") {
    if (l = r.get(o), l)
      return l.anchor ?? (l.anchor = n(o)), new ht(l.anchor);
    l = { anchor: null, node: null }, r.set(o, l);
  }
  e != null && e.startsWith("!!") && (e = $o + e.slice(2));
  let c = Ho(o, e, s.tags);
  if (!c) {
    if (o && typeof o.toJSON == "function" && (o = o.toJSON()), !o || typeof o != "object") {
      const f = new A(o);
      return l && (l.node = f), f;
    }
    c = o instanceof Map ? s[K] : Symbol.iterator in Object(o) ? s[se] : s[K];
  }
  i && (i(c), delete t.onTagObj);
  const h = c != null && c.createNode ? c.createNode(t.schema, o, t) : typeof ((u = c == null ? void 0 : c.nodeClass) == null ? void 0 : u.from) == "function" ? c.nodeClass.from(t.schema, o, t) : new A(o);
  return e ? h.tag = e : c.default || (h.tag = c.tag), l && (l.node = h), h;
}
function Re(o, e, t) {
  let a = t;
  for (let n = e.length - 1; n >= 0; --n) {
    const i = e[n];
    if (typeof i == "number" && Number.isInteger(i) && i >= 0) {
      const s = [];
      s[i] = a, a = s;
    } else
      a = /* @__PURE__ */ new Map([[i, a]]);
  }
  return fe(a, void 0, {
    aliasDuplicateObjects: !1,
    keepUndefined: !1,
    onAnchor: () => {
      throw new Error("This should not happen, please report a bug.");
    },
    schema: o,
    sourceObjects: /* @__PURE__ */ new Map()
  });
}
const ue = (o) => o == null || typeof o == "object" && !!o[Symbol.iterator]().next().done;
class Jt extends mt {
  constructor(e, t) {
    super(e), Object.defineProperty(this, "schema", {
      value: t,
      configurable: !0,
      enumerable: !1,
      writable: !0
    });
  }
  /**
   * Create a copy of this collection.
   *
   * @param schema - If defined, overwrites the original's schema
   */
  clone(e) {
    const t = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    return e && (t.schema = e), t.items = t.items.map((a) => I(a) || P(a) ? a.clone(e) : a), this.range && (t.range = this.range.slice()), t;
  }
  /**
   * Adds a value to the collection. For `!!map` and `!!omap` the value must
   * be a Pair instance or a `{ key, value }` object, which may not have a key
   * that already exists in the map.
   */
  addIn(e, t) {
    if (ue(e))
      this.add(t);
    else {
      const [a, ...n] = e, i = this.get(a, !0);
      if (M(i))
        i.addIn(n, t);
      else if (i === void 0 && this.schema)
        this.set(a, Re(this.schema, n, t));
      else
        throw new Error(`Expected YAML collection at ${a}. Remaining path: ${n}`);
    }
  }
  /**
   * Removes a value from the collection.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(e) {
    const [t, ...a] = e;
    if (a.length === 0)
      return this.delete(t);
    const n = this.get(t, !0);
    if (M(n))
      return n.deleteIn(a);
    throw new Error(`Expected YAML collection at ${t}. Remaining path: ${a}`);
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(e, t) {
    const [a, ...n] = e, i = this.get(a, !0);
    return n.length === 0 ? !t && E(i) ? i.value : i : M(i) ? i.getIn(n, t) : void 0;
  }
  hasAllNullValues(e) {
    return this.items.every((t) => {
      if (!P(t))
        return !1;
      const a = t.value;
      return a == null || e && E(a) && a.value == null && !a.commentBefore && !a.comment && !a.tag;
    });
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   */
  hasIn(e) {
    const [t, ...a] = e;
    if (a.length === 0)
      return this.has(t);
    const n = this.get(t, !0);
    return M(n) ? n.hasIn(a) : !1;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(e, t) {
    const [a, ...n] = e;
    if (n.length === 0)
      this.set(a, t);
    else {
      const i = this.get(a, !0);
      if (M(i))
        i.setIn(n, t);
      else if (i === void 0 && this.schema)
        this.set(a, Re(this.schema, n, t));
      else
        throw new Error(`Expected YAML collection at ${a}. Remaining path: ${n}`);
    }
  }
}
const _o = (o) => o.replace(/^(?!$)(?: $)?/gm, "#");
function _(o, e) {
  return /^\n+$/.test(o) ? o.substring(1) : e ? o.replace(/^(?! *$)/gm, e) : o;
}
const W = (o, e, t) => o.endsWith(`
`) ? _(t, e) : t.includes(`
`) ? `
` + _(t, e) : (o.endsWith(" ") ? "" : " ") + t, Xt = "flow", ot = "block", Le = "quoted";
function $e(o, e, t = "flow", { indentAtStart: a, lineWidth: n = 80, minContentWidth: i = 20, onFold: s, onOverflow: r } = {}) {
  if (!n || n < 0)
    return o;
  n < i && (i = 0);
  const l = Math.max(1 + i, 1 + n - e.length);
  if (o.length <= l)
    return o;
  const c = [], h = {};
  let d = n - e.length;
  typeof a == "number" && (a > n - Math.max(2, i) ? c.push(0) : d = n - a);
  let m, u, f = !1, p = -1, g = -1, w = -1;
  t === ot && (p = Pt(o, p, e.length), p !== -1 && (d = p + l));
  for (let k; k = o[p += 1]; ) {
    if (t === Le && k === "\\") {
      switch (g = p, o[p + 1]) {
        case "x":
          p += 3;
          break;
        case "u":
          p += 5;
          break;
        case "U":
          p += 9;
          break;
        default:
          p += 1;
      }
      w = p;
    }
    if (k === `
`)
      t === ot && (p = Pt(o, p, e.length)), d = p + e.length + l, m = void 0;
    else {
      if (k === " " && u && u !== " " && u !== `
` && u !== "	") {
        const b = o[p + 1];
        b && b !== " " && b !== `
` && b !== "	" && (m = p);
      }
      if (p >= d)
        if (m)
          c.push(m), d = m + l, m = void 0;
        else if (t === Le) {
          for (; u === " " || u === "	"; )
            u = k, k = o[p += 1], f = !0;
          const b = p > w + 1 ? p - 2 : g - 1;
          if (h[b])
            return o;
          c.push(b), h[b] = !0, d = b + l, m = void 0;
        } else
          f = !0;
    }
    u = k;
  }
  if (f && r && r(), c.length === 0)
    return o;
  s && s();
  let y = o.slice(0, c[0]);
  for (let k = 0; k < c.length; ++k) {
    const b = c[k], x = c[k + 1] || o.length;
    b === 0 ? y = `
${e}${o.slice(0, x)}` : (t === Le && h[b] && (y += `${o[b]}\\`), y += `
${e}${o.slice(b + 1, x)}`);
  }
  return y;
}
function Pt(o, e, t) {
  let a = e, n = e + 1, i = o[n];
  for (; i === " " || i === "	"; )
    if (e < n + t)
      i = o[++e];
    else {
      do
        i = o[++e];
      while (i && i !== `
`);
      a = e, n = e + 1, i = o[n];
    }
  return a;
}
const He = (o, e) => ({
  indentAtStart: e ? o.indent.length : o.indentAtStart,
  lineWidth: o.options.lineWidth,
  minContentWidth: o.options.minContentWidth
}), _e = (o) => /^(%|---|\.\.\.)/m.test(o);
function Vo(o, e, t) {
  if (!e || e < 0)
    return !1;
  const a = e - t, n = o.length;
  if (n <= a)
    return !1;
  for (let i = 0, s = 0; i < n; ++i)
    if (o[i] === `
`) {
      if (i - s > a)
        return !0;
      if (s = i + 1, n - s <= a)
        return !1;
    }
  return !0;
}
function ge(o, e) {
  const t = JSON.stringify(o);
  if (e.options.doubleQuotedAsJSON)
    return t;
  const { implicitKey: a } = e, n = e.options.doubleQuotedMinMultiLineLength, i = e.indent || (_e(o) ? "  " : "");
  let s = "", r = 0;
  for (let l = 0, c = t[l]; c; c = t[++l])
    if (c === " " && t[l + 1] === "\\" && t[l + 2] === "n" && (s += t.slice(r, l) + "\\ ", l += 1, r = l, c = "\\"), c === "\\")
      switch (t[l + 1]) {
        case "u":
          {
            s += t.slice(r, l);
            const h = t.substr(l + 2, 4);
            switch (h) {
              case "0000":
                s += "\\0";
                break;
              case "0007":
                s += "\\a";
                break;
              case "000b":
                s += "\\v";
                break;
              case "001b":
                s += "\\e";
                break;
              case "0085":
                s += "\\N";
                break;
              case "00a0":
                s += "\\_";
                break;
              case "2028":
                s += "\\L";
                break;
              case "2029":
                s += "\\P";
                break;
              default:
                h.substr(0, 2) === "00" ? s += "\\x" + h.substr(2) : s += t.substr(l, 6);
            }
            l += 5, r = l + 1;
          }
          break;
        case "n":
          if (a || t[l + 2] === '"' || t.length < n)
            l += 1;
          else {
            for (s += t.slice(r, l) + `

`; t[l + 2] === "\\" && t[l + 3] === "n" && t[l + 4] !== '"'; )
              s += `
`, l += 2;
            s += i, t[l + 2] === " " && (s += "\\"), l += 1, r = l + 1;
          }
          break;
        default:
          l += 1;
      }
  return s = r ? s + t.slice(r) : t, a ? s : $e(s, i, Le, He(e, !1));
}
function at(o, e) {
  if (e.options.singleQuote === !1 || e.implicitKey && o.includes(`
`) || /[ \t]\n|\n[ \t]/.test(o))
    return ge(o, e);
  const t = e.indent || (_e(o) ? "  " : ""), a = "'" + o.replace(/'/g, "''").replace(/\n+/g, `$&
${t}`) + "'";
  return e.implicitKey ? a : $e(a, t, Xt, He(e, !1));
}
function te(o, e) {
  const { singleQuote: t } = e.options;
  let a;
  if (t === !1)
    a = ge;
  else {
    const n = o.includes('"'), i = o.includes("'");
    n && !i ? a = at : i && !n ? a = ge : a = t ? at : ge;
  }
  return a(o, e);
}
let nt;
try {
  nt = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
} catch {
  nt = /\n+(?!\n|$)/g;
}
function Ue({ comment: o, type: e, value: t }, a, n, i) {
  const { blockQuote: s, commentString: r, lineWidth: l } = a.options;
  if (!s || /\n[\t ]+$/.test(t))
    return te(t, a);
  const c = a.indent || (a.forceBlockIndent || _e(t) ? "  " : ""), h = s === "literal" ? !0 : s === "folded" || e === A.BLOCK_FOLDED ? !1 : e === A.BLOCK_LITERAL ? !0 : !Vo(t, l, c.length);
  if (!t)
    return h ? `|
` : `>
`;
  let d, m;
  for (m = t.length; m > 0; --m) {
    const x = t[m - 1];
    if (x !== `
` && x !== "	" && x !== " ")
      break;
  }
  let u = t.substring(m);
  const f = u.indexOf(`
`);
  f === -1 ? d = "-" : t === u || f !== u.length - 1 ? (d = "+", i && i()) : d = "", u && (t = t.slice(0, -u.length), u[u.length - 1] === `
` && (u = u.slice(0, -1)), u = u.replace(nt, `$&${c}`));
  let p = !1, g, w = -1;
  for (g = 0; g < t.length; ++g) {
    const x = t[g];
    if (x === " ")
      p = !0;
    else if (x === `
`)
      w = g;
    else
      break;
  }
  let y = t.substring(0, w < g ? w + 1 : g);
  y && (t = t.substring(y.length), y = y.replace(/\n+/g, `$&${c}`));
  let b = (p ? c ? "2" : "1" : "") + d;
  if (o && (b += " " + r(o.replace(/ ?[\r\n]+/g, " ")), n && n()), !h) {
    const x = t.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${c}`);
    let C = !1;
    const S = He(a, !0);
    s !== "folded" && e !== A.BLOCK_FOLDED && (S.onOverflow = () => {
      C = !0;
    });
    const v = $e(`${y}${x}${u}`, c, ot, S);
    if (!C)
      return `>${b}
${c}${v}`;
  }
  return t = t.replace(/\n+/g, `$&${c}`), `|${b}
${c}${y}${t}${u}`;
}
function Go(o, e, t, a) {
  const { type: n, value: i } = o, { actualString: s, implicitKey: r, indent: l, indentStep: c, inFlow: h } = e;
  if (r && i.includes(`
`) || h && /[[\]{},]/.test(i))
    return te(i, e);
  if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(i))
    return r || h || !i.includes(`
`) ? te(i, e) : Ue(o, e, t, a);
  if (!r && !h && n !== A.PLAIN && i.includes(`
`))
    return Ue(o, e, t, a);
  if (_e(i)) {
    if (l === "")
      return e.forceBlockIndent = !0, Ue(o, e, t, a);
    if (r && l === c)
      return te(i, e);
  }
  const d = i.replace(/\n+/g, `$&
${l}`);
  if (s) {
    const m = (p) => {
      var g;
      return p.default && p.tag !== "tag:yaml.org,2002:str" && ((g = p.test) == null ? void 0 : g.test(d));
    }, { compat: u, tags: f } = e.doc.schema;
    if (f.some(m) || u != null && u.some(m))
      return te(i, e);
  }
  return r ? d : $e(d, l, Xt, He(e, !1));
}
function gt(o, e, t, a) {
  const { implicitKey: n, inFlow: i } = e, s = typeof o.value == "string" ? o : Object.assign({}, o, { value: String(o.value) });
  let { type: r } = o;
  r !== A.QUOTE_DOUBLE && /[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(s.value) && (r = A.QUOTE_DOUBLE);
  const l = (h) => {
    switch (h) {
      case A.BLOCK_FOLDED:
      case A.BLOCK_LITERAL:
        return n || i ? te(s.value, e) : Ue(s, e, t, a);
      case A.QUOTE_DOUBLE:
        return ge(s.value, e);
      case A.QUOTE_SINGLE:
        return at(s.value, e);
      case A.PLAIN:
        return Go(s, e, t, a);
      default:
        return null;
    }
  };
  let c = l(r);
  if (c === null) {
    const { defaultKeyType: h, defaultStringType: d } = e.options, m = n && h || d;
    if (c = l(m), c === null)
      throw new Error(`Unsupported default string type ${m}`);
  }
  return c;
}
function Zt(o, e) {
  const t = Object.assign({
    blockQuote: !0,
    commentString: _o,
    defaultKeyType: null,
    defaultStringType: "PLAIN",
    directives: null,
    doubleQuotedAsJSON: !1,
    doubleQuotedMinMultiLineLength: 40,
    falseStr: "false",
    flowCollectionPadding: !0,
    indentSeq: !0,
    lineWidth: 80,
    minContentWidth: 20,
    nullStr: "null",
    simpleKeys: !1,
    singleQuote: null,
    trailingComma: !1,
    trueStr: "true",
    verifyAliasOrder: !0
  }, o.schema.toStringOptions, e);
  let a;
  switch (t.collectionStyle) {
    case "block":
      a = !1;
      break;
    case "flow":
      a = !0;
      break;
    default:
      a = null;
  }
  return {
    anchors: /* @__PURE__ */ new Set(),
    doc: o,
    flowCollectionPadding: t.flowCollectionPadding ? " " : "",
    indent: "",
    indentStep: typeof t.indent == "number" ? " ".repeat(t.indent) : "  ",
    inFlow: a,
    options: t
  };
}
function Ko(o, e) {
  var n;
  if (e.tag) {
    const i = o.filter((s) => s.tag === e.tag);
    if (i.length > 0)
      return i.find((s) => s.format === e.format) ?? i[0];
  }
  let t, a;
  if (E(e)) {
    a = e.value;
    let i = o.filter((s) => {
      var r;
      return (r = s.identify) == null ? void 0 : r.call(s, a);
    });
    if (i.length > 1) {
      const s = i.filter((r) => r.test);
      s.length > 0 && (i = s);
    }
    t = i.find((s) => s.format === e.format) ?? i.find((s) => !s.format);
  } else
    a = e, t = o.find((i) => i.nodeClass && a instanceof i.nodeClass);
  if (!t) {
    const i = ((n = a == null ? void 0 : a.constructor) == null ? void 0 : n.name) ?? (a === null ? "null" : typeof a);
    throw new Error(`Tag not resolved for ${i} value`);
  }
  return t;
}
function zo(o, e, { anchors: t, doc: a }) {
  if (!a.directives)
    return "";
  const n = [], i = (E(o) || M(o)) && o.anchor;
  i && zt(i) && (t.add(i), n.push(`&${i}`));
  const s = o.tag ?? (e.default ? null : e.tag);
  return s && n.push(a.directives.tagString(s)), n.join(" ");
}
function ne(o, e, t, a) {
  var l;
  if (P(o))
    return o.toString(e, t, a);
  if (re(o)) {
    if (e.doc.directives)
      return o.toString(e);
    if ((l = e.resolvedAliases) != null && l.has(o))
      throw new TypeError("Cannot stringify circular structure without alias nodes");
    e.resolvedAliases ? e.resolvedAliases.add(o) : e.resolvedAliases = /* @__PURE__ */ new Set([o]), o = o.resolve(e.doc);
  }
  let n;
  const i = I(o) ? o : e.doc.createNode(o, { onTagObj: (c) => n = c });
  n ?? (n = Ko(e.doc.schema.tags, i));
  const s = zo(i, n, e);
  s.length > 0 && (e.indentAtStart = (e.indentAtStart ?? 0) + s.length + 1);
  const r = typeof n.stringify == "function" ? n.stringify(i, e, t, a) : E(i) ? gt(i, e, t, a) : i.toString(e, t, a);
  return s ? E(i) || r[0] === "{" || r[0] === "[" ? `${s} ${r}` : `${s}
${e.indent}${r}` : r;
}
function Wo({ key: o, value: e }, t, a, n) {
  const { allNullValues: i, doc: s, indent: r, indentStep: l, options: { commentString: c, indentSeq: h, simpleKeys: d } } = t;
  let m = I(o) && o.comment || null;
  if (d) {
    if (m)
      throw new Error("With simple keys, key nodes cannot have comments");
    if (M(o) || !I(o) && typeof o == "object") {
      const S = "With simple keys, collection cannot be used as a key value";
      throw new Error(S);
    }
  }
  let u = !d && (!o || m && e == null && !t.inFlow || M(o) || (E(o) ? o.type === A.BLOCK_FOLDED || o.type === A.BLOCK_LITERAL : typeof o == "object"));
  t = Object.assign({}, t, {
    allNullValues: !1,
    implicitKey: !u && (d || !i),
    indent: r + l
  });
  let f = !1, p = !1, g = ne(o, t, () => f = !0, () => p = !0);
  if (!u && !t.inFlow && g.length > 1024) {
    if (d)
      throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
    u = !0;
  }
  if (t.inFlow) {
    if (i || e == null)
      return f && a && a(), g === "" ? "?" : u ? `? ${g}` : g;
  } else if (i && !d || e == null && u)
    return g = `? ${g}`, m && !f ? g += W(g, t.indent, c(m)) : p && n && n(), g;
  f && (m = null), u ? (m && (g += W(g, t.indent, c(m))), g = `? ${g}
${r}:`) : (g = `${g}:`, m && (g += W(g, t.indent, c(m))));
  let w, y, k;
  I(e) ? (w = !!e.spaceBefore, y = e.commentBefore, k = e.comment) : (w = !1, y = null, k = null, e && typeof e == "object" && (e = s.createNode(e))), t.implicitKey = !1, !u && !m && E(e) && (t.indentAtStart = g.length + 1), p = !1, !h && l.length >= 2 && !t.inFlow && !u && xe(e) && !e.flow && !e.tag && !e.anchor && (t.indent = t.indent.substring(2));
  let b = !1;
  const x = ne(e, t, () => b = !0, () => p = !0);
  let C = " ";
  if (m || w || y) {
    if (C = w ? `
` : "", y) {
      const S = c(y);
      C += `
${_(S, t.indent)}`;
    }
    x === "" && !t.inFlow ? C === `
` && k && (C = `

`) : C += `
${t.indent}`;
  } else if (!u && M(e)) {
    const S = x[0], v = x.indexOf(`
`), T = v !== -1, O = t.inFlow ?? e.flow ?? e.items.length === 0;
    if (T || !O) {
      let H = !1;
      if (T && (S === "&" || S === "!")) {
        let j = x.indexOf(" ");
        S === "&" && j !== -1 && j < v && x[j + 1] === "!" && (j = x.indexOf(" ", j + 1)), (j === -1 || v < j) && (H = !0);
      }
      H || (C = `
${t.indent}`);
    }
  } else (x === "" || x[0] === `
`) && (C = "");
  return g += C + x, t.inFlow ? b && a && a() : k && !b ? g += W(g, t.indent, c(k)) : p && n && n(), g;
}
function eo(o, e) {
  (o === "debug" || o === "warn") && console.warn(e);
}
const Te = "<<", V = {
  identify: (o) => o === Te || typeof o == "symbol" && o.description === Te,
  default: "key",
  tag: "tag:yaml.org,2002:merge",
  test: /^<<$/,
  resolve: () => Object.assign(new A(Symbol(Te)), {
    addToJSMap: to
  }),
  stringify: () => Te
}, Qo = (o, e) => (V.identify(e) || E(e) && (!e.type || e.type === A.PLAIN) && V.identify(e.value)) && (o == null ? void 0 : o.doc.schema.tags.some((t) => t.tag === V.tag && t.default));
function to(o, e, t) {
  const a = oo(o, t);
  if (xe(a))
    for (const n of a.items)
      Qe(o, e, n);
  else if (Array.isArray(a))
    for (const n of a)
      Qe(o, e, n);
  else
    Qe(o, e, a);
}
function Qe(o, e, t) {
  const a = oo(o, t);
  if (!ke(a))
    throw new Error("Merge sources must be maps or map aliases");
  const n = a.toJSON(null, o, Map);
  for (const [i, s] of n)
    e instanceof Map ? e.has(i) || e.set(i, s) : e instanceof Set ? e.add(i) : Object.prototype.hasOwnProperty.call(e, i) || Object.defineProperty(e, i, {
      value: s,
      writable: !0,
      enumerable: !0,
      configurable: !0
    });
  return e;
}
function oo(o, e) {
  return o && re(e) ? e.resolve(o.doc, o) : e;
}
function ao(o, e, { key: t, value: a }) {
  if (I(t) && t.addToJSMap)
    t.addToJSMap(o, e, a);
  else if (Qo(o, t))
    to(o, e, a);
  else {
    const n = U(t, "", o);
    if (e instanceof Map)
      e.set(n, U(a, n, o));
    else if (e instanceof Set)
      e.add(n);
    else {
      const i = Yo(t, n, o), s = U(a, i, o);
      i in e ? Object.defineProperty(e, i, {
        value: s,
        writable: !0,
        enumerable: !0,
        configurable: !0
      }) : e[i] = s;
    }
  }
  return e;
}
function Yo(o, e, t) {
  if (e === null)
    return "";
  if (typeof e != "object")
    return String(e);
  if (I(o) && (t != null && t.doc)) {
    const a = Zt(t.doc, {});
    a.anchors = /* @__PURE__ */ new Set();
    for (const i of t.anchors.keys())
      a.anchors.add(i.anchor);
    a.inFlow = !0, a.inStringifyKey = !0;
    const n = o.toString(a);
    if (!t.mapKeyWarned) {
      let i = JSON.stringify(n);
      i.length > 40 && (i = i.substring(0, 36) + '..."'), eo(t.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${i}. Set mapAsMap: true to use object keys.`), t.mapKeyWarned = !0;
    }
    return n;
  }
  return JSON.stringify(e);
}
function ft(o, e, t) {
  const a = fe(o, void 0, t), n = fe(e, void 0, t);
  return new N(a, n);
}
class N {
  constructor(e, t = null) {
    Object.defineProperty(this, R, { value: Gt }), this.key = e, this.value = t;
  }
  clone(e) {
    let { key: t, value: a } = this;
    return I(t) && (t = t.clone(e)), I(a) && (a = a.clone(e)), new N(t, a);
  }
  toJSON(e, t) {
    const a = t != null && t.mapAsMap ? /* @__PURE__ */ new Map() : {};
    return ao(t, a, this);
  }
  toString(e, t, a) {
    return e != null && e.doc ? Wo(this, e, t, a) : JSON.stringify(this);
  }
}
function no(o, e, t) {
  return (e.inFlow ?? o.flow ? Xo : Jo)(o, e, t);
}
function Jo({ comment: o, items: e }, t, { blockItemPrefix: a, flowChars: n, itemIndent: i, onChompKeep: s, onComment: r }) {
  const { indent: l, options: { commentString: c } } = t, h = Object.assign({}, t, { indent: i, type: null });
  let d = !1;
  const m = [];
  for (let f = 0; f < e.length; ++f) {
    const p = e[f];
    let g = null;
    if (I(p))
      !d && p.spaceBefore && m.push(""), je(t, m, p.commentBefore, d), p.comment && (g = p.comment);
    else if (P(p)) {
      const y = I(p.key) ? p.key : null;
      y && (!d && y.spaceBefore && m.push(""), je(t, m, y.commentBefore, d));
    }
    d = !1;
    let w = ne(p, h, () => g = null, () => d = !0);
    g && (w += W(w, i, c(g))), d && g && (d = !1), m.push(a + w);
  }
  let u;
  if (m.length === 0)
    u = n.start + n.end;
  else {
    u = m[0];
    for (let f = 1; f < m.length; ++f) {
      const p = m[f];
      u += p ? `
${l}${p}` : `
`;
    }
  }
  return o ? (u += `
` + _(c(o), l), r && r()) : d && s && s(), u;
}
function Xo({ items: o }, e, { flowChars: t, itemIndent: a }) {
  const { indent: n, indentStep: i, flowCollectionPadding: s, options: { commentString: r } } = e;
  a += i;
  const l = Object.assign({}, e, {
    indent: a,
    inFlow: !0,
    type: null
  });
  let c = !1, h = 0;
  const d = [];
  for (let f = 0; f < o.length; ++f) {
    const p = o[f];
    let g = null;
    if (I(p))
      p.spaceBefore && d.push(""), je(e, d, p.commentBefore, !1), p.comment && (g = p.comment);
    else if (P(p)) {
      const y = I(p.key) ? p.key : null;
      y && (y.spaceBefore && d.push(""), je(e, d, y.commentBefore, !1), y.comment && (c = !0));
      const k = I(p.value) ? p.value : null;
      k ? (k.comment && (g = k.comment), k.commentBefore && (c = !0)) : p.value == null && (y != null && y.comment) && (g = y.comment);
    }
    g && (c = !0);
    let w = ne(p, l, () => g = null);
    c || (c = d.length > h || w.includes(`
`)), f < o.length - 1 ? w += "," : e.options.trailingComma && (e.options.lineWidth > 0 && (c || (c = d.reduce((y, k) => y + k.length + 2, 2) + (w.length + 2) > e.options.lineWidth)), c && (w += ",")), g && (w += W(w, a, r(g))), d.push(w), h = d.length;
  }
  const { start: m, end: u } = t;
  if (d.length === 0)
    return m + u;
  if (!c) {
    const f = d.reduce((p, g) => p + g.length + 2, 2);
    c = e.options.lineWidth > 0 && f > e.options.lineWidth;
  }
  if (c) {
    let f = m;
    for (const p of d)
      f += p ? `
${i}${n}${p}` : `
`;
    return `${f}
${n}${u}`;
  } else
    return `${m}${s}${d.join(" ")}${s}${u}`;
}
function je({ indent: o, options: { commentString: e } }, t, a, n) {
  if (a && n && (a = a.replace(/^\n+/, "")), a) {
    const i = _(e(a), o);
    t.push(i.trimStart());
  }
}
function Q(o, e) {
  const t = E(e) ? e.value : e;
  for (const a of o)
    if (P(a) && (a.key === e || a.key === t || E(a.key) && a.key.value === t))
      return a;
}
class L extends Jt {
  static get tagName() {
    return "tag:yaml.org,2002:map";
  }
  constructor(e) {
    super(K, e), this.items = [];
  }
  /**
   * A generic collection parsing method that can be extended
   * to other node classes that inherit from YAMLMap
   */
  static from(e, t, a) {
    const { keepUndefined: n, replacer: i } = a, s = new this(e), r = (l, c) => {
      if (typeof i == "function")
        c = i.call(t, l, c);
      else if (Array.isArray(i) && !i.includes(l))
        return;
      (c !== void 0 || n) && s.items.push(ft(l, c, a));
    };
    if (t instanceof Map)
      for (const [l, c] of t)
        r(l, c);
    else if (t && typeof t == "object")
      for (const l of Object.keys(t))
        r(l, t[l]);
    return typeof e.sortMapEntries == "function" && s.items.sort(e.sortMapEntries), s;
  }
  /**
   * Adds a value to the collection.
   *
   * @param overwrite - If not set `true`, using a key that is already in the
   *   collection will throw. Otherwise, overwrites the previous value.
   */
  add(e, t) {
    var s;
    let a;
    P(e) ? a = e : !e || typeof e != "object" || !("key" in e) ? a = new N(e, e == null ? void 0 : e.value) : a = new N(e.key, e.value);
    const n = Q(this.items, a.key), i = (s = this.schema) == null ? void 0 : s.sortMapEntries;
    if (n) {
      if (!t)
        throw new Error(`Key ${a.key} already set`);
      E(n.value) && Yt(a.value) ? n.value.value = a.value : n.value = a.value;
    } else if (i) {
      const r = this.items.findIndex((l) => i(a, l) < 0);
      r === -1 ? this.items.push(a) : this.items.splice(r, 0, a);
    } else
      this.items.push(a);
  }
  delete(e) {
    const t = Q(this.items, e);
    return t ? this.items.splice(this.items.indexOf(t), 1).length > 0 : !1;
  }
  get(e, t) {
    const a = Q(this.items, e), n = a == null ? void 0 : a.value;
    return (!t && E(n) ? n.value : n) ?? void 0;
  }
  has(e) {
    return !!Q(this.items, e);
  }
  set(e, t) {
    this.add(new N(e, t), !0);
  }
  /**
   * @param ctx - Conversion context, originally set in Document#toJS()
   * @param {Class} Type - If set, forces the returned collection type
   * @returns Instance of Type, Map, or Object
   */
  toJSON(e, t, a) {
    const n = a ? new a() : t != null && t.mapAsMap ? /* @__PURE__ */ new Map() : {};
    t != null && t.onCreate && t.onCreate(n);
    for (const i of this.items)
      ao(t, n, i);
    return n;
  }
  toString(e, t, a) {
    if (!e)
      return JSON.stringify(this);
    for (const n of this.items)
      if (!P(n))
        throw new Error(`Map items must all be pairs; found ${JSON.stringify(n)} instead`);
    return !e.allNullValues && this.hasAllNullValues(!1) && (e = Object.assign({}, e, { allNullValues: !0 })), no(this, e, {
      blockItemPrefix: "",
      flowChars: { start: "{", end: "}" },
      itemIndent: e.indent || "",
      onChompKeep: a,
      onComment: t
    });
  }
}
const ce = {
  collection: "map",
  default: !0,
  nodeClass: L,
  tag: "tag:yaml.org,2002:map",
  resolve(o, e) {
    return ke(o) || e("Expected a mapping for this tag"), o;
  },
  createNode: (o, e, t) => L.from(o, e, t)
};
class Y extends Jt {
  static get tagName() {
    return "tag:yaml.org,2002:seq";
  }
  constructor(e) {
    super(se, e), this.items = [];
  }
  add(e) {
    this.items.push(e);
  }
  /**
   * Removes a value from the collection.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   *
   * @returns `true` if the item was found and removed.
   */
  delete(e) {
    const t = Ee(e);
    return typeof t != "number" ? !1 : this.items.splice(t, 1).length > 0;
  }
  get(e, t) {
    const a = Ee(e);
    if (typeof a != "number")
      return;
    const n = this.items[a];
    return !t && E(n) ? n.value : n;
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   */
  has(e) {
    const t = Ee(e);
    return typeof t == "number" && t < this.items.length;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   *
   * If `key` does not contain a representation of an integer, this will throw.
   * It may be wrapped in a `Scalar`.
   */
  set(e, t) {
    const a = Ee(e);
    if (typeof a != "number")
      throw new Error(`Expected a valid index, not ${e}.`);
    const n = this.items[a];
    E(n) && Yt(t) ? n.value = t : this.items[a] = t;
  }
  toJSON(e, t) {
    const a = [];
    t != null && t.onCreate && t.onCreate(a);
    let n = 0;
    for (const i of this.items)
      a.push(U(i, String(n++), t));
    return a;
  }
  toString(e, t, a) {
    return e ? no(this, e, {
      blockItemPrefix: "- ",
      flowChars: { start: "[", end: "]" },
      itemIndent: (e.indent || "") + "  ",
      onChompKeep: a,
      onComment: t
    }) : JSON.stringify(this);
  }
  static from(e, t, a) {
    const { replacer: n } = a, i = new this(e);
    if (t && Symbol.iterator in Object(t)) {
      let s = 0;
      for (let r of t) {
        if (typeof n == "function") {
          const l = t instanceof Set ? r : String(s++);
          r = n.call(t, l, r);
        }
        i.items.push(fe(r, void 0, a));
      }
    }
    return i;
  }
}
function Ee(o) {
  let e = E(o) ? o.value : o;
  return e && typeof e == "string" && (e = Number(e)), typeof e == "number" && Number.isInteger(e) && e >= 0 ? e : null;
}
const de = {
  collection: "seq",
  default: !0,
  nodeClass: Y,
  tag: "tag:yaml.org,2002:seq",
  resolve(o, e) {
    return xe(o) || e("Expected a sequence for this tag"), o;
  },
  createNode: (o, e, t) => Y.from(o, e, t)
}, Ve = {
  identify: (o) => typeof o == "string",
  default: !0,
  tag: "tag:yaml.org,2002:str",
  resolve: (o) => o,
  stringify(o, e, t, a) {
    return e = Object.assign({ actualString: !0 }, e), gt(o, e, t, a);
  }
}, Ge = {
  identify: (o) => o == null,
  createNode: () => new A(null),
  default: !0,
  tag: "tag:yaml.org,2002:null",
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: () => new A(null),
  stringify: ({ source: o }, e) => typeof o == "string" && Ge.test.test(o) ? o : e.options.nullStr
}, wt = {
  identify: (o) => typeof o == "boolean",
  default: !0,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
  resolve: (o) => new A(o[0] === "t" || o[0] === "T"),
  stringify({ source: o, value: e }, t) {
    if (o && wt.test.test(o)) {
      const a = o[0] === "t" || o[0] === "T";
      if (e === a)
        return o;
    }
    return e ? t.options.trueStr : t.options.falseStr;
  }
};
function q({ format: o, minFractionDigits: e, tag: t, value: a }) {
  if (typeof a == "bigint")
    return String(a);
  const n = typeof a == "number" ? a : Number(a);
  if (!isFinite(n))
    return isNaN(n) ? ".nan" : n < 0 ? "-.inf" : ".inf";
  let i = Object.is(a, -0) ? "-0" : JSON.stringify(a);
  if (!o && e && (!t || t === "tag:yaml.org,2002:float") && /^-?\d/.test(i) && !i.includes("e")) {
    let s = i.indexOf(".");
    s < 0 && (s = i.length, i += ".");
    let r = e - (i.length - s - 1);
    for (; r-- > 0; )
      i += "0";
  }
  return i;
}
const io = {
  identify: (o) => typeof o == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
  resolve: (o) => o.slice(-3).toLowerCase() === "nan" ? NaN : o[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: q
}, so = {
  identify: (o) => typeof o == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  format: "EXP",
  test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
  resolve: (o) => parseFloat(o),
  stringify(o) {
    const e = Number(o.value);
    return isFinite(e) ? e.toExponential() : q(o);
  }
}, ro = {
  identify: (o) => typeof o == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
  resolve(o) {
    const e = new A(parseFloat(o)), t = o.indexOf(".");
    return t !== -1 && o[o.length - 1] === "0" && (e.minFractionDigits = o.length - t - 1), e;
  },
  stringify: q
}, Ke = (o) => typeof o == "bigint" || Number.isInteger(o), yt = (o, e, t, { intAsBigInt: a }) => a ? BigInt(o) : parseInt(o.substring(e), t);
function lo(o, e, t) {
  const { value: a } = o;
  return Ke(a) && a >= 0 ? t + a.toString(e) : q(o);
}
const co = {
  identify: (o) => Ke(o) && o >= 0,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "OCT",
  test: /^0o[0-7]+$/,
  resolve: (o, e, t) => yt(o, 2, 8, t),
  stringify: (o) => lo(o, 8, "0o")
}, po = {
  identify: Ke,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  test: /^[-+]?[0-9]+$/,
  resolve: (o, e, t) => yt(o, 0, 10, t),
  stringify: q
}, uo = {
  identify: (o) => Ke(o) && o >= 0,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "HEX",
  test: /^0x[0-9a-fA-F]+$/,
  resolve: (o, e, t) => yt(o, 2, 16, t),
  stringify: (o) => lo(o, 16, "0x")
}, Zo = [
  ce,
  de,
  Ve,
  Ge,
  wt,
  co,
  po,
  uo,
  io,
  so,
  ro
];
function Ot(o) {
  return typeof o == "bigint" || Number.isInteger(o);
}
const Me = ({ value: o }) => JSON.stringify(o), ea = [
  {
    identify: (o) => typeof o == "string",
    default: !0,
    tag: "tag:yaml.org,2002:str",
    resolve: (o) => o,
    stringify: Me
  },
  {
    identify: (o) => o == null,
    createNode: () => new A(null),
    default: !0,
    tag: "tag:yaml.org,2002:null",
    test: /^null$/,
    resolve: () => null,
    stringify: Me
  },
  {
    identify: (o) => typeof o == "boolean",
    default: !0,
    tag: "tag:yaml.org,2002:bool",
    test: /^true$|^false$/,
    resolve: (o) => o === "true",
    stringify: Me
  },
  {
    identify: Ot,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    test: /^-?(?:0|[1-9][0-9]*)$/,
    resolve: (o, e, { intAsBigInt: t }) => t ? BigInt(o) : parseInt(o, 10),
    stringify: ({ value: o }) => Ot(o) ? o.toString() : JSON.stringify(o)
  },
  {
    identify: (o) => typeof o == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
    resolve: (o) => parseFloat(o),
    stringify: Me
  }
], ta = {
  default: !0,
  tag: "",
  test: /^/,
  resolve(o, e) {
    return e(`Unresolved plain scalar ${JSON.stringify(o)}`), o;
  }
}, oa = [ce, de].concat(ea, ta), vt = {
  identify: (o) => o instanceof Uint8Array,
  // Buffer inherits from Uint8Array
  default: !1,
  tag: "tag:yaml.org,2002:binary",
  /**
   * Returns a Buffer in node and an Uint8Array in browsers
   *
   * To use the resulting buffer as an image, you'll want to do something like:
   *
   *   const blob = new Blob([buffer], { type: 'image/jpeg' })
   *   document.querySelector('#photo').src = URL.createObjectURL(blob)
   */
  resolve(o, e) {
    if (typeof atob == "function") {
      const t = atob(o.replace(/[\n\r]/g, "")), a = new Uint8Array(t.length);
      for (let n = 0; n < t.length; ++n)
        a[n] = t.charCodeAt(n);
      return a;
    } else
      return e("This environment does not support reading binary tags; either Buffer or atob is required"), o;
  },
  stringify({ comment: o, type: e, value: t }, a, n, i) {
    if (!t)
      return "";
    const s = t;
    let r;
    if (typeof btoa == "function") {
      let l = "";
      for (let c = 0; c < s.length; ++c)
        l += String.fromCharCode(s[c]);
      r = btoa(l);
    } else
      throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
    if (e ?? (e = A.BLOCK_LITERAL), e !== A.QUOTE_DOUBLE) {
      const l = Math.max(a.options.lineWidth - a.indent.length, a.options.minContentWidth), c = Math.ceil(r.length / l), h = new Array(c);
      for (let d = 0, m = 0; d < c; ++d, m += l)
        h[d] = r.substr(m, l);
      r = h.join(e === A.BLOCK_LITERAL ? `
` : " ");
    }
    return gt({ comment: o, type: e, value: r }, a, n, i);
  }
};
function mo(o, e) {
  if (xe(o))
    for (let t = 0; t < o.items.length; ++t) {
      let a = o.items[t];
      if (!P(a)) {
        if (ke(a)) {
          a.items.length > 1 && e("Each pair must have its own sequence indicator");
          const n = a.items[0] || new N(new A(null));
          if (a.commentBefore && (n.key.commentBefore = n.key.commentBefore ? `${a.commentBefore}
${n.key.commentBefore}` : a.commentBefore), a.comment) {
            const i = n.value ?? n.key;
            i.comment = i.comment ? `${a.comment}
${i.comment}` : a.comment;
          }
          a = n;
        }
        o.items[t] = P(a) ? a : new N(a);
      }
    }
  else
    e("Expected a sequence for this tag");
  return o;
}
function ho(o, e, t) {
  const { replacer: a } = t, n = new Y(o);
  n.tag = "tag:yaml.org,2002:pairs";
  let i = 0;
  if (e && Symbol.iterator in Object(e))
    for (let s of e) {
      typeof a == "function" && (s = a.call(e, String(i++), s));
      let r, l;
      if (Array.isArray(s))
        if (s.length === 2)
          r = s[0], l = s[1];
        else
          throw new TypeError(`Expected [key, value] tuple: ${s}`);
      else if (s && s instanceof Object) {
        const c = Object.keys(s);
        if (c.length === 1)
          r = c[0], l = s[r];
        else
          throw new TypeError(`Expected tuple with one key, not ${c.length} keys`);
      } else
        r = s;
      n.items.push(ft(r, l, t));
    }
  return n;
}
const bt = {
  collection: "seq",
  default: !1,
  tag: "tag:yaml.org,2002:pairs",
  resolve: mo,
  createNode: ho
};
class oe extends Y {
  constructor() {
    super(), this.add = L.prototype.add.bind(this), this.delete = L.prototype.delete.bind(this), this.get = L.prototype.get.bind(this), this.has = L.prototype.has.bind(this), this.set = L.prototype.set.bind(this), this.tag = oe.tag;
  }
  /**
   * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
   * but TypeScript won't allow widening the signature of a child method.
   */
  toJSON(e, t) {
    if (!t)
      return super.toJSON(e);
    const a = /* @__PURE__ */ new Map();
    t != null && t.onCreate && t.onCreate(a);
    for (const n of this.items) {
      let i, s;
      if (P(n) ? (i = U(n.key, "", t), s = U(n.value, i, t)) : i = U(n, "", t), a.has(i))
        throw new Error("Ordered maps must not include duplicate keys");
      a.set(i, s);
    }
    return a;
  }
  static from(e, t, a) {
    const n = ho(e, t, a), i = new this();
    return i.items = n.items, i;
  }
}
oe.tag = "tag:yaml.org,2002:omap";
const kt = {
  collection: "seq",
  identify: (o) => o instanceof Map,
  nodeClass: oe,
  default: !1,
  tag: "tag:yaml.org,2002:omap",
  resolve(o, e) {
    const t = mo(o, e), a = [];
    for (const { key: n } of t.items)
      E(n) && (a.includes(n.value) ? e(`Ordered maps must not include duplicate keys: ${n.value}`) : a.push(n.value));
    return Object.assign(new oe(), t);
  },
  createNode: (o, e, t) => oe.from(o, e, t)
};
function go({ value: o, source: e }, t) {
  return e && (o ? fo : wo).test.test(e) ? e : o ? t.options.trueStr : t.options.falseStr;
}
const fo = {
  identify: (o) => o === !0,
  default: !0,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
  resolve: () => new A(!0),
  stringify: go
}, wo = {
  identify: (o) => o === !1,
  default: !0,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
  resolve: () => new A(!1),
  stringify: go
}, aa = {
  identify: (o) => typeof o == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
  resolve: (o) => o.slice(-3).toLowerCase() === "nan" ? NaN : o[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: q
}, na = {
  identify: (o) => typeof o == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  format: "EXP",
  test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
  resolve: (o) => parseFloat(o.replace(/_/g, "")),
  stringify(o) {
    const e = Number(o.value);
    return isFinite(e) ? e.toExponential() : q(o);
  }
}, ia = {
  identify: (o) => typeof o == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
  resolve(o) {
    const e = new A(parseFloat(o.replace(/_/g, ""))), t = o.indexOf(".");
    if (t !== -1) {
      const a = o.substring(t + 1).replace(/_/g, "");
      a[a.length - 1] === "0" && (e.minFractionDigits = a.length);
    }
    return e;
  },
  stringify: q
}, Ae = (o) => typeof o == "bigint" || Number.isInteger(o);
function ze(o, e, t, { intAsBigInt: a }) {
  const n = o[0];
  if ((n === "-" || n === "+") && (e += 1), o = o.substring(e).replace(/_/g, ""), a) {
    switch (t) {
      case 2:
        o = `0b${o}`;
        break;
      case 8:
        o = `0o${o}`;
        break;
      case 16:
        o = `0x${o}`;
        break;
    }
    const s = BigInt(o);
    return n === "-" ? BigInt(-1) * s : s;
  }
  const i = parseInt(o, t);
  return n === "-" ? -1 * i : i;
}
function xt(o, e, t) {
  const { value: a } = o;
  if (Ae(a)) {
    const n = a.toString(e);
    return a < 0 ? "-" + t + n.substr(1) : t + n;
  }
  return q(o);
}
const sa = {
  identify: Ae,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "BIN",
  test: /^[-+]?0b[0-1_]+$/,
  resolve: (o, e, t) => ze(o, 2, 2, t),
  stringify: (o) => xt(o, 2, "0b")
}, ra = {
  identify: Ae,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "OCT",
  test: /^[-+]?0[0-7_]+$/,
  resolve: (o, e, t) => ze(o, 1, 8, t),
  stringify: (o) => xt(o, 8, "0")
}, la = {
  identify: Ae,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  test: /^[-+]?[0-9][0-9_]*$/,
  resolve: (o, e, t) => ze(o, 0, 10, t),
  stringify: q
}, ca = {
  identify: Ae,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "HEX",
  test: /^[-+]?0x[0-9a-fA-F_]+$/,
  resolve: (o, e, t) => ze(o, 2, 16, t),
  stringify: (o) => xt(o, 16, "0x")
};
class ae extends L {
  constructor(e) {
    super(e), this.tag = ae.tag;
  }
  add(e) {
    let t;
    P(e) ? t = e : e && typeof e == "object" && "key" in e && "value" in e && e.value === null ? t = new N(e.key, null) : t = new N(e, null), Q(this.items, t.key) || this.items.push(t);
  }
  /**
   * If `keepPair` is `true`, returns the Pair matching `key`.
   * Otherwise, returns the value of that Pair's key.
   */
  get(e, t) {
    const a = Q(this.items, e);
    return !t && P(a) ? E(a.key) ? a.key.value : a.key : a;
  }
  set(e, t) {
    if (typeof t != "boolean")
      throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof t}`);
    const a = Q(this.items, e);
    a && !t ? this.items.splice(this.items.indexOf(a), 1) : !a && t && this.items.push(new N(e));
  }
  toJSON(e, t) {
    return super.toJSON(e, t, Set);
  }
  toString(e, t, a) {
    if (!e)
      return JSON.stringify(this);
    if (this.hasAllNullValues(!0))
      return super.toString(Object.assign({}, e, { allNullValues: !0 }), t, a);
    throw new Error("Set items must all have null values");
  }
  static from(e, t, a) {
    const { replacer: n } = a, i = new this(e);
    if (t && Symbol.iterator in Object(t))
      for (let s of t)
        typeof n == "function" && (s = n.call(t, s, s)), i.items.push(ft(s, null, a));
    return i;
  }
}
ae.tag = "tag:yaml.org,2002:set";
const At = {
  collection: "map",
  identify: (o) => o instanceof Set,
  nodeClass: ae,
  default: !1,
  tag: "tag:yaml.org,2002:set",
  createNode: (o, e, t) => ae.from(o, e, t),
  resolve(o, e) {
    if (ke(o)) {
      if (o.hasAllNullValues(!0))
        return Object.assign(new ae(), o);
      e("Set items must all have null values");
    } else
      e("Expected a mapping for this tag");
    return o;
  }
};
function St(o, e) {
  const t = o[0], a = t === "-" || t === "+" ? o.substring(1) : o, n = (s) => e ? BigInt(s) : Number(s), i = a.replace(/_/g, "").split(":").reduce((s, r) => s * n(60) + n(r), n(0));
  return t === "-" ? n(-1) * i : i;
}
function yo(o) {
  let { value: e } = o, t = (s) => s;
  if (typeof e == "bigint")
    t = (s) => BigInt(s);
  else if (isNaN(e) || !isFinite(e))
    return q(o);
  let a = "";
  e < 0 && (a = "-", e *= t(-1));
  const n = t(60), i = [e % n];
  return e < 60 ? i.unshift(0) : (e = (e - i[0]) / n, i.unshift(e % n), e >= 60 && (e = (e - i[0]) / n, i.unshift(e))), a + i.map((s) => String(s).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
}
const vo = {
  identify: (o) => typeof o == "bigint" || Number.isInteger(o),
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "TIME",
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
  resolve: (o, e, { intAsBigInt: t }) => St(o, t),
  stringify: yo
}, bo = {
  identify: (o) => typeof o == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  format: "TIME",
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
  resolve: (o) => St(o, !1),
  stringify: yo
}, We = {
  identify: (o) => o instanceof Date,
  default: !0,
  tag: "tag:yaml.org,2002:timestamp",
  // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
  // may be omitted altogether, resulting in a date format. In such a case, the time part is
  // assumed to be 00:00:00Z (start of day, UTC).
  test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
  resolve(o) {
    const e = o.match(We.test);
    if (!e)
      throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
    const [, t, a, n, i, s, r] = e.map(Number), l = e[7] ? Number((e[7] + "00").substr(1, 3)) : 0;
    let c = Date.UTC(t, a - 1, n, i || 0, s || 0, r || 0, l);
    const h = e[8];
    if (h && h !== "Z") {
      let d = St(h, !1);
      Math.abs(d) < 30 && (d *= 60), c -= 6e4 * d;
    }
    return new Date(c);
  },
  stringify: ({ value: o }) => (o == null ? void 0 : o.toISOString().replace(/(T00:00:00)?\.000Z$/, "")) ?? ""
}, Dt = [
  ce,
  de,
  Ve,
  Ge,
  fo,
  wo,
  sa,
  ra,
  la,
  ca,
  aa,
  na,
  ia,
  vt,
  V,
  kt,
  bt,
  At,
  vo,
  bo,
  We
], Nt = /* @__PURE__ */ new Map([
  ["core", Zo],
  ["failsafe", [ce, de, Ve]],
  ["json", oa],
  ["yaml11", Dt],
  ["yaml-1.1", Dt]
]), Lt = {
  binary: vt,
  bool: wt,
  float: ro,
  floatExp: so,
  floatNaN: io,
  floatTime: bo,
  int: po,
  intHex: uo,
  intOct: co,
  intTime: vo,
  map: ce,
  merge: V,
  null: Ge,
  omap: kt,
  pairs: bt,
  seq: de,
  set: At,
  timestamp: We
}, da = {
  "tag:yaml.org,2002:binary": vt,
  "tag:yaml.org,2002:merge": V,
  "tag:yaml.org,2002:omap": kt,
  "tag:yaml.org,2002:pairs": bt,
  "tag:yaml.org,2002:set": At,
  "tag:yaml.org,2002:timestamp": We
};
function Ye(o, e, t) {
  const a = Nt.get(e);
  if (a && !o)
    return t && !a.includes(V) ? a.concat(V) : a.slice();
  let n = a;
  if (!n)
    if (Array.isArray(o))
      n = [];
    else {
      const i = Array.from(Nt.keys()).filter((s) => s !== "yaml11").map((s) => JSON.stringify(s)).join(", ");
      throw new Error(`Unknown schema "${e}"; use one of ${i} or define customTags array`);
    }
  if (Array.isArray(o))
    for (const i of o)
      n = n.concat(i);
  else typeof o == "function" && (n = o(n.slice()));
  return t && (n = n.concat(V)), n.reduce((i, s) => {
    const r = typeof s == "string" ? Lt[s] : s;
    if (!r) {
      const l = JSON.stringify(s), c = Object.keys(Lt).map((h) => JSON.stringify(h)).join(", ");
      throw new Error(`Unknown custom tag ${l}; use one of ${c}`);
    }
    return i.includes(r) || i.push(r), i;
  }, []);
}
const pa = (o, e) => o.key < e.key ? -1 : o.key > e.key ? 1 : 0;
class Ct {
  constructor({ compat: e, customTags: t, merge: a, resolveKnownTags: n, schema: i, sortMapEntries: s, toStringDefaults: r }) {
    this.compat = Array.isArray(e) ? Ye(e, "compat") : e ? Ye(null, e) : null, this.name = typeof i == "string" && i || "core", this.knownTags = n ? da : {}, this.tags = Ye(t, this.name, a), this.toStringOptions = r ?? null, Object.defineProperty(this, K, { value: ce }), Object.defineProperty(this, $, { value: Ve }), Object.defineProperty(this, se, { value: de }), this.sortMapEntries = typeof s == "function" ? s : s === !0 ? pa : null;
  }
  clone() {
    const e = Object.create(Ct.prototype, Object.getOwnPropertyDescriptors(this));
    return e.tags = this.tags.slice(), e;
  }
}
function ua(o, e) {
  var l;
  const t = [];
  let a = e.directives === !0;
  if (e.directives !== !1 && o.directives) {
    const c = o.directives.toString(o);
    c ? (t.push(c), a = !0) : o.directives.docStart && (a = !0);
  }
  a && t.push("---");
  const n = Zt(o, e), { commentString: i } = n.options;
  if (o.commentBefore) {
    t.length !== 1 && t.unshift("");
    const c = i(o.commentBefore);
    t.unshift(_(c, ""));
  }
  let s = !1, r = null;
  if (o.contents) {
    if (I(o.contents)) {
      if (o.contents.spaceBefore && a && t.push(""), o.contents.commentBefore) {
        const d = i(o.contents.commentBefore);
        t.push(_(d, ""));
      }
      n.forceBlockIndent = !!o.comment, r = o.contents.comment;
    }
    const c = r ? void 0 : () => s = !0;
    let h = ne(o.contents, n, () => r = null, c);
    r && (h += W(h, "", i(r))), (h[0] === "|" || h[0] === ">") && t[t.length - 1] === "---" ? t[t.length - 1] = `--- ${h}` : t.push(h);
  } else
    t.push(ne(o.contents, n));
  if ((l = o.directives) != null && l.docEnd)
    if (o.comment) {
      const c = i(o.comment);
      c.includes(`
`) ? (t.push("..."), t.push(_(c, ""))) : t.push(`... ${c}`);
    } else
      t.push("...");
  else {
    let c = o.comment;
    c && s && (c = c.replace(/^\n+/, "")), c && ((!s || r) && t[t.length - 1] !== "" && t.push(""), t.push(_(i(c), "")));
  }
  return t.join(`
`) + `
`;
}
class Se {
  constructor(e, t, a) {
    this.commentBefore = null, this.comment = null, this.errors = [], this.warnings = [], Object.defineProperty(this, R, { value: tt });
    let n = null;
    typeof t == "function" || Array.isArray(t) ? n = t : a === void 0 && t && (a = t, t = void 0);
    const i = Object.assign({
      intAsBigInt: !1,
      keepSourceTokens: !1,
      logLevel: "warn",
      prettyErrors: !0,
      strict: !0,
      stringKeys: !1,
      uniqueKeys: !0,
      version: "1.2"
    }, a);
    this.options = i;
    let { version: s } = i;
    a != null && a._directives ? (this.directives = a._directives.atDocument(), this.directives.yaml.explicit && (s = this.directives.yaml.version)) : this.directives = new D({ version: s }), this.setSchema(s, a), this.contents = e === void 0 ? null : this.createNode(e, n, a);
  }
  /**
   * Create a deep copy of this Document and its contents.
   *
   * Custom Node values that inherit from `Object` still refer to their original instances.
   */
  clone() {
    const e = Object.create(Se.prototype, {
      [R]: { value: tt }
    });
    return e.commentBefore = this.commentBefore, e.comment = this.comment, e.errors = this.errors.slice(), e.warnings = this.warnings.slice(), e.options = Object.assign({}, this.options), this.directives && (e.directives = this.directives.clone()), e.schema = this.schema.clone(), e.contents = I(this.contents) ? this.contents.clone(e.schema) : this.contents, this.range && (e.range = this.range.slice()), e;
  }
  /** Adds a value to the document. */
  add(e) {
    J(this.contents) && this.contents.add(e);
  }
  /** Adds a value to the document. */
  addIn(e, t) {
    J(this.contents) && this.contents.addIn(e, t);
  }
  /**
   * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
   *
   * If `node` already has an anchor, `name` is ignored.
   * Otherwise, the `node.anchor` value will be set to `name`,
   * or if an anchor with that name is already present in the document,
   * `name` will be used as a prefix for a new unique anchor.
   * If `name` is undefined, the generated anchor will use 'a' as a prefix.
   */
  createAlias(e, t) {
    if (!e.anchor) {
      const a = Wt(this);
      e.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      !t || a.has(t) ? Qt(t || "a", a) : t;
    }
    return new ht(e.anchor);
  }
  createNode(e, t, a) {
    let n;
    if (typeof t == "function")
      e = t.call({ "": e }, "", e), n = t;
    else if (Array.isArray(t)) {
      const g = (y) => typeof y == "number" || y instanceof String || y instanceof Number, w = t.filter(g).map(String);
      w.length > 0 && (t = t.concat(w)), n = t;
    } else a === void 0 && t && (a = t, t = void 0);
    const { aliasDuplicateObjects: i, anchorPrefix: s, flow: r, keepUndefined: l, onTagObj: c, tag: h } = a ?? {}, { onAnchor: d, setAnchors: m, sourceObjects: u } = qo(
      this,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      s || "a"
    ), f = {
      aliasDuplicateObjects: i ?? !0,
      keepUndefined: l ?? !1,
      onAnchor: d,
      onTagObj: c,
      replacer: n,
      schema: this.schema,
      sourceObjects: u
    }, p = fe(e, h, f);
    return r && M(p) && (p.flow = !0), m(), p;
  }
  /**
   * Convert a key and a value into a `Pair` using the current schema,
   * recursively wrapping all values as `Scalar` or `Collection` nodes.
   */
  createPair(e, t, a = {}) {
    const n = this.createNode(e, null, a), i = this.createNode(t, null, a);
    return new N(n, i);
  }
  /**
   * Removes a value from the document.
   * @returns `true` if the item was found and removed.
   */
  delete(e) {
    return J(this.contents) ? this.contents.delete(e) : !1;
  }
  /**
   * Removes a value from the document.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(e) {
    return ue(e) ? this.contents == null ? !1 : (this.contents = null, !0) : J(this.contents) ? this.contents.deleteIn(e) : !1;
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  get(e, t) {
    return M(this.contents) ? this.contents.get(e, t) : void 0;
  }
  /**
   * Returns item at `path`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(e, t) {
    return ue(e) ? !t && E(this.contents) ? this.contents.value : this.contents : M(this.contents) ? this.contents.getIn(e, t) : void 0;
  }
  /**
   * Checks if the document includes a value with the key `key`.
   */
  has(e) {
    return M(this.contents) ? this.contents.has(e) : !1;
  }
  /**
   * Checks if the document includes a value at `path`.
   */
  hasIn(e) {
    return ue(e) ? this.contents !== void 0 : M(this.contents) ? this.contents.hasIn(e) : !1;
  }
  /**
   * Sets a value in this document. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  set(e, t) {
    this.contents == null ? this.contents = Re(this.schema, [e], t) : J(this.contents) && this.contents.set(e, t);
  }
  /**
   * Sets a value in this document. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(e, t) {
    ue(e) ? this.contents = t : this.contents == null ? this.contents = Re(this.schema, Array.from(e), t) : J(this.contents) && this.contents.setIn(e, t);
  }
  /**
   * Change the YAML version and schema used by the document.
   * A `null` version disables support for directives, explicit tags, anchors, and aliases.
   * It also requires the `schema` option to be given as a `Schema` instance value.
   *
   * Overrides all previously set schema options.
   */
  setSchema(e, t = {}) {
    typeof e == "number" && (e = String(e));
    let a;
    switch (e) {
      case "1.1":
        this.directives ? this.directives.yaml.version = "1.1" : this.directives = new D({ version: "1.1" }), a = { resolveKnownTags: !1, schema: "yaml-1.1" };
        break;
      case "1.2":
      case "next":
        this.directives ? this.directives.yaml.version = e : this.directives = new D({ version: e }), a = { resolveKnownTags: !0, schema: "core" };
        break;
      case null:
        this.directives && delete this.directives, a = null;
        break;
      default: {
        const n = JSON.stringify(e);
        throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${n}`);
      }
    }
    if (t.schema instanceof Object)
      this.schema = t.schema;
    else if (a)
      this.schema = new Ct(Object.assign(a, t));
    else
      throw new Error("With a null YAML version, the { schema: Schema } option is required");
  }
  // json & jsonArg are only used from toJSON()
  toJS({ json: e, jsonArg: t, mapAsMap: a, maxAliasCount: n, onAnchor: i, reviver: s } = {}) {
    const r = {
      anchors: /* @__PURE__ */ new Map(),
      doc: this,
      keep: !e,
      mapAsMap: a === !0,
      mapKeyWarned: !1,
      maxAliasCount: typeof n == "number" ? n : 100
    }, l = U(this.contents, t ?? "", r);
    if (typeof i == "function")
      for (const { count: c, res: h } of r.anchors.values())
        i(h, c);
    return typeof s == "function" ? ee(s, { "": l }, "", l) : l;
  }
  /**
   * A JSON representation of the document `contents`.
   *
   * @param jsonArg Used by `JSON.stringify` to indicate the array index or
   *   property name.
   */
  toJSON(e, t) {
    return this.toJS({ json: !0, jsonArg: e, mapAsMap: !1, onAnchor: t });
  }
  /** A YAML representation of the document. */
  toString(e = {}) {
    if (this.errors.length > 0)
      throw new Error("Document with errors cannot be stringified");
    if ("indent" in e && (!Number.isInteger(e.indent) || Number(e.indent) <= 0)) {
      const t = JSON.stringify(e.indent);
      throw new Error(`"indent" option must be a positive integer, not ${t}`);
    }
    return ua(this, e);
  }
}
function J(o) {
  if (M(o))
    return !0;
  throw new Error("Expected a YAML collection as document contents");
}
class ko extends Error {
  constructor(e, t, a, n) {
    super(), this.name = e, this.code = a, this.message = n, this.pos = t;
  }
}
class me extends ko {
  constructor(e, t, a) {
    super("YAMLParseError", e, t, a);
  }
}
class ma extends ko {
  constructor(e, t, a) {
    super("YAMLWarning", e, t, a);
  }
}
const Ut = (o, e) => (t) => {
  if (t.pos[0] === -1)
    return;
  t.linePos = t.pos.map((r) => e.linePos(r));
  const { line: a, col: n } = t.linePos[0];
  t.message += ` at line ${a}, column ${n}`;
  let i = n - 1, s = o.substring(e.lineStarts[a - 1], e.lineStarts[a]).replace(/[\n\r]+$/, "");
  if (i >= 60 && s.length > 80) {
    const r = Math.min(i - 39, s.length - 79);
    s = "…" + s.substring(r), i -= r - 1;
  }
  if (s.length > 80 && (s = s.substring(0, 79) + "…"), a > 1 && /^ *$/.test(s.substring(0, i))) {
    let r = o.substring(e.lineStarts[a - 2], e.lineStarts[a - 1]);
    r.length > 80 && (r = r.substring(0, 79) + `…
`), s = r + s;
  }
  if (/[^ ]/.test(s)) {
    let r = 1;
    const l = t.linePos[1];
    (l == null ? void 0 : l.line) === a && l.col > n && (r = Math.max(1, Math.min(l.col - n, 80 - i)));
    const c = " ".repeat(i) + "^".repeat(r);
    t.message += `:

${s}
${c}
`;
  }
};
function ie(o, { flow: e, indicator: t, next: a, offset: n, onError: i, parentIndent: s, startOnNewline: r }) {
  let l = !1, c = r, h = r, d = "", m = "", u = !1, f = !1, p = null, g = null, w = null, y = null, k = null, b = null, x = null;
  for (const v of o)
    switch (f && (v.type !== "space" && v.type !== "newline" && v.type !== "comma" && i(v.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space"), f = !1), p && (c && v.type !== "comment" && v.type !== "newline" && i(p, "TAB_AS_INDENT", "Tabs are not allowed as indentation"), p = null), v.type) {
      case "space":
        !e && (t !== "doc-start" || (a == null ? void 0 : a.type) !== "flow-collection") && v.source.includes("	") && (p = v), h = !0;
        break;
      case "comment": {
        h || i(v, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
        const T = v.source.substring(1) || " ";
        d ? d += m + T : d = T, m = "", c = !1;
        break;
      }
      case "newline":
        c ? d ? d += v.source : (!b || t !== "seq-item-ind") && (l = !0) : m += v.source, c = !0, u = !0, (g || w) && (y = v), h = !0;
        break;
      case "anchor":
        g && i(v, "MULTIPLE_ANCHORS", "A node can have at most one anchor"), v.source.endsWith(":") && i(v.offset + v.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", !0), g = v, x ?? (x = v.offset), c = !1, h = !1, f = !0;
        break;
      case "tag": {
        w && i(v, "MULTIPLE_TAGS", "A node can have at most one tag"), w = v, x ?? (x = v.offset), c = !1, h = !1, f = !0;
        break;
      }
      case t:
        (g || w) && i(v, "BAD_PROP_ORDER", `Anchors and tags must be after the ${v.source} indicator`), b && i(v, "UNEXPECTED_TOKEN", `Unexpected ${v.source} in ${e ?? "collection"}`), b = v, c = t === "seq-item-ind" || t === "explicit-key-ind", h = !1;
        break;
      case "comma":
        if (e) {
          k && i(v, "UNEXPECTED_TOKEN", `Unexpected , in ${e}`), k = v, c = !1, h = !1;
          break;
        }
      // else fallthrough
      default:
        i(v, "UNEXPECTED_TOKEN", `Unexpected ${v.type} token`), c = !1, h = !1;
    }
  const C = o[o.length - 1], S = C ? C.offset + C.source.length : n;
  return f && a && a.type !== "space" && a.type !== "newline" && a.type !== "comma" && (a.type !== "scalar" || a.source !== "") && i(a.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space"), p && (c && p.indent <= s || (a == null ? void 0 : a.type) === "block-map" || (a == null ? void 0 : a.type) === "block-seq") && i(p, "TAB_AS_INDENT", "Tabs are not allowed as indentation"), {
    comma: k,
    found: b,
    spaceBefore: l,
    comment: d,
    hasNewline: u,
    anchor: g,
    tag: w,
    newlineAfterProp: y,
    end: S,
    start: x ?? S
  };
}
function we(o) {
  if (!o)
    return null;
  switch (o.type) {
    case "alias":
    case "scalar":
    case "double-quoted-scalar":
    case "single-quoted-scalar":
      if (o.source.includes(`
`))
        return !0;
      if (o.end) {
        for (const e of o.end)
          if (e.type === "newline")
            return !0;
      }
      return !1;
    case "flow-collection":
      for (const e of o.items) {
        for (const t of e.start)
          if (t.type === "newline")
            return !0;
        if (e.sep) {
          for (const t of e.sep)
            if (t.type === "newline")
              return !0;
        }
        if (we(e.key) || we(e.value))
          return !0;
      }
      return !1;
    default:
      return !0;
  }
}
function it(o, e, t) {
  if ((e == null ? void 0 : e.type) === "flow-collection") {
    const a = e.end[0];
    a.indent === o && (a.source === "]" || a.source === "}") && we(e) && t(a, "BAD_INDENT", "Flow end indicator should be more indented than parent", !0);
  }
}
function xo(o, e, t) {
  const { uniqueKeys: a } = o.options;
  if (a === !1)
    return !1;
  const n = typeof a == "function" ? a : (i, s) => i === s || E(i) && E(s) && i.value === s.value;
  return e.some((i) => n(i.key, t));
}
const Rt = "All mapping items must start at the same column";
function ha({ composeNode: o, composeEmptyNode: e }, t, a, n, i) {
  var h;
  const s = (i == null ? void 0 : i.nodeClass) ?? L, r = new s(t.schema);
  t.atRoot && (t.atRoot = !1);
  let l = a.offset, c = null;
  for (const d of a.items) {
    const { start: m, key: u, sep: f, value: p } = d, g = ie(m, {
      indicator: "explicit-key-ind",
      next: u ?? (f == null ? void 0 : f[0]),
      offset: l,
      onError: n,
      parentIndent: a.indent,
      startOnNewline: !0
    }), w = !g.found;
    if (w) {
      if (u && (u.type === "block-seq" ? n(l, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key") : "indent" in u && u.indent !== a.indent && n(l, "BAD_INDENT", Rt)), !g.anchor && !g.tag && !f) {
        c = g.end, g.comment && (r.comment ? r.comment += `
` + g.comment : r.comment = g.comment);
        continue;
      }
      (g.newlineAfterProp || we(u)) && n(u ?? m[m.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
    } else ((h = g.found) == null ? void 0 : h.indent) !== a.indent && n(l, "BAD_INDENT", Rt);
    t.atKey = !0;
    const y = g.end, k = u ? o(t, u, g, n) : e(t, y, m, null, g, n);
    t.schema.compat && it(a.indent, u, n), t.atKey = !1, xo(t, r.items, k) && n(y, "DUPLICATE_KEY", "Map keys must be unique");
    const b = ie(f ?? [], {
      indicator: "map-value-ind",
      next: p,
      offset: k.range[2],
      onError: n,
      parentIndent: a.indent,
      startOnNewline: !u || u.type === "block-scalar"
    });
    if (l = b.end, b.found) {
      w && ((p == null ? void 0 : p.type) === "block-map" && !b.hasNewline && n(l, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings"), t.options.strict && g.start < b.found.offset - 1024 && n(k.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key"));
      const x = p ? o(t, p, b, n) : e(t, l, f, null, b, n);
      t.schema.compat && it(a.indent, p, n), l = x.range[2];
      const C = new N(k, x);
      t.options.keepSourceTokens && (C.srcToken = d), r.items.push(C);
    } else {
      w && n(k.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values"), b.comment && (k.comment ? k.comment += `
` + b.comment : k.comment = b.comment);
      const x = new N(k);
      t.options.keepSourceTokens && (x.srcToken = d), r.items.push(x);
    }
  }
  return c && c < l && n(c, "IMPOSSIBLE", "Map comment with trailing content"), r.range = [a.offset, l, c ?? l], r;
}
function ga({ composeNode: o, composeEmptyNode: e }, t, a, n, i) {
  const s = (i == null ? void 0 : i.nodeClass) ?? Y, r = new s(t.schema);
  t.atRoot && (t.atRoot = !1), t.atKey && (t.atKey = !1);
  let l = a.offset, c = null;
  for (const { start: h, value: d } of a.items) {
    const m = ie(h, {
      indicator: "seq-item-ind",
      next: d,
      offset: l,
      onError: n,
      parentIndent: a.indent,
      startOnNewline: !0
    });
    if (!m.found)
      if (m.anchor || m.tag || d)
        (d == null ? void 0 : d.type) === "block-seq" ? n(m.end, "BAD_INDENT", "All sequence items must start at the same column") : n(l, "MISSING_CHAR", "Sequence item without - indicator");
      else {
        c = m.end, m.comment && (r.comment = m.comment);
        continue;
      }
    const u = d ? o(t, d, m, n) : e(t, m.end, h, null, m, n);
    t.schema.compat && it(a.indent, d, n), l = u.range[2], r.items.push(u);
  }
  return r.range = [a.offset, l, c ?? l], r;
}
function Ce(o, e, t, a) {
  let n = "";
  if (o) {
    let i = !1, s = "";
    for (const r of o) {
      const { source: l, type: c } = r;
      switch (c) {
        case "space":
          i = !0;
          break;
        case "comment": {
          t && !i && a(r, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const h = l.substring(1) || " ";
          n ? n += s + h : n = h, s = "";
          break;
        }
        case "newline":
          n && (s += l), i = !0;
          break;
        default:
          a(r, "UNEXPECTED_TOKEN", `Unexpected ${c} at node end`);
      }
      e += l.length;
    }
  }
  return { comment: n, offset: e };
}
const Je = "Block collections are not allowed within flow collections", Xe = (o) => o && (o.type === "block-map" || o.type === "block-seq");
function fa({ composeNode: o, composeEmptyNode: e }, t, a, n, i) {
  var g;
  const s = a.start.source === "{", r = s ? "flow map" : "flow sequence", l = (i == null ? void 0 : i.nodeClass) ?? (s ? L : Y), c = new l(t.schema);
  c.flow = !0;
  const h = t.atRoot;
  h && (t.atRoot = !1), t.atKey && (t.atKey = !1);
  let d = a.offset + a.start.source.length;
  for (let w = 0; w < a.items.length; ++w) {
    const y = a.items[w], { start: k, key: b, sep: x, value: C } = y, S = ie(k, {
      flow: r,
      indicator: "explicit-key-ind",
      next: b ?? (x == null ? void 0 : x[0]),
      offset: d,
      onError: n,
      parentIndent: a.indent,
      startOnNewline: !1
    });
    if (!S.found) {
      if (!S.anchor && !S.tag && !x && !C) {
        w === 0 && S.comma ? n(S.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${r}`) : w < a.items.length - 1 && n(S.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${r}`), S.comment && (c.comment ? c.comment += `
` + S.comment : c.comment = S.comment), d = S.end;
        continue;
      }
      !s && t.options.strict && we(b) && n(
        b,
        // checked by containsNewline()
        "MULTILINE_IMPLICIT_KEY",
        "Implicit keys of flow sequence pairs need to be on a single line"
      );
    }
    if (w === 0)
      S.comma && n(S.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${r}`);
    else if (S.comma || n(S.start, "MISSING_CHAR", `Missing , between ${r} items`), S.comment) {
      let v = "";
      e: for (const T of k)
        switch (T.type) {
          case "comma":
          case "space":
            break;
          case "comment":
            v = T.source.substring(1);
            break e;
          default:
            break e;
        }
      if (v) {
        let T = c.items[c.items.length - 1];
        P(T) && (T = T.value ?? T.key), T.comment ? T.comment += `
` + v : T.comment = v, S.comment = S.comment.substring(v.length + 1);
      }
    }
    if (!s && !x && !S.found) {
      const v = C ? o(t, C, S, n) : e(t, S.end, x, null, S, n);
      c.items.push(v), d = v.range[2], Xe(C) && n(v.range, "BLOCK_IN_FLOW", Je);
    } else {
      t.atKey = !0;
      const v = S.end, T = b ? o(t, b, S, n) : e(t, v, k, null, S, n);
      Xe(b) && n(T.range, "BLOCK_IN_FLOW", Je), t.atKey = !1;
      const O = ie(x ?? [], {
        flow: r,
        indicator: "map-value-ind",
        next: C,
        offset: T.range[2],
        onError: n,
        parentIndent: a.indent,
        startOnNewline: !1
      });
      if (O.found) {
        if (!s && !S.found && t.options.strict) {
          if (x)
            for (const B of x) {
              if (B === O.found)
                break;
              if (B.type === "newline") {
                n(B, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                break;
              }
            }
          S.start < O.found.offset - 1024 && n(O.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
        }
      } else C && ("source" in C && ((g = C.source) == null ? void 0 : g[0]) === ":" ? n(C, "MISSING_CHAR", `Missing space after : in ${r}`) : n(O.start, "MISSING_CHAR", `Missing , or : between ${r} items`));
      const H = C ? o(t, C, O, n) : O.found ? e(t, O.end, x, null, O, n) : null;
      H ? Xe(C) && n(H.range, "BLOCK_IN_FLOW", Je) : O.comment && (T.comment ? T.comment += `
` + O.comment : T.comment = O.comment);
      const j = new N(T, H);
      if (t.options.keepSourceTokens && (j.srcToken = y), s) {
        const B = c;
        xo(t, B.items, T) && n(v, "DUPLICATE_KEY", "Map keys must be unique"), B.items.push(j);
      } else {
        const B = new L(t.schema);
        B.flow = !0, B.items.push(j);
        const It = (H ?? T).range;
        B.range = [T.range[0], It[1], It[2]], c.items.push(B);
      }
      d = H ? H.range[2] : O.end;
    }
  }
  const m = s ? "}" : "]", [u, ...f] = a.end;
  let p = d;
  if ((u == null ? void 0 : u.source) === m)
    p = u.offset + u.source.length;
  else {
    const w = r[0].toUpperCase() + r.substring(1), y = h ? `${w} must end with a ${m}` : `${w} in block collection must be sufficiently indented and end with a ${m}`;
    n(d, h ? "MISSING_CHAR" : "BAD_INDENT", y), u && u.source.length !== 1 && f.unshift(u);
  }
  if (f.length > 0) {
    const w = Ce(f, p, t.options.strict, n);
    w.comment && (c.comment ? c.comment += `
` + w.comment : c.comment = w.comment), c.range = [a.offset, p, w.offset];
  } else
    c.range = [a.offset, p, p];
  return c;
}
function Ze(o, e, t, a, n, i) {
  const s = t.type === "block-map" ? ha(o, e, t, a, i) : t.type === "block-seq" ? ga(o, e, t, a, i) : fa(o, e, t, a, i), r = s.constructor;
  return n === "!" || n === r.tagName ? (s.tag = r.tagName, s) : (n && (s.tag = n), s);
}
function wa(o, e, t, a, n) {
  var m;
  const i = a.tag, s = i ? e.directives.tagName(i.source, (u) => n(i, "TAG_RESOLVE_FAILED", u)) : null;
  if (t.type === "block-seq") {
    const { anchor: u, newlineAfterProp: f } = a, p = u && i ? u.offset > i.offset ? u : i : u ?? i;
    p && (!f || f.offset < p.offset) && n(p, "MISSING_CHAR", "Missing newline after block sequence props");
  }
  const r = t.type === "block-map" ? "map" : t.type === "block-seq" ? "seq" : t.start.source === "{" ? "map" : "seq";
  if (!i || !s || s === "!" || s === L.tagName && r === "map" || s === Y.tagName && r === "seq")
    return Ze(o, e, t, n, s);
  let l = e.schema.tags.find((u) => u.tag === s && u.collection === r);
  if (!l) {
    const u = e.schema.knownTags[s];
    if ((u == null ? void 0 : u.collection) === r)
      e.schema.tags.push(Object.assign({}, u, { default: !1 })), l = u;
    else
      return u ? n(i, "BAD_COLLECTION_TYPE", `${u.tag} used for ${r} collection, but expects ${u.collection ?? "scalar"}`, !0) : n(i, "TAG_RESOLVE_FAILED", `Unresolved tag: ${s}`, !0), Ze(o, e, t, n, s);
  }
  const c = Ze(o, e, t, n, s, l), h = ((m = l.resolve) == null ? void 0 : m.call(l, c, (u) => n(i, "TAG_RESOLVE_FAILED", u), e.options)) ?? c, d = I(h) ? h : new A(h);
  return d.range = c.range, d.tag = s, l != null && l.format && (d.format = l.format), d;
}
function ya(o, e, t) {
  const a = e.offset, n = va(e, o.options.strict, t);
  if (!n)
    return { value: "", type: null, comment: "", range: [a, a, a] };
  const i = n.mode === ">" ? A.BLOCK_FOLDED : A.BLOCK_LITERAL, s = e.source ? ba(e.source) : [];
  let r = s.length;
  for (let p = s.length - 1; p >= 0; --p) {
    const g = s[p][1];
    if (g === "" || g === "\r")
      r = p;
    else
      break;
  }
  if (r === 0) {
    const p = n.chomp === "+" && s.length > 0 ? `
`.repeat(Math.max(1, s.length - 1)) : "";
    let g = a + n.length;
    return e.source && (g += e.source.length), { value: p, type: i, comment: n.comment, range: [a, g, g] };
  }
  let l = e.indent + n.indent, c = e.offset + n.length, h = 0;
  for (let p = 0; p < r; ++p) {
    const [g, w] = s[p];
    if (w === "" || w === "\r")
      n.indent === 0 && g.length > l && (l = g.length);
    else {
      g.length < l && t(c + g.length, "MISSING_CHAR", "Block scalars with more-indented leading empty lines must use an explicit indentation indicator"), n.indent === 0 && (l = g.length), h = p, l === 0 && !o.atRoot && t(c, "BAD_INDENT", "Block scalar values in collections must be indented");
      break;
    }
    c += g.length + w.length + 1;
  }
  for (let p = s.length - 1; p >= r; --p)
    s[p][0].length > l && (r = p + 1);
  let d = "", m = "", u = !1;
  for (let p = 0; p < h; ++p)
    d += s[p][0].slice(l) + `
`;
  for (let p = h; p < r; ++p) {
    let [g, w] = s[p];
    c += g.length + w.length + 1;
    const y = w[w.length - 1] === "\r";
    if (y && (w = w.slice(0, -1)), w && g.length < l) {
      const b = `Block scalar lines must not be less indented than their ${n.indent ? "explicit indentation indicator" : "first line"}`;
      t(c - w.length - (y ? 2 : 1), "BAD_INDENT", b), g = "";
    }
    i === A.BLOCK_LITERAL ? (d += m + g.slice(l) + w, m = `
`) : g.length > l || w[0] === "	" ? (m === " " ? m = `
` : !u && m === `
` && (m = `

`), d += m + g.slice(l) + w, m = `
`, u = !0) : w === "" ? m === `
` ? d += `
` : m = `
` : (d += m + w, m = " ", u = !1);
  }
  switch (n.chomp) {
    case "-":
      break;
    case "+":
      for (let p = r; p < s.length; ++p)
        d += `
` + s[p][0].slice(l);
      d[d.length - 1] !== `
` && (d += `
`);
      break;
    default:
      d += `
`;
  }
  const f = a + n.length + e.source.length;
  return { value: d, type: i, comment: n.comment, range: [a, f, f] };
}
function va({ offset: o, props: e }, t, a) {
  if (e[0].type !== "block-scalar-header")
    return a(e[0], "IMPOSSIBLE", "Block scalar header not found"), null;
  const { source: n } = e[0], i = n[0];
  let s = 0, r = "", l = -1;
  for (let m = 1; m < n.length; ++m) {
    const u = n[m];
    if (!r && (u === "-" || u === "+"))
      r = u;
    else {
      const f = Number(u);
      !s && f ? s = f : l === -1 && (l = o + m);
    }
  }
  l !== -1 && a(l, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${n}`);
  let c = !1, h = "", d = n.length;
  for (let m = 1; m < e.length; ++m) {
    const u = e[m];
    switch (u.type) {
      case "space":
        c = !0;
      // fallthrough
      case "newline":
        d += u.source.length;
        break;
      case "comment":
        t && !c && a(u, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters"), d += u.source.length, h = u.source.substring(1);
        break;
      case "error":
        a(u, "UNEXPECTED_TOKEN", u.message), d += u.source.length;
        break;
      /* istanbul ignore next should not happen */
      default: {
        const f = `Unexpected token in block scalar header: ${u.type}`;
        a(u, "UNEXPECTED_TOKEN", f);
        const p = u.source;
        p && typeof p == "string" && (d += p.length);
      }
    }
  }
  return { mode: i, indent: s, chomp: r, comment: h, length: d };
}
function ba(o) {
  const e = o.split(/\n( *)/), t = e[0], a = t.match(/^( *)/), i = [a != null && a[1] ? [a[1], t.slice(a[1].length)] : ["", t]];
  for (let s = 1; s < e.length; s += 2)
    i.push([e[s], e[s + 1]]);
  return i;
}
function ka(o, e, t) {
  const { offset: a, type: n, source: i, end: s } = o;
  let r, l;
  const c = (m, u, f) => t(a + m, u, f);
  switch (n) {
    case "scalar":
      r = A.PLAIN, l = xa(i, c);
      break;
    case "single-quoted-scalar":
      r = A.QUOTE_SINGLE, l = Aa(i, c);
      break;
    case "double-quoted-scalar":
      r = A.QUOTE_DOUBLE, l = Sa(i, c);
      break;
    /* istanbul ignore next should not happen */
    default:
      return t(o, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${n}`), {
        value: "",
        type: null,
        comment: "",
        range: [a, a + i.length, a + i.length]
      };
  }
  const h = a + i.length, d = Ce(s, h, e, t);
  return {
    value: l,
    type: r,
    comment: d.comment,
    range: [a, h, d.offset]
  };
}
function xa(o, e) {
  let t = "";
  switch (o[0]) {
    /* istanbul ignore next should not happen */
    case "	":
      t = "a tab character";
      break;
    case ",":
      t = "flow indicator character ,";
      break;
    case "%":
      t = "directive indicator character %";
      break;
    case "|":
    case ">": {
      t = `block scalar indicator ${o[0]}`;
      break;
    }
    case "@":
    case "`": {
      t = `reserved character ${o[0]}`;
      break;
    }
  }
  return t && e(0, "BAD_SCALAR_START", `Plain value cannot start with ${t}`), Ao(o);
}
function Aa(o, e) {
  return (o[o.length - 1] !== "'" || o.length === 1) && e(o.length, "MISSING_CHAR", "Missing closing 'quote"), Ao(o.slice(1, -1)).replace(/''/g, "'");
}
function Ao(o) {
  let e, t;
  try {
    e = new RegExp(`(.*?)(?<![ 	])[ 	]*\r?
`, "sy"), t = new RegExp(`[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?
`, "sy");
  } catch {
    e = /(.*?)[ \t]*\r?\n/sy, t = /[ \t]*(.*?)[ \t]*\r?\n/sy;
  }
  let a = e.exec(o);
  if (!a)
    return o;
  let n = a[1], i = " ", s = e.lastIndex;
  for (t.lastIndex = s; a = t.exec(o); )
    a[1] === "" ? i === `
` ? n += i : i = `
` : (n += i + a[1], i = " "), s = t.lastIndex;
  const r = /[ \t]*(.*)/sy;
  return r.lastIndex = s, a = r.exec(o), n + i + ((a == null ? void 0 : a[1]) ?? "");
}
function Sa(o, e) {
  let t = "";
  for (let a = 1; a < o.length - 1; ++a) {
    const n = o[a];
    if (!(n === "\r" && o[a + 1] === `
`))
      if (n === `
`) {
        const { fold: i, offset: s } = Ca(o, a);
        t += i, a = s;
      } else if (n === "\\") {
        let i = o[++a];
        const s = Ta[i];
        if (s)
          t += s;
        else if (i === `
`)
          for (i = o[a + 1]; i === " " || i === "	"; )
            i = o[++a + 1];
        else if (i === "\r" && o[a + 1] === `
`)
          for (i = o[++a + 1]; i === " " || i === "	"; )
            i = o[++a + 1];
        else if (i === "x" || i === "u" || i === "U") {
          const r = i === "x" ? 2 : i === "u" ? 4 : 8;
          t += Ea(o, a + 1, r, e), a += r;
        } else {
          const r = o.substr(a - 1, 2);
          e(a - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${r}`), t += r;
        }
      } else if (n === " " || n === "	") {
        const i = a;
        let s = o[a + 1];
        for (; s === " " || s === "	"; )
          s = o[++a + 1];
        s !== `
` && !(s === "\r" && o[a + 2] === `
`) && (t += a > i ? o.slice(i, a + 1) : n);
      } else
        t += n;
  }
  return (o[o.length - 1] !== '"' || o.length === 1) && e(o.length, "MISSING_CHAR", 'Missing closing "quote'), t;
}
function Ca(o, e) {
  let t = "", a = o[e + 1];
  for (; (a === " " || a === "	" || a === `
` || a === "\r") && !(a === "\r" && o[e + 2] !== `
`); )
    a === `
` && (t += `
`), e += 1, a = o[e + 1];
  return t || (t = " "), { fold: t, offset: e };
}
const Ta = {
  0: "\0",
  // null character
  a: "\x07",
  // bell character
  b: "\b",
  // backspace
  e: "\x1B",
  // escape character
  f: "\f",
  // form feed
  n: `
`,
  // line feed
  r: "\r",
  // carriage return
  t: "	",
  // horizontal tab
  v: "\v",
  // vertical tab
  N: "",
  // Unicode next line
  _: " ",
  // Unicode non-breaking space
  L: "\u2028",
  // Unicode line separator
  P: "\u2029",
  // Unicode paragraph separator
  " ": " ",
  '"': '"',
  "/": "/",
  "\\": "\\",
  "	": "	"
};
function Ea(o, e, t, a) {
  const n = o.substr(e, t), s = n.length === t && /^[0-9a-fA-F]+$/.test(n) ? parseInt(n, 16) : NaN;
  try {
    return String.fromCodePoint(s);
  } catch {
    const r = o.substr(e - 2, t + 2);
    return a(e - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${r}`), r;
  }
}
function So(o, e, t, a) {
  const { value: n, type: i, comment: s, range: r } = e.type === "block-scalar" ? ya(o, e, a) : ka(e, o.options.strict, a), l = t ? o.directives.tagName(t.source, (d) => a(t, "TAG_RESOLVE_FAILED", d)) : null;
  let c;
  o.options.stringKeys && o.atKey ? c = o.schema[$] : l ? c = Ma(o.schema, n, l, t, a) : e.type === "scalar" ? c = Ia(o, n, e, a) : c = o.schema[$];
  let h;
  try {
    const d = c.resolve(n, (m) => a(t ?? e, "TAG_RESOLVE_FAILED", m), o.options);
    h = E(d) ? d : new A(d);
  } catch (d) {
    const m = d instanceof Error ? d.message : String(d);
    a(t ?? e, "TAG_RESOLVE_FAILED", m), h = new A(n);
  }
  return h.range = r, h.source = n, i && (h.type = i), l && (h.tag = l), c.format && (h.format = c.format), s && (h.comment = s), h;
}
function Ma(o, e, t, a, n) {
  var r;
  if (t === "!")
    return o[$];
  const i = [];
  for (const l of o.tags)
    if (!l.collection && l.tag === t)
      if (l.default && l.test)
        i.push(l);
      else
        return l;
  for (const l of i)
    if ((r = l.test) != null && r.test(e))
      return l;
  const s = o.knownTags[t];
  return s && !s.collection ? (o.tags.push(Object.assign({}, s, { default: !1, test: void 0 })), s) : (n(a, "TAG_RESOLVE_FAILED", `Unresolved tag: ${t}`, t !== "tag:yaml.org,2002:str"), o[$]);
}
function Ia({ atKey: o, directives: e, schema: t }, a, n, i) {
  const s = t.tags.find((r) => {
    var l;
    return (r.default === !0 || o && r.default === "key") && ((l = r.test) == null ? void 0 : l.test(a));
  }) || t[$];
  if (t.compat) {
    const r = t.compat.find((l) => {
      var c;
      return l.default && ((c = l.test) == null ? void 0 : c.test(a));
    }) ?? t[$];
    if (s.tag !== r.tag) {
      const l = e.tagString(s.tag), c = e.tagString(r.tag), h = `Value may be parsed as either ${l} or ${c}`;
      i(n, "TAG_RESOLVE_FAILED", h, !0);
    }
  }
  return s;
}
function Pa(o, e, t) {
  if (e) {
    t ?? (t = e.length);
    for (let a = t - 1; a >= 0; --a) {
      let n = e[a];
      switch (n.type) {
        case "space":
        case "comment":
        case "newline":
          o -= n.source.length;
          continue;
      }
      for (n = e[++a]; (n == null ? void 0 : n.type) === "space"; )
        o += n.source.length, n = e[++a];
      break;
    }
  }
  return o;
}
const Oa = { composeNode: Co, composeEmptyNode: Tt };
function Co(o, e, t, a) {
  const n = o.atKey, { spaceBefore: i, comment: s, anchor: r, tag: l } = t;
  let c, h = !0;
  switch (e.type) {
    case "alias":
      c = Da(o, e, a), (r || l) && a(e, "ALIAS_PROPS", "An alias node must not specify any properties");
      break;
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "block-scalar":
      c = So(o, e, l, a), r && (c.anchor = r.source.substring(1));
      break;
    case "block-map":
    case "block-seq":
    case "flow-collection":
      try {
        c = wa(Oa, o, e, t, a), r && (c.anchor = r.source.substring(1));
      } catch (d) {
        const m = d instanceof Error ? d.message : String(d);
        a(e, "RESOURCE_EXHAUSTION", m);
      }
      break;
    default: {
      const d = e.type === "error" ? e.message : `Unsupported token (type: ${e.type})`;
      a(e, "UNEXPECTED_TOKEN", d), h = !1;
    }
  }
  return c ?? (c = Tt(o, e.offset, void 0, null, t, a)), r && c.anchor === "" && a(r, "BAD_ALIAS", "Anchor cannot be an empty string"), n && o.options.stringKeys && (!E(c) || typeof c.value != "string" || c.tag && c.tag !== "tag:yaml.org,2002:str") && a(l ?? e, "NON_STRING_KEY", "With stringKeys, all keys must be strings"), i && (c.spaceBefore = !0), s && (e.type === "scalar" && e.source === "" ? c.comment = s : c.commentBefore = s), o.options.keepSourceTokens && h && (c.srcToken = e), c;
}
function Tt(o, e, t, a, { spaceBefore: n, comment: i, anchor: s, tag: r, end: l }, c) {
  const h = {
    type: "scalar",
    offset: Pa(e, t, a),
    indent: -1,
    source: ""
  }, d = So(o, h, r, c);
  return s && (d.anchor = s.source.substring(1), d.anchor === "" && c(s, "BAD_ALIAS", "Anchor cannot be an empty string")), n && (d.spaceBefore = !0), i && (d.comment = i, d.range[2] = l), d;
}
function Da({ options: o }, { offset: e, source: t, end: a }, n) {
  const i = new ht(t.substring(1));
  i.source === "" && n(e, "BAD_ALIAS", "Alias cannot be an empty string"), i.source.endsWith(":") && n(e + t.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", !0);
  const s = e + t.length, r = Ce(a, s, o.strict, n);
  return i.range = [e, s, r.offset], r.comment && (i.comment = r.comment), i;
}
function Na(o, e, { offset: t, start: a, value: n, end: i }, s) {
  const r = Object.assign({ _directives: e }, o), l = new Se(void 0, r), c = {
    atKey: !1,
    atRoot: !0,
    directives: l.directives,
    options: l.options,
    schema: l.schema
  }, h = ie(a, {
    indicator: "doc-start",
    next: n ?? (i == null ? void 0 : i[0]),
    offset: t,
    onError: s,
    parentIndent: 0,
    startOnNewline: !0
  });
  h.found && (l.directives.docStart = !0, n && (n.type === "block-map" || n.type === "block-seq") && !h.hasNewline && s(h.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker")), l.contents = n ? Co(c, n, h, s) : Tt(c, h.end, a, null, h, s);
  const d = l.contents.range[2], m = Ce(i, d, !1, s);
  return m.comment && (l.comment = m.comment), l.range = [t, d, m.offset], l;
}
function pe(o) {
  if (typeof o == "number")
    return [o, o + 1];
  if (Array.isArray(o))
    return o.length === 2 ? o : [o[0], o[1]];
  const { offset: e, source: t } = o;
  return [e, e + (typeof t == "string" ? t.length : 1)];
}
function jt(o) {
  var n;
  let e = "", t = !1, a = !1;
  for (let i = 0; i < o.length; ++i) {
    const s = o[i];
    switch (s[0]) {
      case "#":
        e += (e === "" ? "" : a ? `

` : `
`) + (s.substring(1) || " "), t = !0, a = !1;
        break;
      case "%":
        ((n = o[i + 1]) == null ? void 0 : n[0]) !== "#" && (i += 1), t = !1;
        break;
      default:
        t || (a = !0), t = !1;
    }
  }
  return { comment: e, afterEmptyLine: a };
}
class La {
  constructor(e = {}) {
    this.doc = null, this.atDirectives = !1, this.prelude = [], this.errors = [], this.warnings = [], this.onError = (t, a, n, i) => {
      const s = pe(t);
      i ? this.warnings.push(new ma(s, a, n)) : this.errors.push(new me(s, a, n));
    }, this.directives = new D({ version: e.version || "1.2" }), this.options = e;
  }
  decorate(e, t) {
    const { comment: a, afterEmptyLine: n } = jt(this.prelude);
    if (a) {
      const i = e.contents;
      if (t)
        e.comment = e.comment ? `${e.comment}
${a}` : a;
      else if (n || e.directives.docStart || !i)
        e.commentBefore = a;
      else if (M(i) && !i.flow && i.items.length > 0) {
        let s = i.items[0];
        P(s) && (s = s.key);
        const r = s.commentBefore;
        s.commentBefore = r ? `${a}
${r}` : a;
      } else {
        const s = i.commentBefore;
        i.commentBefore = s ? `${a}
${s}` : a;
      }
    }
    if (t) {
      for (let i = 0; i < this.errors.length; ++i)
        e.errors.push(this.errors[i]);
      for (let i = 0; i < this.warnings.length; ++i)
        e.warnings.push(this.warnings[i]);
    } else
      e.errors = this.errors, e.warnings = this.warnings;
    this.prelude = [], this.errors = [], this.warnings = [];
  }
  /**
   * Current stream status information.
   *
   * Mostly useful at the end of input for an empty stream.
   */
  streamInfo() {
    return {
      comment: jt(this.prelude).comment,
      directives: this.directives,
      errors: this.errors,
      warnings: this.warnings
    };
  }
  /**
   * Compose tokens into documents.
   *
   * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
   * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
   */
  *compose(e, t = !1, a = -1) {
    for (const n of e)
      yield* this.next(n);
    yield* this.end(t, a);
  }
  /** Advance the composer by one CST token. */
  *next(e) {
    switch (e.type) {
      case "directive":
        this.directives.add(e.source, (t, a, n) => {
          const i = pe(e);
          i[0] += t, this.onError(i, "BAD_DIRECTIVE", a, n);
        }), this.prelude.push(e.source), this.atDirectives = !0;
        break;
      case "document": {
        const t = Na(this.options, this.directives, e, this.onError);
        this.atDirectives && !t.directives.docStart && this.onError(e, "MISSING_CHAR", "Missing directives-end/doc-start indicator line"), this.decorate(t, !1), this.doc && (yield this.doc), this.doc = t, this.atDirectives = !1;
        break;
      }
      case "byte-order-mark":
      case "space":
        break;
      case "comment":
      case "newline":
        this.prelude.push(e.source);
        break;
      case "error": {
        const t = e.source ? `${e.message}: ${JSON.stringify(e.source)}` : e.message, a = new me(pe(e), "UNEXPECTED_TOKEN", t);
        this.atDirectives || !this.doc ? this.errors.push(a) : this.doc.errors.push(a);
        break;
      }
      case "doc-end": {
        if (!this.doc) {
          const a = "Unexpected doc-end without preceding document";
          this.errors.push(new me(pe(e), "UNEXPECTED_TOKEN", a));
          break;
        }
        this.doc.directives.docEnd = !0;
        const t = Ce(e.end, e.offset + e.source.length, this.doc.options.strict, this.onError);
        if (this.decorate(this.doc, !0), t.comment) {
          const a = this.doc.comment;
          this.doc.comment = a ? `${a}
${t.comment}` : t.comment;
        }
        this.doc.range[2] = t.offset;
        break;
      }
      default:
        this.errors.push(new me(pe(e), "UNEXPECTED_TOKEN", `Unsupported token ${e.type}`));
    }
  }
  /**
   * Call at end of input to yield any remaining document.
   *
   * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
   * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
   */
  *end(e = !1, t = -1) {
    if (this.doc)
      this.decorate(this.doc, !0), yield this.doc, this.doc = null;
    else if (e) {
      const a = Object.assign({ _directives: this.directives }, this.options), n = new Se(void 0, a);
      this.atDirectives && this.onError(t, "MISSING_CHAR", "Missing directives-end indicator line"), n.range = [0, t, t], this.decorate(n, !1), yield n;
    }
  }
}
const To = "\uFEFF", Eo = "", Mo = "", st = "";
function Ua(o) {
  switch (o) {
    case To:
      return "byte-order-mark";
    case Eo:
      return "doc-mode";
    case Mo:
      return "flow-error-end";
    case st:
      return "scalar";
    case "---":
      return "doc-start";
    case "...":
      return "doc-end";
    case "":
    case `
`:
    case `\r
`:
      return "newline";
    case "-":
      return "seq-item-ind";
    case "?":
      return "explicit-key-ind";
    case ":":
      return "map-value-ind";
    case "{":
      return "flow-map-start";
    case "}":
      return "flow-map-end";
    case "[":
      return "flow-seq-start";
    case "]":
      return "flow-seq-end";
    case ",":
      return "comma";
  }
  switch (o[0]) {
    case " ":
    case "	":
      return "space";
    case "#":
      return "comment";
    case "%":
      return "directive-line";
    case "*":
      return "alias";
    case "&":
      return "anchor";
    case "!":
      return "tag";
    case "'":
      return "single-quoted-scalar";
    case '"':
      return "double-quoted-scalar";
    case "|":
    case ">":
      return "block-scalar-header";
  }
  return null;
}
function F(o) {
  switch (o) {
    case void 0:
    case " ":
    case `
`:
    case "\r":
    case "	":
      return !0;
    default:
      return !1;
  }
}
const Bt = new Set("0123456789ABCDEFabcdef"), Ra = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()"), Ie = new Set(",[]{}"), ja = new Set(` ,[]{}
\r	`), et = (o) => !o || ja.has(o);
class Ba {
  constructor() {
    this.atEnd = !1, this.blockScalarIndent = -1, this.blockScalarKeep = !1, this.buffer = "", this.flowKey = !1, this.flowLevel = 0, this.indentNext = 0, this.indentValue = 0, this.lineEndPos = null, this.next = null, this.pos = 0;
  }
  /**
   * Generate YAML tokens from the `source` string. If `incomplete`,
   * a part of the last line may be left as a buffer for the next call.
   *
   * @returns A generator of lexical tokens
   */
  *lex(e, t = !1) {
    if (e) {
      if (typeof e != "string")
        throw TypeError("source is not a string");
      this.buffer = this.buffer ? this.buffer + e : e, this.lineEndPos = null;
    }
    this.atEnd = !t;
    let a = this.next ?? "stream";
    for (; a && (t || this.hasChars(1)); )
      a = yield* this.parseNext(a);
  }
  atLineEnd() {
    let e = this.pos, t = this.buffer[e];
    for (; t === " " || t === "	"; )
      t = this.buffer[++e];
    return !t || t === "#" || t === `
` ? !0 : t === "\r" ? this.buffer[e + 1] === `
` : !1;
  }
  charAt(e) {
    return this.buffer[this.pos + e];
  }
  continueScalar(e) {
    let t = this.buffer[e];
    if (this.indentNext > 0) {
      let a = 0;
      for (; t === " "; )
        t = this.buffer[++a + e];
      if (t === "\r") {
        const n = this.buffer[a + e + 1];
        if (n === `
` || !n && !this.atEnd)
          return e + a + 1;
      }
      return t === `
` || a >= this.indentNext || !t && !this.atEnd ? e + a : -1;
    }
    if (t === "-" || t === ".") {
      const a = this.buffer.substr(e, 3);
      if ((a === "---" || a === "...") && F(this.buffer[e + 3]))
        return -1;
    }
    return e;
  }
  getLine() {
    let e = this.lineEndPos;
    return (typeof e != "number" || e !== -1 && e < this.pos) && (e = this.buffer.indexOf(`
`, this.pos), this.lineEndPos = e), e === -1 ? this.atEnd ? this.buffer.substring(this.pos) : null : (this.buffer[e - 1] === "\r" && (e -= 1), this.buffer.substring(this.pos, e));
  }
  hasChars(e) {
    return this.pos + e <= this.buffer.length;
  }
  setNext(e) {
    return this.buffer = this.buffer.substring(this.pos), this.pos = 0, this.lineEndPos = null, this.next = e, null;
  }
  peek(e) {
    return this.buffer.substr(this.pos, e);
  }
  *parseNext(e) {
    switch (e) {
      case "stream":
        return yield* this.parseStream();
      case "line-start":
        return yield* this.parseLineStart();
      case "block-start":
        return yield* this.parseBlockStart();
      case "doc":
        return yield* this.parseDocument();
      case "flow":
        return yield* this.parseFlowCollection();
      case "quoted-scalar":
        return yield* this.parseQuotedScalar();
      case "block-scalar":
        return yield* this.parseBlockScalar();
      case "plain-scalar":
        return yield* this.parsePlainScalar();
    }
  }
  *parseStream() {
    let e = this.getLine();
    if (e === null)
      return this.setNext("stream");
    if (e[0] === To && (yield* this.pushCount(1), e = e.substring(1)), e[0] === "%") {
      let t = e.length, a = e.indexOf("#");
      for (; a !== -1; ) {
        const i = e[a - 1];
        if (i === " " || i === "	") {
          t = a - 1;
          break;
        } else
          a = e.indexOf("#", a + 1);
      }
      for (; ; ) {
        const i = e[t - 1];
        if (i === " " || i === "	")
          t -= 1;
        else
          break;
      }
      const n = (yield* this.pushCount(t)) + (yield* this.pushSpaces(!0));
      return yield* this.pushCount(e.length - n), this.pushNewline(), "stream";
    }
    if (this.atLineEnd()) {
      const t = yield* this.pushSpaces(!0);
      return yield* this.pushCount(e.length - t), yield* this.pushNewline(), "stream";
    }
    return yield Eo, yield* this.parseLineStart();
  }
  *parseLineStart() {
    const e = this.charAt(0);
    if (!e && !this.atEnd)
      return this.setNext("line-start");
    if (e === "-" || e === ".") {
      if (!this.atEnd && !this.hasChars(4))
        return this.setNext("line-start");
      const t = this.peek(3);
      if ((t === "---" || t === "...") && F(this.charAt(3)))
        return yield* this.pushCount(3), this.indentValue = 0, this.indentNext = 0, t === "---" ? "doc" : "stream";
    }
    return this.indentValue = yield* this.pushSpaces(!1), this.indentNext > this.indentValue && !F(this.charAt(1)) && (this.indentNext = this.indentValue), yield* this.parseBlockStart();
  }
  *parseBlockStart() {
    const [e, t] = this.peek(2);
    if (!t && !this.atEnd)
      return this.setNext("block-start");
    if ((e === "-" || e === "?" || e === ":") && F(t)) {
      const a = (yield* this.pushCount(1)) + (yield* this.pushSpaces(!0));
      return this.indentNext = this.indentValue + 1, this.indentValue += a, "block-start";
    }
    return "doc";
  }
  *parseDocument() {
    yield* this.pushSpaces(!0);
    const e = this.getLine();
    if (e === null)
      return this.setNext("doc");
    let t = yield* this.pushIndicators();
    switch (e[t]) {
      case "#":
        yield* this.pushCount(e.length - t);
      // fallthrough
      case void 0:
        return yield* this.pushNewline(), yield* this.parseLineStart();
      case "{":
      case "[":
        return yield* this.pushCount(1), this.flowKey = !1, this.flowLevel = 1, "flow";
      case "}":
      case "]":
        return yield* this.pushCount(1), "doc";
      case "*":
        return yield* this.pushUntil(et), "doc";
      case '"':
      case "'":
        return yield* this.parseQuotedScalar();
      case "|":
      case ">":
        return t += yield* this.parseBlockScalarHeader(), t += yield* this.pushSpaces(!0), yield* this.pushCount(e.length - t), yield* this.pushNewline(), yield* this.parseBlockScalar();
      default:
        return yield* this.parsePlainScalar();
    }
  }
  *parseFlowCollection() {
    let e, t, a = -1;
    do
      e = yield* this.pushNewline(), e > 0 ? (t = yield* this.pushSpaces(!1), this.indentValue = a = t) : t = 0, t += yield* this.pushSpaces(!0);
    while (e + t > 0);
    const n = this.getLine();
    if (n === null)
      return this.setNext("flow");
    if ((a !== -1 && a < this.indentNext && n[0] !== "#" || a === 0 && (n.startsWith("---") || n.startsWith("...")) && F(n[3])) && !(a === this.indentNext - 1 && this.flowLevel === 1 && (n[0] === "]" || n[0] === "}")))
      return this.flowLevel = 0, yield Mo, yield* this.parseLineStart();
    let i = 0;
    for (; n[i] === ","; )
      i += yield* this.pushCount(1), i += yield* this.pushSpaces(!0), this.flowKey = !1;
    switch (i += yield* this.pushIndicators(), n[i]) {
      case void 0:
        return "flow";
      case "#":
        return yield* this.pushCount(n.length - i), "flow";
      case "{":
      case "[":
        return yield* this.pushCount(1), this.flowKey = !1, this.flowLevel += 1, "flow";
      case "}":
      case "]":
        return yield* this.pushCount(1), this.flowKey = !0, this.flowLevel -= 1, this.flowLevel ? "flow" : "doc";
      case "*":
        return yield* this.pushUntil(et), "flow";
      case '"':
      case "'":
        return this.flowKey = !0, yield* this.parseQuotedScalar();
      case ":": {
        const s = this.charAt(1);
        if (this.flowKey || F(s) || s === ",")
          return this.flowKey = !1, yield* this.pushCount(1), yield* this.pushSpaces(!0), "flow";
      }
      // fallthrough
      default:
        return this.flowKey = !1, yield* this.parsePlainScalar();
    }
  }
  *parseQuotedScalar() {
    const e = this.charAt(0);
    let t = this.buffer.indexOf(e, this.pos + 1);
    if (e === "'")
      for (; t !== -1 && this.buffer[t + 1] === "'"; )
        t = this.buffer.indexOf("'", t + 2);
    else
      for (; t !== -1; ) {
        let i = 0;
        for (; this.buffer[t - 1 - i] === "\\"; )
          i += 1;
        if (i % 2 === 0)
          break;
        t = this.buffer.indexOf('"', t + 1);
      }
    const a = this.buffer.substring(0, t);
    let n = a.indexOf(`
`, this.pos);
    if (n !== -1) {
      for (; n !== -1; ) {
        const i = this.continueScalar(n + 1);
        if (i === -1)
          break;
        n = a.indexOf(`
`, i);
      }
      n !== -1 && (t = n - (a[n - 1] === "\r" ? 2 : 1));
    }
    if (t === -1) {
      if (!this.atEnd)
        return this.setNext("quoted-scalar");
      t = this.buffer.length;
    }
    return yield* this.pushToIndex(t + 1, !1), this.flowLevel ? "flow" : "doc";
  }
  *parseBlockScalarHeader() {
    this.blockScalarIndent = -1, this.blockScalarKeep = !1;
    let e = this.pos;
    for (; ; ) {
      const t = this.buffer[++e];
      if (t === "+")
        this.blockScalarKeep = !0;
      else if (t > "0" && t <= "9")
        this.blockScalarIndent = Number(t) - 1;
      else if (t !== "-")
        break;
    }
    return yield* this.pushUntil((t) => F(t) || t === "#");
  }
  *parseBlockScalar() {
    let e = this.pos - 1, t = 0, a;
    e: for (let i = this.pos; a = this.buffer[i]; ++i)
      switch (a) {
        case " ":
          t += 1;
          break;
        case `
`:
          e = i, t = 0;
          break;
        case "\r": {
          const s = this.buffer[i + 1];
          if (!s && !this.atEnd)
            return this.setNext("block-scalar");
          if (s === `
`)
            break;
        }
        // fallthrough
        default:
          break e;
      }
    if (!a && !this.atEnd)
      return this.setNext("block-scalar");
    if (t >= this.indentNext) {
      this.blockScalarIndent === -1 ? this.indentNext = t : this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
      do {
        const i = this.continueScalar(e + 1);
        if (i === -1)
          break;
        e = this.buffer.indexOf(`
`, i);
      } while (e !== -1);
      if (e === -1) {
        if (!this.atEnd)
          return this.setNext("block-scalar");
        e = this.buffer.length;
      }
    }
    let n = e + 1;
    for (a = this.buffer[n]; a === " "; )
      a = this.buffer[++n];
    if (a === "	") {
      for (; a === "	" || a === " " || a === "\r" || a === `
`; )
        a = this.buffer[++n];
      e = n - 1;
    } else if (!this.blockScalarKeep)
      do {
        let i = e - 1, s = this.buffer[i];
        s === "\r" && (s = this.buffer[--i]);
        const r = i;
        for (; s === " "; )
          s = this.buffer[--i];
        if (s === `
` && i >= this.pos && i + 1 + t > r)
          e = i;
        else
          break;
      } while (!0);
    return yield st, yield* this.pushToIndex(e + 1, !0), yield* this.parseLineStart();
  }
  *parsePlainScalar() {
    const e = this.flowLevel > 0;
    let t = this.pos - 1, a = this.pos - 1, n;
    for (; n = this.buffer[++a]; )
      if (n === ":") {
        const i = this.buffer[a + 1];
        if (F(i) || e && Ie.has(i))
          break;
        t = a;
      } else if (F(n)) {
        let i = this.buffer[a + 1];
        if (n === "\r" && (i === `
` ? (a += 1, n = `
`, i = this.buffer[a + 1]) : t = a), i === "#" || e && Ie.has(i))
          break;
        if (n === `
`) {
          const s = this.continueScalar(a + 1);
          if (s === -1)
            break;
          a = Math.max(a, s - 2);
        }
      } else {
        if (e && Ie.has(n))
          break;
        t = a;
      }
    return !n && !this.atEnd ? this.setNext("plain-scalar") : (yield st, yield* this.pushToIndex(t + 1, !0), e ? "flow" : "doc");
  }
  *pushCount(e) {
    return e > 0 ? (yield this.buffer.substr(this.pos, e), this.pos += e, e) : 0;
  }
  *pushToIndex(e, t) {
    const a = this.buffer.slice(this.pos, e);
    return a ? (yield a, this.pos += a.length, a.length) : (t && (yield ""), 0);
  }
  *pushIndicators() {
    let e = 0;
    e: for (; ; ) {
      switch (this.charAt(0)) {
        case "!":
          e += yield* this.pushTag(), e += yield* this.pushSpaces(!0);
          continue e;
        case "&":
          e += yield* this.pushUntil(et), e += yield* this.pushSpaces(!0);
          continue e;
        case "-":
        // this is an error
        case "?":
        // this is an error outside flow collections
        case ":": {
          const t = this.flowLevel > 0, a = this.charAt(1);
          if (F(a) || t && Ie.has(a)) {
            t ? this.flowKey && (this.flowKey = !1) : this.indentNext = this.indentValue + 1, e += yield* this.pushCount(1), e += yield* this.pushSpaces(!0);
            continue e;
          }
        }
      }
      break e;
    }
    return e;
  }
  *pushTag() {
    if (this.charAt(1) === "<") {
      let e = this.pos + 2, t = this.buffer[e];
      for (; !F(t) && t !== ">"; )
        t = this.buffer[++e];
      return yield* this.pushToIndex(t === ">" ? e + 1 : e, !1);
    } else {
      let e = this.pos + 1, t = this.buffer[e];
      for (; t; )
        if (Ra.has(t))
          t = this.buffer[++e];
        else if (t === "%" && Bt.has(this.buffer[e + 1]) && Bt.has(this.buffer[e + 2]))
          t = this.buffer[e += 3];
        else
          break;
      return yield* this.pushToIndex(e, !1);
    }
  }
  *pushNewline() {
    const e = this.buffer[this.pos];
    return e === `
` ? yield* this.pushCount(1) : e === "\r" && this.charAt(1) === `
` ? yield* this.pushCount(2) : 0;
  }
  *pushSpaces(e) {
    let t = this.pos - 1, a;
    do
      a = this.buffer[++t];
    while (a === " " || e && a === "	");
    const n = t - this.pos;
    return n > 0 && (yield this.buffer.substr(this.pos, n), this.pos = t), n;
  }
  *pushUntil(e) {
    let t = this.pos, a = this.buffer[t];
    for (; !e(a); )
      a = this.buffer[++t];
    return yield* this.pushToIndex(t, !1);
  }
}
class Fa {
  constructor() {
    this.lineStarts = [], this.addNewLine = (e) => this.lineStarts.push(e), this.linePos = (e) => {
      let t = 0, a = this.lineStarts.length;
      for (; t < a; ) {
        const i = t + a >> 1;
        this.lineStarts[i] < e ? t = i + 1 : a = i;
      }
      if (this.lineStarts[t] === e)
        return { line: t + 1, col: 1 };
      if (t === 0)
        return { line: 0, col: e };
      const n = this.lineStarts[t - 1];
      return { line: t, col: e - n + 1 };
    };
  }
}
function G(o, e) {
  for (let t = 0; t < o.length; ++t)
    if (o[t].type === e)
      return !0;
  return !1;
}
function Ft(o) {
  for (let e = 0; e < o.length; ++e)
    switch (o[e].type) {
      case "space":
      case "comment":
      case "newline":
        break;
      default:
        return e;
    }
  return -1;
}
function Io(o) {
  switch (o == null ? void 0 : o.type) {
    case "alias":
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "flow-collection":
      return !0;
    default:
      return !1;
  }
}
function Pe(o) {
  switch (o.type) {
    case "document":
      return o.start;
    case "block-map": {
      const e = o.items[o.items.length - 1];
      return e.sep ?? e.start;
    }
    case "block-seq":
      return o.items[o.items.length - 1].start;
    /* istanbul ignore next should not happen */
    default:
      return [];
  }
}
function X(o) {
  var t;
  if (o.length === 0)
    return [];
  let e = o.length;
  e: for (; --e >= 0; )
    switch (o[e].type) {
      case "doc-start":
      case "explicit-key-ind":
      case "map-value-ind":
      case "seq-item-ind":
      case "newline":
        break e;
    }
  for (; ((t = o[++e]) == null ? void 0 : t.type) === "space"; )
    ;
  return o.splice(e, o.length);
}
function Be(o, e) {
  if (e.length < 1e5)
    Array.prototype.push.apply(o, e);
  else
    for (let t = 0; t < e.length; ++t)
      o.push(e[t]);
}
function qt(o) {
  if (o.start.type === "flow-seq-start")
    for (const e of o.items)
      e.sep && !e.value && !G(e.start, "explicit-key-ind") && !G(e.sep, "map-value-ind") && (e.key && (e.value = e.key), delete e.key, Io(e.value) ? e.value.end ? Be(e.value.end, e.sep) : e.value.end = e.sep : Be(e.start, e.sep), delete e.sep);
}
class qa {
  /**
   * @param onNewLine - If defined, called separately with the start position of
   *   each new line (in `parse()`, including the start of input).
   */
  constructor(e) {
    this.atNewLine = !0, this.atScalar = !1, this.indent = 0, this.offset = 0, this.onKeyLine = !1, this.stack = [], this.source = "", this.type = "", this.lexer = new Ba(), this.onNewLine = e;
  }
  /**
   * Parse `source` as a YAML stream.
   * If `incomplete`, a part of the last line may be left as a buffer for the next call.
   *
   * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
   *
   * @returns A generator of tokens representing each directive, document, and other structure.
   */
  *parse(e, t = !1) {
    this.onNewLine && this.offset === 0 && this.onNewLine(0);
    for (const a of this.lexer.lex(e, t))
      yield* this.next(a);
    t || (yield* this.end());
  }
  /**
   * Advance the parser by the `source` of one lexical token.
   */
  *next(e) {
    if (this.source = e, this.atScalar) {
      this.atScalar = !1, yield* this.step(), this.offset += e.length;
      return;
    }
    const t = Ua(e);
    if (t)
      if (t === "scalar")
        this.atNewLine = !1, this.atScalar = !0, this.type = "scalar";
      else {
        switch (this.type = t, yield* this.step(), t) {
          case "newline":
            this.atNewLine = !0, this.indent = 0, this.onNewLine && this.onNewLine(this.offset + e.length);
            break;
          case "space":
            this.atNewLine && e[0] === " " && (this.indent += e.length);
            break;
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
            this.atNewLine && (this.indent += e.length);
            break;
          case "doc-mode":
          case "flow-error-end":
            return;
          default:
            this.atNewLine = !1;
        }
        this.offset += e.length;
      }
    else {
      const a = `Not a YAML token: ${e}`;
      yield* this.pop({ type: "error", offset: this.offset, message: a, source: e }), this.offset += e.length;
    }
  }
  /** Call at end of input to push out any remaining constructions */
  *end() {
    for (; this.stack.length > 0; )
      yield* this.pop();
  }
  get sourceToken() {
    return {
      type: this.type,
      offset: this.offset,
      indent: this.indent,
      source: this.source
    };
  }
  *step() {
    const e = this.peek(1);
    if (this.type === "doc-end" && (e == null ? void 0 : e.type) !== "doc-end") {
      for (; this.stack.length > 0; )
        yield* this.pop();
      this.stack.push({
        type: "doc-end",
        offset: this.offset,
        source: this.source
      });
      return;
    }
    if (!e)
      return yield* this.stream();
    switch (e.type) {
      case "document":
        return yield* this.document(e);
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
        return yield* this.scalar(e);
      case "block-scalar":
        return yield* this.blockScalar(e);
      case "block-map":
        return yield* this.blockMap(e);
      case "block-seq":
        return yield* this.blockSequence(e);
      case "flow-collection":
        return yield* this.flowCollection(e);
      case "doc-end":
        return yield* this.documentEnd(e);
    }
    yield* this.pop();
  }
  peek(e) {
    return this.stack[this.stack.length - e];
  }
  *pop(e) {
    const t = e ?? this.stack.pop();
    if (!t)
      yield { type: "error", offset: this.offset, source: "", message: "Tried to pop an empty stack" };
    else if (this.stack.length === 0)
      yield t;
    else {
      const a = this.peek(1);
      switch (t.type === "block-scalar" ? t.indent = "indent" in a ? a.indent : 0 : t.type === "flow-collection" && a.type === "document" && (t.indent = 0), t.type === "flow-collection" && qt(t), a.type) {
        case "document":
          a.value = t;
          break;
        case "block-scalar":
          a.props.push(t);
          break;
        case "block-map": {
          const n = a.items[a.items.length - 1];
          if (n.value) {
            a.items.push({ start: [], key: t, sep: [] }), this.onKeyLine = !0;
            return;
          } else if (n.sep)
            n.value = t;
          else {
            Object.assign(n, { key: t, sep: [] }), this.onKeyLine = !n.explicitKey;
            return;
          }
          break;
        }
        case "block-seq": {
          const n = a.items[a.items.length - 1];
          n.value ? a.items.push({ start: [], value: t }) : n.value = t;
          break;
        }
        case "flow-collection": {
          const n = a.items[a.items.length - 1];
          !n || n.value ? a.items.push({ start: [], key: t, sep: [] }) : n.sep ? n.value = t : Object.assign(n, { key: t, sep: [] });
          return;
        }
        /* istanbul ignore next should not happen */
        default:
          yield* this.pop(), yield* this.pop(t);
      }
      if ((a.type === "document" || a.type === "block-map" || a.type === "block-seq") && (t.type === "block-map" || t.type === "block-seq")) {
        const n = t.items[t.items.length - 1];
        n && !n.sep && !n.value && n.start.length > 0 && Ft(n.start) === -1 && (t.indent === 0 || n.start.every((i) => i.type !== "comment" || i.indent < t.indent)) && (a.type === "document" ? a.end = n.start : a.items.push({ start: n.start }), t.items.splice(-1, 1));
      }
    }
  }
  *stream() {
    switch (this.type) {
      case "directive-line":
        yield { type: "directive", offset: this.offset, source: this.source };
        return;
      case "byte-order-mark":
      case "space":
      case "comment":
      case "newline":
        yield this.sourceToken;
        return;
      case "doc-mode":
      case "doc-start": {
        const e = {
          type: "document",
          offset: this.offset,
          start: []
        };
        this.type === "doc-start" && e.start.push(this.sourceToken), this.stack.push(e);
        return;
      }
    }
    yield {
      type: "error",
      offset: this.offset,
      message: `Unexpected ${this.type} token in YAML stream`,
      source: this.source
    };
  }
  *document(e) {
    if (e.value)
      return yield* this.lineEnd(e);
    switch (this.type) {
      case "doc-start": {
        Ft(e.start) !== -1 ? (yield* this.pop(), yield* this.step()) : e.start.push(this.sourceToken);
        return;
      }
      case "anchor":
      case "tag":
      case "space":
      case "comment":
      case "newline":
        e.start.push(this.sourceToken);
        return;
    }
    const t = this.startBlockValue(e);
    t ? this.stack.push(t) : yield {
      type: "error",
      offset: this.offset,
      message: `Unexpected ${this.type} token in YAML document`,
      source: this.source
    };
  }
  *scalar(e) {
    if (this.type === "map-value-ind") {
      const t = Pe(this.peek(2)), a = X(t);
      let n;
      e.end ? (n = e.end, n.push(this.sourceToken), delete e.end) : n = [this.sourceToken];
      const i = {
        type: "block-map",
        offset: e.offset,
        indent: e.indent,
        items: [{ start: a, key: e, sep: n }]
      };
      this.onKeyLine = !0, this.stack[this.stack.length - 1] = i;
    } else
      yield* this.lineEnd(e);
  }
  *blockScalar(e) {
    switch (this.type) {
      case "space":
      case "comment":
      case "newline":
        e.props.push(this.sourceToken);
        return;
      case "scalar":
        if (e.source = this.source, this.atNewLine = !0, this.indent = 0, this.onNewLine) {
          let t = this.source.indexOf(`
`) + 1;
          for (; t !== 0; )
            this.onNewLine(this.offset + t), t = this.source.indexOf(`
`, t) + 1;
        }
        yield* this.pop();
        break;
      /* istanbul ignore next should not happen */
      default:
        yield* this.pop(), yield* this.step();
    }
  }
  *blockMap(e) {
    var a;
    const t = e.items[e.items.length - 1];
    switch (this.type) {
      case "newline":
        if (this.onKeyLine = !1, t.value) {
          const n = "end" in t.value ? t.value.end : void 0, i = Array.isArray(n) ? n[n.length - 1] : void 0;
          (i == null ? void 0 : i.type) === "comment" ? n == null || n.push(this.sourceToken) : e.items.push({ start: [this.sourceToken] });
        } else t.sep ? t.sep.push(this.sourceToken) : t.start.push(this.sourceToken);
        return;
      case "space":
      case "comment":
        if (t.value)
          e.items.push({ start: [this.sourceToken] });
        else if (t.sep)
          t.sep.push(this.sourceToken);
        else {
          if (this.atIndentedComment(t.start, e.indent)) {
            const n = e.items[e.items.length - 2], i = (a = n == null ? void 0 : n.value) == null ? void 0 : a.end;
            if (Array.isArray(i)) {
              Be(i, t.start), i.push(this.sourceToken), e.items.pop();
              return;
            }
          }
          t.start.push(this.sourceToken);
        }
        return;
    }
    if (this.indent >= e.indent) {
      const n = !this.onKeyLine && this.indent === e.indent, i = n && (t.sep || t.explicitKey) && this.type !== "seq-item-ind";
      let s = [];
      if (i && t.sep && !t.value) {
        const r = [];
        for (let l = 0; l < t.sep.length; ++l) {
          const c = t.sep[l];
          switch (c.type) {
            case "newline":
              r.push(l);
              break;
            case "space":
              break;
            case "comment":
              c.indent > e.indent && (r.length = 0);
              break;
            default:
              r.length = 0;
          }
        }
        r.length >= 2 && (s = t.sep.splice(r[1]));
      }
      switch (this.type) {
        case "anchor":
        case "tag":
          i || t.value ? (s.push(this.sourceToken), e.items.push({ start: s }), this.onKeyLine = !0) : t.sep ? t.sep.push(this.sourceToken) : t.start.push(this.sourceToken);
          return;
        case "explicit-key-ind":
          !t.sep && !t.explicitKey ? (t.start.push(this.sourceToken), t.explicitKey = !0) : i || t.value ? (s.push(this.sourceToken), e.items.push({ start: s, explicitKey: !0 })) : this.stack.push({
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken], explicitKey: !0 }]
          }), this.onKeyLine = !0;
          return;
        case "map-value-ind":
          if (t.explicitKey)
            if (t.sep)
              if (t.value)
                e.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (G(t.sep, "map-value-ind"))
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: s, key: null, sep: [this.sourceToken] }]
                });
              else if (Io(t.key) && !G(t.sep, "newline")) {
                const r = X(t.start), l = t.key, c = t.sep;
                c.push(this.sourceToken), delete t.key, delete t.sep, this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: r, key: l, sep: c }]
                });
              } else s.length > 0 ? t.sep = t.sep.concat(s, this.sourceToken) : t.sep.push(this.sourceToken);
            else if (G(t.start, "newline"))
              Object.assign(t, { key: null, sep: [this.sourceToken] });
            else {
              const r = X(t.start);
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: r, key: null, sep: [this.sourceToken] }]
              });
            }
          else
            t.sep ? t.value || i ? e.items.push({ start: s, key: null, sep: [this.sourceToken] }) : G(t.sep, "map-value-ind") ? this.stack.push({
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [], key: null, sep: [this.sourceToken] }]
            }) : t.sep.push(this.sourceToken) : Object.assign(t, { key: null, sep: [this.sourceToken] });
          this.onKeyLine = !0;
          return;
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar": {
          const r = this.flowScalar(this.type);
          i || t.value ? (e.items.push({ start: s, key: r, sep: [] }), this.onKeyLine = !0) : t.sep ? this.stack.push(r) : (Object.assign(t, { key: r, sep: [] }), this.onKeyLine = !0);
          return;
        }
        default: {
          const r = this.startBlockValue(e);
          if (r) {
            if (r.type === "block-seq") {
              if (!t.explicitKey && t.sep && !G(t.sep, "newline")) {
                yield* this.pop({
                  type: "error",
                  offset: this.offset,
                  message: "Unexpected block-seq-ind on same line with key",
                  source: this.source
                });
                return;
              }
            } else n && e.items.push({ start: s });
            this.stack.push(r);
            return;
          }
        }
      }
    }
    yield* this.pop(), yield* this.step();
  }
  *blockSequence(e) {
    var a;
    const t = e.items[e.items.length - 1];
    switch (this.type) {
      case "newline":
        if (t.value) {
          const n = "end" in t.value ? t.value.end : void 0, i = Array.isArray(n) ? n[n.length - 1] : void 0;
          (i == null ? void 0 : i.type) === "comment" ? n == null || n.push(this.sourceToken) : e.items.push({ start: [this.sourceToken] });
        } else
          t.start.push(this.sourceToken);
        return;
      case "space":
      case "comment":
        if (t.value)
          e.items.push({ start: [this.sourceToken] });
        else {
          if (this.atIndentedComment(t.start, e.indent)) {
            const n = e.items[e.items.length - 2], i = (a = n == null ? void 0 : n.value) == null ? void 0 : a.end;
            if (Array.isArray(i)) {
              Be(i, t.start), i.push(this.sourceToken), e.items.pop();
              return;
            }
          }
          t.start.push(this.sourceToken);
        }
        return;
      case "anchor":
      case "tag":
        if (t.value || this.indent <= e.indent)
          break;
        t.start.push(this.sourceToken);
        return;
      case "seq-item-ind":
        if (this.indent !== e.indent)
          break;
        t.value || G(t.start, "seq-item-ind") ? e.items.push({ start: [this.sourceToken] }) : t.start.push(this.sourceToken);
        return;
    }
    if (this.indent > e.indent) {
      const n = this.startBlockValue(e);
      if (n) {
        this.stack.push(n);
        return;
      }
    }
    yield* this.pop(), yield* this.step();
  }
  *flowCollection(e) {
    const t = e.items[e.items.length - 1];
    if (this.type === "flow-error-end") {
      let a;
      do
        yield* this.pop(), a = this.peek(1);
      while ((a == null ? void 0 : a.type) === "flow-collection");
    } else if (e.end.length === 0) {
      switch (this.type) {
        case "comma":
        case "explicit-key-ind":
          !t || t.sep ? e.items.push({ start: [this.sourceToken] }) : t.start.push(this.sourceToken);
          return;
        case "map-value-ind":
          !t || t.value ? e.items.push({ start: [], key: null, sep: [this.sourceToken] }) : t.sep ? t.sep.push(this.sourceToken) : Object.assign(t, { key: null, sep: [this.sourceToken] });
          return;
        case "space":
        case "comment":
        case "newline":
        case "anchor":
        case "tag":
          !t || t.value ? e.items.push({ start: [this.sourceToken] }) : t.sep ? t.sep.push(this.sourceToken) : t.start.push(this.sourceToken);
          return;
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar": {
          const n = this.flowScalar(this.type);
          !t || t.value ? e.items.push({ start: [], key: n, sep: [] }) : t.sep ? this.stack.push(n) : Object.assign(t, { key: n, sep: [] });
          return;
        }
        case "flow-map-end":
        case "flow-seq-end":
          e.end.push(this.sourceToken);
          return;
      }
      const a = this.startBlockValue(e);
      a ? this.stack.push(a) : (yield* this.pop(), yield* this.step());
    } else {
      const a = this.peek(2);
      if (a.type === "block-map" && (this.type === "map-value-ind" && a.indent === e.indent || this.type === "newline" && !a.items[a.items.length - 1].sep))
        yield* this.pop(), yield* this.step();
      else if (this.type === "map-value-ind" && a.type !== "flow-collection") {
        const n = Pe(a), i = X(n);
        qt(e);
        const s = e.end.splice(1, e.end.length);
        s.push(this.sourceToken);
        const r = {
          type: "block-map",
          offset: e.offset,
          indent: e.indent,
          items: [{ start: i, key: e, sep: s }]
        };
        this.onKeyLine = !0, this.stack[this.stack.length - 1] = r;
      } else
        yield* this.lineEnd(e);
    }
  }
  flowScalar(e) {
    if (this.onNewLine) {
      let t = this.source.indexOf(`
`) + 1;
      for (; t !== 0; )
        this.onNewLine(this.offset + t), t = this.source.indexOf(`
`, t) + 1;
    }
    return {
      type: e,
      offset: this.offset,
      indent: this.indent,
      source: this.source
    };
  }
  startBlockValue(e) {
    switch (this.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
        return this.flowScalar(this.type);
      case "block-scalar-header":
        return {
          type: "block-scalar",
          offset: this.offset,
          indent: this.indent,
          props: [this.sourceToken],
          source: ""
        };
      case "flow-map-start":
      case "flow-seq-start":
        return {
          type: "flow-collection",
          offset: this.offset,
          indent: this.indent,
          start: this.sourceToken,
          items: [],
          end: []
        };
      case "seq-item-ind":
        return {
          type: "block-seq",
          offset: this.offset,
          indent: this.indent,
          items: [{ start: [this.sourceToken] }]
        };
      case "explicit-key-ind": {
        this.onKeyLine = !0;
        const t = Pe(e), a = X(t);
        return a.push(this.sourceToken), {
          type: "block-map",
          offset: this.offset,
          indent: this.indent,
          items: [{ start: a, explicitKey: !0 }]
        };
      }
      case "map-value-ind": {
        this.onKeyLine = !0;
        const t = Pe(e), a = X(t);
        return {
          type: "block-map",
          offset: this.offset,
          indent: this.indent,
          items: [{ start: a, key: null, sep: [this.sourceToken] }]
        };
      }
    }
    return null;
  }
  atIndentedComment(e, t) {
    return this.type !== "comment" || this.indent <= t ? !1 : e.every((a) => a.type === "newline" || a.type === "space");
  }
  *documentEnd(e) {
    this.type !== "doc-mode" && (e.end ? e.end.push(this.sourceToken) : e.end = [this.sourceToken], this.type === "newline" && (yield* this.pop()));
  }
  *lineEnd(e) {
    switch (this.type) {
      case "comma":
      case "doc-start":
      case "doc-end":
      case "flow-seq-end":
      case "flow-map-end":
      case "map-value-ind":
        yield* this.pop(), yield* this.step();
        break;
      case "newline":
        this.onKeyLine = !1;
      // fallthrough
      case "space":
      case "comment":
      default:
        e.end ? e.end.push(this.sourceToken) : e.end = [this.sourceToken], this.type === "newline" && (yield* this.pop());
    }
  }
}
function $a(o) {
  const e = o.prettyErrors !== !1;
  return { lineCounter: o.lineCounter || e && new Fa() || null, prettyErrors: e };
}
function Ha(o, e = {}) {
  const { lineCounter: t, prettyErrors: a } = $a(e), n = new qa(t == null ? void 0 : t.addNewLine), i = new La(e);
  let s = null;
  for (const r of i.compose(n.parse(o), !0, o.length))
    if (!s)
      s = r;
    else if (s.options.logLevel !== "silent") {
      s.errors.push(new me(r.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
      break;
    }
  return a && t && (s.errors.forEach(Ut(o, t)), s.warnings.forEach(Ut(o, t))), s;
}
function _a(o, e, t) {
  let a;
  const n = Ha(o, t);
  if (!n)
    return null;
  if (n.warnings.forEach((i) => eo(n.options.logLevel, i)), n.errors.length > 0) {
    if (n.options.logLevel !== "silent")
      throw n.errors[0];
    n.errors = [];
  }
  return n.toJS(Object.assign({ reviver: a }, t));
}
function Va(o, e, t) {
  let a = null;
  if (typeof e == "function" || Array.isArray(e) ? a = e : t === void 0 && e && (t = e), typeof t == "string" && (t = t.length), typeof t == "number") {
    const n = Math.round(t);
    t = n < 1 ? void 0 : n > 8 ? { indent: 8 } : { indent: n };
  }
  if (o === void 0) {
    const { keepUndefined: n } = t ?? e ?? {};
    if (!n)
      return;
  }
  return be(o) && !a ? o.toString(t) : new Se(o, a, t).toString(t);
}
class Et {
  constructor() {
    this.buckets = /* @__PURE__ */ new Map(), this.dirty = /* @__PURE__ */ new Set(), this.removed = /* @__PURE__ */ new Set();
  }
  static from(e) {
    const t = new Et();
    return t.replaceAll(e), t.clearChanges(), t;
  }
  get(e, t) {
    var a;
    if (t != null)
      return (a = this.buckets.get(e)) == null ? void 0 : a.get(t);
  }
  /** Every element of a type, in insertion order. */
  all(e) {
    var t;
    return [...((t = this.buckets.get(e)) == null ? void 0 : t.values()) ?? []];
  }
  /** Every type that currently holds at least one element. */
  types() {
    return [...this.buckets.keys()];
  }
  has(e, t) {
    return this.get(e, t) !== void 0;
  }
  /** Insert or replace, normalized and marked dirty. */
  put(e, t) {
    let a = this.buckets.get(e);
    a || (a = /* @__PURE__ */ new Map(), this.buckets.set(e, a));
    const n = ye(t);
    return a.set(n.id, n), this.dirty.add(De(e, n.id)), this.removed.delete(De(e, n.id)), n;
  }
  /** Shallow-merge a patch into an existing element. No-op if it is absent. */
  patch(e, t, a) {
    const n = this.get(e, t);
    if (n)
      return this.put(e, { ...n, ...a });
  }
  remove(e, t) {
    const a = this.buckets.get(e);
    return a != null && a.delete(t) ? (this.dirty.delete(De(e, t)), this.removed.add(De(e, t)), !0) : !1;
  }
  /**
   * Add `value` to an element's list field, keeping it unique. This is the
   * back-reference maintenance that a third of the commands do by hand today
   * (e.g. an aggregate's id inside its bounded context's `aggregateIds`).
   */
  addToList(e, t, a, n) {
    const i = this.get(e, t);
    if (!i) return;
    const s = Oe(i[a]);
    s.includes(n) || this.put(e, { ...i, [a]: [...s, n] });
  }
  removeFromList(e, t, a, n) {
    const i = this.get(e, t);
    if (!i) return;
    const s = Oe(i[a]);
    s.includes(n) && this.put(e, { ...i, [a]: s.filter((r) => r !== n) });
  }
  /** Drop `value` from this list field wherever it appears, across a whole type. */
  removeFromAllLists(e, t, a) {
    for (const n of this.all(e))
      Oe(n[t]).includes(a) && this.removeFromList(e, n.id, t, a);
  }
  /** The first element of `type` whose list field contains `value`. */
  findByListMember(e, t, a) {
    return this.all(e).find((n) => Oe(n[t]).includes(a));
  }
  /**
   * The first element of any of `types` that owns a nested item with this id —
   * how polymorphic ownership is resolved (an invariant lives inside an
   * aggregate, a value object or an entity).
   */
  findOwner(e, t, a) {
    for (const n of e) {
      const i = this.all(n).find((s) => qe(s[t]).some((r) => r.id === a));
      if (i) return { type: n, element: i };
    }
  }
  /**
   * Replace the whole content, keeping the instance. Change tracking is NOT
   * reset: a rollback has to leave behind whatever the caller had already
   * recorded, and a reload clears it explicitly.
   */
  replaceAll(e) {
    this.buckets.clear();
    for (const [t, a] of Object.entries(e)) {
      const n = /* @__PURE__ */ new Map();
      for (const i of a ?? []) {
        const s = ye(i);
        n.set(s.id, s);
      }
      n.size && this.buckets.set(t, n);
    }
  }
  changes() {
    return {
      written: [...this.dirty].map($t),
      deleted: [...this.removed].map($t)
    };
  }
  clearChanges() {
    this.dirty.clear(), this.removed.clear();
  }
  /** Snapshot back to the plain shape the file tree serializes. */
  toData() {
    const e = {};
    for (const [t, a] of this.buckets) e[t] = [...a.values()];
    return e;
  }
}
function ye(o) {
  if (Array.isArray(o))
    return o.map(ye).filter(Fe);
  if (o && typeof o == "object") {
    const e = {};
    for (const [t, a] of Object.entries(o)) {
      const n = ye(a);
      Fe(n) && (e[t] = n);
    }
    return e;
  }
  return o;
}
function Fe(o) {
  return o == null || o === !1 ? !1 : typeof o == "string" || Array.isArray(o) ? o.length > 0 : typeof o == "object" ? Object.keys(o).length > 0 : !0;
}
function Oe(o) {
  return Array.isArray(o) ? o : [];
}
function qe(o) {
  return Array.isArray(o) ? o : [];
}
const Po = "\0", De = (o, e) => `${o}${Po}${e}`, $t = (o) => {
  const [e, t] = o.split(Po);
  return { type: e, id: t };
}, Mt = [
  "database",
  "dbMigrationTool",
  "terraformProvider",
  "terraformProviderVersion",
  "terraformBackendType",
  "iamProvider",
  "messageBrokerType",
  "tracingProvider",
  "metricsProvider",
  "loggingProvider",
  "llmProvider",
  "cacheProvider",
  "fileStorageProvider",
  "emailProvider",
  "secretsProvider",
  "cicdProvider",
  "dockerRegistry",
  "environments",
  "tenancyStrategy"
], Oo = (o) => `deployment-${o}`;
function Ga(o) {
  const e = { relations: 0, externalSystems: 0, deployments: 0 };
  for (const t of o.all("projects")) {
    const a = qe(t.contextMap), n = qe(t.externalSystems);
    if (a.length || n.length) {
      for (const i of a) o.put("contextMapRelations", i);
      for (const i of n) o.put("externalSystems", i);
      o.put("projects", Ht(t, ["contextMap", "externalSystems"])), e.relations += a.length, e.externalSystems += n.length;
    }
  }
  for (const t of o.all("projects"))
    o.has("deployments", Oo(t.id)) || Ka(t) && (o.put("deployments", za(t)), o.put("projects", Ht(t, Mt)), e.deployments += 1);
  return e;
}
function Ka(o) {
  return Mt.some((e) => Fe(o[e]));
}
function za(o) {
  const e = { id: Oo(o.id) };
  for (const t of Mt)
    Fe(o[t]) && (e[t] = o[t]);
  return e;
}
function Ht(o, e) {
  const t = { ...o };
  for (const a of e) delete t[a];
  return t;
}
function Wa(o) {
  const e = o.all("modules");
  let t = 0;
  for (const a of o.all("boundedContexts"))
    e.some((n) => n.boundedContextId === a.id) || (o.put("modules", {
      id: Qa(a.id),
      name: a.name ?? a.id,
      boundedContextId: a.id,
      main: !0
    }), t += 1);
  return t;
}
const Qa = (o) => `${o}-main`, Ya = [
  "START",
  "ACTION",
  "JOIN",
  "FORK",
  "CHOICE",
  "END",
  "USER_TASK",
  "PROCESS",
  "TIMER",
  "WAIT_FOR_MESSAGE",
  "SEND_MESSAGE",
  "RULE",
  "DYNAMIC",
  "LOCK",
  "UNLOCK",
  "REPLY",
  "PUBLISH_EVENT",
  "HTTP_CALL",
  "LLM_CALL",
  "CONTINUE_AS_NEW",
  "AGENT"
];
function Ja(o) {
  const e = new Set(Ya);
  let t = 0;
  for (const a of o.all("workflows")) {
    const n = qe(a.steps);
    if (!n.length) continue;
    let i = !1;
    const s = n.map((r) => {
      const l = typeof r.type == "string" ? r.type : "";
      if (l && e.has(l)) return r;
      i = !0;
      const c = l === "SPLIT" ? "FORK" : l === "JOIN" ? "JOIN" : r.roleId || r.formPageId ? "USER_TASK" : "ACTION";
      return { ...r, type: c };
    });
    i && (o.patch("workflows", a.id, { steps: s }), t += 1);
  }
  return t;
}
function Xa(o) {
  const e = Ga(o);
  return Ja(o), Wa(o), e;
}
const Za = ".modux";
function en(o) {
  return `${o.replace(/[^A-Za-z0-9._-]/g, "_")}.yaml`;
}
const rt = (o, e) => `${o}/${en(e)}`;
function Cn(o) {
  return o.replace(/\/+$/, "").split("/").filter(Boolean).at(-1) === Za;
}
async function Tn(o, e) {
  const t = {};
  for (const n of await o.listDirs(e)) {
    const i = (await o.list(ve(e, n))).filter((r) => r.endsWith(".yaml")), s = [];
    for (const r of i.sort()) {
      const l = await tn(o, ve(e, `${n}/${r}`));
      l && s.push(l);
    }
    s.length && (t[n] = s);
  }
  const a = Et.from(t);
  return a.clearChanges(), Xa(a), a;
}
async function En(o, e, t) {
  const a = t.changes();
  if (!a.written.length && !a.deleted.length) return a;
  for (const { type: n, id: i } of a.written) {
    if (n === "views") continue;
    const s = t.get(n, i);
    s && await o.write(ve(e, rt(n, i)), Do(s));
  }
  for (const { type: n, id: i } of a.deleted) {
    const s = ve(e, rt(n, i));
    await o.exists(s) && await o.delete(s);
  }
  return t.clearChanges(), a;
}
async function Mn(o, e, t) {
  for (const a of t.types())
    for (const n of t.all(a))
      await o.write(ve(e, rt(a, n.id)), Do(n));
  t.clearChanges();
}
async function tn(o, e) {
  if (!await o.exists(e)) return;
  const t = await o.read(e);
  return t.trim() ? _a(t) : void 0;
}
function Do(o) {
  return Va(ye(o), { lineWidth: 0 });
}
const ve = (o, e) => o ? `${o}/${e}` : e, on = {
  // Layers (model tree folders, legend, Appearance tab)
  "archi.layer.context": "Strategic",
  "archi.layer.domain": "Domain",
  "archi.layer.event": "Events",
  "archi.layer.behavior": "Behavior",
  "archi.layer.orchestration": "Orchestration",
  "archi.layer.api": "Integration",
  "archi.layer.external": "External",
  "archi.layer.ai": "AI",
  "archi.layer.ui": "UI",
  "archi.layer.tech": "Modules",
  // ArchiMate relationship types
  "archi.relation.composition": "Composition",
  "archi.relation.aggregation": "Aggregation",
  "archi.relation.assignment": "Assignment",
  "archi.relation.realization": "Realization",
  "archi.relation.serving": "Serving",
  "archi.relation.access": "Access",
  "archi.relation.influence": "Influence",
  "archi.relation.triggering": "Triggering",
  "archi.relation.flow": "Flow",
  "archi.relation.specialization": "Specialization",
  "archi.relation.association": "Association",
  // Palette groups
  "archi.group.strategic": "Strategic",
  "archi.group.domain": "Domain",
  "archi.group.behavior": "Behavior",
  "archi.group.orchestration": "Orchestration",
  "archi.group.integration": "Integration",
  "archi.group.external": "External",
  "archi.group.ai": "AI",
  "archi.group.ui": "UI",
  "archi.group.deployment": "Deployment",
  "archi.group.modules": "Modules",
  "archi.group.other": "Other",
  "archi.group.extras": "Extras",
  // Palette elements
  "archi.element.context": "Context",
  "archi.element.aggregate": "Aggregate",
  "archi.element.entity": "Entity",
  "archi.element.valueObject": "Value object",
  "archi.element.invariant": "Invariant",
  "archi.element.readModel": "Read model",
  "archi.element.policy": "Policy",
  "archi.element.event": "Event",
  "archi.element.useCase": "Use case",
  "archi.element.service": "Service",
  "archi.element.actor": "Actor",
  "archi.element.workflow": "Workflow",
  "archi.element.workflowStep": "Step",
  "archi.element.etlFlow": "ETL flow",
  "archi.element.api": "API",
  "archi.element.apiOperation": "API operation",
  "archi.element.proxyApi": "Proxy API",
  "archi.element.integrationEvent": "Integration event",
  "archi.element.externalSystem": "External system",
  "archi.element.identityProvider": "IdP",
  "archi.element.aiAgent": "AI agent",
  "archi.element.mcpGateway": "MCP gateway",
  "archi.element.rag": "RAG",
  "archi.element.uiApp": "UI app",
  "archi.element.page": "Page",
  "archi.element.menuItem": "Menu",
  "archi.element.deployment": "Service (deployment)",
  "archi.element.module": "Module",
  "archi.element.bff": "BFF",
  "archi.element.acl": "ACL",
  "archi.element.apiGateway": "API Gateway",
  "archi.element.adapter": "Adapter",
  "archi.element.saga": "Saga",
  "archi.element.projector": "Projector",
  "archi.element.scheduler": "Scheduler",
  "archi.element.junction": "Junction",
  "archi.element.group": "Group",
  "archi.element.note": "Note",
  // Kind tags in the catalog tree (where they differ from the palette label)
  "archi.kind.deployment": "Service",
  "archi.kind.domainService": "Domain service",
  "archi.kind.queryService": "Query service",
  "archi.kind.model": "Model",
  "archi.kind.system": "System",
  "archi.kind.projection": "Projection",
  "archi.kind.saga": "Saga",
  "archi.kind.gateway": "Gateway",
  "archi.kind.subscription": "Subscription",
  "archi.kind.notification": "Notification",
  "archi.kind.process": "Process",
  // Toolbar and tools
  "archi.toolbar.brandView": "· view",
  "archi.tool.select": "Select",
  "archi.tool.magicConnector": "Magic connector ✦",
  "archi.tool.magicConnectorName": "Magic connector",
  "archi.tool.formatPainter": "Format painter",
  "archi.tool.formatPainterHint": "Format painter: takes the selected element's color and applies it to others with a click. Colors are chosen in Appearance.",
  "archi.hint.formatPainter": "Format painter — click the nodes to give this color",
  "archi.hint.place": "Place “{element}” — click on the canvas",
  "archi.hint.relationTool": "Relation “{relation}”",
  "archi.hint.connect": "{tool} — click the source, then the target",
  "archi.hint.escCancels": "{hint} · Esc cancels",
  "archi.align.left": "Align left",
  "archi.align.centerH": "Center horizontally",
  "archi.align.right": "Align right",
  "archi.align.top": "Align top",
  "archi.align.middleV": "Center vertically",
  "archi.align.bottom": "Align bottom",
  "archi.zoom.in": "Zoom in",
  "archi.zoom.out": "Zoom out",
  "archi.zoom.fit": "Fit: the selection if there is one, otherwise the whole view",
  // Model tree
  "archi.tree.catalog": "Catalog",
  "archi.tree.model": "Model",
  "archi.tree.searchPlaceholder": "Search…",
  "archi.tree.relations": "Relations",
  "archi.tree.addToViewHint": "{name} — drag onto the canvas (or double-click) to add it to the view",
  // Palette
  "archi.palette.title": "Palette",
  "archi.palette.tools": "Tools",
  "archi.palette.relations": "Relations",
  "archi.palette.stickyHint": "Shift = sticky",
  "archi.palette.resizeHint": "Drag to adjust the width",
  // Properties panel
  "archi.tab.main": "Main",
  "archi.tab.appearance": "Appearance",
  "archi.tab.properties": "Properties",
  "archi.props.name": "Name",
  "archi.props.type": "Type",
  "archi.props.layer": "Layer",
  "archi.props.fill": "Fill",
  "archi.props.border": "Border",
  "archi.props.color": "Color",
  "archi.props.archimateStroke": "#5C5C5C (ArchiMate notation)",
  "archi.props.resetFill": "Reset to the layer's color",
  "archi.props.fillIsViewOnly": "The color belongs to this view; the model does not change.",
  "archi.props.documentation": "Documentation",
  "archi.props.elementDocPlaceholder": "Description of the element…",
  "archi.props.relationDocPlaceholder": "Description of the relation…",
  "archi.props.lineStyle": "Line style",
  "archi.props.lineDashed": "dashed",
  "archi.props.lineSolid": "solid",
  "archi.props.relation": "Relation",
  "archi.props.source": "Source",
  "archi.props.target": "Target",
  "archi.props.keyPlaceholder": "key",
  "archi.props.valuePlaceholder": "value",
  "archi.props.addProperty": "+ Add property",
  "archi.props.changeTypeHint": "Changing the type keeps the id, the name and what they have in common; it is blocked while something references the element",
  "archi.props.description": "Description",
  "archi.props.descriptionPlaceholder": "What it is, in the language of the domain…",
  "archi.props.fields": "Fields",
  "archi.props.addField": "+ field",
  "archi.props.removeField": "Remove field",
  "archi.props.noFields": "No fields yet.",
  "archi.props.invariants": "Invariants",
  "archi.props.removeInvariant": "Remove invariant",
  "archi.props.newInvariantPlaceholder": "New rule, e.g. IsbnRequired",
  "archi.props.operations": "Operations",
  "archi.props.removeOperation": "Remove operation",
  "archi.props.operationIntentPlaceholder": "What it does (becomes the hook to implement)…",
  "archi.props.newOperationPlaceholder": "New operation, e.g. withdraw",
  "archi.props.none": "— none —",
  "archi.props.boundedContext": "Bounded context",
  "archi.props.subdomain": "Subdomain",
  "archi.props.aggregates": "Aggregates",
  "archi.props.aggregate": "Aggregate",
  "archi.props.context": "Context",
  "archi.props.noContext": "— no context —",
  "archi.props.entities": "Entities",
  "archi.props.valueObjects": "Value objects",
  "archi.props.cron": "Cron",
  "archi.props.cronHint": "Spring cron: second minute hour day month weekday",
  "archi.props.triggers": "Triggers",
  "archi.props.triggersNone": "— draw a line to a use case —",
  "archi.props.port": "Port",
  "archi.props.selectViewElement": "Select an element of the view.",
  "archi.props.selectModelElement": "Select an element of the model.",
  "archi.props.selectTreeOrCanvasElement": "Select an element in the tree or on the canvas.",
  // Use case contract and pipeline
  "archi.useCase.input": "Input",
  "archi.useCase.result": "Result",
  "archi.useCase.editFields": "Edit its fields",
  "archi.useCase.createModelHint": "Create a new model and edit its fields",
  "archi.useCase.create": "Create",
  "archi.useCase.exposed": "Exposed (POST /v1/{path})",
  "archi.useCase.steps": "Steps",
  "archi.useCase.addCustomStep": "+ custom step",
  "archi.useCase.moveStepUp": "Move up",
  "archi.useCase.moveStepDown": "Move down",
  "archi.useCase.removeStep": "Remove step",
  "archi.useCase.stepIntentPlaceholder": "What it has to do (becomes the hook to implement)…",
  "archi.useCase.noSteps": "No steps: draw lines to aggregates or events, or add a custom step.",
  // Menus
  "archi.menu.reverse": "reverse",
  "archi.menu.createFrom": "Create element from “{name}”",
  "archi.menu.createOnly": "(create only)",
  "archi.context.rename": "Rename",
  "archi.context.unnest": "Move out of the container",
  "archi.context.delete": "Delete",
  "archi.context.deleteKey": "Del",
  // Toasts
  "archi.toast.movedToContext": "“{element}” now belongs to “{context}”",
  "archi.toast.deployedIn": "“{module}” is deployed in “{service}”",
  "archi.toast.formatPainterNeedsSelection": "Select the element whose color you want to copy (colors are chosen in Appearance)",
  "archi.toast.triggers": "“{source}” triggers “{target}”",
  "archi.toast.cannotConnect": "Cannot tell how to connect “{source}” to “{target}”",
  "archi.toast.noValidRelation": "There is no valid relation between “{source}” and “{target}”",
  "archi.toast.relationNotValid": "“{relation}” is not valid between “{source}” and “{target}”",
  "archi.toast.cannotCreateStandalone": "“{element}” needs a container or cannot be created on its own yet",
  "archi.toast.connected": "{action}: “{source}” → “{target}”",
  // Standalone prototype pages
  "archi.spike.banner": "real model · FREE-FORM view (you decide what it includes) · persisted in localStorage",
  // default names of new elements (model content, in the UI language)
  "archi.default.fieldN": "field{n}",
  "archi.default.stepN": "step{n}"
}, an = {
  "archi.layer.context": "Estratégico",
  "archi.layer.domain": "Dominio",
  "archi.layer.event": "Eventos",
  "archi.layer.behavior": "Comportamiento",
  "archi.layer.orchestration": "Orquestación",
  "archi.layer.api": "Integración",
  "archi.layer.external": "Externo",
  "archi.layer.ai": "IA",
  "archi.layer.ui": "UI",
  "archi.layer.tech": "Módulos",
  "archi.relation.composition": "compone",
  "archi.relation.aggregation": "agrega",
  "archi.relation.assignment": "asignado",
  "archi.relation.realization": "realiza",
  "archi.relation.serving": "sirve",
  "archi.relation.access": "accede",
  "archi.relation.influence": "influye",
  "archi.relation.triggering": "dispara",
  "archi.relation.flow": "fluye",
  "archi.relation.specialization": "especializa",
  "archi.relation.association": "asocia",
  "archi.group.strategic": "Estratégico",
  "archi.group.domain": "Dominio",
  "archi.group.behavior": "Comportamiento",
  "archi.group.orchestration": "Orquestación",
  "archi.group.integration": "Integración",
  "archi.group.external": "Externo",
  "archi.group.ai": "IA",
  "archi.group.ui": "UI",
  "archi.group.deployment": "Despliegue",
  "archi.group.modules": "Módulos",
  "archi.group.other": "Otros",
  "archi.group.extras": "Extras",
  "archi.element.context": "Contexto",
  "archi.element.aggregate": "Agregado",
  "archi.element.entity": "Entidad",
  "archi.element.valueObject": "Value object",
  "archi.element.invariant": "Invariante",
  "archi.element.readModel": "Read model",
  "archi.element.policy": "Policy",
  "archi.element.event": "Evento",
  "archi.element.useCase": "Caso de uso",
  "archi.element.service": "Servicio",
  "archi.element.actor": "Actor",
  "archi.element.workflow": "Workflow",
  "archi.element.workflowStep": "Paso",
  "archi.element.etlFlow": "Flujo ETL",
  "archi.element.api": "API",
  "archi.element.apiOperation": "Operación API",
  "archi.element.proxyApi": "Proxy API",
  "archi.element.integrationEvent": "Evento integración",
  "archi.element.externalSystem": "Sistema externo",
  "archi.element.identityProvider": "IdP",
  "archi.element.aiAgent": "Agente IA",
  "archi.element.mcpGateway": "Gateway MCP",
  "archi.element.rag": "RAG",
  "archi.element.uiApp": "App UI",
  "archi.element.page": "Página",
  "archi.element.menuItem": "Menú",
  "archi.element.deployment": "Servicio (despliegue)",
  "archi.element.module": "Módulo",
  "archi.element.bff": "BFF",
  "archi.element.acl": "ACL",
  "archi.element.apiGateway": "API Gateway",
  "archi.element.adapter": "Adaptador",
  "archi.element.saga": "Saga",
  "archi.element.projector": "Projector",
  "archi.element.scheduler": "Scheduler",
  "archi.element.junction": "Junction",
  "archi.element.group": "Grupo",
  "archi.element.note": "Nota",
  "archi.kind.deployment": "Servicio",
  "archi.kind.domainService": "Servicio de dominio",
  "archi.kind.queryService": "Query service",
  "archi.kind.model": "Modelo",
  "archi.kind.system": "Sistema",
  "archi.kind.projection": "Proyección",
  "archi.kind.saga": "Saga",
  "archi.kind.gateway": "Gateway",
  "archi.kind.subscription": "Suscripción",
  "archi.kind.notification": "Notificación",
  "archi.kind.process": "Proceso",
  "archi.toolbar.brandView": "· vista",
  "archi.tool.select": "Seleccionar",
  "archi.tool.magicConnector": "Conector mágico ✦",
  "archi.tool.magicConnectorName": "Conector mágico",
  "archi.tool.formatPainter": "Copiar formato",
  "archi.tool.formatPainterHint": "Copiar formato: toma el color del elemento seleccionado y aplícalo a otros con un click. El color se elige en Apariencia.",
  "archi.hint.formatPainter": "Copiar formato — click en los nodos a los que dar este color",
  "archi.hint.place": "Coloca «{element}» — click en el lienzo",
  "archi.hint.relationTool": "Relación «{relation}»",
  "archi.hint.connect": "{tool} — click en origen y luego en destino",
  "archi.hint.escCancels": "{hint} · Esc cancela",
  "archi.align.left": "Alinear izquierda",
  "archi.align.centerH": "Centrar horizontal",
  "archi.align.right": "Alinear derecha",
  "archi.align.top": "Alinear arriba",
  "archi.align.middleV": "Centrar vertical",
  "archi.align.bottom": "Alinear abajo",
  "archi.zoom.in": "Acercar",
  "archi.zoom.out": "Alejar",
  "archi.zoom.fit": "Encuadrar: la selección si hay alguna; si no, toda la vista",
  "archi.tree.catalog": "Catálogo",
  "archi.tree.model": "Modelo",
  "archi.tree.searchPlaceholder": "Buscar…",
  "archi.tree.relations": "Relaciones",
  "archi.tree.addToViewHint": "{name} — arrastra al lienzo (o doble click) para añadirlo a la vista",
  "archi.palette.title": "Paleta",
  "archi.palette.tools": "Herramientas",
  "archi.palette.relations": "Relaciones",
  "archi.palette.stickyHint": "Shift = fija",
  "archi.palette.resizeHint": "Arrastra para ajustar el ancho",
  "archi.tab.main": "Principal",
  "archi.tab.appearance": "Apariencia",
  "archi.tab.properties": "Propiedades",
  "archi.props.name": "Nombre",
  "archi.props.type": "Tipo",
  "archi.props.layer": "Capa",
  "archi.props.fill": "Relleno",
  "archi.props.border": "Borde",
  "archi.props.color": "Color",
  "archi.props.archimateStroke": "#5C5C5C (notación ArchiMate)",
  "archi.props.resetFill": "Restablecer el color de la capa",
  "archi.props.fillIsViewOnly": "El color es de esta vista; el modelo no cambia.",
  "archi.props.documentation": "Documentación",
  "archi.props.elementDocPlaceholder": "Descripción del elemento…",
  "archi.props.relationDocPlaceholder": "Descripción de la relación…",
  "archi.props.lineStyle": "Tipo de línea",
  "archi.props.lineDashed": "discontinua",
  "archi.props.lineSolid": "sólida",
  "archi.props.relation": "Relación",
  "archi.props.source": "Origen",
  "archi.props.target": "Destino",
  "archi.props.keyPlaceholder": "clave",
  "archi.props.valuePlaceholder": "valor",
  "archi.props.addProperty": "+ Añadir propiedad",
  "archi.props.changeTypeHint": "Cambiar el tipo conserva id, nombre y lo común; se bloquea si algo lo referencia",
  "archi.props.description": "Descripción",
  "archi.props.descriptionPlaceholder": "Qué es, en lenguaje del dominio…",
  "archi.props.fields": "Campos",
  "archi.props.addField": "+ campo",
  "archi.props.removeField": "Quitar campo",
  "archi.props.noFields": "Sin campos todavía.",
  "archi.props.invariants": "Invariantes",
  "archi.props.removeInvariant": "Quitar invariante",
  "archi.props.newInvariantPlaceholder": "Nueva regla, p. ej. IsbnObligatorio",
  "archi.props.operations": "Operaciones",
  "archi.props.removeOperation": "Quitar operación",
  "archi.props.operationIntentPlaceholder": "Qué hace (se convierte en el gancho a implementar)…",
  "archi.props.newOperationPlaceholder": "Nueva operación, p. ej. retirar",
  "archi.props.none": "— ninguno —",
  "archi.props.boundedContext": "Bounded context",
  "archi.props.subdomain": "Subdominio",
  "archi.props.aggregates": "Agregados",
  "archi.props.aggregate": "Agregado",
  "archi.props.context": "Contexto",
  "archi.props.noContext": "— sin contexto —",
  "archi.props.entities": "Entidades",
  "archi.props.valueObjects": "Value objects",
  "archi.props.cron": "Cron",
  "archi.props.cronHint": "Cron de Spring: segundo minuto hora día mes día-semana",
  "archi.props.triggers": "Dispara",
  "archi.props.triggersNone": "— traza una línea a un caso de uso —",
  "archi.props.port": "Puerto",
  "archi.props.selectViewElement": "Selecciona un elemento de la vista.",
  "archi.props.selectModelElement": "Selecciona un elemento del modelo.",
  "archi.props.selectTreeOrCanvasElement": "Selecciona un elemento en el árbol o el lienzo.",
  "archi.useCase.input": "Entrada",
  "archi.useCase.result": "Resultado",
  "archi.useCase.editFields": "Editar sus campos",
  "archi.useCase.createModelHint": "Crear un modelo nuevo y editar sus campos",
  "archi.useCase.create": "Crear",
  "archi.useCase.exposed": "Expuesto (POST /v1/{path})",
  "archi.useCase.steps": "Pasos",
  "archi.useCase.addCustomStep": "+ paso custom",
  "archi.useCase.moveStepUp": "Subir",
  "archi.useCase.moveStepDown": "Bajar",
  "archi.useCase.removeStep": "Quitar paso",
  "archi.useCase.stepIntentPlaceholder": "Qué tiene que hacer (se convierte en el gancho a implementar)…",
  "archi.useCase.noSteps": "Sin pasos: traza líneas a agregados o eventos, o añade un paso custom.",
  "archi.menu.reverse": "inversa",
  "archi.menu.createFrom": "Crear elemento desde «{name}»",
  "archi.menu.createOnly": "(solo crear)",
  "archi.context.rename": "Renombrar",
  "archi.context.unnest": "Sacar del contenedor",
  "archi.context.delete": "Borrar",
  "archi.context.deleteKey": "Supr",
  "archi.toast.movedToContext": "«{element}» pasa a «{context}»",
  "archi.toast.deployedIn": "«{module}» se despliega en «{service}»",
  "archi.toast.formatPainterNeedsSelection": "Selecciona el elemento cuyo color quieres copiar (el color se elige en Apariencia)",
  "archi.toast.triggers": "«{source}» dispara «{target}»",
  "archi.toast.cannotConnect": "No sé conectar «{source}» con «{target}»",
  "archi.toast.noValidRelation": "No hay ninguna relación válida entre «{source}» y «{target}»",
  "archi.toast.relationNotValid": "«{relation}» no es válida entre «{source}» y «{target}»",
  "archi.toast.cannotCreateStandalone": "«{element}» necesita un contenedor o aún no se puede crear suelto",
  "archi.toast.connected": "{action}: «{source}» → «{target}»",
  "archi.spike.banner": "modelo real · vista LIBRE (tú decides qué incluye) · persiste en localStorage",
  "archi.default.fieldN": "campo{n}",
  "archi.default.stepN": "paso{n}"
}, nn = {
  // Empty canvas
  "canvas.empty.title": "Empty canvas",
  "canvas.empty.hint": "Drag elements from the palette to get started",
  // Nodes
  "canvas.node.derivedTooltip": "Inferred: stub generated by the system (not declared by hand)",
  "canvas.node.diffAdded": "New in this solution (does not exist in the system)",
  "canvas.node.diffModified": "Modified relative to the system",
  "canvas.node.expand": "Expand: show the node’s children",
  "canvas.node.collapse": "Collapse: hide the children",
  // Edge editing
  "canvas.waypoint.tooltip": "Drag to adjust · Delete or double-click to remove the point",
  "canvas.bendpoint.tooltip": "Drag to create a bendpoint",
  "canvas.resize.tooltip": "Drag to resize (Shift: symmetric from the center)",
  // Minimap
  "canvas.minimap.tooltip": "Minimap — click or drag to navigate",
  // Connect handles (top-level nodes)
  "canvas.handle.note": "Drag onto any element or relation: the note will be tied to it with a thread",
  "canvas.handle.service": "Drag onto a module (or its context) to deploy it in this service",
  "canvas.handle.boundedContext": "Drag onto another context (choose the DDD pattern), an IdP (identity) or any element (ArchiMate relation)",
  "canvas.handle.actor": "Drag onto a use case, query service or aggregate (derives a UI), or onto an external system (dependency)",
  "canvas.handle.aiAgent": "Drag onto a tool (use case, query service, operation, MCP server, gateway), another agent or a RAG",
  "canvas.handle.mcpGateway": "Drag onto what it exposes: an MCP server, an API, an operation, a use case or a RAG",
  "canvas.handle.rag": "Drag onto a read model: the RAG will index its content",
  "canvas.handle.workflowStep": "Drag onto another step: the target will wait for this one to complete",
  "canvas.handle.externalSystem": "Drag onto a use case (it will call it through an ACL), another external system, an API or a proxy (dependency)",
  "canvas.handle.api": "Drag onto the external system that publishes it: the API gets nested in it",
  "canvas.handle.proxyApi": "Drag onto the API it proxies, or onto the external system that hosts it",
  "canvas.handle.workflow": "Drag onto a use case: the workflow will orchestrate it as a step",
  "canvas.handle.default": "Drag onto another node to create a relation",
  // Connect handles (nested nodes)
  "canvas.handle.childApi": "Drag onto another external system: the API will move to that publisher",
  "canvas.handle.childProxyApi": "Drag onto the API it proxies, or onto another external system to move it",
  "canvas.handle.childEvent": "Drag onto another context or a read model to materialize it (flow)",
  "canvas.handle.childExternalSource": "Drag onto a read model or a context to project it (polling)",
  "canvas.handle.childApiOperation": "Drag onto the use case, policy or context that implements it",
  "canvas.handle.childApiOpOccurrence": "Drag onto the implementation that serves this operation (the published API or a bounded context’s)",
  "canvas.handle.childUseCase": "Drag onto another use case to invoke it, or onto an application event to publish it",
  "canvas.handle.childDefault": "Drag onto a domain event to declare that it emits it",
  // 3D tilt view
  "canvas.tilt.empty": "Nothing to tilt — the diagram is empty",
  "canvas.tilt.connectHandle": "Drag onto another node to connect",
  "canvas.tilt.help": "click selects · ▸ expands the node · drag the background: multiple selection · alt+drag orbits · double-click opens · drag a plate to move it · shift, space or middle button+drag pans · wheel to zoom · Delete deletes · F2 renames · double-click the background resets"
}, sn = {
  "canvas.empty.title": "Lienzo vacío",
  "canvas.empty.hint": "Arrastra elementos de la paleta para empezar",
  "canvas.node.derivedTooltip": "Inferido: stub generado por el sistema (no declarado a mano)",
  "canvas.node.diffAdded": "Nuevo en esta solución (no existe en el sistema)",
  "canvas.node.diffModified": "Modificado respecto al sistema",
  "canvas.node.expand": "Expandir: muestra los hijos del nodo",
  "canvas.node.collapse": "Contraer: oculta los hijos",
  "canvas.waypoint.tooltip": "Arrastra para ajustar · Supr o doble click para quitar el punto",
  "canvas.bendpoint.tooltip": "Arrastra para crear un punto de ruptura",
  "canvas.resize.tooltip": "Arrastra para cambiar el tamaño (Shift: simétrico desde el centro)",
  "canvas.minimap.tooltip": "Minimapa — click o arrastra para navegar",
  "canvas.handle.note": "Arrastra hasta cualquier elemento o relación: la nota quedará atada con un hilo",
  "canvas.handle.service": "Arrastra hasta un módulo (o su contexto) para desplegarlo en este servicio",
  "canvas.handle.boundedContext": "Arrastra hasta otro contexto (elige el patrón DDD), un IdP (identidad) o cualquier elemento (relación ArchiMate)",
  "canvas.handle.actor": "Arrastra hasta un caso de uso, query service o agregado (deriva una UI), o hasta un sistema externo (dependencia)",
  "canvas.handle.aiAgent": "Arrastra hasta una herramienta (caso de uso, query service, operación, servidor MCP, gateway), otro agente o un RAG",
  "canvas.handle.mcpGateway": "Arrastra hasta lo que expone: un servidor MCP, una API, una operación, un caso de uso o un RAG",
  "canvas.handle.rag": "Arrastra hasta un read model: el RAG indexará su contenido",
  "canvas.handle.workflowStep": "Arrastra hasta otro paso: el destino esperará a que éste complete",
  "canvas.handle.externalSystem": "Arrastra hasta un caso de uso (lo llamará vía ACL), otro sistema externo, una API o un proxy (dependencia)",
  "canvas.handle.api": "Arrastra hasta el sistema externo que la publica: la API se anida en él",
  "canvas.handle.proxyApi": "Arrastra hasta la API que proxea, o hasta el sistema externo que lo aloja",
  "canvas.handle.workflow": "Arrastra hasta un caso de uso: el workflow lo orquestará como un paso",
  "canvas.handle.default": "Arrastra hasta otro nodo para crear una relación",
  "canvas.handle.childApi": "Arrastra hasta otro sistema externo: la API se moverá a ese publicador",
  "canvas.handle.childProxyApi": "Arrastra hasta la API que proxea, o a otro sistema externo para moverlo",
  "canvas.handle.childEvent": "Arrastra hasta otro contexto o un read model para materializarlo (flow)",
  "canvas.handle.childExternalSource": "Arrastra hasta un read model o un contexto para proyectarlo (polling)",
  "canvas.handle.childApiOperation": "Arrastra hasta el caso de uso, policy o contexto que la implementa",
  "canvas.handle.childApiOpOccurrence": "Arrastra hasta la implementación que sirve esta operación (la API publicada o la de un bounded context)",
  "canvas.handle.childUseCase": "Arrastra hasta otro caso de uso para invocarlo, o hasta un evento de aplicación para publicarlo",
  "canvas.handle.childDefault": "Arrastra hasta un evento de dominio para declarar que lo emite",
  "canvas.tilt.empty": "Nada que inclinar — el diagrama está vacío",
  "canvas.tilt.connectHandle": "Arrastra hasta otro nodo para conectar",
  "canvas.tilt.help": "click selecciona · ▸ despliega el nodo · arrastra el fondo: selección múltiple · alt+arrastra orbita · doble click abre · arrastra una placa para moverla · shift, espacio o botón central+arrastra panea · rueda para zoom · Supr borra · F2 renombra · doble click en el fondo resetea"
}, rn = {
  "editor.toolbar.brandHint": "Graphical editor — context map, aggregates, flows, processes and event storming on an editable canvas; changes are saved to the model",
  "editor.toolbar.brand": "Graphical editor",
  "editor.toolbar.paletteHint": "Element palette: drag new or existing elements onto the canvas (P)",
  "editor.toolbar.treeHint": "Catalog tree: check which elements belong to the view (deletes nothing from the project)",
  "editor.toolbar.tree": "☰ Tree",
  "editor.toolbar.viewNamePlaceholder": "View name…",
  "editor.toolbar.createViewFromSelection": "Create a modux view with the selection",
  "editor.toolbar.createEmptyView": "Create an empty modux view — then add elements by dropping them or from the tree",
  "editor.toolbar.createView": "⊞ View",
  "editor.toolbar.importApiIntoHint": "Imports an OpenAPI/WSDL into the selected API (operations and rq/rs models)",
  "editor.toolbar.importApiNewHint": "Imports an OpenAPI/WSDL as a new API in the diagram",
  "editor.toolbar.importApiHere": "⇪ Import API here",
  "editor.toolbar.importApi": "⇪ Import API…",
  "editor.toolbar.ragSourceType": "Type of the RAG content source",
  "editor.toolbar.ragSourceUriPlaceholder": "Source URI…",
  "editor.toolbar.ragSourceUriHint": "The source that feeds the RAG: repo, web, FTP, database, bucket, SharePoint, Confluence, Drive or file system",
  "editor.toolbar.addRagSourceHint": "Add the content source to the selected RAG",
  "editor.toolbar.addRagSource": "＋ Source",
  "editor.toolbar.fitHint": "Fit the view to the selection (or to the whole diagram, if nothing is selected)",
  "editor.toolbar.fit": "⌖ Fit",
  "editor.toolbar.zoomOut": "Zoom out (− key)",
  "editor.toolbar.zoomIn": "Zoom in (+ key)",
  "editor.toolbar.autoLayoutSelectionHint": "Lays out only the {count} selected elements (undoable)",
  "editor.toolbar.autoLayoutHint": "Lays out the whole diagram automatically — or only the selection, if any (undoable)",
  "editor.toolbar.rerouteSelectionHint": "Reroutes only the selection's lines over the current positions, without moving the nodes (undoable)",
  "editor.toolbar.rerouteHint": "Reroutes every line over the current positions, without moving the nodes (undoable)",
  "editor.toolbar.reroute": "↻ Lines",
  "editor.toolbar.alignRowHint": "Align the selected elements in a row (same height)",
  "editor.toolbar.alignRow": "↔ Align",
  "editor.toolbar.alignColumnHint": "Align the selected elements in a column (same vertical)",
  "editor.toolbar.alignColumn": "↕ Align",
  "editor.toolbar.migrateHint": "Processes and sagas merge into workflows: a linear chain with a role, a deadline and a compensation on each step",
  "editor.toolbar.migrate": "⇪ Migrate {what}",
  "editor.toolbar.migrateProcesses": "{count} processes",
  "editor.toolbar.migrateSagas": "{count} sagas",
  "editor.toolbar.migrateAnd": " and ",
  "editor.toolbar.tiltBack": "Back to the editable canvas (V)",
  "editor.toolbar.tiltHint": "3D view: the diagram as plates stacked by containment (V)",
  "editor.toolbar.yugoBack": "Back to the editable canvas (Y)",
  "editor.toolbar.yugoHint": "Yugo surface: the view as a physical organism — click expands, shift+drag relates (Y)",
  "editor.toolbar.hideDerivedHint": "Hide the inferred elements (stubs generated by the system, marked ✦)",
  "editor.toolbar.showDerivedHint": "Show the inferred elements (stubs generated by the system, marked ✦)",
  "editor.toolbar.derivedShown": "✦ Inferred: shown",
  "editor.toolbar.derivedHidden": "✦ Inferred: hidden",
  "editor.toolbar.exitFullscreen": "Exit full screen (F or Esc)",
  "editor.toolbar.fullscreen": "The diagram in full screen (F)",
  "editor.toolbar.helpHint": "Keyboard shortcuts and gestures (?)",
  "editor.palette.filter": "Filter…",
  "editor.palette.newHeader": "New — drag onto the canvas",
  "editor.palette.dropWorkflowStep": "Drop it on a workflow — or on one of its steps to chain it",
  "editor.palette.dropOnContainer": "Drop it on its container (context, external system or API)",
  "editor.palette.dropOnCanvas": "Drop it on the canvas",
  "editor.palette.catalogHeader": "Catalog — drag to place or connect",
  "editor.palette.catalogItemHint": "Drop it on the canvas to place it, or on a node to connect it",
  "editor.palette.newTabHint": "New elements to drag onto the canvas",
  "editor.palette.newTab": "New",
  "editor.palette.catalogTabHint": "The model's catalog: place or connect existing elements",
  "editor.palette.catalogTab": "Catalog",
  "editor.group.contexts": "Contexts",
  "editor.group.externalSystems": "External systems",
  "editor.group.apis": "APIs",
  "editor.group.actors": "Actors",
  "editor.group.aiAgents": "AI agents",
  "editor.group.mcpGateways": "MCP gateways",
  "editor.group.rags": "RAGs",
  "editor.group.flows": "Flows",
  "editor.group.processes": "Processes",
  "editor.group.workflows": "Workflows",
  "editor.group.systems": "Systems",
  "editor.group.cdcs": "CDC",
  "editor.group.apps": "Apps",
  "editor.group.pages": "Pages",
  "editor.group.models": "Models",
  "editor.group.scheduledTriggers": "Scheduled triggers",
  "editor.group.mappings": "Mappings",
  "editor.group.useCases": "Use cases",
  "editor.group.events": "Events",
  "editor.group.aggregates": "Aggregates",
  "editor.group.readModels": "Read models",
  "editor.group.queryOperations": "Query operations",
  "editor.group.queryServices": "Query services",
  "editor.group.externalOperations": "External operations and tables",
  "editor.group.apiOperations": "API operations",
  "editor.group.proxyApis": "Proxy APIs",
  "editor.viewTree.implicitHint": "Already shown through its container; check it to make it an explicit member",
  "editor.viewTree.memberHint": "View member — unchecking removes it from the view, NOT from the project",
  "editor.viewTree.title": "View: {name}",
  "editor.drawer.name": "Name",
  "editor.drawer.close": "Close (Esc)",
  "editor.drawer.elementGone": "This element is no longer in the model.",
  "editor.drawer.component": "Component",
  "editor.drawer.componentGone": "This component is no longer in the mockup.",
  "editor.drawer.componentKind": "Component · {kind}",
  "editor.drawer.title": "Title",
  "editor.drawer.label": "Label",
  "editor.drawer.text": "Text",
  "editor.drawer.useCase": "Use case",
  "editor.drawer.model": "Model",
  "editor.drawer.field": "Field",
  "editor.drawer.elements.one": "1 element",
  "editor.drawer.elements.other": "{count} elements",
  "editor.drawer.yes": "yes",
  "editor.drawer.no": "no",
  "editor.elementType.context": "Context",
  "editor.elementType.aggregate": "Aggregate",
  "editor.elementType.entity": "Entity",
  "editor.elementType.valueObject": "Value object",
  "editor.elementType.useCase": "Use case",
  "editor.elementType.field": "Field",
  "editor.elementType.flow": "Flow",
  "editor.elementType.process": "Process",
  "editor.elementType.workflow": "Workflow",
  "editor.elementType.domainEvent": "Domain event",
  "editor.elementType.subscription": "Subscription",
  "editor.elementType.projection": "Projection",
  "editor.elementType.readModel": "Read model",
  "editor.elementType.uiAdapter": "UI adapter",
  "editor.elementType.page": "Page",
  "editor.elementType.service": "Service",
  "editor.elementType.queryService": "Query service",
  "editor.elementType.actor": "Actor",
  "editor.elementType.scheduledTrigger": "Scheduled trigger",
  "editor.elementType.workflowGateway": "Gateway",
  "editor.elementType.model": "Model",
  "editor.elementType.mapping": "Mapping",
  "editor.elementType.component": "Component",
  "editor.elementType.externalSystem": "External system",
  "editor.elementType.module": "Module",
  "editor.elementType.customCode": "Custom code",
  "editor.elementType.aiAgent": "AI agent",
  "editor.elementType.rag": "RAG",
  "editor.elementType.mcpGateway": "MCP gateway",
  "editor.elementType.identityProvider": "Identity provider",
  "editor.connect.invert": "⇄ Reverse direction",
  "editor.connect.invertHint": "Swaps source and target and offers the types again",
  "editor.connect.title": "Which relation is this line?",
  "editor.relation.invert": "↔ Reverse direction",
  "editor.relation.invertHint": "Swaps the relation's source and target",
  "editor.relation.typeTitle": "Relation type",
  "editor.relation.changeType": "Change type",
  "editor.nature.markFact": "◆ Mark as fact (real)",
  "editor.nature.markIntent": "◇ Mark as intent (sketch)",
  "editor.nature.markFactHint": "Counts as real coupling: it generates code and rolls up",
  "editor.nature.markIntentHint": "A sketch with no weight in the code; it is confirmed when a fact below realizes it",
  "editor.extDep.depends": "Simple dependency",
  "editor.extDep.cqrs": "CQRS — query over its data",
  "editor.extDep.title": "Dependency type",
  "editor.repo.title": "Reference another modux project",
  "editor.repo.placeholder": "Repository URL, or ../other-repo/modux",
  "editor.repo.reference": "Reference",
  "editor.invariant.title": "⚖ {name} — condition (empty removes it)",
  "editor.invariant.expressionPlaceholder": "expression — e.g. amount >= 0",
  "editor.invariant.errorPlaceholder": "error message — e.g. The amount cannot be negative",
  "editor.branch.title": "Branch condition (empty removes it)",
  "editor.branch.placeholder": "e.g. amount > 1000",
  "editor.wfStep.title": "Which workflow does the step belong to?",
  "editor.delete.elements": "{count} elements ({names})",
  "editor.delete.titleWithView": "Delete {what}, or only remove it from the view?",
  "editor.delete.title": "Delete {what} from the model?",
  "editor.delete.removeFromView": "Remove from view «{name}»",
  "editor.delete.fromModel": "Delete from the model — it disappears from every view and diagram",
  "editor.help.palette": "Show/hide the palette",
  "editor.help.fullscreen": "Full screen (Esc exits)",
  "editor.help.fit": "Fit the view to the selection (or to the whole diagram)",
  "editor.help.zoom": "Zoom (also with the wheel)",
  "editor.help.systemMapDistribution": "System map · Distribution",
  "editor.help.sequences": "Sequences (interactions)",
  "editor.help.otherViews": "Flows · Processes · Workflows · UI · Design",
  "editor.help.aggregates": "Aggregates view",
  "editor.help.eventstorming": "EventStorming view",
  "editor.help.tilt": "3D view (stacked plates, Firefox Tilt style)",
  "editor.help.tree": "Catalog tree (with an active view)",
  "editor.help.deleteKey": "Del",
  "editor.help.delete": "Delete the selection",
  "editor.help.rename": "Rename the selected node",
  "editor.help.undoRedo": "Undo / redo",
  "editor.help.panKeys": "Space+drag",
  "editor.help.pan": "Move the canvas",
  "editor.help.multiKeys": "Shift+click / drag",
  "editor.help.multi": "Multi-select / rubber band",
  "editor.help.freeDragKeys": "Alt+drag",
  "editor.help.freeDrag": "Free drag (turns off grid snapping and guides)",
  "editor.help.help": "This help",
  "editor.help.title": "Keyboard shortcuts",
  "editor.hint.contextMap": "Drag to reorder · Shift+drag moves an API between systems (and an external system into/out of another) · Ctrl+drag an API onto a system creates a proxy · blue handle → create relation (pick the type) · double click on the label changes the type · drag on empty space to select · space+drag moves the canvas · Del deletes the selected relation or empty context · F2 renames · wheel to zoom",
  "editor.hint.eventstorming": "View derived from the model: blue command → yellow aggregate → orange event → lilac policy → green read model · edited from the other views or the CRUDs (double click opens the CRUD) · ✨ Auto-layout orders the narrative · wheel to zoom",
  "editor.hint.workflows": "Drag a step onto another with the handle to declare a dependency (B waits for A) · Del deletes the selected step or dependency · F2 renames · double click opens the CRUD · space+drag moves the canvas · wheel to zoom",
  "editor.hint.default": "Drag to reorder · drag on empty space to select · space+drag moves the canvas · Del deletes (if empty) · F2 renames · double click opens the CRUD · wheel to zoom",
  "editor.hint.press": "press",
  "editor.hint.forShortcuts": "for shortcuts",
  "editor.importApi.selectTarget": "Select the target API, or the external system or context that will publish it, before importing",
  "editor.importApi.buildStep": "Importing a contract is a build step: {command}",
  "editor.drop.tabOnTabLayout": "Drop the tab on a tab layout",
  "editor.drop.componentOnPage": "Drop the layout/component on a page",
  "editor.drop.stepOnWizard": "Drop the step on a wizard",
  "editor.drop.menuItemOnApp": "Drop the menu entry on an app",
  "editor.drop.transformOnEtlFlow": "Drop the transformation on an ETL flow",
  "editor.drop.apiNeedsHome": "An API lives in an external system or in a context: drop it on one",
  "editor.drop.operationOnApi": "Drop the operation on an API",
  "editor.drop.stepOnUseCase": "Drop the step on a use case",
  "editor.drop.elementOnExternalSystem": "Drop the element on an external system",
  "editor.drop.onAggregate": "Drop it on an aggregate (or near one, in the aggregates view)",
  "editor.drop.elementOnContext": "Drop the element on a context",
  "editor.drop.fieldOnAggregateOrEntity": "Drop the field on an aggregate or entity",
  "editor.notice.subsystemCreatedAsPart": "Subsystem created as part of the system",
  "editor.notice.subsystemCreatedInside": "Subsystem created inside the system",
  "editor.notice.contextCreatedInSystem": "Context created inside the system",
  "editor.notice.wizardStepCreated": "Step created — drag its handle to the page that implements it",
  "editor.notice.pageCreatedAsWizardStep": "{name} created as a wizard step",
  "editor.notice.transformAdded": "Transformation added — the mapping or the intent is detailed in its sheet",
  "editor.notice.etlFlowCreatedLoose": "Integrator created unattached — its owning context is set in its sheet; wire sources and writes here",
  "editor.notice.gatewayCreatedLoose": "Gateway created unattached — its lines will tell which workflow it belongs to (join: n inputs → 1 output; split: 1 → n)",
  "editor.notice.createWorkflowFirst": "Create a workflow first: steps live in one",
  "editor.notice.workflowStepAdded": "Step added to {name} — it shows in the Workflows view",
  "editor.notice.createdLoose": "{noun} «{name}» created unattached — drag a composition from {parent} to attach it",
  "editor.notice.entityCreated": "Entity «{name}» created in aggregate «{aggregate}»",
  "editor.notice.valueObjectCreated": "Value object «{name}» created in aggregate «{aggregate}»",
  "editor.notice.operationCreated": "Operation «{name}» created in «{aggregate}» — its input/output models are edited in its sheet",
  "editor.notice.invariantDeclared": "Invariant declared on the {owner} — its conditions are detailed in its sheet",
  "editor.notice.fieldCreated": "Field «{name}» created in «{owner}» — drag a value object onto it to type it",
  "editor.notice.buttonCreated": "Button created — drag its handle to a use case or policy to set what it triggers",
  "editor.notice.moduleCreated": "Module created — drag the handle of the context's elements to it to distribute them",
  "editor.notice.triggerCreated": "Trigger created (daily cron by default) — drag it to a use case or policy to set what it triggers",
  "editor.notice.notificationCreated": "Notification created (EMAIL channel) — drag an event to it, and from it to the roles it notifies",
  "editor.notice.documentCreated": "Document created — drag it to a model (template) or to a query (report)",
  "editor.notice.etlFlowCreated": "Integrator created in the context — wire sources TO it (table/API = pull, event = consumer) and writes FROM it",
  "editor.notice.apiOperationAdded": "Operation added to {name} — it shows at the «APIs and operations» level",
  "editor.notice.customStepAdded": "Custom step added to {name} — detail it in its sheet; a relation drawn from the use case creates the typed step",
  "editor.notice.notDrawnAtThisLevel": "That element is not drawn at this level of detail",
  "editor.notice.expandBeforeView": "Expand something before creating the view",
  "editor.notice.viewCreatedFromExpanded": "View «{name}» created from what is expanded ({count} members)",
  "editor.noun.aggregate": "Aggregate",
  "editor.noun.entity": "Entity",
  "editor.noun.valueObject": "Value object",
  "editor.noun.policy": "Policy",
  "editor.noun.useCase": "Use case",
  "editor.noun.operation": "Operation",
  "editor.noun.invariant": "Invariant",
  "editor.noun.field": "Field",
  "editor.noun.readModel": "Read model",
  "editor.noun.table": "Table",
  "editor.noun.integrationEvent": "Integration event",
  "editor.noun.step": "Step",
  "editor.parentNoun.anAggregate": "an aggregate",
  "editor.parentNoun.aContext": "a context",
  "editor.parentNoun.anAggregateEntityOrValueObject": "an aggregate, entity or value object",
  "editor.parentNoun.aModel": "a model",
  "editor.parentNoun.aContextOrAggregate": "a context or aggregate",
  "editor.parentNoun.anExternalSystem": "an external system",
  "editor.parentNoun.aUseCaseOrPolicy": "a use case or policy",
  "editor.ownerKind.valueObject": "value object",
  "editor.ownerKind.entity": "entity",
  "editor.ownerKind.aggregate": "aggregate",
  "editor.common.cancel": "Cancel",
  "editor.common.save": "Save",
  // default names of new elements (model content, in the UI language)
  "editor.default.tabN": "Tab {n}",
  "editor.default.step": "Step",
  "editor.default.stepN": "Step {n}",
  "editor.default.page": "Page",
  "editor.default.menuEntry": "Entry",
  "editor.default.menuEntryN": "Entry {n}",
  "editor.default.transformationN": "Transformation {n}"
}, ln = {
  "editor.toolbar.brandHint": "Editor gráfico — context map, agregados, flows, procesos y eventstorming sobre lienzo editable; los cambios se guardan en el modelo",
  "editor.toolbar.brand": "Editor gráfico",
  "editor.toolbar.paletteHint": "Paleta de elementos: arrastra nuevos o existentes al lienzo (P)",
  "editor.toolbar.treeHint": "Árbol del catálogo: marca qué elementos pertenecen a la vista (sin borrar nada del proyecto)",
  "editor.toolbar.tree": "☰ Árbol",
  "editor.toolbar.viewNamePlaceholder": "Nombre de la vista…",
  "editor.toolbar.createViewFromSelection": "Crear una vista modux con la selección",
  "editor.toolbar.createEmptyView": "Crear una vista modux vacía — luego añades elementos soltándolos o desde el árbol",
  "editor.toolbar.createView": "⊞ Vista",
  "editor.toolbar.importApiIntoHint": "Importa un OpenAPI/WSDL sobre la API seleccionada (operaciones y modelos rq/rs)",
  "editor.toolbar.importApiNewHint": "Importa un OpenAPI/WSDL como una nueva API del diagrama",
  "editor.toolbar.importApiHere": "⇪ Importar API aquí",
  "editor.toolbar.importApi": "⇪ Importar API…",
  "editor.toolbar.ragSourceType": "Tipo de fuente de contenido del RAG",
  "editor.toolbar.ragSourceUriPlaceholder": "URI de la fuente…",
  "editor.toolbar.ragSourceUriHint": "La fuente que alimenta el RAG: repo, web, FTP, base de datos, bucket, SharePoint, Confluence, Drive o sistema de ficheros",
  "editor.toolbar.addRagSourceHint": "Añadir la fuente de contenido al RAG seleccionado",
  "editor.toolbar.addRagSource": "＋ Fuente",
  "editor.toolbar.fitHint": "Ajustar la vista a la selección (o a todo el diagrama, si no hay selección)",
  "editor.toolbar.fit": "⌖ Ajustar",
  "editor.toolbar.zoomOut": "Alejar (tecla −)",
  "editor.toolbar.zoomIn": "Acercar (tecla +)",
  "editor.toolbar.autoLayoutSelectionHint": "Recoloca solo los {count} elementos seleccionados (deshacible)",
  "editor.toolbar.autoLayoutHint": "Recoloca todo el diagrama automáticamente — o solo la selección si la hay (deshacible)",
  "editor.toolbar.rerouteSelectionHint": "Recalcula solo las líneas de la selección sobre las posiciones actuales, sin mover los nodos (deshacible)",
  "editor.toolbar.rerouteHint": "Recalcula todas las líneas sobre las posiciones actuales, sin mover los nodos (deshacible)",
  "editor.toolbar.reroute": "↻ Líneas",
  "editor.toolbar.alignRowHint": "Alinear los seleccionados en una fila (misma altura)",
  "editor.toolbar.alignRow": "↔ Alinear",
  "editor.toolbar.alignColumnHint": "Alinear los seleccionados en una columna (misma vertical)",
  "editor.toolbar.alignColumn": "↕ Alinear",
  "editor.toolbar.migrateHint": "Procesos y sagas se fusionan en workflows: cadena lineal con rol, plazo y compensación en cada paso",
  "editor.toolbar.migrate": "⇪ Migrar {what}",
  "editor.toolbar.migrateProcesses": "{count} procesos",
  "editor.toolbar.migrateSagas": "{count} sagas",
  "editor.toolbar.migrateAnd": " y ",
  "editor.toolbar.tiltBack": "Volver al lienzo editable (V)",
  "editor.toolbar.tiltHint": "Vista 3D: el diagrama como placas apiladas por contención (V)",
  "editor.toolbar.yugoBack": "Volver al lienzo editable (Y)",
  "editor.toolbar.yugoHint": "Superficie yugo: la vista como organismo físico — click expande, shift+arrastrar relaciona (Y)",
  "editor.toolbar.hideDerivedHint": "Ocultar los elementos inferidos (stubs generados por el sistema, marcados ✦)",
  "editor.toolbar.showDerivedHint": "Mostrar los elementos inferidos (stubs generados por el sistema, marcados ✦)",
  "editor.toolbar.derivedShown": "✦ Inferidos: visibles",
  "editor.toolbar.derivedHidden": "✦ Inferidos: ocultos",
  "editor.toolbar.exitFullscreen": "Salir de pantalla completa (F o Esc)",
  "editor.toolbar.fullscreen": "El diagrama a pantalla completa (F)",
  "editor.toolbar.helpHint": "Atajos de teclado y gestos (?)",
  "editor.palette.filter": "Filtrar…",
  "editor.palette.newHeader": "Nuevos — arrastra al lienzo",
  "editor.palette.dropWorkflowStep": "Suéltalo sobre un workflow — o sobre uno de sus pasos para encadenarlo",
  "editor.palette.dropOnContainer": "Suéltalo sobre su contenedor (contexto, sistema externo o API)",
  "editor.palette.dropOnCanvas": "Suéltalo en el lienzo",
  "editor.palette.catalogHeader": "Catálogo — arrastra para colocar o conectar",
  "editor.palette.catalogItemHint": "Suéltalo en el lienzo para colocarlo, o sobre un nodo para conectarlo",
  "editor.palette.newTabHint": "Elementos nuevos para arrastrar al lienzo",
  "editor.palette.newTab": "Nuevos",
  "editor.palette.catalogTabHint": "El catálogo del modelo: colocar o conectar elementos existentes",
  "editor.palette.catalogTab": "Catálogo",
  "editor.group.contexts": "Contextos",
  "editor.group.externalSystems": "Sistemas externos",
  "editor.group.apis": "APIs",
  "editor.group.actors": "Actores",
  "editor.group.aiAgents": "Agentes IA",
  "editor.group.mcpGateways": "Gateways MCP",
  "editor.group.rags": "RAGs",
  "editor.group.flows": "Flows",
  "editor.group.processes": "Procesos",
  "editor.group.workflows": "Workflows",
  "editor.group.systems": "Sistemas",
  "editor.group.cdcs": "CDC",
  "editor.group.apps": "Apps",
  "editor.group.pages": "Páginas",
  "editor.group.models": "Modelos",
  "editor.group.scheduledTriggers": "Triggers programados",
  "editor.group.mappings": "Mapeados",
  "editor.group.useCases": "Casos de uso",
  "editor.group.events": "Eventos",
  "editor.group.aggregates": "Agregados",
  "editor.group.readModels": "Read models",
  "editor.group.queryOperations": "Operaciones de consulta",
  "editor.group.queryServices": "Query services",
  "editor.group.externalOperations": "Operaciones y tablas externas",
  "editor.group.apiOperations": "Operaciones de API",
  "editor.group.proxyApis": "Proxies API",
  "editor.viewTree.implicitHint": "Ya se ve por su contenedor; márcalo para que sea miembro explícito",
  "editor.viewTree.memberHint": "Miembro de la vista — desmarcar lo quita de la vista, NO del proyecto",
  "editor.viewTree.title": "Vista: {name}",
  "editor.drawer.name": "Nombre",
  "editor.drawer.close": "Cerrar (Esc)",
  "editor.drawer.elementGone": "Este elemento ya no está en el modelo.",
  "editor.drawer.component": "Componente",
  "editor.drawer.componentGone": "Este componente ya no está en el mockup.",
  "editor.drawer.componentKind": "Componente · {kind}",
  "editor.drawer.title": "Título",
  "editor.drawer.label": "Etiqueta",
  "editor.drawer.text": "Texto",
  "editor.drawer.useCase": "Caso de uso",
  "editor.drawer.model": "Modelo",
  "editor.drawer.field": "Campo",
  "editor.drawer.elements.one": "1 elemento",
  "editor.drawer.elements.other": "{count} elementos",
  "editor.drawer.yes": "sí",
  "editor.drawer.no": "no",
  "editor.elementType.context": "Contexto",
  "editor.elementType.aggregate": "Agregado",
  "editor.elementType.entity": "Entidad",
  "editor.elementType.valueObject": "Value object",
  "editor.elementType.useCase": "Caso de uso",
  "editor.elementType.field": "Campo",
  "editor.elementType.flow": "Flow",
  "editor.elementType.process": "Proceso",
  "editor.elementType.workflow": "Workflow",
  "editor.elementType.domainEvent": "Evento de dominio",
  "editor.elementType.subscription": "Suscripción",
  "editor.elementType.projection": "Proyección",
  "editor.elementType.readModel": "Read model",
  "editor.elementType.uiAdapter": "Adaptador UI",
  "editor.elementType.page": "Página",
  "editor.elementType.service": "Servicio",
  "editor.elementType.queryService": "Query service",
  "editor.elementType.actor": "Actor",
  "editor.elementType.scheduledTrigger": "Disparador programado",
  "editor.elementType.workflowGateway": "Gateway",
  "editor.elementType.model": "Modelo",
  "editor.elementType.mapping": "Mapping",
  "editor.elementType.component": "Componente",
  "editor.elementType.externalSystem": "Sistema externo",
  "editor.elementType.module": "Módulo",
  "editor.elementType.customCode": "Código a medida",
  "editor.elementType.aiAgent": "Agente IA",
  "editor.elementType.rag": "RAG",
  "editor.elementType.mcpGateway": "Pasarela MCP",
  "editor.elementType.identityProvider": "Proveedor de identidad",
  "editor.connect.invert": "⇄ Invertir sentido",
  "editor.connect.invertHint": "Intercambia origen y destino y vuelve a ofrecer los tipos",
  "editor.connect.title": "¿Qué relación es esta línea?",
  "editor.relation.invert": "↔ Invertir sentido",
  "editor.relation.invertHint": "Intercambia origen y destino de la relación",
  "editor.relation.typeTitle": "Tipo de relación",
  "editor.relation.changeType": "Cambiar tipo",
  "editor.nature.markFact": "◆ Marcar como hecho (real)",
  "editor.nature.markIntent": "◇ Marcar como intención (boceto)",
  "editor.nature.markFactHint": "Cuenta como acoplamiento real: genera y sube por roll-up",
  "editor.nature.markIntentHint": "Boceto sin peso en el código; se confirma cuando un hecho de abajo la realice",
  "editor.extDep.depends": "Dependencia simple",
  "editor.extDep.cqrs": "CQRS — consulta sobre sus datos",
  "editor.extDep.title": "Tipo de dependencia",
  "editor.repo.title": "Referenciar otro proyecto modux",
  "editor.repo.placeholder": "URL del repositorio, o ../otro-repo/modux",
  "editor.repo.reference": "Referenciar",
  "editor.invariant.title": "⚖ {name} — condición (vacío la quita)",
  "editor.invariant.expressionPlaceholder": "expresión — p. ej. importe >= 0",
  "editor.invariant.errorPlaceholder": "mensaje de error — p. ej. El importe no puede ser negativo",
  "editor.branch.title": "Condición de la rama (vacío la quita)",
  "editor.branch.placeholder": "p. ej. importe > 1000",
  "editor.wfStep.title": "¿De qué workflow es el paso?",
  "editor.delete.elements": "{count} elementos ({names})",
  "editor.delete.titleWithView": "¿Eliminar {what}, o solo quitar de la vista?",
  "editor.delete.title": "¿Eliminar {what} del modelo?",
  "editor.delete.removeFromView": "Quitar de la vista «{name}»",
  "editor.delete.fromModel": "Eliminar del modelo — desaparece de todas las vistas y diagramas",
  "editor.help.palette": "Mostrar/ocultar la paleta",
  "editor.help.fullscreen": "Pantalla completa (Esc sale)",
  "editor.help.fit": "Ajustar la vista a la selección (o a todo el diagrama)",
  "editor.help.zoom": "Zoom (también con la rueda)",
  "editor.help.systemMapDistribution": "Mapa del sistema · Distribución",
  "editor.help.sequences": "Secuencias (interacciones)",
  "editor.help.otherViews": "Flows · Procesos · Workflows · UI · Diseño",
  "editor.help.aggregates": "Vista de agregados",
  "editor.help.eventstorming": "Vista EventStorming",
  "editor.help.tilt": "Vista 3D (placas apiladas, tipo Firefox Tilt)",
  "editor.help.tree": "Árbol del catálogo (con una vista activa)",
  "editor.help.deleteKey": "Supr",
  "editor.help.delete": "Borrar la selección",
  "editor.help.rename": "Renombrar el nodo seleccionado",
  "editor.help.undoRedo": "Deshacer / rehacer",
  "editor.help.panKeys": "Espacio+arrastrar",
  "editor.help.pan": "Mover el lienzo",
  "editor.help.multiKeys": "Shift+click / arrastrar",
  "editor.help.multi": "Multi-selección / banda elástica",
  "editor.help.freeDragKeys": "Alt+arrastrar",
  "editor.help.freeDrag": "Arrastre libre (desactiva el snap a rejilla y las guías)",
  "editor.help.help": "Esta ayuda",
  "editor.help.title": "Atajos de teclado",
  "editor.hint.contextMap": "Arrastra para reordenar · Shift+arrastrar mueve una API de sistema (y un sistema externo dentro/fuera de otro) · Ctrl+arrastrar una API a un sistema crea un proxy · asa azul → crear relación (elige el tipo) · doble click en la etiqueta cambia el tipo · arrastra en vacío para seleccionar · espacio+arrastra mueve el lienzo · Supr borra la relación o el contexto vacío seleccionado · F2 renombra · rueda para zoom",
  "editor.hint.eventstorming": "Vista derivada del modelo: comando azul → agregado amarillo → evento naranja → policy lila → read model verde · se edita desde las otras vistas o los CRUD (doble click abre el CRUD) · ✨ Auto-layout ordena la narrativa · rueda para zoom",
  "editor.hint.workflows": "Arrastra un paso sobre otro con el asa para declarar dependencia (B espera a A) · Supr borra el paso o la dependencia seleccionada · F2 renombra · doble click abre el CRUD · espacio+arrastra mueve el lienzo · rueda para zoom",
  "editor.hint.default": "Arrastra para reordenar · arrastra en vacío para seleccionar · espacio+arrastra mueve el lienzo · Supr borra (si está vacío) · F2 renombra · doble click abre el CRUD · rueda para zoom",
  "editor.hint.press": "pulsa",
  "editor.hint.forShortcuts": "para los atajos",
  "editor.importApi.selectTarget": "Selecciona la API destino, o el sistema externo o contexto que la publicará, antes de importar",
  "editor.importApi.buildStep": "Importar un contrato es un paso de build: {command}",
  "editor.drop.tabOnTabLayout": "Suelta la pestaña sobre un layout de pestañas",
  "editor.drop.componentOnPage": "Suelta el layout/componente sobre una página",
  "editor.drop.stepOnWizard": "Suelta el paso sobre un wizard",
  "editor.drop.menuItemOnApp": "Suelta la entrada de menú sobre una app",
  "editor.drop.transformOnEtlFlow": "Suelta la transformación sobre un flujo ETL",
  "editor.drop.apiNeedsHome": "Una API vive en un sistema externo o en un contexto: suéltala sobre uno",
  "editor.drop.operationOnApi": "Suelta la operación sobre una API",
  "editor.drop.stepOnUseCase": "Suelta el paso sobre un caso de uso",
  "editor.drop.elementOnExternalSystem": "Suelta el elemento sobre un sistema externo",
  "editor.drop.onAggregate": "Suéltalo sobre un agregado (o cerca de uno, en la vista de agregados)",
  "editor.drop.elementOnContext": "Suelta el elemento sobre un contexto",
  "editor.drop.fieldOnAggregateOrEntity": "Suelta el campo sobre un agregado o entidad",
  "editor.notice.subsystemCreatedAsPart": "Subsistema creado como parte del sistema",
  "editor.notice.subsystemCreatedInside": "Subsistema creado dentro del sistema",
  "editor.notice.contextCreatedInSystem": "Contexto creado dentro del sistema",
  "editor.notice.wizardStepCreated": "Paso creado — arrastra su asa hasta la página que lo implementa",
  "editor.notice.pageCreatedAsWizardStep": "{name} creada como paso del wizard",
  "editor.notice.transformAdded": "Transformación añadida — el mapping o el intent se detallan en su ficha",
  "editor.notice.etlFlowCreatedLoose": "Integrador creado suelto — su contexto dueño se fija en la ficha; cablea fuentes y escrituras aquí",
  "editor.notice.gatewayCreatedLoose": "Gateway creado suelto — sus líneas dirán de qué workflow es (join: n entradas → 1 salida; split: 1 → n)",
  "editor.notice.createWorkflowFirst": "Crea antes un workflow: los pasos viven en uno",
  "editor.notice.workflowStepAdded": "Paso añadido a {name} — se ve en la vista Workflows",
  "editor.notice.createdLoose": "{noun} «{name}» creado suelto — arrastra una composición desde {parent} para asociarlo",
  "editor.notice.entityCreated": "Entidad «{name}» creada en el agregado «{aggregate}»",
  "editor.notice.valueObjectCreated": "Value object «{name}» creado en el agregado «{aggregate}»",
  "editor.notice.operationCreated": "Operación «{name}» creada en «{aggregate}» — sus modelos de entrada/salida se editan en la ficha",
  "editor.notice.invariantDeclared": "Invariante declarado en el {owner} — sus condiciones se detallan en su ficha",
  "editor.notice.fieldCreated": "Campo «{name}» creado en «{owner}» — arrastra un value object sobre él para tiparlo",
  "editor.notice.buttonCreated": "Botón creado — arrastra su asa hasta un caso de uso o policy para fijar qué dispara",
  "editor.notice.moduleCreated": "Módulo creado — arrastra el asa de los elementos del contexto hasta él para distribuirlos",
  "editor.notice.triggerCreated": "Trigger creado (cron diario por defecto) — arrástralo a un caso de uso o policy para fijar qué dispara",
  "editor.notice.notificationCreated": "Notificación creada (canal EMAIL) — arrastra un evento hasta ella y de ella a los roles que avisa",
  "editor.notice.documentCreated": "Documento creado — arrástralo a un modelo (plantilla) o a una consulta (informe)",
  "editor.notice.etlFlowCreated": "Integrador creado en el contexto — cablea fuentes HACIA él (tabla/API = pull, evento = consumidor) y escrituras DESDE él",
  "editor.notice.apiOperationAdded": "Operación añadida a {name} — se ve en el nivel «APIs y operaciones»",
  "editor.notice.customStepAdded": "Paso Custom añadido a {name} — detállalo en su ficha; una relación trazada desde el caso de uso crea el paso tipado",
  "editor.notice.notDrawnAtThisLevel": "Ese elemento no se pinta en este nivel de detalle",
  "editor.notice.expandBeforeView": "Despliega algo antes de crear la vista",
  "editor.notice.viewCreatedFromExpanded": "Vista «{name}» creada con lo desplegado ({count} miembros)",
  "editor.noun.aggregate": "Agregado",
  "editor.noun.entity": "Entidad",
  "editor.noun.valueObject": "Value object",
  "editor.noun.policy": "Policy",
  "editor.noun.useCase": "Caso de uso",
  "editor.noun.operation": "Operación",
  "editor.noun.invariant": "Invariante",
  "editor.noun.field": "Campo",
  "editor.noun.readModel": "Read model",
  "editor.noun.table": "Tabla",
  "editor.noun.integrationEvent": "Evento de integración",
  "editor.noun.step": "Paso",
  "editor.parentNoun.anAggregate": "un agregado",
  "editor.parentNoun.aContext": "un contexto",
  "editor.parentNoun.anAggregateEntityOrValueObject": "un agregado, entidad o value object",
  "editor.parentNoun.aModel": "un modelo",
  "editor.parentNoun.aContextOrAggregate": "un contexto o agregado",
  "editor.parentNoun.anExternalSystem": "un sistema externo",
  "editor.parentNoun.aUseCaseOrPolicy": "un caso de uso o policy",
  "editor.ownerKind.valueObject": "value object",
  "editor.ownerKind.entity": "entidad",
  "editor.ownerKind.aggregate": "agregado",
  "editor.common.cancel": "Cancelar",
  "editor.common.save": "Guardar",
  "editor.default.tabN": "Pestaña {n}",
  "editor.default.step": "Paso",
  "editor.default.stepN": "Paso {n}",
  "editor.default.page": "Página",
  "editor.default.menuEntry": "Entrada",
  "editor.default.menuEntryN": "Entrada {n}",
  "editor.default.transformationN": "Transformación {n}"
}, cn = {
  // Node kinds (singular)
  "explorer.kind.root": "System",
  "explorer.kind.boundedContext": "Bounded context",
  "explorer.kind.group": "Group",
  "explorer.kind.externalSystem": "External system",
  "explorer.kind.uiApp": "App",
  "explorer.kind.page": "Page",
  "explorer.kind.actor": "Actor",
  "explorer.kind.workflow": "Workflow",
  "explorer.kind.identityProvider": "IdP",
  "explorer.kind.aiAgent": "AI agent",
  "explorer.kind.aggregate": "Aggregate",
  "explorer.kind.entity": "Entity",
  "explorer.kind.useCase": "Use case",
  "explorer.kind.policy": "Policy",
  "explorer.kind.domainEvent": "Domain event",
  "explorer.kind.applicationEvent": "Application event",
  "explorer.kind.readModel": "Read model",
  "explorer.kind.domainService": "Domain service",
  "explorer.kind.queryService": "Query service",
  "explorer.kind.scheduledTrigger": "Scheduled trigger",
  "explorer.kind.etlFlow": "ETL flow",
  "explorer.kind.notification": "Notification",
  "explorer.kind.document": "Document",
  "explorer.kind.api": "API",
  "explorer.kind.apiOperation": "Operation",
  "explorer.kind.externalUseCase": "External use case",
  "explorer.kind.externalTable": "External table",
  "explorer.kind.mcpServer": "MCP",
  // Node kinds (plural, hover card summary)
  "explorer.kindPlural.boundedContext": "bounded contexts",
  "explorer.kindPlural.externalSystem": "external systems",
  "explorer.kindPlural.uiApp": "apps",
  "explorer.kindPlural.page": "pages",
  "explorer.kindPlural.actor": "actors",
  "explorer.kindPlural.workflow": "workflows",
  "explorer.kindPlural.identityProvider": "IdPs",
  "explorer.kindPlural.aiAgent": "AI agents",
  "explorer.kindPlural.aggregate": "aggregates",
  "explorer.kindPlural.entity": "entities",
  "explorer.kindPlural.useCase": "use cases",
  "explorer.kindPlural.policy": "policies",
  "explorer.kindPlural.domainEvent": "domain events",
  "explorer.kindPlural.applicationEvent": "application events",
  "explorer.kindPlural.readModel": "read models",
  "explorer.kindPlural.domainService": "domain services",
  "explorer.kindPlural.queryService": "query services",
  "explorer.kindPlural.scheduledTrigger": "scheduled triggers",
  "explorer.kindPlural.etlFlow": "ETL flows",
  "explorer.kindPlural.notification": "notifications",
  "explorer.kindPlural.document": "documents",
  "explorer.kindPlural.api": "APIs",
  "explorer.kindPlural.apiOperation": "operations",
  "explorer.kindPlural.externalUseCase": "external use cases",
  "explorer.kindPlural.externalTable": "external tables",
  "explorer.kindPlural.mcpServer": "MCPs",
  // Tree labels
  "explorer.tree.aggregatesGroup": "Aggregates · {count}",
  "explorer.tree.useCasesGroup": "Use cases · {count}",
  // Hover card
  "explorer.card.moreKinds": "(+{count} more kinds)",
  "explorer.card.andMore": "… and {count} more",
  "explorer.card.clickCollapse": "click: collapse",
  "explorer.card.clickExpand": "click: expand",
  "explorer.card.doubleClickOpen": "double-click: open",
  // Search
  "explorer.search.placeholder": "Search the model…",
  "explorer.search.noResults": "no results",
  // Controls
  "explorer.controls.levels": "Levels",
  "explorer.controls.levelsTooltip": "How many levels are shown open",
  "explorer.controls.collapseAll": "Collapse",
  "explorer.controls.collapseAllTooltip": "Collapse everything and start over",
  "explorer.controls.physics": "Physics",
  "explorer.controls.physicsTooltip": "How much the map moves: 0 parks the nodes in equilibrium",
  "explorer.controls.stopMotion": "Stop completely (physics to 0)",
  "explorer.controls.resumeMotion": "Resume the motion",
  "explorer.controls.threadsHoverTooltip": "Show relation threads only on hover",
  "explorer.controls.threadsAlwaysTooltip": "ALWAYS show relation threads",
  "explorer.controls.threadsAlways": "Threads: always",
  "explorer.controls.threadsHover": "Threads: hover",
  // Curated view from what is unfolded
  "explorer.view.namePlaceholder": "View name…",
  "explorer.view.create": "Create",
  "explorer.view.new": "View…",
  "explorer.view.newTooltip": "Create a modux view with the elements unfolded right now",
  // Help HUD
  "explorer.help.line1": "click: select and expand / collapse · alt+click: isolate what is related · double-click: open",
  "explorer.help.line2": "shift+drag from a node: draw a relation · drag on the background: selection",
  "explorer.help.line3": "space+drag: move the canvas · wheel: zoom · Delete deletes · F2 renames · Ctrl+Z undoes",
  "explorer.help.line4": "search: expands the path and flies to the node · drag a node: pull its subtree"
}, dn = {
  "explorer.kind.root": "Sistema",
  "explorer.kind.boundedContext": "Bounded context",
  "explorer.kind.group": "Grupo",
  "explorer.kind.externalSystem": "Sistema externo",
  "explorer.kind.uiApp": "App",
  "explorer.kind.page": "Página",
  "explorer.kind.actor": "Actor",
  "explorer.kind.workflow": "Workflow",
  "explorer.kind.identityProvider": "IdP",
  "explorer.kind.aiAgent": "Agente IA",
  "explorer.kind.aggregate": "Agregado",
  "explorer.kind.entity": "Entidad",
  "explorer.kind.useCase": "Caso de uso",
  "explorer.kind.policy": "Policy",
  "explorer.kind.domainEvent": "Evento de dominio",
  "explorer.kind.applicationEvent": "Evento de aplicación",
  "explorer.kind.readModel": "Read model",
  "explorer.kind.domainService": "Servicio de dominio",
  "explorer.kind.queryService": "Servicio de consulta",
  "explorer.kind.scheduledTrigger": "Trigger programado",
  "explorer.kind.etlFlow": "Flujo ETL",
  "explorer.kind.notification": "Notificación",
  "explorer.kind.document": "Documento",
  "explorer.kind.api": "API",
  "explorer.kind.apiOperation": "Operación",
  "explorer.kind.externalUseCase": "Caso de uso externo",
  "explorer.kind.externalTable": "Tabla externa",
  "explorer.kind.mcpServer": "MCP",
  "explorer.kindPlural.boundedContext": "bounded contexts",
  "explorer.kindPlural.externalSystem": "sistemas externos",
  "explorer.kindPlural.uiApp": "apps",
  "explorer.kindPlural.page": "páginas",
  "explorer.kindPlural.actor": "actores",
  "explorer.kindPlural.workflow": "workflows",
  "explorer.kindPlural.identityProvider": "IdPs",
  "explorer.kindPlural.aiAgent": "agentes IA",
  "explorer.kindPlural.aggregate": "agregados",
  "explorer.kindPlural.entity": "entidades",
  "explorer.kindPlural.useCase": "casos de uso",
  "explorer.kindPlural.policy": "policies",
  "explorer.kindPlural.domainEvent": "eventos de dominio",
  "explorer.kindPlural.applicationEvent": "eventos de aplicación",
  "explorer.kindPlural.readModel": "read models",
  "explorer.kindPlural.domainService": "servicios de dominio",
  "explorer.kindPlural.queryService": "servicios de consulta",
  "explorer.kindPlural.scheduledTrigger": "triggers programados",
  "explorer.kindPlural.etlFlow": "flujos ETL",
  "explorer.kindPlural.notification": "notificaciones",
  "explorer.kindPlural.document": "documentos",
  "explorer.kindPlural.api": "APIs",
  "explorer.kindPlural.apiOperation": "operaciones",
  "explorer.kindPlural.externalUseCase": "casos de uso externos",
  "explorer.kindPlural.externalTable": "tablas externas",
  "explorer.kindPlural.mcpServer": "MCPs",
  "explorer.tree.aggregatesGroup": "Agregados · {count}",
  "explorer.tree.useCasesGroup": "Casos de uso · {count}",
  "explorer.card.moreKinds": "(+{count} tipos más)",
  "explorer.card.andMore": "… y {count} más",
  "explorer.card.clickCollapse": "click: plegar",
  "explorer.card.clickExpand": "click: expandir",
  "explorer.card.doubleClickOpen": "doble click: abrir",
  "explorer.search.placeholder": "Buscar en el modelo…",
  "explorer.search.noResults": "sin resultados",
  "explorer.controls.levels": "Niveles",
  "explorer.controls.levelsTooltip": "Cuántos niveles se ven abiertos",
  "explorer.controls.collapseAll": "Replegar",
  "explorer.controls.collapseAllTooltip": "Plegarlo todo y volver a empezar",
  "explorer.controls.physics": "Física",
  "explorer.controls.physicsTooltip": "Cuánto se mueve el mapa: 0 aparca los nodos en equilibrio",
  "explorer.controls.stopMotion": "Parar del todo (física a 0)",
  "explorer.controls.resumeMotion": "Reanudar el movimiento",
  "explorer.controls.threadsHoverTooltip": "Enseñar los hilos de relaciones solo al hacer hover",
  "explorer.controls.threadsAlwaysTooltip": "Enseñar SIEMPRE los hilos de relaciones",
  "explorer.controls.threadsAlways": "Hilos: siempre",
  "explorer.controls.threadsHover": "Hilos: hover",
  "explorer.view.namePlaceholder": "Nombre de la vista…",
  "explorer.view.create": "Crear",
  "explorer.view.new": "Vista…",
  "explorer.view.newTooltip": "Crea una vista modux con los elementos desplegados ahora mismo",
  "explorer.help.line1": "click: seleccionar y expandir / plegar · alt+click: aislar lo relacionado · doble click: abrir",
  "explorer.help.line2": "shift+arrastrar desde un nodo: trazar una relación · arrastrar en el fondo: selección",
  "explorer.help.line3": "espacio+arrastrar: mover el lienzo · rueda: zoom · Supr borra · F2 renombra · Ctrl+Z deshace",
  "explorer.help.line4": "buscar: expande el camino y vuela hasta el nodo · arrastrar nodo: tirar del subárbol"
}, pn = {
  "gestures.relation.ucCall.label": "Invocation",
  "gestures.relation.ucCall.hint": "Use case → use case: invokes it as a step",
  "gestures.relation.queryCall.label": "Query",
  "gestures.relation.queryCall.hint": "Use case → query service: queries it",
  "gestures.relation.aggregateCall.label": "Operates on",
  "gestures.relation.aggregateCall.hint": "Use case → aggregate: operates on it",
  "gestures.relation.emission.label": "Emission",
  "gestures.relation.emission.hint": "Aggregate/service → domain event · use case → event (publishes it as a step)",
  "gestures.relation.flowTriggers.label": "Flow · triggers",
  "gestures.relation.flowTriggers.hint": "Event → use case of another context (TRIGGERS)",
  "gestures.relation.flowMaterializes.label": "Flow · materializes",
  "gestures.relation.flowMaterializes.hint": "Event → context or read model (MATERIALIZES)",
  "gestures.relation.actorUse.label": "Use (actor)",
  "gestures.relation.actorUse.hint": "Actor → use case, query service, aggregate (CRUD) or agent",
  "gestures.relation.extDep.label": "Dependency",
  "gestures.relation.extDep.hint": "External system/actor → system, API or proxy",
  "gestures.relation.apiImplementation.label": "Implementation",
  "gestures.relation.apiImplementation.hint": "API → context: the context implements it (serves it itself)",
  "gestures.relation.apiConsumption.label": "Consumption (serving)",
  "gestures.relation.apiConsumption.hint": "API → context: the context consumes it (serving relation)",
  "gestures.relation.externalCall.label": "ACL call",
  "gestures.relation.externalCall.hint": "External system → one of our use cases (comes in through an ACL)",
  "gestures.relation.externalCrud.label": "CRUD (API)",
  "gestures.relation.externalCrud.hint": "External system → aggregate: creates the CRUD API and wires it as a consumer",
  "gestures.relation.contextCrud.label": "CRUD (API)",
  "gestures.relation.contextCrud.hint": "Another context → aggregate: creates the CRUD API it will consume",
  "gestures.relation.uiCrud.label": "CRUD (UI)",
  "gestures.relation.uiCrud.hint": "UI app → aggregate: manages it with CRUD pages from its menu",
  "gestures.relation.externalUcCall.label": "Outbound call",
  "gestures.relation.externalUcCall.hint": "One of our use cases → an operation of an external system",
  "gestures.relation.agentTool.label": "AI tool",
  "gestures.relation.agentTool.hint": "Agent → use case, operation, MCP, gateway, API or query service",
  "gestures.relation.agentDelegate.label": "AI delegation",
  "gestures.relation.agentDelegate.hint": "Agent → agent: delegates work to it",
  "gestures.relation.agentRag.label": "Knowledge",
  "gestures.relation.agentRag.hint": "Agent → RAG that grounds its answers",
  "gestures.relation.idpTrust.label": "Identity",
  "gestures.relation.idpTrust.hint": "Context, app or ETL flow → IdP whose tokens it validates",
  "gestures.relation.uiAssignment.label": "Assignment to the UI",
  "gestures.relation.uiAssignment.hint": "App or page ⇆ declared UI: assigned to it (assignment)",
  "gestures.relation.uiComposition.label": "Composition (exposes the UI)",
  "gestures.relation.uiComposition.hint": "Context ⇆ UI: the context owns it — the only relation possible between them",
  "gestures.relation.uiServing.label": "Serving (serves the actor)",
  "gestures.relation.uiServing.hint": "UI ⇆ actor: the interface serves it — the only relation possible between them",
  "gestures.relation.aggregateComposition.label": "Composition (contains it)",
  "gestures.relation.aggregateComposition.hint": "Context ⇆ loose aggregate: the context comes to contain it",
  "gestures.relation.systemComposition.label": "Composition (contains it)",
  "gestures.relation.systemComposition.hint": "System ⇆ context/subsystem: the system comes to contain it",
  "gestures.relation.projection.label": "Projection",
  "gestures.relation.projection.hint": "External table ⇆ read model: the read model is projected from the table — the only relation possible between them",
  "gestures.archimate.hint": "ArchiMate relation «{label}»: {source} → {target}",
  "gestures.notice.buttonWiresToUseCase": "A button is wired to a use case or a policy",
  "gestures.notice.viewmodelToModel": "The viewmodel is traced to a data MODEL",
  "gestures.notice.pageIsHeader": "{page} is the header of {app} — the next pages will be tabs",
  "gestures.notice.idpInUiView": "In the UI view, the IdP relates to the APPS (who authenticates where)",
  "gestures.notice.menuGroupOpensNothing": "A grouper (with a submenu) cannot open anything",
  "gestures.notice.modelInSeveralMappings": "The model takes part in several mappings: pick the mapping from its sheet",
  "gestures.notice.modelHasNoMappings": "That model has no mappings to delegate the code to",
  "gestures.notice.rulesNeedDistinctModels": "Rules map fields of DIFFERENT models",
  "gestures.notice.notificationWiring": "A notification is fired by an EVENT and alerts ACTORS (roles)",
  "gestures.notice.documentWiring": "A report is fed by a QUERY (here); a document template is filled by a MODEL (drop it from the Catalog onto the document)",
  "gestures.notice.idpWiring": "An IdP relates to contexts and ETL flows (here) or to apps (UI view); towards an external system it federates it",
  "gestures.notice.etlWiring": "An ETL flow reads from tables, APIs and events, and writes to APIs, tables and events",
  "gestures.notice.declarePublisherFirst": "First declare which use case publishes {event} (drag from the use case to the event) — the flow needs its trigger",
  "gestures.notice.declareEmitterFirst": "First declare who emits {event} (drag from the aggregate or domain service to the event) — the flow needs its trigger",
  // default names written into the model (in the UI language)
  "gestures.default.projection": "Projection"
}, un = {
  "gestures.relation.ucCall.label": "Invocación",
  "gestures.relation.ucCall.hint": "Caso de uso → caso de uso: lo invoca como un paso",
  "gestures.relation.queryCall.label": "Consulta",
  "gestures.relation.queryCall.hint": "Caso de uso → query service: lo consulta",
  "gestures.relation.aggregateCall.label": "Opera sobre",
  "gestures.relation.aggregateCall.hint": "Caso de uso → agregado: opera sobre él",
  "gestures.relation.emission.label": "Emisión",
  "gestures.relation.emission.hint": "Agregado/servicio → evento de dominio · caso de uso → evento (lo publica como paso)",
  "gestures.relation.flowTriggers.label": "Flow · dispara",
  "gestures.relation.flowTriggers.hint": "Evento → caso de uso de otro contexto (TRIGGERS)",
  "gestures.relation.flowMaterializes.label": "Flow · materializa",
  "gestures.relation.flowMaterializes.hint": "Evento → contexto o read model (MATERIALIZES)",
  "gestures.relation.actorUse.label": "Uso (actor)",
  "gestures.relation.actorUse.hint": "Actor → caso de uso, query service, agregado (CRUD) o agente",
  "gestures.relation.extDep.label": "Dependencia",
  "gestures.relation.extDep.hint": "Sistema externo/actor → sistema, API o proxy",
  "gestures.relation.apiImplementation.label": "Implementación",
  "gestures.relation.apiImplementation.hint": "API → contexto: el contexto la implementa (la sirve él mismo)",
  "gestures.relation.apiConsumption.label": "Consumo (servidumbre)",
  "gestures.relation.apiConsumption.hint": "API → contexto: el contexto la consume (relación serving)",
  "gestures.relation.externalCall.label": "Llamada ACL",
  "gestures.relation.externalCall.hint": "Sistema externo → caso de uso nuestro (entra por ACL)",
  "gestures.relation.externalCrud.label": "CRUD (API)",
  "gestures.relation.externalCrud.hint": "Sistema externo → agregado: crea la API CRUD y lo cablea como consumidor",
  "gestures.relation.contextCrud.label": "CRUD (API)",
  "gestures.relation.contextCrud.hint": "Otro contexto → agregado: crea la API CRUD que consumirá",
  "gestures.relation.uiCrud.label": "CRUD (UI)",
  "gestures.relation.uiCrud.hint": "App UI → agregado: lo gestiona con páginas CRUD desde su menú",
  "gestures.relation.externalUcCall.label": "Llamada saliente",
  "gestures.relation.externalUcCall.hint": "Caso de uso nuestro → operación de un sistema externo",
  "gestures.relation.agentTool.label": "Herramienta IA",
  "gestures.relation.agentTool.hint": "Agente → caso de uso, operación, MCP, gateway, API o query service",
  "gestures.relation.agentDelegate.label": "Delegación IA",
  "gestures.relation.agentDelegate.hint": "Agente → agente: le delega trabajo",
  "gestures.relation.agentRag.label": "Conocimiento",
  "gestures.relation.agentRag.hint": "Agente → RAG que fundamenta sus respuestas",
  "gestures.relation.idpTrust.label": "Identidad",
  "gestures.relation.idpTrust.hint": "Contexto, app o flujo ETL → IdP cuyos tokens valida",
  "gestures.relation.uiAssignment.label": "Asignación a la UI",
  "gestures.relation.uiAssignment.hint": "App o página ⇆ UI declarada: se le asigna (assignment)",
  "gestures.relation.uiComposition.label": "Composición (expone la UI)",
  "gestures.relation.uiComposition.hint": "Contexto ⇆ UI: el contexto la posee — la única relación posible entre ambos",
  "gestures.relation.uiServing.label": "Servidumbre (sirve al actor)",
  "gestures.relation.uiServing.hint": "UI ⇆ actor: la interfaz le sirve — la única relación posible entre ambos",
  "gestures.relation.aggregateComposition.label": "Composición (lo contiene)",
  "gestures.relation.aggregateComposition.hint": "Contexto ⇆ agregado suelto: el contexto pasa a contenerlo",
  "gestures.relation.systemComposition.label": "Composición (lo contiene)",
  "gestures.relation.systemComposition.hint": "Sistema ⇆ contexto/subsistema: el sistema pasa a contenerlo",
  "gestures.relation.projection.label": "Proyección",
  "gestures.relation.projection.hint": "Tabla externa ⇆ read model: el read model se proyecta de la tabla — la única relación posible entre ambos",
  "gestures.archimate.hint": "Relación ArchiMate «{label}»: {source} → {target}",
  "gestures.notice.buttonWiresToUseCase": "El botón se cablea a un caso de uso o una policy",
  "gestures.notice.viewmodelToModel": "El viewmodel se traza hasta un MODELO de datos",
  "gestures.notice.pageIsHeader": "{page} es la cabecera de {app} — las siguientes páginas serán pestañas",
  "gestures.notice.idpInUiView": "En la vista UI, el IdP se relaciona con las APPS (quién autentica dónde)",
  "gestures.notice.menuGroupOpensNothing": "Un agrupador (con submenú) no puede abrir nada",
  "gestures.notice.modelInSeveralMappings": "El modelo participa en varios mapeados: elige el mapeado desde su ficha",
  "gestures.notice.modelHasNoMappings": "Ese modelo no tiene mapeados donde delegar el código",
  "gestures.notice.rulesNeedDistinctModels": "Las reglas mapean campos de modelos DISTINTOS",
  "gestures.notice.notificationWiring": "Una notificación se dispara con un EVENTO y avisa a ACTORES (roles)",
  "gestures.notice.documentWiring": "Un informe se alimenta de una CONSULTA (aquí); la plantilla de documento se rellena con un MODELO (suéltalo del Catálogo sobre el documento)",
  "gestures.notice.idpWiring": "Un IdP se relaciona con contextos y flujos ETL (aquí) o con apps (vista UI); hacia un sistema externo lo federa",
  "gestures.notice.etlWiring": "Un flujo ETL lee de tablas, APIs y eventos, y escribe en APIs, tablas y eventos",
  "gestures.notice.declarePublisherFirst": "Declara primero qué caso de uso publica {event} (arrastra desde el caso de uso hasta el evento) — el flow necesita su disparador",
  "gestures.notice.declareEmitterFirst": "Declara primero quién emite {event} (arrastra desde el agregado o servicio de dominio hasta el evento) — el flow necesita su disparador",
  "gestures.default.projection": "Proyección"
}, mn = {
  "hosts.loadingModel": "Loading the model…",
  // modux-editor-connected (web app, REST)
  "hosts.connected.reloadedExternally": "The model changed outside this editor: reloaded (undo history reset)",
  "hosts.connected.commandRejected": "The server rejected the command ({status})",
  // modux-editor-ide / modux-archi-ide (IDE plugin)
  "hosts.ide.noBridge": "No bridge to the IDE: this component only works inside the plugin.",
  "hosts.ide.noBridgeShort": "No bridge to the IDE",
  "hosts.ide.openViewFailed": "Could not open the view: {message}",
  "hosts.ide.saveFailed": "Could not save: {message}",
  "hosts.ide.applyFailed": "Could not apply: {message}",
  "hosts.ide.unprojectedTypes": "This model has elements the editor does not draw yet: {types}. They are kept intact on disk.",
  "hosts.ide.referencedModelNotFound": "Cannot find the model of {project}. Clone it next to this repository, or give the reference a path.",
  "hosts.ideFs.readOnlyReference": "Another project's model is read-only",
  // draw.io host
  "hosts.drawio.noBridge": "No bridge to the IDE (window.moduxBridge missing).",
  "hosts.drawio.openModelFailed": "Could not open the model: {message}",
  // default names written into the model (in the UI language)
  "hosts.default.project": "project"
}, hn = {
  "hosts.loadingModel": "Cargando el modelo…",
  "hosts.connected.reloadedExternally": "El modelo ha cambiado fuera de este editor: recargado (historial de deshacer reiniciado)",
  "hosts.connected.commandRejected": "El servidor rechazó el comando ({status})",
  "hosts.ide.noBridge": "Sin puente con el IDE: este componente solo funciona dentro del plugin.",
  "hosts.ide.noBridgeShort": "Sin puente con el IDE",
  "hosts.ide.openViewFailed": "No se pudo abrir la vista: {message}",
  "hosts.ide.saveFailed": "No se pudo guardar: {message}",
  "hosts.ide.applyFailed": "No se pudo aplicar: {message}",
  "hosts.ide.unprojectedTypes": "Este modelo tiene elementos que el editor todavía no dibuja: {types}. Se conservan intactos en disco.",
  "hosts.ide.referencedModelNotFound": "No encuentro el modelo de {project}. Clónalo al lado de este repositorio, o dale un path a la referencia.",
  "hosts.ideFs.readOnlyReference": "El modelo de otro proyecto se lee, no se escribe",
  "hosts.drawio.noBridge": "Sin puente con el IDE (window.moduxBridge ausente).",
  "hosts.drawio.openModelFailed": "No se pudo abrir el modelo: {message}",
  "hosts.default.project": "proyecto"
}, gn = {
  "palette.group.strategic": "Strategic",
  "palette.group.domain": "Domain",
  "palette.group.distribution": "Distribution",
  "palette.group.apis": "APIs",
  "palette.group.externalSystem": "External system",
  "palette.group.ai": "AI",
  "palette.group.orchestration": "Orchestration",
  "palette.group.ui": "UI",
  "palette.group.models": "Models",
  "palette.group.layouts": "Layouts",
  "palette.group.components": "Components",
  "palette.group.display": "Display",
  "palette.item.system": "System",
  "palette.item.boundedContext": "Context",
  "palette.item.actor": "Actor",
  "palette.item.note": "Note",
  "palette.item.area": "Area",
  "palette.item.projectReference": "Other modux project",
  "palette.item.externalSystem": "External system",
  "palette.item.identityProvider": "IdP (identity)",
  "palette.item.aiAgent": "AI agent",
  "palette.item.externalAiAgent": "External AI agent",
  "palette.item.mcpGateway": "MCP gateway",
  "palette.item.rag": "RAG",
  "palette.item.api": "API",
  "palette.item.proxyApi": "Proxy API",
  "palette.item.workflow": "Workflow",
  "palette.item.workflowStep": "Workflow step",
  "palette.item.workflowJoin": "Join",
  "palette.item.workflowSplit": "Split",
  "palette.item.etlFlow": "ETL flow (integrator)",
  "palette.item.etlTransform": "ETL transformation",
  "palette.item.aggregate": "Aggregate",
  "palette.item.entity": "Entity",
  "palette.item.valueObject": "Value object",
  "palette.item.field": "Field",
  "palette.item.operation": "Operation",
  "palette.item.invariant": "Invariant",
  "palette.item.useCase": "Use case",
  "palette.item.useCaseStep": "Use case step",
  "palette.item.policy": "Policy",
  "palette.item.domainEvent": "Domain event",
  "palette.item.applicationEvent": "Application event",
  "palette.item.integrationEvent": "Integration event",
  "palette.item.readModel": "Read model",
  "palette.item.domainService": "Domain service",
  "palette.item.queryService": "Query service",
  "palette.item.scheduledTrigger": "Scheduled trigger",
  "palette.item.notification": "Notification",
  "palette.item.document": "Document/Report",
  "palette.item.apiOperation": "API operation",
  "palette.item.externalUseCase": "External operation",
  "palette.item.externalTable": "External table",
  "palette.item.cdc": "CDC",
  "palette.item.mcpServer": "MCP server",
  "palette.item.service": "Service (deployment)",
  "palette.item.module": "Module",
  "palette.item.url": "URL",
  "palette.item.ui": "UI",
  "palette.item.uiApp": "App",
  "palette.item.uiAppOrchestrator": "Orchestrator",
  "palette.item.uiAppMasterdetail": "Master-detail",
  "palette.item.uiAppVieweditor": "View-editor",
  "palette.item.page": "Page",
  "palette.item.mockup": "Mockup",
  "palette.item.menuItem": "Menu option",
  "palette.item.buttonGroup": "Button group",
  "palette.item.uiButton": "Button",
  "palette.item.uiPageCrud": "CRUD",
  "palette.item.uiPageWizard": "Wizard",
  "palette.item.uiWizardStep": "Wizard step",
  "palette.item.uiModel": "Model",
  "palette.item.modelField": "Field",
  "palette.item.transformation": "Transformation",
  "palette.item.customCode": "Custom code",
  "palette.item.cmpVerticalLayout": "Layout · Vertical",
  "palette.item.cmpHorizontalLayout": "Layout · Horizontal",
  "palette.item.cmpFormLayout": "Layout · Form",
  "palette.item.cmpSplitLayout": "Layout · Split",
  "palette.item.cmpTabLayout": "Layout · Tabs",
  "palette.item.cmpTab": "Layout · Tab",
  "palette.item.cmpAccordionLayout": "Layout · Accordion",
  "palette.item.cmpCard": "Layout · Card",
  "palette.item.cmpGridLayout": "Layout · Grid",
  "palette.item.cmpBoardLayout": "Layout · Board",
  "palette.item.cmpDashboardLayout": "Layout · Dashboard",
  "palette.item.cmpMasterDetailLayout": "Layout · Master-detail",
  "palette.item.cmpFoldoutLayout": "Layout · Foldout",
  "palette.item.cmpCarouselLayout": "Layout · Carousel",
  "palette.item.cmpAppLayout": "Layout · App",
  "palette.item.cmpSection": "Layout · Section",
  "palette.item.cmpZones": "Layout · Zone row",
  "palette.item.cmpToolbar": "Layout · Toolbar",
  "palette.item.cmpPageHeader": "Layout · Page header",
  "palette.item.cmpHero": "Layout · Hero",
  "palette.item.cmpScoreboard": "Layout · Scoreboard",
  "palette.item.cmpWizard": "Layout · Wizard",
  "palette.item.cmpApp": "Layout · App shell",
  "palette.item.cmpForm": "Component · Form",
  "palette.item.cmpListing": "Component · Listing",
  "palette.item.cmpCrud": "Component · CRUD",
  "palette.item.cmpFilterBar": "Component · Filter bar",
  "palette.item.cmpButton": "Component · Button",
  "palette.item.cmpFab": "Component · Floating button",
  "palette.item.cmpField": "Component · Field",
  "palette.item.cmpMenuBar": "Component · Menu",
  "palette.item.cmpAppContext": "Component · Context selector",
  "palette.item.cmpAddOnPicker": "Component · Extras (add-ons)",
  "palette.item.cmpPaymentPicker": "Component · Payment",
  "palette.item.cmpChat": "Component · Chat",
  "palette.item.cmpText": "Display · Text",
  "palette.item.cmpMetricCard": "Display · Metric",
  "palette.item.cmpKpi": "Display · KPI",
  "palette.item.cmpStat": "Display · Statistic",
  "palette.item.cmpNotice": "Display · Notice",
  "palette.item.cmpBanner": "Display · Banner",
  "palette.item.cmpCalloutCard": "Display · Callout",
  "palette.item.cmpBulletedList": "Display · List",
  "palette.item.cmpStatusList": "Display · Status list",
  "palette.item.cmpChecklist": "Display · Checklist",
  "palette.item.cmpFileList": "Display · Files",
  "palette.item.cmpSeparator": "Display · Separator",
  "palette.item.cmpEntityHeader": "Display · Entity header",
  "palette.item.cmpEmptyState": "Display · Empty state",
  "palette.item.cmpSkeleton": "Display · Skeleton",
  "palette.item.cmpProgressBar": "Display · Progress bar",
  "palette.item.cmpProgressSteps": "Display · Progress steps",
  "palette.item.cmpTaskProgress": "Display · Task progress",
  "palette.item.cmpMeter": "Display · Meter",
  "palette.item.cmpTimeline": "Display · Timeline",
  "palette.item.cmpCalendar": "Display · Calendar",
  "palette.item.cmpKanban": "Display · Kanban",
  "palette.item.cmpGantt": "Display · Gantt",
  "palette.item.cmpTrendChart": "Display · Trend chart",
  "palette.item.cmpHeatmap": "Display · Heat map",
  "palette.item.cmpFunnel": "Display · Funnel",
  "palette.item.cmpOrgChart": "Display · Org chart",
  "palette.item.cmpFeatureGrid": "Display · Feature grid",
  "palette.item.cmpTestimonials": "Display · Testimonials",
  "palette.item.cmpFaq": "Display · FAQ",
  "palette.item.cmpCommentThread": "Display · Comments",
  "palette.item.cmpComparisonCard": "Display · Comparison",
  "palette.item.cmpPlanningBoard": "Display · Planning (resources × days)",
  "palette.item.cmpOfferCard": "Display · Offer",
  "palette.item.cmpPricingTable": "Display · Pricing table",
  "palette.item.cmpProcessMonitor": "Display · Process monitor",
  "palette.item.cmpResourceGrid": "Display · Resource grid",
  "palette.item.cmpTaskQueue": "Display · Task queue",
  "palette.item.cmpLedger": "Display · Breakdown (ledger)",
  "palette.item.cmpMarkdown": "Display · Markdown",
  "palette.item.cmpBreadcrumbs": "Display · Breadcrumbs"
}, fn = {
  "palette.group.strategic": "Estratégico",
  "palette.group.domain": "Dominio",
  "palette.group.distribution": "Distribución",
  "palette.group.apis": "APIs",
  "palette.group.externalSystem": "Sistema externo",
  "palette.group.ai": "IA",
  "palette.group.orchestration": "Orquestación",
  "palette.group.ui": "UI",
  "palette.group.models": "Modelos",
  "palette.group.layouts": "Layouts",
  "palette.group.components": "Componentes",
  "palette.group.display": "Display",
  "palette.item.system": "Sistema",
  "palette.item.boundedContext": "Contexto",
  "palette.item.actor": "Actor",
  "palette.item.note": "Nota",
  "palette.item.area": "Área",
  "palette.item.projectReference": "Otro proyecto modux",
  "palette.item.externalSystem": "Sistema externo",
  "palette.item.identityProvider": "IdP (identidad)",
  "palette.item.aiAgent": "Agente IA",
  "palette.item.externalAiAgent": "Agente IA externo",
  "palette.item.mcpGateway": "Gateway MCP",
  "palette.item.rag": "RAG",
  "palette.item.api": "API",
  "palette.item.proxyApi": "Proxy API",
  "palette.item.workflow": "Workflow",
  "palette.item.workflowStep": "Paso de workflow",
  "palette.item.workflowJoin": "Join",
  "palette.item.workflowSplit": "Split",
  "palette.item.etlFlow": "Flujo ETL (integrador)",
  "palette.item.etlTransform": "Transformación ETL",
  "palette.item.aggregate": "Agregado",
  "palette.item.entity": "Entidad",
  "palette.item.valueObject": "Value object",
  "palette.item.field": "Campo",
  "palette.item.operation": "Operación",
  "palette.item.invariant": "Invariante",
  "palette.item.useCase": "Caso de uso",
  "palette.item.useCaseStep": "Paso de caso de uso",
  "palette.item.policy": "Policy",
  "palette.item.domainEvent": "Evento de dominio",
  "palette.item.applicationEvent": "Evento de aplicación",
  "palette.item.integrationEvent": "Evento de integración",
  "palette.item.readModel": "Read model",
  "palette.item.domainService": "Servicio de dominio",
  "palette.item.queryService": "Query service",
  "palette.item.scheduledTrigger": "Trigger programado",
  "palette.item.notification": "Notificación",
  "palette.item.document": "Documento/Informe",
  "palette.item.apiOperation": "Operación de API",
  "palette.item.externalUseCase": "Operación externa",
  "palette.item.externalTable": "Tabla externa",
  "palette.item.cdc": "CDC",
  "palette.item.mcpServer": "Servidor MCP",
  "palette.item.service": "Servicio (despliegue)",
  "palette.item.module": "Módulo",
  "palette.item.url": "URL",
  "palette.item.ui": "UI",
  "palette.item.uiApp": "App",
  "palette.item.uiAppOrchestrator": "Orquestador",
  "palette.item.uiAppMasterdetail": "Maestro-detalle",
  "palette.item.uiAppVieweditor": "Vista-editor",
  "palette.item.page": "Página",
  "palette.item.mockup": "Mockup",
  "palette.item.menuItem": "Opción de menú",
  "palette.item.buttonGroup": "Grupo de botones",
  "palette.item.uiButton": "Botón",
  "palette.item.uiPageCrud": "CRUD",
  "palette.item.uiPageWizard": "Wizard",
  "palette.item.uiWizardStep": "Paso de wizard",
  "palette.item.uiModel": "Modelo",
  "palette.item.modelField": "Campo",
  "palette.item.transformation": "Transformación",
  "palette.item.customCode": "Custom code",
  "palette.item.cmpVerticalLayout": "Layout · Vertical",
  "palette.item.cmpHorizontalLayout": "Layout · Horizontal",
  "palette.item.cmpFormLayout": "Layout · Form",
  "palette.item.cmpSplitLayout": "Layout · Split",
  "palette.item.cmpTabLayout": "Layout · Tabs",
  "palette.item.cmpTab": "Layout · Pestaña",
  "palette.item.cmpAccordionLayout": "Layout · Acordeón",
  "palette.item.cmpCard": "Layout · Card",
  "palette.item.cmpGridLayout": "Layout · Grid",
  "palette.item.cmpBoardLayout": "Layout · Board",
  "palette.item.cmpDashboardLayout": "Layout · Dashboard",
  "palette.item.cmpMasterDetailLayout": "Layout · Master-detail",
  "palette.item.cmpFoldoutLayout": "Layout · Foldout",
  "palette.item.cmpCarouselLayout": "Layout · Carrusel",
  "palette.item.cmpAppLayout": "Layout · App",
  "palette.item.cmpSection": "Layout · Sección",
  "palette.item.cmpZones": "Layout · Fila de zonas",
  "palette.item.cmpToolbar": "Layout · Toolbar",
  "palette.item.cmpPageHeader": "Layout · Cabecera de página",
  "palette.item.cmpHero": "Layout · Hero",
  "palette.item.cmpScoreboard": "Layout · Scoreboard",
  "palette.item.cmpWizard": "Layout · Wizard",
  "palette.item.cmpApp": "Layout · Shell de app",
  "palette.item.cmpForm": "Componente · Formulario",
  "palette.item.cmpListing": "Componente · Listado",
  "palette.item.cmpCrud": "Componente · CRUD",
  "palette.item.cmpFilterBar": "Componente · Barra de filtros",
  "palette.item.cmpButton": "Componente · Botón",
  "palette.item.cmpFab": "Componente · Botón flotante",
  "palette.item.cmpField": "Componente · Campo",
  "palette.item.cmpMenuBar": "Componente · Menú",
  "palette.item.cmpAppContext": "Componente · Selector de contexto",
  "palette.item.cmpAddOnPicker": "Componente · Extras (add-ons)",
  "palette.item.cmpPaymentPicker": "Componente · Pago",
  "palette.item.cmpChat": "Componente · Chat",
  "palette.item.cmpText": "Display · Texto",
  "palette.item.cmpMetricCard": "Display · Métrica",
  "palette.item.cmpKpi": "Display · KPI",
  "palette.item.cmpStat": "Display · Estadística",
  "palette.item.cmpNotice": "Display · Aviso",
  "palette.item.cmpBanner": "Display · Banner",
  "palette.item.cmpCalloutCard": "Display · Callout",
  "palette.item.cmpBulletedList": "Display · Lista",
  "palette.item.cmpStatusList": "Display · Lista de estados",
  "palette.item.cmpChecklist": "Display · Checklist",
  "palette.item.cmpFileList": "Display · Ficheros",
  "palette.item.cmpSeparator": "Display · Separador",
  "palette.item.cmpEntityHeader": "Display · Cabecera de entidad",
  "palette.item.cmpEmptyState": "Display · Estado vacío",
  "palette.item.cmpSkeleton": "Display · Esqueleto",
  "palette.item.cmpProgressBar": "Display · Barra de progreso",
  "palette.item.cmpProgressSteps": "Display · Pasos de progreso",
  "palette.item.cmpTaskProgress": "Display · Progreso de tareas",
  "palette.item.cmpMeter": "Display · Medidor",
  "palette.item.cmpTimeline": "Display · Línea de tiempo",
  "palette.item.cmpCalendar": "Display · Calendario",
  "palette.item.cmpKanban": "Display · Kanban",
  "palette.item.cmpGantt": "Display · Gantt",
  "palette.item.cmpTrendChart": "Display · Gráfica de tendencia",
  "palette.item.cmpHeatmap": "Display · Mapa de calor",
  "palette.item.cmpFunnel": "Display · Embudo",
  "palette.item.cmpOrgChart": "Display · Organigrama",
  "palette.item.cmpFeatureGrid": "Display · Grid de features",
  "palette.item.cmpTestimonials": "Display · Testimonios",
  "palette.item.cmpFaq": "Display · FAQ",
  "palette.item.cmpCommentThread": "Display · Comentarios",
  "palette.item.cmpComparisonCard": "Display · Comparativa",
  "palette.item.cmpPlanningBoard": "Display · Planning (recursos × días)",
  "palette.item.cmpOfferCard": "Display · Oferta",
  "palette.item.cmpPricingTable": "Display · Tabla de precios",
  "palette.item.cmpProcessMonitor": "Display · Monitor de procesos",
  "palette.item.cmpResourceGrid": "Display · Grid de recursos",
  "palette.item.cmpTaskQueue": "Display · Cola de tareas",
  "palette.item.cmpLedger": "Display · Desglose (ledger)",
  "palette.item.cmpMarkdown": "Display · Markdown",
  "palette.item.cmpBreadcrumbs": "Display · Migas de pan"
}, wn = {
  "store.error.unknownKind": "Unknown {kind}: {id}",
  "store.kind.mcpGateway": "MCP gateway",
  "store.kind.queryService": "query service",
  "store.kind.rag": "RAG",
  "store.kind.useCase": "use case",
  "store.kind.agent": "agent",
  "store.kind.actor": "actor",
  "store.kind.api": "API",
  "store.kind.boundedContext": "bounded context",
  "store.kind.proxy": "proxy",
  "store.kind.externalSystem": "external system",
  "store.kind.uiApp": "UI app",
  "store.kind.model": "model",
  "store.kind.page": "page",
  "store.kind.aggregate": "aggregate",
  "store.kind.context": "context",
  "store.kind.looseElement": "loose element",
  "store.kind.mapping": "mapping",
  "store.kind.transformation": "transformation",
  "store.kind.buttonGroup": "button group",
  "store.kind.mockup": "mockup",
  "store.kind.idp": "IdP",
  "store.kind.notification": "notification",
  "store.kind.document": "document",
  "store.kind.etlFlow": "ETL flow",
  "store.kind.customCode": "custom code",
  "store.kind.role": "role",
  "store.kind.gateway": "gateway",
  "store.kind.detailPage": "detail page",
  "store.unknown.externalSystem": "Unknown external system: {id}",
  "store.unknown.view": "Unknown view: {id}",
  "store.unknown.module": "Unknown module: {id}",
  "store.unknown.service": "Unknown service: {id}",
  "store.unknown.url": "Unknown URL: {id}",
  "store.unknown.actor": "Unknown actor: {id}",
  "store.unknown.api": "Unknown API: {id}",
  "store.unknown.apiOperation": "Unknown API operation: {id}",
  "store.unknown.externalUseCase": "Unknown external use case: {id}",
  "store.unknown.mcpServer": "Unknown MCP server: {id}",
  "store.unknown.domainOrApplicationEvent": "Unknown domain or application event: {id}",
  "store.unknown.agent": "Unknown agent: {id}",
  "store.unknown.useCase": "Unknown use case: {id}",
  "store.unknown.boundedContext": "Unknown bounded context: {id}",
  "store.unknown.proxy": "Unknown proxy: {id}",
  "store.unknown.menuItem": "Unknown menu item: {id}",
  "store.unknown.operation": "Unknown operation: {id}",
  "store.unknown.domainEvent": "Unknown domain event: {id}",
  "store.unknown.model": "Unknown model: {id}",
  "store.unknown.system": "Unknown system: {id}",
  "store.unknown.aggregate": "Unknown aggregate: {id}",
  "store.unknown.context": "Unknown context: {id}",
  "store.unknown.valueObject": "Unknown value object: {id}",
  "store.unknown.note": "Unknown note: {id}",
  "store.unknown.step": "Unknown step: {id}",
  "store.unknown.process": "Unknown process: {id}",
  "store.unknown.looseType": "Unknown loose type: {id}",
  "store.unknown.field": "Unknown field: {id}",
  "store.unknown.component": "Unknown component: {id}",
  "store.unknown.wizardStep": "Unknown wizard step: {id}",
  "store.unknown.event": "Unknown event: {id}",
  "store.unknown.trigger": "Unknown trigger: {id}",
  "store.unknown.externalOperation": "Unknown external operation: {id}",
  "store.unknown.externalTable": "Unknown external table: {id}",
  "store.unknown.mockup": "Unknown mockup: {id}",
  "store.unknown.ui": "Unknown UI: {id}",
  "store.unknown.uiApp": "Unknown UI app: {id}",
  "store.unknown.workflow": "Unknown workflow: {id}",
  "store.unknown.queryOperation": "Unknown query operation: {operation} in {service}",
  "store.unknown.element": "Unknown element: {id}",
  "store.apply.unsupportedCommand": "Unsupported command: {kind}",
  "store.workflow.unboundedLoop": "Infinite loop: the cycle {cycle} has no conditioned exit. A loop is only valid if at least one branch leaving the cycle is guarded by the condition of an EXCLUSIVE split.",
  "store.workflow.stepDependsOnSelf": "A step cannot depend on itself",
  "store.workflow.invalidSemantics": "Invalid semantics for a {type}: {semantics}",
  "store.workflow.branchNotFromSplit": "That branch does not leave this split: {target}",
  "store.workflow.endpointsInDifferentWorkflows": "Both ends already belong to different workflows: another workflow is only reached by pointing at the workflow",
  "store.workflow.nodeAlreadyFlows": "That node already flows somewhere else: a step or workflow only leads to ONE node",
  "store.workflow.stepAlreadyFlows": "That step already flows somewhere else: a step only leads to ONE node",
  "store.workflow.linkWithoutGatewayOrWorkflow": "That link involves neither a gateway nor a workflow",
  "store.workflow.branchConditionsOnlyExclusive": "Per-branch conditions belong to an EXCLUSIVE split",
  "store.workflow.splitSingleInput": "A split has only ONE input",
  "store.workflow.joinSingleOutput": "A join has only ONE output",
  "store.api.removeHasDependants": "API {id} has external systems that depend on it; remove those dependencies first",
  "store.api.removeHasProxies": "API {id} has proxies pointing to it; remove those proxies first",
  "store.api.removeProxyHasDependants": "Proxy {id} has external systems that depend on it; remove those dependencies first",
  "store.app.homeOnlyNormalApps": "Only regular apps have a home: a master-detail is a header and tabs, and an orchestrator only shows child pages",
  "store.app.homeIsSelf": "An app cannot be its own home",
  "store.app.viewEditOnlyViewEditor": "Only a view-editor has a view and an edit page",
  "store.menu.moveMissingItem": "move-menu-item: the item to move is missing",
  "store.menu.moveIntoItself": "A menu item cannot be moved inside itself",
  "store.menu.missingItem": "The menu item is missing",
  "store.menu.hasSubmenu": "The item «{label}» has a submenu: it cannot open anything",
  "store.actor.removeInProcesses": "Actor {id} takes part in processes; unassign it first",
  "store.actor.removeAllowedInUseCases": "Actor {id} is allowed in use cases; unassign it first",
  "store.actor.invalidUseTarget": "An actor only uses use cases or query services; unknown target: {target}",
  "store.view.computedMembers": "View {name} is computed; its members are derived from the seed",
  "store.agent.invalidExposureTarget": "An MCP gateway exposes MCP servers, APIs, operations, use cases or RAGs; unknown target: {target}",
  "store.agent.delegateToSelf": "An agent cannot delegate to itself",
  "store.agent.invalidRagSource": "A RAG indexes read models, external tables, APIs, external systems or contexts; unknown target: {target}",
  "store.agent.sourceNeedsUri": "The source needs a URI",
  "store.crud.aggregateWithoutContext": "Aggregate {id} does not belong to any bounded context",
  "store.external.parentNotFound": "The parent external system {id} does not exist",
  "store.external.removeHasSubsystems": "External system {id} has subsystems; delete them first",
  "store.external.removeIsFlowTarget": "External system {id} is the target of flows; delete them first",
  "store.external.removeHasDependantActors": "External system {id} has actors that depend on it; remove those dependencies first",
  "store.external.removeHasDependantSystems": "External system {id} has external systems that depend on it; remove those dependencies first",
  "store.external.notFound": "External system {id} does not exist",
  "store.external.circularNesting": "System {parent} lives inside {id} — nesting them in a circle makes no sense",
  "store.external.removeUseCaseIsCalled": "External use case {id} is called by use cases; remove those calls first",
  "store.external.removeTableIsProjected": "Table {id} is projected by projections; delete them first",
  "store.external.useCaseWithoutContext": "Use case {id} does not belong to any bounded context",
  "store.external.dependsOnSelf": "An external system cannot depend on itself",
  "store.external.cqrsBetweenExternals": "The CQRS relation is established between external systems",
  "store.external.referenceNeedsCoordinate": "Referencing another project needs its git URL or the path to its model",
  "store.external.referenceUnreadable": "Could not read the referenced project: no data to copy",
  "store.behavior.applicationEventEmitter": "Only use cases emit application events; unknown emitter: {id}",
  "store.behavior.useCaseCallsSelf": "A use case cannot call itself",
  "store.behavior.domainEventEmitter": "Only aggregates and domain services emit domain events; unknown emitter: {id}",
  "store.model.targetHasField": "The target model already has a field with id {id}",
  "store.core.removeContextHasAggregates": "Bounded context {id} has aggregates; delete them first",
  "store.core.removeSystemHasContexts": "System {id} groups contexts; move them out first",
  "store.core.removeSystemHasSubsystems": "System {id} contains subsystems; move them out first",
  "store.core.systemContainsSelf": "A system cannot contain itself",
  "store.core.removeAggregateHasEntities": "Aggregate {id} has entities; delete them first",
  "store.core.setContextUnsupported": "set-element-context is not supported for: {type}",
  "store.core.invalidPort": "«{value}» is not a valid port",
  "store.core.portTaken": "Port {port} is already used by service «{service}»",
  "store.page.componentIntoItself": "A component cannot be moved inside itself: {id}",
  "store.page.wizardContainsSelf": "A wizard cannot contain itself",
  "store.page.detailOnlyCrud": "Only a CRUD has a detail page and a create form",
  "store.page.tabLayoutOnlyTabs": "A tabLayout only accepts tabs",
  "store.page.tabOnlyInTabLayout": "A tab can only hang from a tabLayout",
  "store.rename.missingType": "rename-element: the element type is missing",
  "store.rename.unsupported": "rename-element is not supported for: {type}",
  "store.rename.describeUnsupported": "set-element-description is not supported for: {type}",
  "store.loose.invariantOwner": "An invariant must sit on an aggregate, value object or entity",
  "store.loose.readModelOwner": "A read model must sit on a context or an aggregate",
  "store.platform.idpTarget": "The IdP relates to apps, bounded contexts or ETL flows: {id}",
  "store.platform.noProject": "There is no project in the model",
  "store.platform.etlStepNeedsType": "The ETL step needs a type",
  "store.retype.type.aggregate": "Aggregate",
  "store.retype.type.entity": "Entity",
  "store.retype.type.valueObject": "Value object",
  "store.retype.type.domainEvent": "Domain event",
  "store.retype.type.applicationEvent": "Application event",
  "store.retype.type.integrationEvent": "Integration event",
  "store.retype.type.useCase": "Use case",
  "store.retype.type.policy": "Policy",
  "store.retype.unknownTypes": "Cannot change from «{from}» to «{to}»",
  "store.retype.incompatible": "Cannot convert {from} into {to}",
  "store.retype.andMore": " and {count} more",
  "store.retype.referenced": "Cannot change the type of «{name}»: it is referenced by {refs}. Remove those references first.",
  "store.retype.wouldLose": "Cannot change the type of «{name}»: it would lose {fields}. Empty it first.",
  "store.ui.assignTarget": "A UI is assigned to an app or a page: {target}",
  "store.readside.removeQueryServiceConsumed": "Query service {id} is consumed by use cases; remove those calls first",
  "store.readside.readModelWithoutContext": "Read model {id} does not belong to any bounded context",
  "store.readside.removeProjectionUpdated": "Projection {id} is updated by subscriptions; remove those actions first",
  "store.readside.invalidCron": "«{cron}» is not a Spring cron: it has six fields (second minute hour day month day-of-week)",
  "store.readside.projectionNeedsSource": "A projection needs a source: aggregate, external operation or table",
  // default names and descriptions written into the model (model content, in the UI language)
  "store.default.stepN": "Step {n}",
  "store.default.tabN": "Tab {n}",
  "store.default.sagaStepOperatesOn": "operates on {target}",
  "store.default.sagaStepCallsGateway": "calls the gateway {gateway}",
  "store.default.sagaStepCompensatedWith": "was compensated by step {step}",
  "store.default.sagaAlsoTriggeredBy": "also triggered by: {events}",
  "store.default.sagaTimeout": "saga timeout: {ms} ms",
  "store.default.sagaRetries": "retries: {retries}",
  "store.default.deleteAggregateDescription": "Deletes the aggregate {name}",
  "store.default.queriesDescription": "Canonical listing of the aggregate {name}.",
  "store.default.listDescription": "Paged listing of {name}",
  "store.default.crudApiDescription": "CRUD of the aggregate {name}.",
  "store.default.referencedProjectDescription": "Referenced modux project"
}, yn = {
  "store.error.unknownKind": "{kind} desconocido: {id}",
  "store.kind.mcpGateway": "Gateway MCP",
  "store.kind.queryService": "Query service",
  "store.kind.rag": "RAG",
  "store.kind.useCase": "Caso de uso",
  "store.kind.agent": "Agente",
  "store.kind.actor": "Actor",
  "store.kind.api": "API",
  "store.kind.boundedContext": "Bounded context",
  "store.kind.proxy": "Proxy",
  "store.kind.externalSystem": "Sistema externo",
  "store.kind.uiApp": "App de UI",
  "store.kind.model": "Modelo",
  "store.kind.page": "Página",
  "store.kind.aggregate": "Agregado",
  "store.kind.context": "Contexto",
  "store.kind.looseElement": "Elemento suelto",
  "store.kind.mapping": "Mapeo",
  "store.kind.transformation": "Transformación",
  "store.kind.buttonGroup": "Grupo de botones",
  "store.kind.mockup": "Mockup",
  "store.kind.idp": "IdP",
  "store.kind.notification": "Notificación",
  "store.kind.document": "Documento",
  "store.kind.etlFlow": "Flujo ETL",
  "store.kind.customCode": "Custom code",
  "store.kind.role": "Rol",
  "store.kind.gateway": "Gateway",
  "store.kind.detailPage": "Página de detalle",
  "store.unknown.externalSystem": "Sistema externo desconocido: {id}",
  "store.unknown.view": "Vista desconocida: {id}",
  "store.unknown.module": "Módulo desconocido: {id}",
  "store.unknown.service": "Servicio desconocido: {id}",
  "store.unknown.url": "URL desconocida: {id}",
  "store.unknown.actor": "Actor desconocido: {id}",
  "store.unknown.api": "API desconocida: {id}",
  "store.unknown.apiOperation": "Operación de API desconocida: {id}",
  "store.unknown.externalUseCase": "Caso de uso externo desconocido: {id}",
  "store.unknown.mcpServer": "Servidor MCP desconocido: {id}",
  "store.unknown.domainOrApplicationEvent": "Evento de dominio o de aplicación desconocido: {id}",
  "store.unknown.agent": "Agente desconocido: {id}",
  "store.unknown.useCase": "Caso de uso desconocido: {id}",
  "store.unknown.boundedContext": "Bounded context desconocido: {id}",
  "store.unknown.proxy": "Proxy desconocido: {id}",
  "store.unknown.menuItem": "Entrada de menú desconocida: {id}",
  "store.unknown.operation": "Operación desconocida: {id}",
  "store.unknown.domainEvent": "Evento de dominio desconocido: {id}",
  "store.unknown.model": "Modelo desconocido: {id}",
  "store.unknown.system": "Sistema desconocido: {id}",
  "store.unknown.aggregate": "Agregado desconocido: {id}",
  "store.unknown.context": "Contexto desconocido: {id}",
  "store.unknown.valueObject": "Value object desconocido: {id}",
  "store.unknown.note": "Nota desconocida: {id}",
  "store.unknown.step": "Paso desconocido: {id}",
  "store.unknown.process": "Proceso desconocido: {id}",
  "store.unknown.looseType": "Tipo suelto desconocido: {id}",
  "store.unknown.field": "Campo desconocido: {id}",
  "store.unknown.component": "Componente desconocido: {id}",
  "store.unknown.wizardStep": "Paso de wizard desconocido: {id}",
  "store.unknown.event": "Evento desconocido: {id}",
  "store.unknown.trigger": "Disparador desconocido: {id}",
  "store.unknown.externalOperation": "Operación externa desconocida: {id}",
  "store.unknown.externalTable": "Tabla externa desconocida: {id}",
  "store.unknown.mockup": "Mockup desconocido: {id}",
  "store.unknown.ui": "UI desconocida: {id}",
  "store.unknown.uiApp": "App de UI desconocida: {id}",
  "store.unknown.workflow": "Workflow desconocido: {id}",
  "store.unknown.queryOperation": "Operación de query desconocida: {operation} en {service}",
  "store.unknown.element": "Elemento desconocido: {id}",
  "store.apply.unsupportedCommand": "Comando no soportado: {kind}",
  "store.workflow.unboundedLoop": "Bucle infinito: el ciclo {cycle} no tiene salida condicionada. Un bucle solo es válido si al menos una rama que sale del ciclo está guardada por la condición de un split EXCLUSIVO.",
  "store.workflow.stepDependsOnSelf": "Un paso no puede depender de sí mismo",
  "store.workflow.invalidSemantics": "Semántica inválida para un {type}: {semantics}",
  "store.workflow.branchNotFromSplit": "Esa rama no sale de este split: {target}",
  "store.workflow.endpointsInDifferentWorkflows": "Los dos extremos ya pertenecen a workflows distintos: a otro workflow solo se llega apuntando al workflow",
  "store.workflow.nodeAlreadyFlows": "Ese nodo ya fluye hacia otro sitio: un paso o workflow solo sale a UN nodo",
  "store.workflow.stepAlreadyFlows": "Ese paso ya fluye hacia otro sitio: un paso solo sale a UN nodo",
  "store.workflow.linkWithoutGatewayOrWorkflow": "Ese enlace no involucra a un gateway ni a un workflow",
  "store.workflow.branchConditionsOnlyExclusive": "Las condiciones por rama son del split EXCLUSIVO",
  "store.workflow.splitSingleInput": "Un split solo tiene UNA entrada",
  "store.workflow.joinSingleOutput": "Un join solo tiene UNA salida",
  "store.api.removeHasDependants": "La API {id} tiene sistemas externos que dependen de ella; quita esas dependencias primero",
  "store.api.removeHasProxies": "La API {id} tiene proxies que apuntan a ella; quita esos proxies primero",
  "store.api.removeProxyHasDependants": "El proxy {id} tiene sistemas externos que dependen de él; quita esas dependencias primero",
  "store.app.homeOnlyNormalApps": "Solo las apps normales tienen home: el maestro-detalle es cabecera y pestañas, y el orquestador solo enseña páginas hijas",
  "store.app.homeIsSelf": "Una app no puede ser su propia home",
  "store.app.viewEditOnlyViewEditor": "Solo un vista-editor tiene vista y edición",
  "store.menu.moveMissingItem": "move-menu-item: falta la entrada a mover",
  "store.menu.moveIntoItself": "Una opción no puede moverse dentro de sí misma",
  "store.menu.missingItem": "Falta la entrada de menú",
  "store.menu.hasSubmenu": "La entrada «{label}» tiene submenú: no puede abrir nada",
  "store.actor.removeInProcesses": "El actor {id} participa en procesos; desasígnalo primero",
  "store.actor.removeAllowedInUseCases": "El actor {id} está permitido en casos de uso; desasígnalo primero",
  "store.actor.invalidUseTarget": "Un actor solo usa casos de uso o query services; destino desconocido: {target}",
  "store.view.computedMembers": "La vista {name} es computada; sus miembros se derivan del seed",
  "store.agent.invalidExposureTarget": "Un gateway MCP expone servidores MCP, APIs, operaciones, casos de uso o RAGs; destino desconocido: {target}",
  "store.agent.delegateToSelf": "Un agente no puede delegar en sí mismo",
  "store.agent.invalidRagSource": "El RAG indexa read models, tablas externas, APIs, sistemas externos o contextos; destino desconocido: {target}",
  "store.agent.sourceNeedsUri": "La fuente necesita una URI",
  "store.crud.aggregateWithoutContext": "El agregado {id} no pertenece a ningún bounded context",
  "store.external.parentNotFound": "El sistema externo padre {id} no existe",
  "store.external.removeHasSubsystems": "El sistema externo {id} tiene subsistemas; bórralos primero",
  "store.external.removeIsFlowTarget": "El sistema externo {id} es destino de flows; bórralos primero",
  "store.external.removeHasDependantActors": "El sistema externo {id} tiene actores que dependen de él; quita esas dependencias primero",
  "store.external.removeHasDependantSystems": "El sistema externo {id} tiene sistemas externos que dependen de él; quita esas dependencias primero",
  "store.external.notFound": "El sistema externo {id} no existe",
  "store.external.circularNesting": "El sistema {parent} vive dentro de {id} — anidarlos en círculo no tiene sentido",
  "store.external.removeUseCaseIsCalled": "El caso de uso externo {id} lo llaman casos de uso; quita esas llamadas primero",
  "store.external.removeTableIsProjected": "La tabla {id} la proyectan proyecciones; bórralas primero",
  "store.external.useCaseWithoutContext": "El caso de uso {id} no pertenece a ningún bounded context",
  "store.external.dependsOnSelf": "Un sistema externo no puede depender de sí mismo",
  "store.external.cqrsBetweenExternals": "La relación CQRS se establece entre sistemas externos",
  "store.external.referenceNeedsCoordinate": "Para referenciar otro proyecto hace falta su URL git o el path a su modelo",
  "store.external.referenceUnreadable": "No se pudo leer el proyecto referenciado: sin datos que copiar",
  "store.behavior.applicationEventEmitter": "Solo los casos de uso emiten eventos de aplicación; emisor desconocido: {id}",
  "store.behavior.useCaseCallsSelf": "Un caso de uso no puede invocarse a sí mismo",
  "store.behavior.domainEventEmitter": "Solo agregados y servicios de dominio emiten eventos de dominio; emisor desconocido: {id}",
  "store.model.targetHasField": "El modelo destino ya tiene un campo con id {id}",
  "store.core.removeContextHasAggregates": "El bounded context {id} tiene agregados; bórralos primero",
  "store.core.removeSystemHasContexts": "El sistema {id} agrupa contextos; sácalos primero",
  "store.core.removeSystemHasSubsystems": "El sistema {id} contiene subsistemas; sácalos primero",
  "store.core.systemContainsSelf": "Un sistema no puede contenerse a sí mismo",
  "store.core.removeAggregateHasEntities": "El agregado {id} tiene entidades; bórralas primero",
  "store.core.setContextUnsupported": "set-element-context no soportado para: {type}",
  "store.core.invalidPort": "«{value}» no es un puerto válido",
  "store.core.portTaken": "El puerto {port} ya lo usa el servicio «{service}»",
  "store.page.componentIntoItself": "Un componente no puede moverse dentro de sí mismo: {id}",
  "store.page.wizardContainsSelf": "Un wizard no puede contenerse a sí mismo",
  "store.page.detailOnlyCrud": "Solo un CRUD tiene detalle y formulario de alta",
  "store.page.tabLayoutOnlyTabs": "Un tabLayout solo admite pestañas",
  "store.page.tabOnlyInTabLayout": "Una pestaña solo puede colgar de un tabLayout",
  "store.rename.missingType": "rename-element: falta el tipo de elemento",
  "store.rename.unsupported": "rename-element no soportado para: {type}",
  "store.rename.describeUnsupported": "set-element-description no soportado para: {type}",
  "store.loose.invariantOwner": "El invariante debe caer sobre un agregado, value object o entidad",
  "store.loose.readModelOwner": "El read model debe caer sobre un contexto o un agregado",
  "store.platform.idpTarget": "El IdP se relaciona con apps, bounded contexts o flujos ETL: {id}",
  "store.platform.noProject": "No hay proyecto en el modelo",
  "store.platform.etlStepNeedsType": "El paso ETL necesita un tipo",
  "store.retype.type.aggregate": "Agregado",
  "store.retype.type.entity": "Entidad",
  "store.retype.type.valueObject": "Value object",
  "store.retype.type.domainEvent": "Evento de dominio",
  "store.retype.type.applicationEvent": "Evento de aplicación",
  "store.retype.type.integrationEvent": "Evento de integración",
  "store.retype.type.useCase": "Caso de uso",
  "store.retype.type.policy": "Policy",
  "store.retype.unknownTypes": "No se puede cambiar de «{from}» a «{to}»",
  "store.retype.incompatible": "Un {from} no se puede convertir en {to}",
  "store.retype.andMore": " y {count} más",
  "store.retype.referenced": "No se puede cambiar el tipo de «{name}»: lo referencian {refs}. Quita esas referencias primero.",
  "store.retype.wouldLose": "No se puede cambiar el tipo de «{name}»: perdería {fields}. Vacíalo primero.",
  "store.ui.assignTarget": "La UI se asigna a una app o una página: {target}",
  "store.readside.removeQueryServiceConsumed": "El query service {id} lo consumen casos de uso; quita esas llamadas primero",
  "store.readside.readModelWithoutContext": "El read model {id} no pertenece a ningún bounded context",
  "store.readside.removeProjectionUpdated": "La proyección {id} la actualizan subscriptions; quita esas acciones primero",
  "store.readside.invalidCron": "«{cron}» no es un cron de Spring: lleva seis campos (segundo minuto hora día mes día-semana)",
  "store.readside.projectionNeedsSource": "La proyección necesita una fuente: agregado, operación externa o tabla",
  "store.default.stepN": "Paso {n}",
  "store.default.tabN": "Pestaña {n}",
  "store.default.sagaStepOperatesOn": "opera sobre {target}",
  "store.default.sagaStepCallsGateway": "llama al gateway {gateway}",
  "store.default.sagaStepCompensatedWith": "compensaba con el paso {step}",
  "store.default.sagaAlsoTriggeredBy": "también la disparaban: {events}",
  "store.default.sagaTimeout": "timeout de la saga: {ms} ms",
  "store.default.sagaRetries": "reintentos: {retries}",
  "store.default.deleteAggregateDescription": "Elimina el agregado {name}",
  "store.default.queriesDescription": "Listado canónico del agregado {name}.",
  "store.default.listDescription": "Listado paginado de {name}",
  "store.default.crudApiDescription": "CRUD del agregado {name}.",
  "store.default.referencedProjectDescription": "Proyecto modux referenciado"
}, vn = {
  // Placeholders drawn where the model is still incomplete
  "views.placeholder.condition": "condition?",
  "views.placeholder.collection": "collection?",
  "views.placeholder.type": "type?",
  // Aggregates view
  "views.aggregates.aggregateTooltip": "Aggregate {name}",
  "views.aggregates.aggregateTooltipContext": " — context {context} ({subdomain})",
  "views.aggregates.aggregateTooltipContents": " · {entities} entity(ies), {valueObjects} value object(s)",
  "views.aggregates.entityTooltip": "Entity {name} (inside the aggregate)",
  "views.aggregates.valueObjectInAggregate": "Value object inside the aggregate",
  "views.aggregates.ownerAggregate": "aggregate",
  "views.aggregates.ownerValueObject": "value object",
  "views.aggregates.ownerEntity": "entity",
  "views.aggregates.invariantBadge": "INVARIANT",
  "views.aggregates.invariantTooltip": "{name} — a rule the {owner} protects; double-click opens its sheet (the conditions are detailed there)",
  "views.aggregates.protectsEdge": "Protects this rule — Del removes it",
  "views.aggregates.entityInAggregate": "Entity inside the aggregate",
  "views.aggregates.referenceLabelled": "Reference: {label}",
  "views.aggregates.reference": "Reference between aggregates",
  "views.aggregates.defaultPrimitive": "text",
  "views.aggregates.fieldBadge": "FIELD",
  "views.aggregates.fieldTooltip": "Field {name}",
  "views.aggregates.fieldRequired": " (required)",
  "views.aggregates.fieldCollection": " (collection)",
  "views.aggregates.fieldEdge": "Field of this element",
  "views.aggregates.operationTooltip": "Operation {name}",
  "views.aggregates.operationEdge": "Operation of the aggregate",
  // Flows view
  "views.flows.triggerEvent": "Event: {event}",
  // Integrations (ETL) view
  "views.integrations.flowTooltip": "{name} — integrator: sources → transformation → writes; the palette adds transformations",
  "views.integrations.flowTooltipOwned": "{name} — integrator of {context}: sources → transformation → writes; the palette adds transformations",
  "views.integrations.dbBadge": "DB",
  "views.integrations.eventBadge": "EVENT",
  "views.integrations.stepAppliesMapping": " · applies a mapping",
  "views.integrations.stepRemove": " — Del removes it from the integrator",
  "views.integrations.pipeEdge": "the data flows through the pipeline",
  "views.integrations.externalSystemTooltip": "{name} — external system: its legacy tables feed (or receive from) integrators",
  "views.integrations.tableTooltip": "{name} — legacy table of {system}",
  "views.integrations.apiTooltip": "{name} — API an integrator consumes or calls",
  "views.integrations.eventTooltip": "event an integrator consumes or publishes",
  "views.integrations.dbEdge": "db",
  "views.integrations.eventEdge": "event",
  "views.integrations.readsHere": "{name} reads from here — Del removes the step",
  "views.integrations.writesHere": "{name} writes here — Del removes the step",
  // Mappings view
  "views.mappings.modelTooltip": "{name} — drag the handle to another model to create a mapping; the palette adds fields",
  "views.mappings.fieldTooltip": " — drag its handle to a field of another model to map them, or to another model to move it; Del deletes it",
  "views.mappings.transformationTooltip": "{name} — transformation: drag models or fields onto it (inputs) and its handle to a model or field (output)",
  "views.mappings.transformationNoOutput": " · no output yet",
  "views.mappings.customCodeTooltip": "{name} — hand-written code: drag its handle to a transformation, or to a mapped model, to delegate to it",
  "views.mappings.transformationDelegates": "{name} delegates to hand-written code — Del disconnects it",
  "views.mappings.mappingDelegates": "The mapping {name} delegates to hand-written code — Del disconnects it",
  "views.mappings.inputEdge": "input of {name} — Del disconnects it",
  "views.mappings.outputEdge": "output of {name} — Del disconnects it",
  "views.mappings.mappingTooltip": "{name} — the field-to-field rules are the thin lines between fields; Del deletes it",
  "views.mappings.ruleTooltip": "Rule of {name} — Del deletes it",
  "views.mappings.gapLabel": "mapping missing",
  "views.mappings.gapTooltip": "«{button}» (page {page}) calls {useCase}: mapping {source} → {target} is missing — draw the line to create it",
  // Processes view
  "views.processes.tooltipContext": " — context {context}",
  "views.processes.tooltipTrigger": " · starts on {event}",
  "views.processes.compensationBadge": "COMPENSATION",
  "views.processes.completionBadge": "FINAL EVENT",
  // Workflows view
  "views.workflows.startsOn": " — starts on {event}",
  "views.workflows.emitsOnCompletion": " · emits {event} on completion",
  "views.workflows.noUseCase": "no use case",
  "views.workflows.joinStepTooltip": "{name} — waits for ALL its dependencies before moving on",
  "views.workflows.splitStepTooltip": "{name} — opens parallel branches: the steps that depend on it start at once",
  "views.workflows.humanTask": " · HUMAN task of {role}",
  "views.workflows.humanTaskWithDeadline": " · HUMAN task of {role} (deadline {deadline})",
  "views.workflows.stepEmits": " · emits {event}",
  "views.workflows.stepLaunches": " · launches {useCase}",
  "views.workflows.stepAwaits": " · awaits {event}",
  "views.workflows.stepCompensable": " · ⎌ compensable",
  "views.workflows.dependencyTooltip": "{name} waits for {dependency}",
  "views.workflows.gatewayExclusive": "EXCLUSIVE",
  "views.workflows.gatewayParallel": "PARALLEL",
  "views.workflows.gatewayAny": "ANY",
  "views.workflows.gatewayAll": "ALL",
  "views.workflows.splitExclusiveTooltip": "{name} — exclusive split: picks ONE branch; double-click changes the semantics",
  "views.workflows.splitParallelTooltip": "{name} — parallel split: opens ALL branches; double-click changes the semantics",
  "views.workflows.joinAnyTooltip": "{name} — join that starts on ANY input; double-click changes the semantics",
  "views.workflows.joinAllTooltip": "{name} — join that waits for ALL its inputs; double-click changes the semantics",
  "views.workflows.flowsToGateway": "flows into the gateway — Del disconnects it",
  "views.workflows.branchIf": "Branch if: {condition} — double-click edits it; Del disconnects",
  "views.workflows.branchNoCondition": "Branch without a condition yet — double-click edits it; Del disconnects",
  "views.workflows.gatewayFlowsHere": "the gateway flows here — Del disconnects it",
  "views.workflows.roleBadge": "ROLE",
  "views.workflows.roleTooltip": "{name} — its task list receives the connected human steps",
  "views.workflows.roleEdge": "the task lands in this role's list — Del makes it automatic",
  "views.workflows.formBadge": "FORM",
  "views.workflows.formTooltip": "{name} — the forms engine presents it as the task's form",
  "views.workflows.formEdge": "the human task is presented with this page — Del disconnects it",
  "views.workflows.handoffEdge": "the step hands off to ANOTHER workflow — Del disconnects it",
  "views.workflows.rolledUpEdge": "{tooltip} — from a step folded inside",
  // Event storming view
  "views.eventstorming.commandBadge": "COMMAND",
  "views.eventstorming.policyTooltip": "{name} — policy of {context} (a reaction, not a business case)",
  "views.eventstorming.useCaseTooltip": "{name} — use case of {context}",
  "views.eventstorming.stepFallback": "step",
  "views.eventstorming.stepTooltip": "Step of {name}",
  "views.eventstorming.stepDelegates": " — delegates to hand-written code",
  "views.eventstorming.stepDragHint": " — drag its handle to a CODE to delegate to it",
  "views.eventstorming.pipelineEdge": "pipeline of {name}",
  "views.eventstorming.customCodeTooltip": "{name} — hand-written code: Custom steps delegate to it",
  "views.eventstorming.foldedStepDelegates": "A folded step of {name} delegates to this code — expand the command to see it",
  "views.eventstorming.stepDelegatesEdge": "The step delegates to hand-written code — Del disconnects it",
  "views.eventstorming.aggregateBadge": "AGGREGATE",
  "views.eventstorming.aggregateTooltip": "{name} — aggregate of {context}",
  "views.eventstorming.applicationEventBadge": "APPLICATION EVENT",
  "views.eventstorming.eventBadge": "EVENT",
  "views.eventstorming.eventTooltip": "{name} — event of {context}",
  "views.eventstorming.undeclaredEventBadge": "EVENT (undeclared)",
  "views.eventstorming.undeclaredEventTooltip": "{name} — referenced by name, no event declared in the catalog",
  "views.eventstorming.aiAgentBadge": "AI AGENT",
  "views.eventstorming.aiAgentTooltip": "{name} — AI agent (consumes via MCP)",
  "views.eventstorming.consumesViaMcp": "consumes via MCP",
  "views.eventstorming.callsExternal": "Calls {name} of the external system",
  "views.eventstorming.consumesMcpTools": "Consumes the tools of the MCP server {name}",
  "views.eventstorming.ragTooltip": "{name} — knowledge base (retrieval)",
  "views.eventstorming.ragQuery": "queries (retrieval)",
  "views.eventstorming.feedsIndex": "feeds the index",
  "views.eventstorming.externalBadge": "EXTERNAL",
  "views.eventstorming.emits": "emits",
  "views.eventstorming.reactsTo": " — reacts to {event}",
  "views.eventstorming.consumerGroup": " · group {group}",
  "views.eventstorming.projectionBadge": "PROJECTION",
  "views.eventstorming.materializes": " — materializes {readModel}",
  "views.eventstorming.projectsState": "projects its state",
  "views.eventstorming.pollingOf": "polling of {name}",
  "views.eventstorming.polling": "polling",
  "views.eventstorming.contextBadge": "CONTEXT",
  "views.eventstorming.processBadge": "PROCESS",
  "views.eventstorming.emitsOnCompletion": "emits on completion",
  // UI view
  "views.ui.orchestratorBadge": "ORCHESTRATOR",
  "views.ui.masterDetailBadge": "MASTER·DETAIL",
  "views.ui.viewEditorBadge": "VIEW·EDITOR",
  "views.ui.headerHandle": "Header: drag to the page that acts as the header",
  "views.ui.viewHandle": "View: drag to the detail page (read-only)",
  "views.ui.editHandle": "Edit: drag to the edit page",
  "views.ui.homeHandle": "Home: drag to the page (or app) it opens with",
  "views.ui.orchestratorTooltip": "{name} — orchestrates and keeps state; only shows child pages",
  "views.ui.masterDetailTooltip": "{name} — header + tabs (both are pages)",
  "views.ui.appTooltip": "App: {name}",
  "views.ui.stateEdge": "state",
  "views.ui.stateEdgeTooltip": "the app's viewmodel: the state it keeps and shares with its pages",
  "views.ui.viewEdge": "view",
  "views.ui.viewEdgeTooltip": "the read-only detail",
  "views.ui.editEdge": "edit",
  "views.ui.editEdgeTooltip": "the edit view",
  "views.ui.homeAppTooltip": "the app it opens with (assignment)",
  "views.ui.homePageTooltip": "the page the app opens with (assignment)",
  "views.ui.headerEdge": "header",
  "views.ui.headerEdgeTooltip": "the page that acts as the header; the others are tabs",
  "views.ui.menuGroupTooltip": "Grouper (with a submenu): it cannot open anything",
  "views.ui.menuOpensPage": "Opens {target}",
  "views.ui.menuOpensApp": "Opens the app {target}",
  "views.ui.menuLaunches": "Launches {target}",
  "views.ui.menuCrud": "Inferred CRUD over {target}",
  "views.ui.menuListing": "Filtered listing of {target}",
  "views.ui.menuNoTarget": "Menu entry without a target",
  "views.ui.menuPageEdge": "the page the option opens (assignment)",
  "views.ui.viewmodelHandle": "Viewmodel: drag to the page's data model",
  "views.ui.crudDetailHandle": "Detail: drag to the page or app a row opens",
  "views.ui.crudCreateHandle": "Create: drag to the page or app for the new record",
  "views.ui.wizardStepFallback": "Step",
  "views.ui.wizardStepTooltip": "Step {n}: {page} — drag the handle to another page to remap it",
  "views.ui.wizardStepUnmapped": "Step {n}, no page — drag the handle to the page that implements it",
  "views.ui.crudDetailEdge": "detail",
  "views.ui.crudCreateEdge": "new",
  "views.ui.crudDetailEdgeTooltip": "what a CRUD row opens",
  "views.ui.crudCreateEdgeTooltip": "the new-record form",
  "views.ui.wizardStepEdge": "the page that implements step {n} — Del unmaps it",
  "views.ui.buttonMapping": "Button «{label}» — mapping {mapping}",
  "views.ui.buttonNoMapping": "Button «{label}» — the viewmodel travels as is (no mapping)",
  "views.ui.listingEdge": "listing",
  "views.ui.buttonGroupBadge": "BUTTONS",
  "views.ui.toolbarHandle": "Toolbar: drag to a page to hook it at the top",
  "views.ui.bottomBarHandle": "Button bar: drag to a page to hook it at the bottom",
  "views.ui.buttonGroupTooltip": "{name} — button group: the palette adds buttons inside; its handles hook it to a page's toolbar or button bar",
  "views.ui.groupButtonTooltip": "{name} — drag its handle to a use case or policy to set what it triggers; Del removes it from the group",
  "views.ui.subgroupTooltip": "Subgroup {name} — Del un-nests it (the group still exists)",
  "views.ui.groupButtonEdge": "«{name}» triggers this use case — Del disconnects it",
  "views.ui.toolbarEdge": "toolbar",
  "views.ui.bottomBarEdge": "button bar",
  "views.ui.toolbarGroupEdge": "Group hooked to the toolbar of {page} — Del unhooks it",
  "views.ui.bottomBarGroupEdge": "Group hooked to the button bar of {page} — Del unhooks it",
  "views.ui.idpTooltip": "{name} — drag an app onto it: its users will authenticate here",
  "views.ui.authenticatesWith": "authenticates with",
  "views.ui.authEdgeTooltip": "the users of this app authenticate against this IdP — Del disconnects it",
  "views.ui.customCodeTooltip": "{name} — hand-written code: drag a page onto it to make it custom, and its handle to any element it uses",
  "views.ui.customPageEdge": "The page {name} is CUSTOM: it delegates to this code — Del disconnects it",
  "views.ui.customCodeUses": "{name} uses this element — Del disconnects it",
  "views.ui.uiTooltip": "{name} — declared interface: draw a line to the assigned app or page",
  "views.ui.uiAssignmentEdge": "assigned to the UI (assignment) — Del disconnects it",
  "views.ui.uiServingEdge": "the UI serves this actor (serving) — Del disconnects it",
  // Context map
  "views.contextMap.livesAt": "at {where}",
  "views.contextMap.livesNowhere": "no coordinates: it does not say where it lives",
  "views.contextMap.childTooltip": "{kind} {name} — part of {owner}",
  "views.contextMap.containsEdge": "{owner} contains {name}",
  "views.contextMap.component.button": "BUTTON",
  "views.contextMap.component.tab": "TAB",
  "views.contextMap.component.tabs": "TABS",
  "views.contextMap.component.listing": "LISTING",
  "views.contextMap.component.text": "TEXT",
  "views.contextMap.child.aggregate": "Aggregate",
  "views.contextMap.child.entity": "Entity — inside the aggregate",
  "views.contextMap.child.valueObject": "Value object — inside the aggregate",
  "views.contextMap.child.field": "Field — name, required flag and type",
  "views.contextMap.child.invariant": "Invariant — a rule this element protects",
  "views.contextMap.child.operation": "Operation — input model → output model",
  "views.contextMap.child.useCase": "Use case",
  "views.contextMap.child.domainEvent": "Domain event",
  "views.contextMap.child.applicationEvent": "Application event",
  "views.contextMap.child.integrationEvent": "Integration event",
  "views.contextMap.child.readModel": "Read model",
  "views.contextMap.child.domainService": "Domain service",
  "views.contextMap.child.queryService": "Query service",
  "views.contextMap.child.externalUseCase": "External use case",
  "views.contextMap.child.externalSystem": "Subsystem",
  "views.contextMap.child.system": "System — groups bounded contexts",
  "views.contextMap.child.boundedContext": "Bounded context — inside the system",
  "views.contextMap.child.externalTable": "Table (legacy)",
  "views.contextMap.child.mcpServer": "MCP server",
  "views.contextMap.child.apiOperation": "API operation",
  "views.contextMap.child.apiOpOccurrence": "Operation of the API, at this place",
  "views.contextMap.child.api": "API published by this system",
  "views.contextMap.child.apiImpl": "The same API, also implemented in this context",
  "views.contextMap.child.proxyApi": "Proxy/cache of an API, hosted in this system",
  "views.contextMap.child.scheduledTrigger": "Scheduled trigger (cron) — fires a use case",
  "views.contextMap.child.etlFlow": "ETL integrator — sources (pull/consumer) → transformation → writes",
  "views.contextMap.child.notification": "Notification — an event fires it and it alerts some roles through a channel",
  "views.contextMap.child.document": "Document/report — a template filled by a model, or a query's dataset",
  "views.contextMap.child.uiApp": "App — the UI of this bounded context (its pages are detailed in the UI view)",
  "views.contextMap.child.ui": "UI — the human interface the context exposes (as the API is the programmatic one); assigned to apps and pages",
  "views.contextMap.child.workflowStep": "Workflow step — runs when its dependencies complete",
  "views.contextMap.child.processStep": "Process step — a link in the chain (HUMAN or AUTOMATED)",
  "views.contextMap.child.menuGroup": "Menu grouper — holds a submenu, opens nothing",
  "views.contextMap.child.menuItem": "Menu entry — opens a page, app, use case or CRUD",
  "views.contextMap.child.etlStep": "ETL step — source (pull/consumer) → transformation → write",
  "views.contextMap.child.modelField": "Model field — drag its handle to another model's field to map them",
  "views.contextMap.child.component": "Mockup component — a Mateu piece (layout, field, button…)",
  "views.contextMap.child.module": "Module — a distribution unit; drag an element's handle onto it to package it",
  "views.archimate.association": "Association",
  "views.archimate.composition": "Composition",
  "views.archimate.aggregation": "Aggregation",
  "views.archimate.assignment": "Assignment",
  "views.archimate.realization": "Realization",
  "views.archimate.specialization": "Specialization",
  "views.archimate.serving": "Serving",
  "views.archimate.access": "Access",
  "views.archimate.influence": "Influence",
  "views.archimate.triggering": "Triggering",
  "views.archimate.flow": "Flow",
  "views.contextMap.cdcTooltip": "{name} — Change Data Capture: drag one relation from the source and another to the target",
  "views.contextMap.idpTooltip": "{name} — issues the identities the system trusts; drag a context, app or ETL flow onto it",
  "views.contextMap.idpTooltipFederated": "{name} — issues the identities the system trusts (federated); drag a context, app or ETL flow onto it",
  "views.contextMap.etlTooltip": "{name} — integrator: sources (pull/consumer) → transformation → writes (API/DB/event)",
  "views.contextMap.workflowTooltip": "{name} — workflow",
  "views.contextMap.processTooltip": "{name} — process",
  "views.contextMap.startsOn": " · starts on {event}",
  "views.contextMap.dataModelTooltip": "{name} — data model; drag the handle to another model to map it",
  "views.contextMap.pageBadge": "PAGE",
  "views.contextMap.pageTooltip": "{name} — page",
  "views.contextMap.mockupTooltip": "{name} — mockup of a page; drop palette components onto it",
  "views.contextMap.mockupTooltipLoose": "{name} — mockup (drag its handle to a page); drop palette components onto it",
  "views.contextMap.proxyTooltip": "{name} — proxy/cache of an API, consumable just like it",
  "views.contextMap.apiTooltip": "{name} — published API (its operations point to whoever implements them)",
  "views.contextMap.projectBadge": "PROJECT",
  "views.contextMap.projectTooltip": "{name} — another modux project, {where}",
  "views.contextMap.externalSystemTooltip": "{name} (external system)",
  "views.contextMap.systemBadge": "SYSTEM",
  "views.contextMap.systemTooltip": "{name} — system; groups bounded contexts",
  "views.contextMap.singleModuleTooltip": "{name} — a single module (the main one): the service deploys it whole. Add a module from the palette to split its elements",
  "views.contextMap.contextTooltip": "{name} — subdomain {subdomain}",
  "views.contextMap.looseBadge": "unassigned",
  "views.contextMap.looseTooltip": "{name} — unassigned {noun}; drag a composition from its container",
  "views.contextMap.loose.useCase": "use case",
  "views.contextMap.loose.operation": "operation",
  "views.contextMap.loose.invariant": "invariant",
  "views.contextMap.loose.field": "field",
  "views.contextMap.loose.step": "step",
  "views.contextMap.loose.readModel": "read model",
  "views.contextMap.loose.table": "table",
  "views.contextMap.loose.integrationEvent": "integration event",
  "views.contextMap.loose.element": "element",
  "views.contextMap.externalAiAgentBadge": "EXT. AI AGENT",
  "views.contextMap.externalAiAgentTooltip": "{name} (external AI agent — comes in through an MCP gateway)",
  "views.contextMap.aiAgentTooltip": "{name} (AI agent — consumes via MCP)",
  "views.contextMap.mcpGatewayBadge": "MCP GATEWAY",
  "views.contextMap.mcpGatewayTooltip": "{name} — aggregates MCPs and exposes APIs, operations, use cases and RAGs as MCP",
  "views.contextMap.ragTooltip": "{name} (knowledge base — retrieval for agents)",
  "views.contextMap.serviceBadge": "SERVICE",
  "views.contextMap.serviceTooltip": "{name} — deployable: drag its handle to a module to deploy it here",
  "views.contextMap.urlTooltip": "{name} — draw a line from a service to serve it here",
  "views.contextMap.databaseTooltip": "Database {db} — used by the services that declare database={db}",
  "views.contextMap.brokerLabel": "Event broker",
  "views.contextMap.brokerTooltip": "Broker (Kafka/…) — fed by the services with an outbox",
  "views.contextMap.workflowEngineTooltip": "Workflow engine — runs the model's workflows",
  "views.contextMap.formsEngineTooltip": "Forms engine (Mateu) — serves the declared pages",
  "views.contextMap.relationInferred": "≈ {type} INFERRED from the dependencies — double-click to declare it (or correct it)",
  "views.contextMap.relationDerived": "Derived relation — double-click to pick the pattern",
  "views.contextMap.looseUiTooltip": "{name} — loose human interface; draw it to a context to declare who exposes it",
  "views.contextMap.rolledUpEdge": "{tooltip} — from an element folded inside",
  "views.contextMap.firesOn": "fires on {cron}",
  "views.contextMap.edge.deployedIn": "deployed in {name} — Del disconnects it",
  "views.contextMap.edge.answersAtUrl": "{name} answers at this URL — Del disconnects it",
  "views.contextMap.edge.persistsIn": "{name} persists in {db}",
  "views.contextMap.edge.publishesViaOutbox": "{name} publishes events through the outbox",
  "views.contextMap.edge.projectionState": "Projection {name}: the aggregate's state materializes into {readModel}",
  "views.contextMap.edge.projectionPolling": "Projection {name}: polling into {readModel}",
  "views.contextMap.edge.readsFrom": "{name} reads from {target}",
  "views.contextMap.edge.implementedBy": "{name} is implemented by {target}",
  "views.contextMap.edge.validatesTokens": "{name} validates the tokens issued by this IdP — Del untrusts it",
  "views.contextMap.edge.runsWithServiceIdentity": "{name} runs with a service identity from this IdP",
  "views.contextMap.edge.notificationTrigger": "{name}: this event fires it — Del unlinks it",
  "views.contextMap.edge.notifiesRole": "{name} notifies this role — Del removes it",
  "views.contextMap.edge.queryFeedsReport": "{name}: this query feeds the report — Del unlinks it",
  "views.contextMap.edge.readsHerePull": "{name} reads from here (pull)",
  "views.contextMap.edge.readsHereConsumer": "{name} reads from here (consumer)",
  "views.contextMap.edge.indexesTable": "{name} indexes this table",
  "views.contextMap.edge.indexesApi": "{name} indexes the content of this API",
  "views.contextMap.edge.indexesContent": "{name} indexes its content",
  "views.contextMap.edge.follows": "{name} follows {previous}",
  "views.contextMap.edge.mappingRules": "{name} — the field-to-field rules are the thin lines between fields",
  "views.contextMap.edge.mappingRule": "Rule of {name}",
  "views.contextMap.edge.indexesReadModel": "{name} indexes this read model",
  "views.contextMap.edge.archimateHint": " — double-click retypes it or flips its direction · Del deletes it",
  "views.contextMap.edge.sketch": "Proposal (unbacked sketch)",
  "views.contextMap.edge.sketchHint": " — it will be confirmed when some fact below realizes it",
  "views.contextMap.edge.invokes": "invokes",
  "views.contextMap.edge.operatesOnAggregate": "operates on the aggregate",
  "views.contextMap.edge.queries": "queries",
  "views.contextMap.edge.usesDerivesUi": "uses (derives a UI)",
  "views.contextMap.edge.dependsOn": "depends on",
  "views.contextMap.edge.cqrs": "CQRS — queries over its data",
  "views.contextMap.edge.orchestrates": "orchestrates",
  "views.contextMap.edge.triggersWorkflow": "triggers the workflow",
  "views.contextMap.edge.triggers": "triggers",
  "views.contextMap.edge.notifies": "notifies",
  "views.contextMap.edge.feeds": "feeds",
  "views.contextMap.edge.validatesTokensOf": "validates tokens of",
  "views.contextMap.edge.serviceIdentity": "service identity",
  "views.contextMap.edge.publishes": "publishes",
  "views.contextMap.edge.federatedIdp": "Federated IdP: this external system publishes it — Del makes it our own",
  "views.contextMap.edge.consumesWholeApi": "consumes the whole API as a tool",
  "views.contextMap.edge.completionTriggersWorkflow": "its final event triggers this workflow",
  "views.contextMap.edge.pageMockup": "the mockup of this page",
  "views.contextMap.edge.opensPage": "the page it opens",
  "views.contextMap.edge.opensApp": "opens this app",
  "views.contextMap.edge.launchesUseCase": "launches this use case",
  "views.contextMap.edge.crudOverAggregate": "CRUD over this aggregate",
  "views.contextMap.edge.queryListing": "listing of this query",
  "views.contextMap.edge.proxyOf": "proxy/cache of",
  "views.contextMap.edge.proxyRoutes": "the proxy routes to this implementation (a derived route, not a relation)",
  "views.contextMap.edge.routesOperationTo": "routes this operation to",
  "views.contextMap.edge.callsOperation": "calls this operation",
  "views.contextMap.edge.implementedHereBy": "implemented here by",
  "views.contextMap.edge.consumesViaMcpExposed": "consumes via MCP (exposedAsMcp)",
  "views.contextMap.edge.queriesKnowledgeBase": "queries the knowledge base (retrieval)",
  "views.contextMap.edge.callsExternalOperation": "calls the external system's operation",
  "views.contextMap.edge.consumesMcpServerTools": "consumes the MCP server's tools",
  "views.contextMap.edge.aggregatesAsMcpTool": "aggregates/exposes it as an MCP tool",
  "views.contextMap.edge.consumesMcpGatewayTools": "consumes the MCP gateway's tool surface",
  "views.contextMap.edge.callsApiOperationAsTool": "calls the API operation as a tool",
  "views.contextMap.edge.queriesQueryService": "queries the query service (a read tool)",
  "views.contextMap.edge.delegatesToAgent": "delegates work to the other agent",
  "views.contextMap.edge.talksToAgent": "talks to the agent (derives a chat/supervision UI)",
  "views.contextMap.edge.eventTriggersAgent": "the event triggers an agent run (reactive agent)",
  "views.contextMap.edge.callsViaAcl": "calls (comes in through an ACL)",
  "views.contextMap.edge.callsDerivesGateway": "calls (will derive a gateway/API)"
}, bn = {
  // Placeholders drawn where the model is still incomplete
  "views.placeholder.condition": "¿condición?",
  "views.placeholder.collection": "¿colección?",
  "views.placeholder.type": "¿tipo?",
  // Aggregates view
  "views.aggregates.aggregateTooltip": "Agregado {name}",
  "views.aggregates.aggregateTooltipContext": " — contexto {context} ({subdomain})",
  "views.aggregates.aggregateTooltipContents": " · {entities} entidad(es), {valueObjects} value object(s)",
  "views.aggregates.entityTooltip": "Entidad {name} (dentro del agregado)",
  "views.aggregates.valueObjectInAggregate": "Value object dentro del agregado",
  "views.aggregates.ownerAggregate": "agregado",
  "views.aggregates.ownerValueObject": "value object",
  "views.aggregates.ownerEntity": "entidad",
  "views.aggregates.invariantBadge": "INVARIANTE",
  "views.aggregates.invariantTooltip": "{name} — regla que el {owner} protege; doble click abre su ficha (las condiciones se detallan allí)",
  "views.aggregates.protectsEdge": "Protege esta regla — Supr la retira",
  "views.aggregates.entityInAggregate": "Entidad dentro del agregado",
  "views.aggregates.referenceLabelled": "Referencia: {label}",
  "views.aggregates.reference": "Referencia entre agregados",
  "views.aggregates.defaultPrimitive": "texto",
  "views.aggregates.fieldBadge": "CAMPO",
  "views.aggregates.fieldTooltip": "Campo {name}",
  "views.aggregates.fieldRequired": " (obligatorio)",
  "views.aggregates.fieldCollection": " (colección)",
  "views.aggregates.fieldEdge": "Campo de este elemento",
  "views.aggregates.operationTooltip": "Operación {name}",
  "views.aggregates.operationEdge": "Operación del agregado",
  // Flows view
  "views.flows.triggerEvent": "Evento: {event}",
  // Integrations (ETL) view
  "views.integrations.flowTooltip": "{name} — integrador: fuentes → transformación → escrituras; la paleta añade transformaciones",
  "views.integrations.flowTooltipOwned": "{name} — integrador de {context}: fuentes → transformación → escrituras; la paleta añade transformaciones",
  "views.integrations.dbBadge": "BD",
  "views.integrations.eventBadge": "EVENTO",
  "views.integrations.stepAppliesMapping": " · aplica un mapeado",
  "views.integrations.stepRemove": " — Supr lo quita del integrador",
  "views.integrations.pipeEdge": "el dato fluye por el pipeline",
  "views.integrations.externalSystemTooltip": "{name} — sistema externo: sus tablas legacy alimentan (o reciben) integradores",
  "views.integrations.tableTooltip": "{name} — tabla legacy de {system}",
  "views.integrations.apiTooltip": "{name} — API que un integrador consume o llama",
  "views.integrations.eventTooltip": "evento que un integrador consume o publica",
  "views.integrations.dbEdge": "bd",
  "views.integrations.eventEdge": "evento",
  "views.integrations.readsHere": "{name} lee de aquí — Supr quita el paso",
  "views.integrations.writesHere": "{name} escribe aquí — Supr quita el paso",
  // Mappings view
  "views.mappings.modelTooltip": "{name} — arrastra el asa hasta otro modelo para crear un mapeado; la paleta añade campos",
  "views.mappings.fieldTooltip": " — arrastra su asa hasta un campo de otro modelo para mapearlos, o hasta otro modelo para moverlo; Supr lo elimina",
  "views.mappings.transformationTooltip": "{name} — transformación: arrastra modelos o campos hasta ella (entradas) y su asa hasta un modelo o campo (salida)",
  "views.mappings.transformationNoOutput": " · aún sin salida",
  "views.mappings.customCodeTooltip": "{name} — código a mano: arrastra su asa hasta una transformación, o hasta un modelo mapeado, para delegar en él",
  "views.mappings.transformationDelegates": "{name} delega en código a mano — Supr lo desconecta",
  "views.mappings.mappingDelegates": "El mapeado {name} delega en código a mano — Supr lo desconecta",
  "views.mappings.inputEdge": "entrada de {name} — Supr la desconecta",
  "views.mappings.outputEdge": "salida de {name} — Supr la desconecta",
  "views.mappings.mappingTooltip": "{name} — las reglas campo a campo son las líneas finas entre campos; Supr lo elimina",
  "views.mappings.ruleTooltip": "Regla de {name} — Supr la elimina",
  "views.mappings.gapLabel": "falta mapear",
  "views.mappings.gapTooltip": "«{button}» (página {page}) llama a {useCase}: falta mapear {source} → {target} — traza la línea para crearlo",
  // Processes view
  "views.processes.tooltipContext": " — contexto {context}",
  "views.processes.tooltipTrigger": " · arranca con {event}",
  "views.processes.compensationBadge": "COMPENSACIÓN",
  "views.processes.completionBadge": "EVENTO FINAL",
  // Workflows view
  "views.workflows.startsOn": " — arranca con {event}",
  "views.workflows.emitsOnCompletion": " · emite {event} al completar",
  "views.workflows.noUseCase": "sin use case",
  "views.workflows.joinStepTooltip": "{name} — espera a TODAS sus dependencias antes de seguir",
  "views.workflows.splitStepTooltip": "{name} — abre ramas paralelas: los pasos que dependan de él arrancan a la vez",
  "views.workflows.humanTask": " · tarea HUMANA de {role}",
  "views.workflows.humanTaskWithDeadline": " · tarea HUMANA de {role} (plazo {deadline})",
  "views.workflows.stepEmits": " · emite {event}",
  "views.workflows.stepLaunches": " · lanza {useCase}",
  "views.workflows.stepAwaits": " · espera {event}",
  "views.workflows.stepCompensable": " · ⎌ compensable",
  "views.workflows.dependencyTooltip": "{name} espera a {dependency}",
  "views.workflows.gatewayExclusive": "EXCLUSIVO",
  "views.workflows.gatewayParallel": "PARALELO",
  "views.workflows.gatewayAny": "CUALQUIERA",
  "views.workflows.gatewayAll": "TODAS",
  "views.workflows.splitExclusiveTooltip": "{name} — split exclusivo: elige UNA rama; doble click cambia la semántica",
  "views.workflows.splitParallelTooltip": "{name} — split paralelo: abre TODAS las ramas; doble click cambia la semántica",
  "views.workflows.joinAnyTooltip": "{name} — join que arranca con CUALQUIER entrada; doble click cambia la semántica",
  "views.workflows.joinAllTooltip": "{name} — join que espera a TODAS sus entradas; doble click cambia la semántica",
  "views.workflows.flowsToGateway": "fluye al gateway — Supr lo desconecta",
  "views.workflows.branchIf": "Rama si: {condition} — doble click la edita; Supr desconecta",
  "views.workflows.branchNoCondition": "Rama sin condición aún — doble click la edita; Supr desconecta",
  "views.workflows.gatewayFlowsHere": "el gateway fluye aquí — Supr lo desconecta",
  "views.workflows.roleBadge": "ROL",
  "views.workflows.roleTooltip": "{name} — su lista de tareas recibe los pasos humanos conectados",
  "views.workflows.roleEdge": "la tarea cae en la lista de este rol — Supr la vuelve automática",
  "views.workflows.formBadge": "FORMULARIO",
  "views.workflows.formTooltip": "{name} — el forms engine la presenta como formulario de la tarea",
  "views.workflows.formEdge": "la tarea humana se presenta con esta página — Supr lo desconecta",
  "views.workflows.handoffEdge": "el paso entrega a OTRO workflow — Supr lo desconecta",
  "views.workflows.rolledUpEdge": "{tooltip} — de un paso plegado dentro",
  // Event storming view
  "views.eventstorming.commandBadge": "COMANDO",
  "views.eventstorming.policyTooltip": "{name} — policy de {context} (reacción, no caso de negocio)",
  "views.eventstorming.useCaseTooltip": "{name} — caso de uso de {context}",
  "views.eventstorming.stepFallback": "paso",
  "views.eventstorming.stepTooltip": "Paso de {name}",
  "views.eventstorming.stepDelegates": " — delega en código a mano",
  "views.eventstorming.stepDragHint": " — arrastra su asa hasta un CODE para delegar en él",
  "views.eventstorming.pipelineEdge": "pipeline de {name}",
  "views.eventstorming.customCodeTooltip": "{name} — código a mano: los pasos Custom delegan en él",
  "views.eventstorming.foldedStepDelegates": "Un paso plegado de {name} delega en este código — expande el comando para verlo",
  "views.eventstorming.stepDelegatesEdge": "El paso delega en código a mano — Supr lo desconecta",
  "views.eventstorming.aggregateBadge": "AGREGADO",
  "views.eventstorming.aggregateTooltip": "{name} — agregado de {context}",
  "views.eventstorming.applicationEventBadge": "EVENTO APLICACIÓN",
  "views.eventstorming.eventBadge": "EVENTO",
  "views.eventstorming.eventTooltip": "{name} — evento de {context}",
  "views.eventstorming.undeclaredEventBadge": "EVENTO (sin declarar)",
  "views.eventstorming.undeclaredEventTooltip": "{name} — referenciado por nombre, sin evento declarado en el catálogo",
  "views.eventstorming.aiAgentBadge": "AGENTE IA",
  "views.eventstorming.aiAgentTooltip": "{name} — agente de IA (consume por MCP)",
  "views.eventstorming.consumesViaMcp": "consume por MCP",
  "views.eventstorming.callsExternal": "Llama a {name} del sistema externo",
  "views.eventstorming.consumesMcpTools": "Consume las herramientas del servidor MCP {name}",
  "views.eventstorming.ragTooltip": "{name} — base de conocimiento (retrieval)",
  "views.eventstorming.ragQuery": "consulta (retrieval)",
  "views.eventstorming.feedsIndex": "alimenta el índice",
  "views.eventstorming.externalBadge": "EXTERNO",
  "views.eventstorming.emits": "emite",
  "views.eventstorming.reactsTo": " — reacciona a {event}",
  "views.eventstorming.consumerGroup": " · grupo {group}",
  "views.eventstorming.projectionBadge": "PROYECCIÓN",
  "views.eventstorming.materializes": " — materializa {readModel}",
  "views.eventstorming.projectsState": "proyecta su estado",
  "views.eventstorming.pollingOf": "polling de {name}",
  "views.eventstorming.polling": "polling",
  "views.eventstorming.contextBadge": "CONTEXTO",
  "views.eventstorming.processBadge": "PROCESO",
  "views.eventstorming.emitsOnCompletion": "emite al completar",
  // UI view
  "views.ui.orchestratorBadge": "ORQUESTADOR",
  "views.ui.masterDetailBadge": "MAESTRO·DETALLE",
  "views.ui.viewEditorBadge": "VISTA·EDITOR",
  "views.ui.headerHandle": "Cabecera: arrastra hasta la página que hace de cabecera",
  "views.ui.viewHandle": "Vista: arrastra hasta la página de detalle (solo lectura)",
  "views.ui.editHandle": "Edición: arrastra hasta la página de edición",
  "views.ui.homeHandle": "Home: arrastra hasta la página (o la app) con la que abre",
  "views.ui.orchestratorTooltip": "{name} — orquesta y mantiene estado; solo enseña páginas hijas",
  "views.ui.masterDetailTooltip": "{name} — cabecera + pestañas (ambas son páginas)",
  "views.ui.appTooltip": "App: {name}",
  "views.ui.stateEdge": "estado",
  "views.ui.stateEdgeTooltip": "el viewmodel de la app: el estado que mantiene y comparte con sus páginas",
  "views.ui.viewEdge": "vista",
  "views.ui.viewEdgeTooltip": "el detalle solo lectura",
  "views.ui.editEdge": "edición",
  "views.ui.editEdgeTooltip": "la vista de edición",
  "views.ui.homeAppTooltip": "la app con la que abre (assignment)",
  "views.ui.homePageTooltip": "la página con la que abre la app (assignment)",
  "views.ui.headerEdge": "cabecera",
  "views.ui.headerEdgeTooltip": "la página que hace de cabecera; las demás son pestañas",
  "views.ui.menuGroupTooltip": "Agrupador (con submenú): no puede abrir nada",
  "views.ui.menuOpensPage": "Abre {target}",
  "views.ui.menuOpensApp": "Abre la app {target}",
  "views.ui.menuLaunches": "Lanza {target}",
  "views.ui.menuCrud": "CRUD inferido sobre {target}",
  "views.ui.menuListing": "Listado con filtros de {target}",
  "views.ui.menuNoTarget": "Entrada de menú sin destino",
  "views.ui.menuPageEdge": "la página que abre la opción (assignment)",
  "views.ui.viewmodelHandle": "Viewmodel: arrastra hasta el modelo de datos de la página",
  "views.ui.crudDetailHandle": "Detalle: arrastra hasta la página o app que abre una fila",
  "views.ui.crudCreateHandle": "Alta: arrastra hasta la página o app del nuevo registro",
  "views.ui.wizardStepFallback": "Paso",
  "views.ui.wizardStepTooltip": "Paso {n}: {page} — arrastra el asa hasta otra página para re-mapearlo",
  "views.ui.wizardStepUnmapped": "Paso {n}, sin página — arrastra el asa hasta la página que lo implementa",
  "views.ui.crudDetailEdge": "detalle",
  "views.ui.crudCreateEdge": "nuevo",
  "views.ui.crudDetailEdgeTooltip": "lo que abre una fila del CRUD",
  "views.ui.crudCreateEdgeTooltip": "el formulario de nuevo registro",
  "views.ui.wizardStepEdge": "la página que implementa el paso {n} — Supr desmapea",
  "views.ui.buttonMapping": "Botón «{label}» — mapping {mapping}",
  "views.ui.buttonNoMapping": "Botón «{label}» — el viewmodel viaja tal cual (sin mapping)",
  "views.ui.listingEdge": "listado",
  "views.ui.buttonGroupBadge": "BOTONES",
  "views.ui.toolbarHandle": "Toolbar: arrastra hasta una página para engancharlo arriba",
  "views.ui.bottomBarHandle": "Botonera: arrastra hasta una página para engancharlo abajo",
  "views.ui.buttonGroupTooltip": "{name} — grupo de botones: la paleta añade botones dentro; sus asas lo enganchan al toolbar o la botonera de una página",
  "views.ui.groupButtonTooltip": "{name} — arrastra su asa hasta un caso de uso o policy para fijar qué dispara; Supr lo quita del grupo",
  "views.ui.subgroupTooltip": "Subgrupo {name} — Supr lo desanida (el grupo sigue existiendo)",
  "views.ui.groupButtonEdge": "«{name}» dispara este caso de uso — Supr lo desconecta",
  "views.ui.toolbarEdge": "toolbar",
  "views.ui.bottomBarEdge": "botonera",
  "views.ui.toolbarGroupEdge": "Grupo enganchado a la toolbar de {page} — Supr lo desengancha",
  "views.ui.bottomBarGroupEdge": "Grupo enganchado a la botonera de {page} — Supr lo desengancha",
  "views.ui.idpTooltip": "{name} — arrastra una app hasta él: sus usuarios autenticarán aquí",
  "views.ui.authenticatesWith": "autentica con",
  "views.ui.authEdgeTooltip": "los usuarios de esta app se autentican contra este IdP — Supr lo desconecta",
  "views.ui.customCodeTooltip": "{name} — código a mano: arrastra una página hasta él para hacerla custom, y su asa hasta cualquier elemento que use",
  "views.ui.customPageEdge": "La página {name} es CUSTOM: delega en este código — Supr lo desconecta",
  "views.ui.customCodeUses": "{name} usa este elemento — Supr lo desconecta",
  "views.ui.uiTooltip": "{name} — interfaz declarada: traza una línea hasta la app o la página asignada",
  "views.ui.uiAssignmentEdge": "asignada a la UI (assignment) — Supr la desconecta",
  "views.ui.uiServingEdge": "la UI sirve a este actor (serving) — Supr la desconecta",
  // Context map
  "views.contextMap.livesAt": "en {where}",
  "views.contextMap.livesNowhere": "sin coordenada: no dice dónde está",
  "views.contextMap.childTooltip": "{kind} {name} — parte de {owner}",
  "views.contextMap.containsEdge": "{owner} contiene {name}",
  "views.contextMap.component.button": "BOTÓN",
  "views.contextMap.component.tab": "PESTAÑA",
  "views.contextMap.component.tabs": "PESTAÑAS",
  "views.contextMap.component.listing": "LISTADO",
  "views.contextMap.component.text": "TEXTO",
  "views.contextMap.child.aggregate": "Agregado",
  "views.contextMap.child.entity": "Entidad — dentro del agregado",
  "views.contextMap.child.valueObject": "Value object — dentro del agregado",
  "views.contextMap.child.field": "Campo — nombre, obligatoriedad y tipo",
  "views.contextMap.child.invariant": "Invariante — una regla que este elemento protege",
  "views.contextMap.child.operation": "Operación — modelo de entrada → modelo de salida",
  "views.contextMap.child.useCase": "Caso de uso",
  "views.contextMap.child.domainEvent": "Evento de dominio",
  "views.contextMap.child.applicationEvent": "Evento de aplicación",
  "views.contextMap.child.integrationEvent": "Evento de integración",
  "views.contextMap.child.readModel": "Read model",
  "views.contextMap.child.domainService": "Servicio de dominio",
  "views.contextMap.child.queryService": "Query service",
  "views.contextMap.child.externalUseCase": "Caso de uso externo",
  "views.contextMap.child.externalSystem": "Subsistema",
  "views.contextMap.child.system": "Sistema — agrupa bounded contexts",
  "views.contextMap.child.boundedContext": "Bounded context — dentro del sistema",
  "views.contextMap.child.externalTable": "Tabla (legacy)",
  "views.contextMap.child.mcpServer": "Servidor MCP",
  "views.contextMap.child.apiOperation": "Operación de API",
  "views.contextMap.child.apiOpOccurrence": "Operación de la API, en este sitio",
  "views.contextMap.child.api": "API publicada por este sistema",
  "views.contextMap.child.apiImpl": "La misma API, implementada también en este contexto",
  "views.contextMap.child.proxyApi": "Proxy/cache de una API, alojado en este sistema",
  "views.contextMap.child.scheduledTrigger": "Trigger programado (cron) — dispara un caso de uso",
  "views.contextMap.child.etlFlow": "Integrador ETL — fuentes (pull/consumidor) → transformación → escrituras",
  "views.contextMap.child.notification": "Notificación — un evento la dispara y avisa a unos roles por un canal",
  "views.contextMap.child.document": "Documento/informe — plantilla rellenada por un modelo, o dataset de una consulta",
  "views.contextMap.child.uiApp": "App — la UI de este bounded context (sus páginas se detallan en la vista UI)",
  "views.contextMap.child.ui": "UI — la interfaz humana que expone el contexto (como la API es la programática); se asigna a apps y páginas",
  "views.contextMap.child.workflowStep": "Paso de workflow — corre cuando sus dependencias completan",
  "views.contextMap.child.processStep": "Paso de proceso — eslabón de la cadena (HUMAN o AUTOMÁTICO)",
  "views.contextMap.child.menuGroup": "Agrupador de menú — contiene un submenú, no abre nada",
  "views.contextMap.child.menuItem": "Entrada de menú — abre una página, app, caso de uso o CRUD",
  "views.contextMap.child.etlStep": "Paso ETL — fuente (pull/consumer) → transformación → escritura",
  "views.contextMap.child.modelField": "Campo de modelo — arrastra su asa hasta el campo de otro modelo para mapearlos",
  "views.contextMap.child.component": "Componente del mockup — una pieza Mateu (layout, campo, botón…)",
  "views.contextMap.child.module": "Módulo — unidad de distribución; arrastra el asa de un elemento hasta él para empaquetarlo",
  "views.archimate.association": "Asociación",
  "views.archimate.composition": "Composición",
  "views.archimate.aggregation": "Agregación",
  "views.archimate.assignment": "Asignación",
  "views.archimate.realization": "Realización",
  "views.archimate.specialization": "Especialización",
  "views.archimate.serving": "Servicio (serving)",
  "views.archimate.access": "Acceso",
  "views.archimate.influence": "Influencia",
  "views.archimate.triggering": "Disparo (triggering)",
  "views.archimate.flow": "Flujo",
  "views.contextMap.cdcTooltip": "{name} — Change Data Capture: arrastra una relación desde la fuente y otra hacia el destino",
  "views.contextMap.idpTooltip": "{name} — emite las identidades que el sistema confía; arrastra un contexto, app o flujo ETL hasta él",
  "views.contextMap.idpTooltipFederated": "{name} — emite las identidades que el sistema confía (federado); arrastra un contexto, app o flujo ETL hasta él",
  "views.contextMap.etlTooltip": "{name} — integrador: fuentes (pull/consumidor) → transformación → escrituras (API/BD/evento)",
  "views.contextMap.workflowTooltip": "{name} — workflow",
  "views.contextMap.processTooltip": "{name} — proceso",
  "views.contextMap.startsOn": " · arranca con {event}",
  "views.contextMap.dataModelTooltip": "{name} — modelo de datos; arrastra el asa hasta otro modelo para mapearlo",
  "views.contextMap.pageBadge": "PÁGINA",
  "views.contextMap.pageTooltip": "{name} — página",
  "views.contextMap.mockupTooltip": "{name} — mockup de una página; suéltale componentes de la paleta",
  "views.contextMap.mockupTooltipLoose": "{name} — mockup (arrastra su asa hasta una página); suéltale componentes de la paleta",
  "views.contextMap.proxyTooltip": "{name} — proxy/cache de una API, consumible como ella",
  "views.contextMap.apiTooltip": "{name} — API publicada (sus operaciones apuntan a quien las implementa)",
  "views.contextMap.projectBadge": "PROYECTO",
  "views.contextMap.projectTooltip": "{name} — otro proyecto modux, {where}",
  "views.contextMap.externalSystemTooltip": "{name} (sistema externo)",
  "views.contextMap.systemBadge": "SISTEMA",
  "views.contextMap.systemTooltip": "{name} — sistema; agrupa bounded contexts",
  "views.contextMap.singleModuleTooltip": "{name} — un solo módulo (el principal): el servicio lo despliega entero. Añade un módulo desde la paleta para repartir sus elementos",
  "views.contextMap.contextTooltip": "{name} — subdominio {subdomain}",
  "views.contextMap.looseBadge": "sin asociar",
  "views.contextMap.looseTooltip": "{name} — {noun} sin asociar; arrastra una composición desde su contenedor",
  "views.contextMap.loose.useCase": "caso de uso",
  "views.contextMap.loose.operation": "operación",
  "views.contextMap.loose.invariant": "invariante",
  "views.contextMap.loose.field": "campo",
  "views.contextMap.loose.step": "paso",
  "views.contextMap.loose.readModel": "read model",
  "views.contextMap.loose.table": "tabla",
  "views.contextMap.loose.integrationEvent": "evento de integración",
  "views.contextMap.loose.element": "elemento",
  "views.contextMap.externalAiAgentBadge": "AGENTE IA EXT.",
  "views.contextMap.externalAiAgentTooltip": "{name} (agente de IA externo — entra por un gateway MCP)",
  "views.contextMap.aiAgentTooltip": "{name} (agente de IA — consume por MCP)",
  "views.contextMap.mcpGatewayBadge": "GATEWAY MCP",
  "views.contextMap.mcpGatewayTooltip": "{name} — agrega MCPs y expone APIs, operaciones, casos de uso y RAGs como MCP",
  "views.contextMap.ragTooltip": "{name} (base de conocimiento — retrieval para agentes)",
  "views.contextMap.serviceBadge": "SERVICIO",
  "views.contextMap.serviceTooltip": "{name} — deployable: arrastra su asa hasta un módulo para desplegarlo aquí",
  "views.contextMap.urlTooltip": "{name} — traza una línea desde un servicio para servirla aquí",
  "views.contextMap.databaseTooltip": "Base de datos {db} — la usan los servicios que declaran database={db}",
  "views.contextMap.brokerLabel": "Broker de eventos",
  "views.contextMap.brokerTooltip": "Broker (Kafka/…) — lo alimentan los servicios con outbox",
  "views.contextMap.workflowEngineTooltip": "Motor de workflows — ejecuta los workflows del modelo",
  "views.contextMap.formsEngineTooltip": "Motor de formularios (Mateu) — sirve las páginas declaradas",
  "views.contextMap.relationInferred": "≈ {type} INFERIDO de las dependencias — doble click para declararlo (o corregirlo)",
  "views.contextMap.relationDerived": "Relación derivada — doble click para elegir el patrón",
  "views.contextMap.looseUiTooltip": "{name} — interfaz humana suelta; trázala a un contexto para declarar quién la expone",
  "views.contextMap.rolledUpEdge": "{tooltip} — de un elemento plegado dentro",
  "views.contextMap.firesOn": "dispara según {cron}",
  "views.contextMap.edge.deployedIn": "desplegado en {name} — Supr lo desconecta",
  "views.contextMap.edge.answersAtUrl": "{name} responde en esta URL — Supr lo desconecta",
  "views.contextMap.edge.persistsIn": "{name} persiste en {db}",
  "views.contextMap.edge.publishesViaOutbox": "{name} publica eventos por el outbox",
  "views.contextMap.edge.projectionState": "Proyección {name}: el estado del agregado se materializa en {readModel}",
  "views.contextMap.edge.projectionPolling": "Proyección {name}: polling hacia {readModel}",
  "views.contextMap.edge.readsFrom": "{name} lee de {target}",
  "views.contextMap.edge.implementedBy": "{name} la implementa {target}",
  "views.contextMap.edge.validatesTokens": "{name} valida los tokens emitidos por este IdP — Supr lo desconfía",
  "views.contextMap.edge.runsWithServiceIdentity": "{name} corre con una identidad de servicio de este IdP",
  "views.contextMap.edge.notificationTrigger": "{name}: este evento la dispara — Supr lo desapunta",
  "views.contextMap.edge.notifiesRole": "{name} avisa a este rol — Supr lo quita",
  "views.contextMap.edge.queryFeedsReport": "{name}: esta consulta alimenta el informe — Supr lo desapunta",
  "views.contextMap.edge.readsHerePull": "{name} lee de aquí (pull)",
  "views.contextMap.edge.readsHereConsumer": "{name} lee de aquí (consumidor)",
  "views.contextMap.edge.indexesTable": "{name} indexa esta tabla",
  "views.contextMap.edge.indexesApi": "{name} indexa el contenido de esta API",
  "views.contextMap.edge.indexesContent": "{name} indexa su contenido",
  "views.contextMap.edge.follows": "{name} sigue a {previous}",
  "views.contextMap.edge.mappingRules": "{name} — las reglas campo a campo son las líneas finas entre campos",
  "views.contextMap.edge.mappingRule": "Regla de {name}",
  "views.contextMap.edge.indexesReadModel": "{name} indexa este read model",
  "views.contextMap.edge.archimateHint": " — doble click retipa o invierte el sentido · Supr la borra",
  "views.contextMap.edge.sketch": "Propuesta (boceto sin respaldo)",
  "views.contextMap.edge.sketchHint": " — se confirmará cuando algún hecho de abajo la realice",
  "views.contextMap.edge.invokes": "invoca",
  "views.contextMap.edge.operatesOnAggregate": "opera sobre el agregado",
  "views.contextMap.edge.queries": "consulta",
  "views.contextMap.edge.usesDerivesUi": "usa (deriva una UI)",
  "views.contextMap.edge.dependsOn": "depende de",
  "views.contextMap.edge.cqrs": "CQRS — consulta sobre sus datos",
  "views.contextMap.edge.orchestrates": "orquesta",
  "views.contextMap.edge.triggersWorkflow": "dispara el workflow",
  "views.contextMap.edge.triggers": "dispara",
  "views.contextMap.edge.notifies": "avisa",
  "views.contextMap.edge.feeds": "alimenta",
  "views.contextMap.edge.validatesTokensOf": "valida tokens de",
  "views.contextMap.edge.serviceIdentity": "identidad de servicio",
  "views.contextMap.edge.publishes": "publica",
  "views.contextMap.edge.federatedIdp": "IdP federado: lo publica este sistema externo — Supr lo vuelve propio",
  "views.contextMap.edge.consumesWholeApi": "consume la API entera como herramienta",
  "views.contextMap.edge.completionTriggersWorkflow": "su evento final dispara este workflow",
  "views.contextMap.edge.pageMockup": "el mockup de esta página",
  "views.contextMap.edge.opensPage": "la página que abre",
  "views.contextMap.edge.opensApp": "abre esta app",
  "views.contextMap.edge.launchesUseCase": "lanza este caso de uso",
  "views.contextMap.edge.crudOverAggregate": "CRUD sobre este agregado",
  "views.contextMap.edge.queryListing": "listado de esta consulta",
  "views.contextMap.edge.proxyOf": "proxy/cache de",
  "views.contextMap.edge.proxyRoutes": "el proxy enruta a esta implementación (ruta derivada, no una relación)",
  "views.contextMap.edge.routesOperationTo": "enruta esta operación a",
  "views.contextMap.edge.callsOperation": "llama a esta operación",
  "views.contextMap.edge.implementedHereBy": "implementada aquí por",
  "views.contextMap.edge.consumesViaMcpExposed": "consume por MCP (exposedAsMcp)",
  "views.contextMap.edge.queriesKnowledgeBase": "consulta la base de conocimiento (retrieval)",
  "views.contextMap.edge.callsExternalOperation": "llama a la operación del sistema externo",
  "views.contextMap.edge.consumesMcpServerTools": "consume las herramientas del servidor MCP",
  "views.contextMap.edge.aggregatesAsMcpTool": "lo agrega/expone como herramienta MCP",
  "views.contextMap.edge.consumesMcpGatewayTools": "consume la superficie de herramientas del gateway MCP",
  "views.contextMap.edge.callsApiOperationAsTool": "llama a la operación de API como herramienta",
  "views.contextMap.edge.queriesQueryService": "consulta el query service (herramienta de lectura)",
  "views.contextMap.edge.delegatesToAgent": "delega trabajo en el otro agente",
  "views.contextMap.edge.talksToAgent": "habla con el agente (deriva una UI de chat/supervisión)",
  "views.contextMap.edge.eventTriggersAgent": "el evento dispara una ejecución del agente (agente reactivo)",
  "views.contextMap.edge.callsViaAcl": "llama (entra por un ACL)",
  "views.contextMap.edge.callsDerivesGateway": "llama (derivará gateway/API)"
}, kn = {
  ...on,
  ...nn,
  ...rn,
  ...cn,
  ...pn,
  ...mn,
  ...gn,
  ...wn,
  ...vn
}, xn = {
  ...an,
  ...sn,
  ...ln,
  ...dn,
  ...un,
  ...hn,
  ...fn,
  ...yn,
  ...bn
}, _t = { en: kn, es: xn }, No = "en";
function lt(o) {
  const e = o == null ? void 0 : o.trim().toLowerCase();
  if (e)
    return e.startsWith("es") ? "es" : "en";
}
let ct;
const dt = /* @__PURE__ */ new Set();
function Vt(o) {
  const e = lt(o);
  if (e === ct) return;
  const t = pt();
  ct = e, pt() !== t && dt.forEach((a) => a());
}
function pt() {
  var o;
  return ct ?? lt(typeof document < "u" ? (o = document.documentElement) == null ? void 0 : o.lang : void 0) ?? lt(typeof navigator < "u" ? navigator.language : void 0) ?? No;
}
function An(o) {
  return dt.add(o), () => dt.delete(o);
}
function Sn(o, e) {
  const t = _t[pt()][o] ?? _t[No][o] ?? o;
  return e ? t.replace(/\{(\w+)\}/g, (a, n) => {
    const i = e[n];
    return i == null ? a : String(i);
  }) : t;
}
class In {
  constructor(e, t = {}) {
    this.host = e, this.options = t, e.addController(this);
  }
  hostConnected() {
    if (this.options.root) {
      const e = this.host.getAttribute("lang");
      e && Vt(e), typeof MutationObserver < "u" && (this.observer = new MutationObserver(() => Vt(this.host.getAttribute("lang"))), this.observer.observe(this.host, { attributes: !0, attributeFilter: ["lang"] }));
    }
    this.off = An(() => this.host.requestUpdate());
  }
  hostDisconnected() {
    var e, t;
    (e = this.off) == null || e.call(this), this.off = void 0, (t = this.observer) == null || t.disconnect(), this.observer = void 0;
  }
}
async function Pn(o, e) {
  const t = await o({ op: "resolveProject", ...e });
  return typeof t == "string" && t ? t : null;
}
function On(o, e) {
  const t = () => {
    throw new Error(Sn("hosts.ideFs.readOnlyReference"));
  };
  return {
    list: async (a) => await o({ op: "list", path: a, root: e }),
    listDirs: async (a) => await o({ op: "listDirs", path: a, root: e }),
    read: async (a) => await o({ op: "read", path: a, root: e }),
    exists: async (a) => await o({ op: "exists", path: a, root: e }),
    write: t,
    delete: t
  };
}
async function Dn(o) {
  return await o({ op: "readView" });
}
async function Nn(o, e) {
  await o({ op: "writeView", content: e });
}
function Ln() {
  const o = globalThis.moduxBridge;
  return typeof o == "function" ? o : null;
}
function Un(o) {
  const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Set(), a = (n) => e.has(n);
  return {
    async list(n) {
      const i = await o({ op: "list", path: n }), s = [...e.keys()].filter((l) => l.startsWith(`${n}/`) && !l.slice(n.length + 1).includes("/")).map((l) => l.slice(n.length + 1)), r = new Set([...t].map((l) => l.slice(l.lastIndexOf("/") + 1)));
      return [.../* @__PURE__ */ new Set([...i, ...s])].filter((l) => !r.has(`${n}/${l}`.slice(n.length + 1)));
    },
    listDirs: async (n) => await o({ op: "listDirs", path: n }),
    async read(n) {
      const i = e.get(n);
      return i !== void 0 ? i : await o({ op: "read", path: n });
    },
    async write(n, i) {
      e.set(n, i), t.delete(n);
    },
    async delete(n) {
      e.delete(n), t.add(n);
    },
    async exists(n) {
      return t.has(n) ? !1 : a(n) ? !0 : await o({ op: "exists", path: n });
    },
    pending() {
      return e.size + t.size;
    },
    async commit() {
      if (!e.size && !t.size) return;
      const n = {
        op: "flush",
        writes: [...e].map(([i, s]) => ({ path: i, content: s })),
        deletes: [...t]
      };
      e.clear(), t.clear(), await o(n);
    }
  };
}
export {
  In as L,
  Et as M,
  pt as a,
  Oe as b,
  Pn as c,
  On as d,
  Cn as e,
  En as f,
  Mn as g,
  Ln as h,
  Un as i,
  Tn as l,
  qe as n,
  _a as p,
  Dn as r,
  Va as s,
  Sn as t,
  Nn as w
};
