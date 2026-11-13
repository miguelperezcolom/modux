const at = Symbol.for("yaml.alias"), tt = Symbol.for("yaml.document"), G = Symbol.for("yaml.map"), Rt = Symbol.for("yaml.pair"), U = Symbol.for("yaml.scalar"), oe = Symbol.for("yaml.seq"), K = Symbol.for("yaml.node.type"), le = (s) => !!s && typeof s == "object" && s[K] === at, ke = (s) => !!s && typeof s == "object" && s[K] === tt, Se = (s) => !!s && typeof s == "object" && s[K] === G, C = (s) => !!s && typeof s == "object" && s[K] === Rt, I = (s) => !!s && typeof s == "object" && s[K] === U, Ne = (s) => !!s && typeof s == "object" && s[K] === oe;
function L(s) {
  if (s && typeof s == "object")
    switch (s[K]) {
      case G:
      case oe:
        return !0;
    }
  return !1;
}
function $(s) {
  if (s && typeof s == "object")
    switch (s[K]) {
      case at:
      case G:
      case U:
      case oe:
        return !0;
    }
  return !1;
}
const Ft = (s) => (I(s) || L(s)) && !!s.anchor, H = Symbol("break visit"), Es = Symbol("skip children"), pe = Symbol("remove node");
function ae(s, e) {
  const t = Is(e);
  ke(s) ? x(null, s.contents, t, Object.freeze([s])) === pe && (s.contents = null) : x(null, s, t, Object.freeze([]));
}
ae.BREAK = H;
ae.SKIP = Es;
ae.REMOVE = pe;
function x(s, e, t, n) {
  const i = Ls(s, e, t, n);
  if ($(i) || C(i))
    return $s(s, n, i), x(s, i, t, n);
  if (typeof i != "symbol") {
    if (L(e)) {
      n = Object.freeze(n.concat(e));
      for (let r = 0; r < e.items.length; ++r) {
        const o = x(r, e.items[r], t, n);
        if (typeof o == "number")
          r = o - 1;
        else {
          if (o === H)
            return H;
          o === pe && (e.items.splice(r, 1), r -= 1);
        }
      }
    } else if (C(e)) {
      n = Object.freeze(n.concat(e));
      const r = x("key", e.key, t, n);
      if (r === H)
        return H;
      r === pe && (e.key = null);
      const o = x("value", e.value, t, n);
      if (o === H)
        return H;
      o === pe && (e.value = null);
    }
  }
  return i;
}
function Is(s) {
  return typeof s == "object" && (s.Collection || s.Node || s.Value) ? Object.assign({
    Alias: s.Node,
    Map: s.Node,
    Scalar: s.Node,
    Seq: s.Node
  }, s.Value && {
    Map: s.Value,
    Scalar: s.Value,
    Seq: s.Value
  }, s.Collection && {
    Map: s.Collection,
    Seq: s.Collection
  }, s) : s;
}
function Ls(s, e, t, n) {
  var i, r, o, l, a;
  if (typeof t == "function")
    return t(s, e, n);
  if (Se(e))
    return (i = t.Map) == null ? void 0 : i.call(t, s, e, n);
  if (Ne(e))
    return (r = t.Seq) == null ? void 0 : r.call(t, s, e, n);
  if (C(e))
    return (o = t.Pair) == null ? void 0 : o.call(t, s, e, n);
  if (I(e))
    return (l = t.Scalar) == null ? void 0 : l.call(t, s, e, n);
  if (le(e))
    return (a = t.Alias) == null ? void 0 : a.call(t, s, e, n);
}
function $s(s, e, t) {
  const n = e[e.length - 1];
  if (L(n))
    n.items[s] = t;
  else if (C(n))
    s === "key" ? n.key = t : n.value = t;
  else if (ke(n))
    n.contents = t;
  else {
    const i = le(n) ? "alias" : "scalar";
    throw new Error(`Cannot replace node with ${i} parent`);
  }
}
const Cs = {
  "!": "%21",
  ",": "%2C",
  "[": "%5B",
  "]": "%5D",
  "{": "%7B",
  "}": "%7D"
}, _s = (s) => s.replace(/[!,[\]{}]/g, (e) => Cs[e]);
class v {
  constructor(e, t) {
    this.docStart = null, this.docEnd = !1, this.yaml = Object.assign({}, v.defaultYaml, e), this.tags = Object.assign({}, v.defaultTags, t);
  }
  clone() {
    const e = new v(this.yaml, this.tags);
    return e.docStart = this.docStart, e;
  }
  /**
   * During parsing, get a Directives instance for the current document and
   * update the stream state according to the current version's spec.
   */
  atDocument() {
    const e = new v(this.yaml, this.tags);
    switch (this.yaml.version) {
      case "1.1":
        this.atNextDocument = !0;
        break;
      case "1.2":
        this.atNextDocument = !1, this.yaml = {
          explicit: v.defaultYaml.explicit,
          version: "1.2"
        }, this.tags = Object.assign({}, v.defaultTags);
        break;
    }
    return e;
  }
  /**
   * @param onError - May be called even if the action was successful
   * @returns `true` on success
   */
  add(e, t) {
    this.atNextDocument && (this.yaml = { explicit: v.defaultYaml.explicit, version: "1.1" }, this.tags = Object.assign({}, v.defaultTags), this.atNextDocument = !1);
    const n = e.trim().split(/[ \t]+/), i = n.shift();
    switch (i) {
      case "%TAG": {
        if (n.length !== 2 && (t(0, "%TAG directive should contain exactly two parts"), n.length < 2))
          return !1;
        const [r, o] = n;
        return this.tags[r] = o, !0;
      }
      case "%YAML": {
        if (this.yaml.explicit = !0, n.length !== 1)
          return t(0, "%YAML directive should contain exactly one part"), !1;
        const [r] = n;
        if (r === "1.1" || r === "1.2")
          return this.yaml.version = r, !0;
        {
          const o = /^\d+\.\d+$/.test(r);
          return t(6, `Unsupported YAML version ${r}`, o), !1;
        }
      }
      default:
        return t(0, `Unknown directive ${i}`, !0), !1;
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
      const o = e.slice(2, -1);
      return o === "!" || o === "!!" ? (t(`Verbatim tags aren't resolved, so ${e} is invalid.`), null) : (e[e.length - 1] !== ">" && t("Verbatim tags must end with a >"), o);
    }
    const [, n, i] = e.match(/^(.*!)([^!]*)$/s);
    i || t(`The ${e} tag has no suffix`);
    const r = this.tags[n];
    if (r)
      try {
        return r + decodeURIComponent(i);
      } catch (o) {
        return t(String(o)), null;
      }
    return n === "!" ? e : (t(`Could not resolve tag: ${e}`), null);
  }
  /**
   * Given a fully resolved tag, returns its printable string form,
   * taking into account current tag prefixes and defaults.
   */
  tagString(e) {
    for (const [t, n] of Object.entries(this.tags))
      if (e.startsWith(n))
        return t + _s(e.substring(n.length));
    return e[0] === "!" ? e : `!<${e}>`;
  }
  toString(e) {
    const t = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [], n = Object.entries(this.tags);
    let i;
    if (e && n.length > 0 && $(e.contents)) {
      const r = {};
      ae(e.contents, (o, l) => {
        $(l) && l.tag && (r[l.tag] = !0);
      }), i = Object.keys(r);
    } else
      i = [];
    for (const [r, o] of n)
      r === "!!" && o === "tag:yaml.org,2002:" || (!e || i.some((l) => l.startsWith(o))) && t.push(`%TAG ${r} ${o}`);
    return t.join(`
`);
  }
}
v.defaultYaml = { explicit: !1, version: "1.2" };
v.defaultTags = { "!!": "tag:yaml.org,2002:" };
function Ut(s) {
  if (/[\x00-\x19\s,[\]{}]/.test(s)) {
    const t = `Anchor must not contain whitespace or control characters: ${JSON.stringify(s)}`;
    throw new Error(t);
  }
  return !0;
}
function qt(s) {
  const e = /* @__PURE__ */ new Set();
  return ae(s, {
    Value(t, n) {
      n.anchor && e.add(n.anchor);
    }
  }), e;
}
function Vt(s, e) {
  for (let t = 1; ; ++t) {
    const n = `${s}${t}`;
    if (!e.has(n))
      return n;
  }
}
function vs(s, e) {
  const t = [], n = /* @__PURE__ */ new Map();
  let i = null;
  return {
    onAnchor: (r) => {
      t.push(r), i ?? (i = qt(s));
      const o = Vt(e, i);
      return i.add(o), o;
    },
    /**
     * With circular references, the source node is only resolved after all
     * of its child nodes are. This is why anchors are set only after all of
     * the nodes have been created.
     */
    setAnchors: () => {
      for (const r of t) {
        const o = n.get(r);
        if (typeof o == "object" && o.anchor && (I(o.node) || L(o.node)))
          o.node.anchor = o.anchor;
        else {
          const l = new Error("Failed to resolve repeated object (this should not happen)");
          throw l.source = r, l;
        }
      }
    },
    sourceObjects: n
  };
}
function ee(s, e, t, n) {
  if (n && typeof n == "object")
    if (Array.isArray(n))
      for (let i = 0, r = n.length; i < r; ++i) {
        const o = n[i], l = ee(s, n, String(i), o);
        l === void 0 ? delete n[i] : l !== o && (n[i] = l);
      }
    else if (n instanceof Map)
      for (const i of Array.from(n.keys())) {
        const r = n.get(i), o = ee(s, n, i, r);
        o === void 0 ? n.delete(i) : o !== r && n.set(i, o);
      }
    else if (n instanceof Set)
      for (const i of Array.from(n)) {
        const r = ee(s, n, i, i);
        r === void 0 ? n.delete(i) : r !== i && (n.delete(i), n.add(r));
      }
    else
      for (const [i, r] of Object.entries(n)) {
        const o = ee(s, n, i, r);
        o === void 0 ? delete n[i] : o !== r && (n[i] = o);
      }
  return s.call(e, t, n);
}
function B(s, e, t) {
  if (Array.isArray(s))
    return s.map((n, i) => B(n, String(i), t));
  if (s && typeof s.toJSON == "function") {
    if (!t || !Ft(s))
      return s.toJSON(e, t);
    const n = { aliasCount: 0, count: 1, res: void 0 };
    t.anchors.set(s, n), t.onCreate = (r) => {
      n.res = r, delete t.onCreate;
    };
    const i = s.toJSON(e, t);
    return t.onCreate && t.onCreate(i), i;
  }
  return typeof s == "bigint" && !(t != null && t.keep) ? Number(s) : s;
}
class ct {
  constructor(e) {
    Object.defineProperty(this, K, { value: e });
  }
  /** Create a copy of this node.  */
  clone() {
    const e = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    return this.range && (e.range = this.range.slice()), e;
  }
  /** A plain JavaScript representation of this node. */
  toJS(e, { mapAsMap: t, maxAliasCount: n, onAnchor: i, reviver: r } = {}) {
    if (!ke(e))
      throw new TypeError("A document argument is required");
    const o = {
      anchors: /* @__PURE__ */ new Map(),
      doc: e,
      keep: !0,
      mapAsMap: t === !0,
      mapKeyWarned: !1,
      maxAliasCount: typeof n == "number" ? n : 100
    }, l = B(this, "", o);
    if (typeof i == "function")
      for (const { count: a, res: c } of o.anchors.values())
        i(c, a);
    return typeof r == "function" ? ee(r, { "": l }, "", l) : l;
  }
}
class ft extends ct {
  constructor(e) {
    super(at), this.source = e, Object.defineProperty(this, "tag", {
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
    let n;
    t != null && t.aliasResolveCache ? n = t.aliasResolveCache : (n = [], ae(e, {
      Node: (r, o) => {
        (le(o) || Ft(o)) && n.push(o);
      }
    }), t && (t.aliasResolveCache = n));
    let i;
    for (const r of n) {
      if (r === this)
        break;
      r.anchor === this.source && (i = r);
    }
    return i;
  }
  toJSON(e, t) {
    if (!t)
      return { source: this.source };
    const { anchors: n, doc: i, maxAliasCount: r } = t, o = this.resolve(i, t);
    if (!o) {
      const a = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
      throw new ReferenceError(a);
    }
    let l = n.get(o);
    if (l || (B(o, null, t), l = n.get(o)), (l == null ? void 0 : l.res) === void 0) {
      const a = "This should not happen: Alias anchor was not resolved?";
      throw new ReferenceError(a);
    }
    if (r >= 0 && (l.count += 1, l.aliasCount === 0 && (l.aliasCount = Me(i, o, n)), l.count * l.aliasCount > r)) {
      const a = "Excessive alias count indicates a resource exhaustion attack";
      throw new ReferenceError(a);
    }
    return l.res;
  }
  toString(e, t, n) {
    const i = `*${this.source}`;
    if (e) {
      if (Ut(this.source), e.options.verifyAliasOrder && !e.anchors.has(this.source)) {
        const r = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new Error(r);
      }
      if (e.implicitKey)
        return `${i} `;
    }
    return i;
  }
}
function Me(s, e, t) {
  if (le(e)) {
    const n = e.resolve(s), i = t && n && t.get(n);
    return i ? i.count * i.aliasCount : 0;
  } else if (L(e)) {
    let n = 0;
    for (const i of e.items) {
      const r = Me(s, i, t);
      r > n && (n = r);
    }
    return n;
  } else if (C(e)) {
    const n = Me(s, e.key, t), i = Me(s, e.value, t);
    return Math.max(n, i);
  }
  return 1;
}
const Jt = (s) => !s || typeof s != "function" && typeof s != "object";
class O extends ct {
  constructor(e) {
    super(U), this.value = e;
  }
  toJSON(e, t) {
    return t != null && t.keep ? this.value : B(this.value, e, t);
  }
  toString() {
    return String(this.value);
  }
}
O.BLOCK_FOLDED = "BLOCK_FOLDED";
O.BLOCK_LITERAL = "BLOCK_LITERAL";
O.PLAIN = "PLAIN";
O.QUOTE_DOUBLE = "QUOTE_DOUBLE";
O.QUOTE_SINGLE = "QUOTE_SINGLE";
const Ms = "tag:yaml.org,2002:";
function Ps(s, e, t) {
  if (e) {
    const n = t.filter((r) => r.tag === e), i = n.find((r) => !r.format) ?? n[0];
    if (!i)
      throw new Error(`Tag ${e} not found`);
    return i;
  }
  return t.find((n) => {
    var i;
    return ((i = n.identify) == null ? void 0 : i.call(n, s)) && !n.format;
  });
}
function ge(s, e, t) {
  var f, d, h;
  if (ke(s) && (s = s.contents), $(s))
    return s;
  if (C(s)) {
    const g = (d = (f = t.schema[G]).createNode) == null ? void 0 : d.call(f, t.schema, null, t);
    return g.items.push(s), g;
  }
  (s instanceof String || s instanceof Number || s instanceof Boolean || typeof BigInt < "u" && s instanceof BigInt) && (s = s.valueOf());
  const { aliasDuplicateObjects: n, onAnchor: i, onTagObj: r, schema: o, sourceObjects: l } = t;
  let a;
  if (n && s && typeof s == "object") {
    if (a = l.get(s), a)
      return a.anchor ?? (a.anchor = i(s)), new ft(a.anchor);
    a = { anchor: null, node: null }, l.set(s, a);
  }
  e != null && e.startsWith("!!") && (e = Ms + e.slice(2));
  let c = Ps(s, e, o.tags);
  if (!c) {
    if (s && typeof s.toJSON == "function" && (s = s.toJSON()), !s || typeof s != "object") {
      const g = new O(s);
      return a && (a.node = g), g;
    }
    c = s instanceof Map ? o[G] : Symbol.iterator in Object(s) ? o[oe] : o[G];
  }
  r && (r(c), delete t.onTagObj);
  const p = c != null && c.createNode ? c.createNode(t.schema, s, t) : typeof ((h = c == null ? void 0 : c.nodeClass) == null ? void 0 : h.from) == "function" ? c.nodeClass.from(t.schema, s, t) : new O(s);
  return e ? p.tag = e : c.default || (p.tag = c.tag), a && (a.node = p), p;
}
function Ke(s, e, t) {
  let n = t;
  for (let i = e.length - 1; i >= 0; --i) {
    const r = e[i];
    if (typeof r == "number" && Number.isInteger(r) && r >= 0) {
      const o = [];
      o[r] = n, n = o;
    } else
      n = /* @__PURE__ */ new Map([[r, n]]);
  }
  return ge(n, void 0, {
    aliasDuplicateObjects: !1,
    keepUndefined: !1,
    onAnchor: () => {
      throw new Error("This should not happen, please report a bug.");
    },
    schema: s,
    sourceObjects: /* @__PURE__ */ new Map()
  });
}
const he = (s) => s == null || typeof s == "object" && !!s[Symbol.iterator]().next().done;
class Yt extends ct {
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
    return e && (t.schema = e), t.items = t.items.map((n) => $(n) || C(n) ? n.clone(e) : n), this.range && (t.range = this.range.slice()), t;
  }
  /**
   * Adds a value to the collection. For `!!map` and `!!omap` the value must
   * be a Pair instance or a `{ key, value }` object, which may not have a key
   * that already exists in the map.
   */
  addIn(e, t) {
    if (he(e))
      this.add(t);
    else {
      const [n, ...i] = e, r = this.get(n, !0);
      if (L(r))
        r.addIn(i, t);
      else if (r === void 0 && this.schema)
        this.set(n, Ke(this.schema, i, t));
      else
        throw new Error(`Expected YAML collection at ${n}. Remaining path: ${i}`);
    }
  }
  /**
   * Removes a value from the collection.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(e) {
    const [t, ...n] = e;
    if (n.length === 0)
      return this.delete(t);
    const i = this.get(t, !0);
    if (L(i))
      return i.deleteIn(n);
    throw new Error(`Expected YAML collection at ${t}. Remaining path: ${n}`);
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(e, t) {
    const [n, ...i] = e, r = this.get(n, !0);
    return i.length === 0 ? !t && I(r) ? r.value : r : L(r) ? r.getIn(i, t) : void 0;
  }
  hasAllNullValues(e) {
    return this.items.every((t) => {
      if (!C(t))
        return !1;
      const n = t.value;
      return n == null || e && I(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
    });
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   */
  hasIn(e) {
    const [t, ...n] = e;
    if (n.length === 0)
      return this.has(t);
    const i = this.get(t, !0);
    return L(i) ? i.hasIn(n) : !1;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(e, t) {
    const [n, ...i] = e;
    if (i.length === 0)
      this.set(n, t);
    else {
      const r = this.get(n, !0);
      if (L(r))
        r.setIn(i, t);
      else if (r === void 0 && this.schema)
        this.set(n, Ke(this.schema, i, t));
      else
        throw new Error(`Expected YAML collection at ${n}. Remaining path: ${i}`);
    }
  }
}
const Bs = (s) => s.replace(/^(?!$)(?: $)?/gm, "#");
function V(s, e) {
  return /^\n+$/.test(s) ? s.substring(1) : e ? s.replace(/^(?! *$)/gm, e) : s;
}
const W = (s, e, t) => s.endsWith(`
`) ? V(t, e) : t.includes(`
`) ? `
` + V(t, e) : (s.endsWith(" ") ? "" : " ") + t, Gt = "flow", st = "block", Pe = "quoted";
function Ue(s, e, t = "flow", { indentAtStart: n, lineWidth: i = 80, minContentWidth: r = 20, onFold: o, onOverflow: l } = {}) {
  if (!i || i < 0)
    return s;
  i < r && (r = 0);
  const a = Math.max(1 + r, 1 + i - e.length);
  if (s.length <= a)
    return s;
  const c = [], p = {};
  let f = i - e.length;
  typeof n == "number" && (n > i - Math.max(2, r) ? c.push(0) : f = i - n);
  let d, h, g = !1, u = -1, m = -1, y = -1;
  t === st && (u = Et(s, u, e.length), u !== -1 && (f = u + a));
  for (let S; S = s[u += 1]; ) {
    if (t === Pe && S === "\\") {
      switch (m = u, s[u + 1]) {
        case "x":
          u += 3;
          break;
        case "u":
          u += 5;
          break;
        case "U":
          u += 9;
          break;
        default:
          u += 1;
      }
      y = u;
    }
    if (S === `
`)
      t === st && (u = Et(s, u, e.length)), f = u + e.length + a, d = void 0;
    else {
      if (S === " " && h && h !== " " && h !== `
` && h !== "	") {
        const k = s[u + 1];
        k && k !== " " && k !== `
` && k !== "	" && (d = u);
      }
      if (u >= f)
        if (d)
          c.push(d), f = d + a, d = void 0;
        else if (t === Pe) {
          for (; h === " " || h === "	"; )
            h = S, S = s[u += 1], g = !0;
          const k = u > y + 1 ? u - 2 : m - 1;
          if (p[k])
            return s;
          c.push(k), p[k] = !0, f = k + a, d = void 0;
        } else
          g = !0;
    }
    h = S;
  }
  if (g && l && l(), c.length === 0)
    return s;
  o && o();
  let b = s.slice(0, c[0]);
  for (let S = 0; S < c.length; ++S) {
    const k = c[S], N = c[S + 1] || s.length;
    k === 0 ? b = `
${e}${s.slice(0, N)}` : (t === Pe && p[k] && (b += `${s[k]}\\`), b += `
${e}${s.slice(k + 1, N)}`);
  }
  return b;
}
function Et(s, e, t) {
  let n = e, i = e + 1, r = s[i];
  for (; r === " " || r === "	"; )
    if (e < i + t)
      r = s[++e];
    else {
      do
        r = s[++e];
      while (r && r !== `
`);
      n = e, i = e + 1, r = s[i];
    }
  return n;
}
const qe = (s, e) => ({
  indentAtStart: e ? s.indent.length : s.indentAtStart,
  lineWidth: s.options.lineWidth,
  minContentWidth: s.options.minContentWidth
}), Ve = (s) => /^(%|---|\.\.\.)/m.test(s);
function Ks(s, e, t) {
  if (!e || e < 0)
    return !1;
  const n = e - t, i = s.length;
  if (i <= n)
    return !1;
  for (let r = 0, o = 0; r < i; ++r)
    if (s[r] === `
`) {
      if (r - o > n)
        return !0;
      if (o = r + 1, i - o <= n)
        return !1;
    }
  return !0;
}
function me(s, e) {
  const t = JSON.stringify(s);
  if (e.options.doubleQuotedAsJSON)
    return t;
  const { implicitKey: n } = e, i = e.options.doubleQuotedMinMultiLineLength, r = e.indent || (Ve(s) ? "  " : "");
  let o = "", l = 0;
  for (let a = 0, c = t[a]; c; c = t[++a])
    if (c === " " && t[a + 1] === "\\" && t[a + 2] === "n" && (o += t.slice(l, a) + "\\ ", a += 1, l = a, c = "\\"), c === "\\")
      switch (t[a + 1]) {
        case "u":
          {
            o += t.slice(l, a);
            const p = t.substr(a + 2, 4);
            switch (p) {
              case "0000":
                o += "\\0";
                break;
              case "0007":
                o += "\\a";
                break;
              case "000b":
                o += "\\v";
                break;
              case "001b":
                o += "\\e";
                break;
              case "0085":
                o += "\\N";
                break;
              case "00a0":
                o += "\\_";
                break;
              case "2028":
                o += "\\L";
                break;
              case "2029":
                o += "\\P";
                break;
              default:
                p.substr(0, 2) === "00" ? o += "\\x" + p.substr(2) : o += t.substr(a, 6);
            }
            a += 5, l = a + 1;
          }
          break;
        case "n":
          if (n || t[a + 2] === '"' || t.length < i)
            a += 1;
          else {
            for (o += t.slice(l, a) + `

`; t[a + 2] === "\\" && t[a + 3] === "n" && t[a + 4] !== '"'; )
              o += `
`, a += 2;
            o += r, t[a + 2] === " " && (o += "\\"), a += 1, l = a + 1;
          }
          break;
        default:
          a += 1;
      }
  return o = l ? o + t.slice(l) : t, n ? o : Ue(o, r, Pe, qe(e, !1));
}
function nt(s, e) {
  if (e.options.singleQuote === !1 || e.implicitKey && s.includes(`
`) || /[ \t]\n|\n[ \t]/.test(s))
    return me(s, e);
  const t = e.indent || (Ve(s) ? "  " : ""), n = "'" + s.replace(/'/g, "''").replace(/\n+/g, `$&
${t}`) + "'";
  return e.implicitKey ? n : Ue(n, t, Gt, qe(e, !1));
}
function te(s, e) {
  const { singleQuote: t } = e.options;
  let n;
  if (t === !1)
    n = me;
  else {
    const i = s.includes('"'), r = s.includes("'");
    i && !r ? n = nt : r && !i ? n = me : n = t ? nt : me;
  }
  return n(s, e);
}
let it;
try {
  it = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
} catch {
  it = /\n+(?!\n|$)/g;
}
function Be({ comment: s, type: e, value: t }, n, i, r) {
  const { blockQuote: o, commentString: l, lineWidth: a } = n.options;
  if (!o || /\n[\t ]+$/.test(t))
    return te(t, n);
  const c = n.indent || (n.forceBlockIndent || Ve(t) ? "  " : ""), p = o === "literal" ? !0 : o === "folded" || e === O.BLOCK_FOLDED ? !1 : e === O.BLOCK_LITERAL ? !0 : !Ks(t, a, c.length);
  if (!t)
    return p ? `|
` : `>
`;
  let f, d;
  for (d = t.length; d > 0; --d) {
    const N = t[d - 1];
    if (N !== `
` && N !== "	" && N !== " ")
      break;
  }
  let h = t.substring(d);
  const g = h.indexOf(`
`);
  g === -1 ? f = "-" : t === h || g !== h.length - 1 ? (f = "+", r && r()) : f = "", h && (t = t.slice(0, -h.length), h[h.length - 1] === `
` && (h = h.slice(0, -1)), h = h.replace(it, `$&${c}`));
  let u = !1, m, y = -1;
  for (m = 0; m < t.length; ++m) {
    const N = t[m];
    if (N === " ")
      u = !0;
    else if (N === `
`)
      y = m;
    else
      break;
  }
  let b = t.substring(0, y < m ? y + 1 : m);
  b && (t = t.substring(b.length), b = b.replace(/\n+/g, `$&${c}`));
  let k = (u ? c ? "2" : "1" : "") + f;
  if (s && (k += " " + l(s.replace(/ ?[\r\n]+/g, " ")), i && i()), !p) {
    const N = t.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${c}`);
    let T = !1;
    const A = qe(n, !0);
    o !== "folded" && e !== O.BLOCK_FOLDED && (A.onOverflow = () => {
      T = !0;
    });
    const w = Ue(`${b}${N}${h}`, c, st, A);
    if (!T)
      return `>${k}
${c}${w}`;
  }
  return t = t.replace(/\n+/g, `$&${c}`), `|${k}
${c}${b}${t}${h}`;
}
function Ds(s, e, t, n) {
  const { type: i, value: r } = s, { actualString: o, implicitKey: l, indent: a, indentStep: c, inFlow: p } = e;
  if (l && r.includes(`
`) || p && /[[\]{},]/.test(r))
    return te(r, e);
  if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(r))
    return l || p || !r.includes(`
`) ? te(r, e) : Be(s, e, t, n);
  if (!l && !p && i !== O.PLAIN && r.includes(`
`))
    return Be(s, e, t, n);
  if (Ve(r)) {
    if (a === "")
      return e.forceBlockIndent = !0, Be(s, e, t, n);
    if (l && a === c)
      return te(r, e);
  }
  const f = r.replace(/\n+/g, `$&
${a}`);
  if (o) {
    const d = (u) => {
      var m;
      return u.default && u.tag !== "tag:yaml.org,2002:str" && ((m = u.test) == null ? void 0 : m.test(f));
    }, { compat: h, tags: g } = e.doc.schema;
    if (g.some(d) || h != null && h.some(d))
      return te(r, e);
  }
  return l ? f : Ue(f, a, Gt, qe(e, !1));
}
function ut(s, e, t, n) {
  const { implicitKey: i, inFlow: r } = e, o = typeof s.value == "string" ? s : Object.assign({}, s, { value: String(s.value) });
  let { type: l } = s;
  l !== O.QUOTE_DOUBLE && /[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(o.value) && (l = O.QUOTE_DOUBLE);
  const a = (p) => {
    switch (p) {
      case O.BLOCK_FOLDED:
      case O.BLOCK_LITERAL:
        return i || r ? te(o.value, e) : Be(o, e, t, n);
      case O.QUOTE_DOUBLE:
        return me(o.value, e);
      case O.QUOTE_SINGLE:
        return nt(o.value, e);
      case O.PLAIN:
        return Ds(o, e, t, n);
      default:
        return null;
    }
  };
  let c = a(l);
  if (c === null) {
    const { defaultKeyType: p, defaultStringType: f } = e.options, d = i && p || f;
    if (c = a(d), c === null)
      throw new Error(`Unsupported default string type ${d}`);
  }
  return c;
}
function Ht(s, e) {
  const t = Object.assign({
    blockQuote: !0,
    commentString: Bs,
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
  }, s.schema.toStringOptions, e);
  let n;
  switch (t.collectionStyle) {
    case "block":
      n = !1;
      break;
    case "flow":
      n = !0;
      break;
    default:
      n = null;
  }
  return {
    anchors: /* @__PURE__ */ new Set(),
    doc: s,
    flowCollectionPadding: t.flowCollectionPadding ? " " : "",
    indent: "",
    indentStep: typeof t.indent == "number" ? " ".repeat(t.indent) : "  ",
    inFlow: n,
    options: t
  };
}
function js(s, e) {
  var i;
  if (e.tag) {
    const r = s.filter((o) => o.tag === e.tag);
    if (r.length > 0)
      return r.find((o) => o.format === e.format) ?? r[0];
  }
  let t, n;
  if (I(e)) {
    n = e.value;
    let r = s.filter((o) => {
      var l;
      return (l = o.identify) == null ? void 0 : l.call(o, n);
    });
    if (r.length > 1) {
      const o = r.filter((l) => l.test);
      o.length > 0 && (r = o);
    }
    t = r.find((o) => o.format === e.format) ?? r.find((o) => !o.format);
  } else
    n = e, t = s.find((r) => r.nodeClass && n instanceof r.nodeClass);
  if (!t) {
    const r = ((i = n == null ? void 0 : n.constructor) == null ? void 0 : i.name) ?? (n === null ? "null" : typeof n);
    throw new Error(`Tag not resolved for ${r} value`);
  }
  return t;
}
function Rs(s, e, { anchors: t, doc: n }) {
  if (!n.directives)
    return "";
  const i = [], r = (I(s) || L(s)) && s.anchor;
  r && Ut(r) && (t.add(r), i.push(`&${r}`));
  const o = s.tag ?? (e.default ? null : e.tag);
  return o && i.push(n.directives.tagString(o)), i.join(" ");
}
function ie(s, e, t, n) {
  var a;
  if (C(s))
    return s.toString(e, t, n);
  if (le(s)) {
    if (e.doc.directives)
      return s.toString(e);
    if ((a = e.resolvedAliases) != null && a.has(s))
      throw new TypeError("Cannot stringify circular structure without alias nodes");
    e.resolvedAliases ? e.resolvedAliases.add(s) : e.resolvedAliases = /* @__PURE__ */ new Set([s]), s = s.resolve(e.doc);
  }
  let i;
  const r = $(s) ? s : e.doc.createNode(s, { onTagObj: (c) => i = c });
  i ?? (i = js(e.doc.schema.tags, r));
  const o = Rs(r, i, e);
  o.length > 0 && (e.indentAtStart = (e.indentAtStart ?? 0) + o.length + 1);
  const l = typeof i.stringify == "function" ? i.stringify(r, e, t, n) : I(r) ? ut(r, e, t, n) : r.toString(e, t, n);
  return o ? I(r) || l[0] === "{" || l[0] === "[" ? `${o} ${l}` : `${o}
${e.indent}${l}` : l;
}
function Fs({ key: s, value: e }, t, n, i) {
  const { allNullValues: r, doc: o, indent: l, indentStep: a, options: { commentString: c, indentSeq: p, simpleKeys: f } } = t;
  let d = $(s) && s.comment || null;
  if (f) {
    if (d)
      throw new Error("With simple keys, key nodes cannot have comments");
    if (L(s) || !$(s) && typeof s == "object") {
      const A = "With simple keys, collection cannot be used as a key value";
      throw new Error(A);
    }
  }
  let h = !f && (!s || d && e == null && !t.inFlow || L(s) || (I(s) ? s.type === O.BLOCK_FOLDED || s.type === O.BLOCK_LITERAL : typeof s == "object"));
  t = Object.assign({}, t, {
    allNullValues: !1,
    implicitKey: !h && (f || !r),
    indent: l + a
  });
  let g = !1, u = !1, m = ie(s, t, () => g = !0, () => u = !0);
  if (!h && !t.inFlow && m.length > 1024) {
    if (f)
      throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
    h = !0;
  }
  if (t.inFlow) {
    if (r || e == null)
      return g && n && n(), m === "" ? "?" : h ? `? ${m}` : m;
  } else if (r && !f || e == null && h)
    return m = `? ${m}`, d && !g ? m += W(m, t.indent, c(d)) : u && i && i(), m;
  g && (d = null), h ? (d && (m += W(m, t.indent, c(d))), m = `? ${m}
${l}:`) : (m = `${m}:`, d && (m += W(m, t.indent, c(d))));
  let y, b, S;
  $(e) ? (y = !!e.spaceBefore, b = e.commentBefore, S = e.comment) : (y = !1, b = null, S = null, e && typeof e == "object" && (e = o.createNode(e))), t.implicitKey = !1, !h && !d && I(e) && (t.indentAtStart = m.length + 1), u = !1, !p && a.length >= 2 && !t.inFlow && !h && Ne(e) && !e.flow && !e.tag && !e.anchor && (t.indent = t.indent.substring(2));
  let k = !1;
  const N = ie(e, t, () => k = !0, () => u = !0);
  let T = " ";
  if (d || y || b) {
    if (T = y ? `
` : "", b) {
      const A = c(b);
      T += `
${V(A, t.indent)}`;
    }
    N === "" && !t.inFlow ? T === `
` && S && (T = `

`) : T += `
${t.indent}`;
  } else if (!h && L(e)) {
    const A = N[0], w = N.indexOf(`
`), E = w !== -1, _ = t.inFlow ?? e.flow ?? e.items.length === 0;
    if (E || !_) {
      let q = !1;
      if (E && (A === "&" || A === "!")) {
        let D = N.indexOf(" ");
        A === "&" && D !== -1 && D < w && N[D + 1] === "!" && (D = N.indexOf(" ", D + 1)), (D === -1 || w < D) && (q = !0);
      }
      q || (T = `
${t.indent}`);
    }
  } else (N === "" || N[0] === `
`) && (T = "");
  return m += T + N, t.inFlow ? k && n && n() : S && !k ? m += W(m, t.indent, c(S)) : u && i && i(), m;
}
function Wt(s, e) {
  (s === "debug" || s === "warn") && console.warn(e);
}
const Ee = "<<", J = {
  identify: (s) => s === Ee || typeof s == "symbol" && s.description === Ee,
  default: "key",
  tag: "tag:yaml.org,2002:merge",
  test: /^<<$/,
  resolve: () => Object.assign(new O(Symbol(Ee)), {
    addToJSMap: Qt
  }),
  stringify: () => Ee
}, Us = (s, e) => (J.identify(e) || I(e) && (!e.type || e.type === O.PLAIN) && J.identify(e.value)) && (s == null ? void 0 : s.doc.schema.tags.some((t) => t.tag === J.tag && t.default));
function Qt(s, e, t) {
  const n = Xt(s, t);
  if (Ne(n))
    for (const i of n.items)
      Qe(s, e, i);
  else if (Array.isArray(n))
    for (const i of n)
      Qe(s, e, i);
  else
    Qe(s, e, n);
}
function Qe(s, e, t) {
  const n = Xt(s, t);
  if (!Se(n))
    throw new Error("Merge sources must be maps or map aliases");
  const i = n.toJSON(null, s, Map);
  for (const [r, o] of i)
    e instanceof Map ? e.has(r) || e.set(r, o) : e instanceof Set ? e.add(r) : Object.prototype.hasOwnProperty.call(e, r) || Object.defineProperty(e, r, {
      value: o,
      writable: !0,
      enumerable: !0,
      configurable: !0
    });
  return e;
}
function Xt(s, e) {
  return s && le(e) ? e.resolve(s.doc, s) : e;
}
function zt(s, e, { key: t, value: n }) {
  if ($(t) && t.addToJSMap)
    t.addToJSMap(s, e, n);
  else if (Us(s, t))
    Qt(s, e, n);
  else {
    const i = B(t, "", s);
    if (e instanceof Map)
      e.set(i, B(n, i, s));
    else if (e instanceof Set)
      e.add(i);
    else {
      const r = qs(t, i, s), o = B(n, r, s);
      r in e ? Object.defineProperty(e, r, {
        value: o,
        writable: !0,
        enumerable: !0,
        configurable: !0
      }) : e[r] = o;
    }
  }
  return e;
}
function qs(s, e, t) {
  if (e === null)
    return "";
  if (typeof e != "object")
    return String(e);
  if ($(s) && (t != null && t.doc)) {
    const n = Ht(t.doc, {});
    n.anchors = /* @__PURE__ */ new Set();
    for (const r of t.anchors.keys())
      n.anchors.add(r.anchor);
    n.inFlow = !0, n.inStringifyKey = !0;
    const i = s.toString(n);
    if (!t.mapKeyWarned) {
      let r = JSON.stringify(i);
      r.length > 40 && (r = r.substring(0, 36) + '..."'), Wt(t.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${r}. Set mapAsMap: true to use object keys.`), t.mapKeyWarned = !0;
    }
    return i;
  }
  return JSON.stringify(e);
}
function ht(s, e, t) {
  const n = ge(s, void 0, t), i = ge(e, void 0, t);
  return new M(n, i);
}
class M {
  constructor(e, t = null) {
    Object.defineProperty(this, K, { value: Rt }), this.key = e, this.value = t;
  }
  clone(e) {
    let { key: t, value: n } = this;
    return $(t) && (t = t.clone(e)), $(n) && (n = n.clone(e)), new M(t, n);
  }
  toJSON(e, t) {
    const n = t != null && t.mapAsMap ? /* @__PURE__ */ new Map() : {};
    return zt(t, n, this);
  }
  toString(e, t, n) {
    return e != null && e.doc ? Fs(this, e, t, n) : JSON.stringify(this);
  }
}
function Zt(s, e, t) {
  return (e.inFlow ?? s.flow ? Js : Vs)(s, e, t);
}
function Vs({ comment: s, items: e }, t, { blockItemPrefix: n, flowChars: i, itemIndent: r, onChompKeep: o, onComment: l }) {
  const { indent: a, options: { commentString: c } } = t, p = Object.assign({}, t, { indent: r, type: null });
  let f = !1;
  const d = [];
  for (let g = 0; g < e.length; ++g) {
    const u = e[g];
    let m = null;
    if ($(u))
      !f && u.spaceBefore && d.push(""), De(t, d, u.commentBefore, f), u.comment && (m = u.comment);
    else if (C(u)) {
      const b = $(u.key) ? u.key : null;
      b && (!f && b.spaceBefore && d.push(""), De(t, d, b.commentBefore, f));
    }
    f = !1;
    let y = ie(u, p, () => m = null, () => f = !0);
    m && (y += W(y, r, c(m))), f && m && (f = !1), d.push(n + y);
  }
  let h;
  if (d.length === 0)
    h = i.start + i.end;
  else {
    h = d[0];
    for (let g = 1; g < d.length; ++g) {
      const u = d[g];
      h += u ? `
${a}${u}` : `
`;
    }
  }
  return s ? (h += `
` + V(c(s), a), l && l()) : f && o && o(), h;
}
function Js({ items: s }, e, { flowChars: t, itemIndent: n }) {
  const { indent: i, indentStep: r, flowCollectionPadding: o, options: { commentString: l } } = e;
  n += r;
  const a = Object.assign({}, e, {
    indent: n,
    inFlow: !0,
    type: null
  });
  let c = !1, p = 0;
  const f = [];
  for (let g = 0; g < s.length; ++g) {
    const u = s[g];
    let m = null;
    if ($(u))
      u.spaceBefore && f.push(""), De(e, f, u.commentBefore, !1), u.comment && (m = u.comment);
    else if (C(u)) {
      const b = $(u.key) ? u.key : null;
      b && (b.spaceBefore && f.push(""), De(e, f, b.commentBefore, !1), b.comment && (c = !0));
      const S = $(u.value) ? u.value : null;
      S ? (S.comment && (m = S.comment), S.commentBefore && (c = !0)) : u.value == null && (b != null && b.comment) && (m = b.comment);
    }
    m && (c = !0);
    let y = ie(u, a, () => m = null);
    c || (c = f.length > p || y.includes(`
`)), g < s.length - 1 ? y += "," : e.options.trailingComma && (e.options.lineWidth > 0 && (c || (c = f.reduce((b, S) => b + S.length + 2, 2) + (y.length + 2) > e.options.lineWidth)), c && (y += ",")), m && (y += W(y, n, l(m))), f.push(y), p = f.length;
  }
  const { start: d, end: h } = t;
  if (f.length === 0)
    return d + h;
  if (!c) {
    const g = f.reduce((u, m) => u + m.length + 2, 2);
    c = e.options.lineWidth > 0 && g > e.options.lineWidth;
  }
  if (c) {
    let g = d;
    for (const u of f)
      g += u ? `
${r}${i}${u}` : `
`;
    return `${g}
${i}${h}`;
  } else
    return `${d}${o}${f.join(" ")}${o}${h}`;
}
function De({ indent: s, options: { commentString: e } }, t, n, i) {
  if (n && i && (n = n.replace(/^\n+/, "")), n) {
    const r = V(e(n), s);
    t.push(r.trimStart());
  }
}
function Q(s, e) {
  const t = I(e) ? e.value : e;
  for (const n of s)
    if (C(n) && (n.key === e || n.key === t || I(n.key) && n.key.value === t))
      return n;
}
class P extends Yt {
  static get tagName() {
    return "tag:yaml.org,2002:map";
  }
  constructor(e) {
    super(G, e), this.items = [];
  }
  /**
   * A generic collection parsing method that can be extended
   * to other node classes that inherit from YAMLMap
   */
  static from(e, t, n) {
    const { keepUndefined: i, replacer: r } = n, o = new this(e), l = (a, c) => {
      if (typeof r == "function")
        c = r.call(t, a, c);
      else if (Array.isArray(r) && !r.includes(a))
        return;
      (c !== void 0 || i) && o.items.push(ht(a, c, n));
    };
    if (t instanceof Map)
      for (const [a, c] of t)
        l(a, c);
    else if (t && typeof t == "object")
      for (const a of Object.keys(t))
        l(a, t[a]);
    return typeof e.sortMapEntries == "function" && o.items.sort(e.sortMapEntries), o;
  }
  /**
   * Adds a value to the collection.
   *
   * @param overwrite - If not set `true`, using a key that is already in the
   *   collection will throw. Otherwise, overwrites the previous value.
   */
  add(e, t) {
    var o;
    let n;
    C(e) ? n = e : !e || typeof e != "object" || !("key" in e) ? n = new M(e, e == null ? void 0 : e.value) : n = new M(e.key, e.value);
    const i = Q(this.items, n.key), r = (o = this.schema) == null ? void 0 : o.sortMapEntries;
    if (i) {
      if (!t)
        throw new Error(`Key ${n.key} already set`);
      I(i.value) && Jt(n.value) ? i.value.value = n.value : i.value = n.value;
    } else if (r) {
      const l = this.items.findIndex((a) => r(n, a) < 0);
      l === -1 ? this.items.push(n) : this.items.splice(l, 0, n);
    } else
      this.items.push(n);
  }
  delete(e) {
    const t = Q(this.items, e);
    return t ? this.items.splice(this.items.indexOf(t), 1).length > 0 : !1;
  }
  get(e, t) {
    const n = Q(this.items, e), i = n == null ? void 0 : n.value;
    return (!t && I(i) ? i.value : i) ?? void 0;
  }
  has(e) {
    return !!Q(this.items, e);
  }
  set(e, t) {
    this.add(new M(e, t), !0);
  }
  /**
   * @param ctx - Conversion context, originally set in Document#toJS()
   * @param {Class} Type - If set, forces the returned collection type
   * @returns Instance of Type, Map, or Object
   */
  toJSON(e, t, n) {
    const i = n ? new n() : t != null && t.mapAsMap ? /* @__PURE__ */ new Map() : {};
    t != null && t.onCreate && t.onCreate(i);
    for (const r of this.items)
      zt(t, i, r);
    return i;
  }
  toString(e, t, n) {
    if (!e)
      return JSON.stringify(this);
    for (const i of this.items)
      if (!C(i))
        throw new Error(`Map items must all be pairs; found ${JSON.stringify(i)} instead`);
    return !e.allNullValues && this.hasAllNullValues(!1) && (e = Object.assign({}, e, { allNullValues: !0 })), Zt(this, e, {
      blockItemPrefix: "",
      flowChars: { start: "{", end: "}" },
      itemIndent: e.indent || "",
      onChompKeep: n,
      onComment: t
    });
  }
}
const ce = {
  collection: "map",
  default: !0,
  nodeClass: P,
  tag: "tag:yaml.org,2002:map",
  resolve(s, e) {
    return Se(s) || e("Expected a mapping for this tag"), s;
  },
  createNode: (s, e, t) => P.from(s, e, t)
};
class X extends Yt {
  static get tagName() {
    return "tag:yaml.org,2002:seq";
  }
  constructor(e) {
    super(oe, e), this.items = [];
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
    const t = Ie(e);
    return typeof t != "number" ? !1 : this.items.splice(t, 1).length > 0;
  }
  get(e, t) {
    const n = Ie(e);
    if (typeof n != "number")
      return;
    const i = this.items[n];
    return !t && I(i) ? i.value : i;
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   */
  has(e) {
    const t = Ie(e);
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
    const n = Ie(e);
    if (typeof n != "number")
      throw new Error(`Expected a valid index, not ${e}.`);
    const i = this.items[n];
    I(i) && Jt(t) ? i.value = t : this.items[n] = t;
  }
  toJSON(e, t) {
    const n = [];
    t != null && t.onCreate && t.onCreate(n);
    let i = 0;
    for (const r of this.items)
      n.push(B(r, String(i++), t));
    return n;
  }
  toString(e, t, n) {
    return e ? Zt(this, e, {
      blockItemPrefix: "- ",
      flowChars: { start: "[", end: "]" },
      itemIndent: (e.indent || "") + "  ",
      onChompKeep: n,
      onComment: t
    }) : JSON.stringify(this);
  }
  static from(e, t, n) {
    const { replacer: i } = n, r = new this(e);
    if (t && Symbol.iterator in Object(t)) {
      let o = 0;
      for (let l of t) {
        if (typeof i == "function") {
          const a = t instanceof Set ? l : String(o++);
          l = i.call(t, a, l);
        }
        r.items.push(ge(l, void 0, n));
      }
    }
    return r;
  }
}
function Ie(s) {
  let e = I(s) ? s.value : s;
  return e && typeof e == "string" && (e = Number(e)), typeof e == "number" && Number.isInteger(e) && e >= 0 ? e : null;
}
const fe = {
  collection: "seq",
  default: !0,
  nodeClass: X,
  tag: "tag:yaml.org,2002:seq",
  resolve(s, e) {
    return Ne(s) || e("Expected a sequence for this tag"), s;
  },
  createNode: (s, e, t) => X.from(s, e, t)
}, Je = {
  identify: (s) => typeof s == "string",
  default: !0,
  tag: "tag:yaml.org,2002:str",
  resolve: (s) => s,
  stringify(s, e, t, n) {
    return e = Object.assign({ actualString: !0 }, e), ut(s, e, t, n);
  }
}, Ye = {
  identify: (s) => s == null,
  createNode: () => new O(null),
  default: !0,
  tag: "tag:yaml.org,2002:null",
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: () => new O(null),
  stringify: ({ source: s }, e) => typeof s == "string" && Ye.test.test(s) ? s : e.options.nullStr
}, dt = {
  identify: (s) => typeof s == "boolean",
  default: !0,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
  resolve: (s) => new O(s[0] === "t" || s[0] === "T"),
  stringify({ source: s, value: e }, t) {
    if (s && dt.test.test(s)) {
      const n = s[0] === "t" || s[0] === "T";
      if (e === n)
        return s;
    }
    return e ? t.options.trueStr : t.options.falseStr;
  }
};
function F({ format: s, minFractionDigits: e, tag: t, value: n }) {
  if (typeof n == "bigint")
    return String(n);
  const i = typeof n == "number" ? n : Number(n);
  if (!isFinite(i))
    return isNaN(i) ? ".nan" : i < 0 ? "-.inf" : ".inf";
  let r = Object.is(n, -0) ? "-0" : JSON.stringify(n);
  if (!s && e && (!t || t === "tag:yaml.org,2002:float") && /^-?\d/.test(r) && !r.includes("e")) {
    let o = r.indexOf(".");
    o < 0 && (o = r.length, r += ".");
    let l = e - (r.length - o - 1);
    for (; l-- > 0; )
      r += "0";
  }
  return r;
}
const xt = {
  identify: (s) => typeof s == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
  resolve: (s) => s.slice(-3).toLowerCase() === "nan" ? NaN : s[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: F
}, es = {
  identify: (s) => typeof s == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  format: "EXP",
  test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
  resolve: (s) => parseFloat(s),
  stringify(s) {
    const e = Number(s.value);
    return isFinite(e) ? e.toExponential() : F(s);
  }
}, ts = {
  identify: (s) => typeof s == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
  resolve(s) {
    const e = new O(parseFloat(s)), t = s.indexOf(".");
    return t !== -1 && s[s.length - 1] === "0" && (e.minFractionDigits = s.length - t - 1), e;
  },
  stringify: F
}, Ge = (s) => typeof s == "bigint" || Number.isInteger(s), pt = (s, e, t, { intAsBigInt: n }) => n ? BigInt(s) : parseInt(s.substring(e), t);
function ss(s, e, t) {
  const { value: n } = s;
  return Ge(n) && n >= 0 ? t + n.toString(e) : F(s);
}
const ns = {
  identify: (s) => Ge(s) && s >= 0,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "OCT",
  test: /^0o[0-7]+$/,
  resolve: (s, e, t) => pt(s, 2, 8, t),
  stringify: (s) => ss(s, 8, "0o")
}, is = {
  identify: Ge,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  test: /^[-+]?[0-9]+$/,
  resolve: (s, e, t) => pt(s, 0, 10, t),
  stringify: F
}, rs = {
  identify: (s) => Ge(s) && s >= 0,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "HEX",
  test: /^0x[0-9a-fA-F]+$/,
  resolve: (s, e, t) => pt(s, 2, 16, t),
  stringify: (s) => ss(s, 16, "0x")
}, Ys = [
  ce,
  fe,
  Je,
  Ye,
  dt,
  ns,
  is,
  rs,
  xt,
  es,
  ts
];
function It(s) {
  return typeof s == "bigint" || Number.isInteger(s);
}
const Le = ({ value: s }) => JSON.stringify(s), Gs = [
  {
    identify: (s) => typeof s == "string",
    default: !0,
    tag: "tag:yaml.org,2002:str",
    resolve: (s) => s,
    stringify: Le
  },
  {
    identify: (s) => s == null,
    createNode: () => new O(null),
    default: !0,
    tag: "tag:yaml.org,2002:null",
    test: /^null$/,
    resolve: () => null,
    stringify: Le
  },
  {
    identify: (s) => typeof s == "boolean",
    default: !0,
    tag: "tag:yaml.org,2002:bool",
    test: /^true$|^false$/,
    resolve: (s) => s === "true",
    stringify: Le
  },
  {
    identify: It,
    default: !0,
    tag: "tag:yaml.org,2002:int",
    test: /^-?(?:0|[1-9][0-9]*)$/,
    resolve: (s, e, { intAsBigInt: t }) => t ? BigInt(s) : parseInt(s, 10),
    stringify: ({ value: s }) => It(s) ? s.toString() : JSON.stringify(s)
  },
  {
    identify: (s) => typeof s == "number",
    default: !0,
    tag: "tag:yaml.org,2002:float",
    test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
    resolve: (s) => parseFloat(s),
    stringify: Le
  }
], Hs = {
  default: !0,
  tag: "",
  test: /^/,
  resolve(s, e) {
    return e(`Unresolved plain scalar ${JSON.stringify(s)}`), s;
  }
}, Ws = [ce, fe].concat(Gs, Hs), mt = {
  identify: (s) => s instanceof Uint8Array,
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
  resolve(s, e) {
    if (typeof atob == "function") {
      const t = atob(s.replace(/[\n\r]/g, "")), n = new Uint8Array(t.length);
      for (let i = 0; i < t.length; ++i)
        n[i] = t.charCodeAt(i);
      return n;
    } else
      return e("This environment does not support reading binary tags; either Buffer or atob is required"), s;
  },
  stringify({ comment: s, type: e, value: t }, n, i, r) {
    if (!t)
      return "";
    const o = t;
    let l;
    if (typeof btoa == "function") {
      let a = "";
      for (let c = 0; c < o.length; ++c)
        a += String.fromCharCode(o[c]);
      l = btoa(a);
    } else
      throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
    if (e ?? (e = O.BLOCK_LITERAL), e !== O.QUOTE_DOUBLE) {
      const a = Math.max(n.options.lineWidth - n.indent.length, n.options.minContentWidth), c = Math.ceil(l.length / a), p = new Array(c);
      for (let f = 0, d = 0; f < c; ++f, d += a)
        p[f] = l.substr(d, a);
      l = p.join(e === O.BLOCK_LITERAL ? `
` : " ");
    }
    return ut({ comment: s, type: e, value: l }, n, i, r);
  }
};
function os(s, e) {
  if (Ne(s))
    for (let t = 0; t < s.items.length; ++t) {
      let n = s.items[t];
      if (!C(n)) {
        if (Se(n)) {
          n.items.length > 1 && e("Each pair must have its own sequence indicator");
          const i = n.items[0] || new M(new O(null));
          if (n.commentBefore && (i.key.commentBefore = i.key.commentBefore ? `${n.commentBefore}
${i.key.commentBefore}` : n.commentBefore), n.comment) {
            const r = i.value ?? i.key;
            r.comment = r.comment ? `${n.comment}
${r.comment}` : n.comment;
          }
          n = i;
        }
        s.items[t] = C(n) ? n : new M(n);
      }
    }
  else
    e("Expected a sequence for this tag");
  return s;
}
function ls(s, e, t) {
  const { replacer: n } = t, i = new X(s);
  i.tag = "tag:yaml.org,2002:pairs";
  let r = 0;
  if (e && Symbol.iterator in Object(e))
    for (let o of e) {
      typeof n == "function" && (o = n.call(e, String(r++), o));
      let l, a;
      if (Array.isArray(o))
        if (o.length === 2)
          l = o[0], a = o[1];
        else
          throw new TypeError(`Expected [key, value] tuple: ${o}`);
      else if (o && o instanceof Object) {
        const c = Object.keys(o);
        if (c.length === 1)
          l = c[0], a = o[l];
        else
          throw new TypeError(`Expected tuple with one key, not ${c.length} keys`);
      } else
        l = o;
      i.items.push(ht(l, a, t));
    }
  return i;
}
const gt = {
  collection: "seq",
  default: !1,
  tag: "tag:yaml.org,2002:pairs",
  resolve: os,
  createNode: ls
};
class se extends X {
  constructor() {
    super(), this.add = P.prototype.add.bind(this), this.delete = P.prototype.delete.bind(this), this.get = P.prototype.get.bind(this), this.has = P.prototype.has.bind(this), this.set = P.prototype.set.bind(this), this.tag = se.tag;
  }
  /**
   * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
   * but TypeScript won't allow widening the signature of a child method.
   */
  toJSON(e, t) {
    if (!t)
      return super.toJSON(e);
    const n = /* @__PURE__ */ new Map();
    t != null && t.onCreate && t.onCreate(n);
    for (const i of this.items) {
      let r, o;
      if (C(i) ? (r = B(i.key, "", t), o = B(i.value, r, t)) : r = B(i, "", t), n.has(r))
        throw new Error("Ordered maps must not include duplicate keys");
      n.set(r, o);
    }
    return n;
  }
  static from(e, t, n) {
    const i = ls(e, t, n), r = new this();
    return r.items = i.items, r;
  }
}
se.tag = "tag:yaml.org,2002:omap";
const yt = {
  collection: "seq",
  identify: (s) => s instanceof Map,
  nodeClass: se,
  default: !1,
  tag: "tag:yaml.org,2002:omap",
  resolve(s, e) {
    const t = os(s, e), n = [];
    for (const { key: i } of t.items)
      I(i) && (n.includes(i.value) ? e(`Ordered maps must not include duplicate keys: ${i.value}`) : n.push(i.value));
    return Object.assign(new se(), t);
  },
  createNode: (s, e, t) => se.from(s, e, t)
};
function as({ value: s, source: e }, t) {
  return e && (s ? cs : fs).test.test(e) ? e : s ? t.options.trueStr : t.options.falseStr;
}
const cs = {
  identify: (s) => s === !0,
  default: !0,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
  resolve: () => new O(!0),
  stringify: as
}, fs = {
  identify: (s) => s === !1,
  default: !0,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
  resolve: () => new O(!1),
  stringify: as
}, Qs = {
  identify: (s) => typeof s == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
  resolve: (s) => s.slice(-3).toLowerCase() === "nan" ? NaN : s[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: F
}, Xs = {
  identify: (s) => typeof s == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  format: "EXP",
  test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
  resolve: (s) => parseFloat(s.replace(/_/g, "")),
  stringify(s) {
    const e = Number(s.value);
    return isFinite(e) ? e.toExponential() : F(s);
  }
}, zs = {
  identify: (s) => typeof s == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
  resolve(s) {
    const e = new O(parseFloat(s.replace(/_/g, ""))), t = s.indexOf(".");
    if (t !== -1) {
      const n = s.substring(t + 1).replace(/_/g, "");
      n[n.length - 1] === "0" && (e.minFractionDigits = n.length);
    }
    return e;
  },
  stringify: F
}, Oe = (s) => typeof s == "bigint" || Number.isInteger(s);
function He(s, e, t, { intAsBigInt: n }) {
  const i = s[0];
  if ((i === "-" || i === "+") && (e += 1), s = s.substring(e).replace(/_/g, ""), n) {
    switch (t) {
      case 2:
        s = `0b${s}`;
        break;
      case 8:
        s = `0o${s}`;
        break;
      case 16:
        s = `0x${s}`;
        break;
    }
    const o = BigInt(s);
    return i === "-" ? BigInt(-1) * o : o;
  }
  const r = parseInt(s, t);
  return i === "-" ? -1 * r : r;
}
function bt(s, e, t) {
  const { value: n } = s;
  if (Oe(n)) {
    const i = n.toString(e);
    return n < 0 ? "-" + t + i.substr(1) : t + i;
  }
  return F(s);
}
const Zs = {
  identify: Oe,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "BIN",
  test: /^[-+]?0b[0-1_]+$/,
  resolve: (s, e, t) => He(s, 2, 2, t),
  stringify: (s) => bt(s, 2, "0b")
}, xs = {
  identify: Oe,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "OCT",
  test: /^[-+]?0[0-7_]+$/,
  resolve: (s, e, t) => He(s, 1, 8, t),
  stringify: (s) => bt(s, 8, "0")
}, en = {
  identify: Oe,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  test: /^[-+]?[0-9][0-9_]*$/,
  resolve: (s, e, t) => He(s, 0, 10, t),
  stringify: F
}, tn = {
  identify: Oe,
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "HEX",
  test: /^[-+]?0x[0-9a-fA-F_]+$/,
  resolve: (s, e, t) => He(s, 2, 16, t),
  stringify: (s) => bt(s, 16, "0x")
};
class ne extends P {
  constructor(e) {
    super(e), this.tag = ne.tag;
  }
  add(e) {
    let t;
    C(e) ? t = e : e && typeof e == "object" && "key" in e && "value" in e && e.value === null ? t = new M(e.key, null) : t = new M(e, null), Q(this.items, t.key) || this.items.push(t);
  }
  /**
   * If `keepPair` is `true`, returns the Pair matching `key`.
   * Otherwise, returns the value of that Pair's key.
   */
  get(e, t) {
    const n = Q(this.items, e);
    return !t && C(n) ? I(n.key) ? n.key.value : n.key : n;
  }
  set(e, t) {
    if (typeof t != "boolean")
      throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof t}`);
    const n = Q(this.items, e);
    n && !t ? this.items.splice(this.items.indexOf(n), 1) : !n && t && this.items.push(new M(e));
  }
  toJSON(e, t) {
    return super.toJSON(e, t, Set);
  }
  toString(e, t, n) {
    if (!e)
      return JSON.stringify(this);
    if (this.hasAllNullValues(!0))
      return super.toString(Object.assign({}, e, { allNullValues: !0 }), t, n);
    throw new Error("Set items must all have null values");
  }
  static from(e, t, n) {
    const { replacer: i } = n, r = new this(e);
    if (t && Symbol.iterator in Object(t))
      for (let o of t)
        typeof i == "function" && (o = i.call(t, o, o)), r.items.push(ht(o, null, n));
    return r;
  }
}
ne.tag = "tag:yaml.org,2002:set";
const wt = {
  collection: "map",
  identify: (s) => s instanceof Set,
  nodeClass: ne,
  default: !1,
  tag: "tag:yaml.org,2002:set",
  createNode: (s, e, t) => ne.from(s, e, t),
  resolve(s, e) {
    if (Se(s)) {
      if (s.hasAllNullValues(!0))
        return Object.assign(new ne(), s);
      e("Set items must all have null values");
    } else
      e("Expected a mapping for this tag");
    return s;
  }
};
function kt(s, e) {
  const t = s[0], n = t === "-" || t === "+" ? s.substring(1) : s, i = (o) => e ? BigInt(o) : Number(o), r = n.replace(/_/g, "").split(":").reduce((o, l) => o * i(60) + i(l), i(0));
  return t === "-" ? i(-1) * r : r;
}
function us(s) {
  let { value: e } = s, t = (o) => o;
  if (typeof e == "bigint")
    t = (o) => BigInt(o);
  else if (isNaN(e) || !isFinite(e))
    return F(s);
  let n = "";
  e < 0 && (n = "-", e *= t(-1));
  const i = t(60), r = [e % i];
  return e < 60 ? r.unshift(0) : (e = (e - r[0]) / i, r.unshift(e % i), e >= 60 && (e = (e - r[0]) / i, r.unshift(e))), n + r.map((o) => String(o).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
}
const hs = {
  identify: (s) => typeof s == "bigint" || Number.isInteger(s),
  default: !0,
  tag: "tag:yaml.org,2002:int",
  format: "TIME",
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
  resolve: (s, e, { intAsBigInt: t }) => kt(s, t),
  stringify: us
}, ds = {
  identify: (s) => typeof s == "number",
  default: !0,
  tag: "tag:yaml.org,2002:float",
  format: "TIME",
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
  resolve: (s) => kt(s, !1),
  stringify: us
}, We = {
  identify: (s) => s instanceof Date,
  default: !0,
  tag: "tag:yaml.org,2002:timestamp",
  // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
  // may be omitted altogether, resulting in a date format. In such a case, the time part is
  // assumed to be 00:00:00Z (start of day, UTC).
  test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
  resolve(s) {
    const e = s.match(We.test);
    if (!e)
      throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
    const [, t, n, i, r, o, l] = e.map(Number), a = e[7] ? Number((e[7] + "00").substr(1, 3)) : 0;
    let c = Date.UTC(t, n - 1, i, r || 0, o || 0, l || 0, a);
    const p = e[8];
    if (p && p !== "Z") {
      let f = kt(p, !1);
      Math.abs(f) < 30 && (f *= 60), c -= 6e4 * f;
    }
    return new Date(c);
  },
  stringify: ({ value: s }) => (s == null ? void 0 : s.toISOString().replace(/(T00:00:00)?\.000Z$/, "")) ?? ""
}, Lt = [
  ce,
  fe,
  Je,
  Ye,
  cs,
  fs,
  Zs,
  xs,
  en,
  tn,
  Qs,
  Xs,
  zs,
  mt,
  J,
  yt,
  gt,
  wt,
  hs,
  ds,
  We
], $t = /* @__PURE__ */ new Map([
  ["core", Ys],
  ["failsafe", [ce, fe, Je]],
  ["json", Ws],
  ["yaml11", Lt],
  ["yaml-1.1", Lt]
]), Ct = {
  binary: mt,
  bool: dt,
  float: ts,
  floatExp: es,
  floatNaN: xt,
  floatTime: ds,
  int: is,
  intHex: rs,
  intOct: ns,
  intTime: hs,
  map: ce,
  merge: J,
  null: Ye,
  omap: yt,
  pairs: gt,
  seq: fe,
  set: wt,
  timestamp: We
}, sn = {
  "tag:yaml.org,2002:binary": mt,
  "tag:yaml.org,2002:merge": J,
  "tag:yaml.org,2002:omap": yt,
  "tag:yaml.org,2002:pairs": gt,
  "tag:yaml.org,2002:set": wt,
  "tag:yaml.org,2002:timestamp": We
};
function Xe(s, e, t) {
  const n = $t.get(e);
  if (n && !s)
    return t && !n.includes(J) ? n.concat(J) : n.slice();
  let i = n;
  if (!i)
    if (Array.isArray(s))
      i = [];
    else {
      const r = Array.from($t.keys()).filter((o) => o !== "yaml11").map((o) => JSON.stringify(o)).join(", ");
      throw new Error(`Unknown schema "${e}"; use one of ${r} or define customTags array`);
    }
  if (Array.isArray(s))
    for (const r of s)
      i = i.concat(r);
  else typeof s == "function" && (i = s(i.slice()));
  return t && (i = i.concat(J)), i.reduce((r, o) => {
    const l = typeof o == "string" ? Ct[o] : o;
    if (!l) {
      const a = JSON.stringify(o), c = Object.keys(Ct).map((p) => JSON.stringify(p)).join(", ");
      throw new Error(`Unknown custom tag ${a}; use one of ${c}`);
    }
    return r.includes(l) || r.push(l), r;
  }, []);
}
const nn = (s, e) => s.key < e.key ? -1 : s.key > e.key ? 1 : 0;
class St {
  constructor({ compat: e, customTags: t, merge: n, resolveKnownTags: i, schema: r, sortMapEntries: o, toStringDefaults: l }) {
    this.compat = Array.isArray(e) ? Xe(e, "compat") : e ? Xe(null, e) : null, this.name = typeof r == "string" && r || "core", this.knownTags = i ? sn : {}, this.tags = Xe(t, this.name, n), this.toStringOptions = l ?? null, Object.defineProperty(this, G, { value: ce }), Object.defineProperty(this, U, { value: Je }), Object.defineProperty(this, oe, { value: fe }), this.sortMapEntries = typeof o == "function" ? o : o === !0 ? nn : null;
  }
  clone() {
    const e = Object.create(St.prototype, Object.getOwnPropertyDescriptors(this));
    return e.tags = this.tags.slice(), e;
  }
}
function rn(s, e) {
  var a;
  const t = [];
  let n = e.directives === !0;
  if (e.directives !== !1 && s.directives) {
    const c = s.directives.toString(s);
    c ? (t.push(c), n = !0) : s.directives.docStart && (n = !0);
  }
  n && t.push("---");
  const i = Ht(s, e), { commentString: r } = i.options;
  if (s.commentBefore) {
    t.length !== 1 && t.unshift("");
    const c = r(s.commentBefore);
    t.unshift(V(c, ""));
  }
  let o = !1, l = null;
  if (s.contents) {
    if ($(s.contents)) {
      if (s.contents.spaceBefore && n && t.push(""), s.contents.commentBefore) {
        const f = r(s.contents.commentBefore);
        t.push(V(f, ""));
      }
      i.forceBlockIndent = !!s.comment, l = s.contents.comment;
    }
    const c = l ? void 0 : () => o = !0;
    let p = ie(s.contents, i, () => l = null, c);
    l && (p += W(p, "", r(l))), (p[0] === "|" || p[0] === ">") && t[t.length - 1] === "---" ? t[t.length - 1] = `--- ${p}` : t.push(p);
  } else
    t.push(ie(s.contents, i));
  if ((a = s.directives) != null && a.docEnd)
    if (s.comment) {
      const c = r(s.comment);
      c.includes(`
`) ? (t.push("..."), t.push(V(c, ""))) : t.push(`... ${c}`);
    } else
      t.push("...");
  else {
    let c = s.comment;
    c && o && (c = c.replace(/^\n+/, "")), c && ((!o || l) && t[t.length - 1] !== "" && t.push(""), t.push(V(r(c), "")));
  }
  return t.join(`
`) + `
`;
}
class Ae {
  constructor(e, t, n) {
    this.commentBefore = null, this.comment = null, this.errors = [], this.warnings = [], Object.defineProperty(this, K, { value: tt });
    let i = null;
    typeof t == "function" || Array.isArray(t) ? i = t : n === void 0 && t && (n = t, t = void 0);
    const r = Object.assign({
      intAsBigInt: !1,
      keepSourceTokens: !1,
      logLevel: "warn",
      prettyErrors: !0,
      strict: !0,
      stringKeys: !1,
      uniqueKeys: !0,
      version: "1.2"
    }, n);
    this.options = r;
    let { version: o } = r;
    n != null && n._directives ? (this.directives = n._directives.atDocument(), this.directives.yaml.explicit && (o = this.directives.yaml.version)) : this.directives = new v({ version: o }), this.setSchema(o, n), this.contents = e === void 0 ? null : this.createNode(e, i, n);
  }
  /**
   * Create a deep copy of this Document and its contents.
   *
   * Custom Node values that inherit from `Object` still refer to their original instances.
   */
  clone() {
    const e = Object.create(Ae.prototype, {
      [K]: { value: tt }
    });
    return e.commentBefore = this.commentBefore, e.comment = this.comment, e.errors = this.errors.slice(), e.warnings = this.warnings.slice(), e.options = Object.assign({}, this.options), this.directives && (e.directives = this.directives.clone()), e.schema = this.schema.clone(), e.contents = $(this.contents) ? this.contents.clone(e.schema) : this.contents, this.range && (e.range = this.range.slice()), e;
  }
  /** Adds a value to the document. */
  add(e) {
    z(this.contents) && this.contents.add(e);
  }
  /** Adds a value to the document. */
  addIn(e, t) {
    z(this.contents) && this.contents.addIn(e, t);
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
      const n = qt(this);
      e.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      !t || n.has(t) ? Vt(t || "a", n) : t;
    }
    return new ft(e.anchor);
  }
  createNode(e, t, n) {
    let i;
    if (typeof t == "function")
      e = t.call({ "": e }, "", e), i = t;
    else if (Array.isArray(t)) {
      const m = (b) => typeof b == "number" || b instanceof String || b instanceof Number, y = t.filter(m).map(String);
      y.length > 0 && (t = t.concat(y)), i = t;
    } else n === void 0 && t && (n = t, t = void 0);
    const { aliasDuplicateObjects: r, anchorPrefix: o, flow: l, keepUndefined: a, onTagObj: c, tag: p } = n ?? {}, { onAnchor: f, setAnchors: d, sourceObjects: h } = vs(
      this,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      o || "a"
    ), g = {
      aliasDuplicateObjects: r ?? !0,
      keepUndefined: a ?? !1,
      onAnchor: f,
      onTagObj: c,
      replacer: i,
      schema: this.schema,
      sourceObjects: h
    }, u = ge(e, p, g);
    return l && L(u) && (u.flow = !0), d(), u;
  }
  /**
   * Convert a key and a value into a `Pair` using the current schema,
   * recursively wrapping all values as `Scalar` or `Collection` nodes.
   */
  createPair(e, t, n = {}) {
    const i = this.createNode(e, null, n), r = this.createNode(t, null, n);
    return new M(i, r);
  }
  /**
   * Removes a value from the document.
   * @returns `true` if the item was found and removed.
   */
  delete(e) {
    return z(this.contents) ? this.contents.delete(e) : !1;
  }
  /**
   * Removes a value from the document.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(e) {
    return he(e) ? this.contents == null ? !1 : (this.contents = null, !0) : z(this.contents) ? this.contents.deleteIn(e) : !1;
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  get(e, t) {
    return L(this.contents) ? this.contents.get(e, t) : void 0;
  }
  /**
   * Returns item at `path`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(e, t) {
    return he(e) ? !t && I(this.contents) ? this.contents.value : this.contents : L(this.contents) ? this.contents.getIn(e, t) : void 0;
  }
  /**
   * Checks if the document includes a value with the key `key`.
   */
  has(e) {
    return L(this.contents) ? this.contents.has(e) : !1;
  }
  /**
   * Checks if the document includes a value at `path`.
   */
  hasIn(e) {
    return he(e) ? this.contents !== void 0 : L(this.contents) ? this.contents.hasIn(e) : !1;
  }
  /**
   * Sets a value in this document. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  set(e, t) {
    this.contents == null ? this.contents = Ke(this.schema, [e], t) : z(this.contents) && this.contents.set(e, t);
  }
  /**
   * Sets a value in this document. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(e, t) {
    he(e) ? this.contents = t : this.contents == null ? this.contents = Ke(this.schema, Array.from(e), t) : z(this.contents) && this.contents.setIn(e, t);
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
    let n;
    switch (e) {
      case "1.1":
        this.directives ? this.directives.yaml.version = "1.1" : this.directives = new v({ version: "1.1" }), n = { resolveKnownTags: !1, schema: "yaml-1.1" };
        break;
      case "1.2":
      case "next":
        this.directives ? this.directives.yaml.version = e : this.directives = new v({ version: e }), n = { resolveKnownTags: !0, schema: "core" };
        break;
      case null:
        this.directives && delete this.directives, n = null;
        break;
      default: {
        const i = JSON.stringify(e);
        throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${i}`);
      }
    }
    if (t.schema instanceof Object)
      this.schema = t.schema;
    else if (n)
      this.schema = new St(Object.assign(n, t));
    else
      throw new Error("With a null YAML version, the { schema: Schema } option is required");
  }
  // json & jsonArg are only used from toJSON()
  toJS({ json: e, jsonArg: t, mapAsMap: n, maxAliasCount: i, onAnchor: r, reviver: o } = {}) {
    const l = {
      anchors: /* @__PURE__ */ new Map(),
      doc: this,
      keep: !e,
      mapAsMap: n === !0,
      mapKeyWarned: !1,
      maxAliasCount: typeof i == "number" ? i : 100
    }, a = B(this.contents, t ?? "", l);
    if (typeof r == "function")
      for (const { count: c, res: p } of l.anchors.values())
        r(p, c);
    return typeof o == "function" ? ee(o, { "": a }, "", a) : a;
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
    return rn(this, e);
  }
}
function z(s) {
  if (L(s))
    return !0;
  throw new Error("Expected a YAML collection as document contents");
}
class ps extends Error {
  constructor(e, t, n, i) {
    super(), this.name = e, this.code = n, this.message = i, this.pos = t;
  }
}
class de extends ps {
  constructor(e, t, n) {
    super("YAMLParseError", e, t, n);
  }
}
class on extends ps {
  constructor(e, t, n) {
    super("YAMLWarning", e, t, n);
  }
}
const _t = (s, e) => (t) => {
  if (t.pos[0] === -1)
    return;
  t.linePos = t.pos.map((l) => e.linePos(l));
  const { line: n, col: i } = t.linePos[0];
  t.message += ` at line ${n}, column ${i}`;
  let r = i - 1, o = s.substring(e.lineStarts[n - 1], e.lineStarts[n]).replace(/[\n\r]+$/, "");
  if (r >= 60 && o.length > 80) {
    const l = Math.min(r - 39, o.length - 79);
    o = "…" + o.substring(l), r -= l - 1;
  }
  if (o.length > 80 && (o = o.substring(0, 79) + "…"), n > 1 && /^ *$/.test(o.substring(0, r))) {
    let l = s.substring(e.lineStarts[n - 2], e.lineStarts[n - 1]);
    l.length > 80 && (l = l.substring(0, 79) + `…
`), o = l + o;
  }
  if (/[^ ]/.test(o)) {
    let l = 1;
    const a = t.linePos[1];
    (a == null ? void 0 : a.line) === n && a.col > i && (l = Math.max(1, Math.min(a.col - i, 80 - r)));
    const c = " ".repeat(r) + "^".repeat(l);
    t.message += `:

${o}
${c}
`;
  }
};
function re(s, { flow: e, indicator: t, next: n, offset: i, onError: r, parentIndent: o, startOnNewline: l }) {
  let a = !1, c = l, p = l, f = "", d = "", h = !1, g = !1, u = null, m = null, y = null, b = null, S = null, k = null, N = null;
  for (const w of s)
    switch (g && (w.type !== "space" && w.type !== "newline" && w.type !== "comma" && r(w.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space"), g = !1), u && (c && w.type !== "comment" && w.type !== "newline" && r(u, "TAB_AS_INDENT", "Tabs are not allowed as indentation"), u = null), w.type) {
      case "space":
        !e && (t !== "doc-start" || (n == null ? void 0 : n.type) !== "flow-collection") && w.source.includes("	") && (u = w), p = !0;
        break;
      case "comment": {
        p || r(w, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
        const E = w.source.substring(1) || " ";
        f ? f += d + E : f = E, d = "", c = !1;
        break;
      }
      case "newline":
        c ? f ? f += w.source : (!k || t !== "seq-item-ind") && (a = !0) : d += w.source, c = !0, h = !0, (m || y) && (b = w), p = !0;
        break;
      case "anchor":
        m && r(w, "MULTIPLE_ANCHORS", "A node can have at most one anchor"), w.source.endsWith(":") && r(w.offset + w.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", !0), m = w, N ?? (N = w.offset), c = !1, p = !1, g = !0;
        break;
      case "tag": {
        y && r(w, "MULTIPLE_TAGS", "A node can have at most one tag"), y = w, N ?? (N = w.offset), c = !1, p = !1, g = !0;
        break;
      }
      case t:
        (m || y) && r(w, "BAD_PROP_ORDER", `Anchors and tags must be after the ${w.source} indicator`), k && r(w, "UNEXPECTED_TOKEN", `Unexpected ${w.source} in ${e ?? "collection"}`), k = w, c = t === "seq-item-ind" || t === "explicit-key-ind", p = !1;
        break;
      case "comma":
        if (e) {
          S && r(w, "UNEXPECTED_TOKEN", `Unexpected , in ${e}`), S = w, c = !1, p = !1;
          break;
        }
      // else fallthrough
      default:
        r(w, "UNEXPECTED_TOKEN", `Unexpected ${w.type} token`), c = !1, p = !1;
    }
  const T = s[s.length - 1], A = T ? T.offset + T.source.length : i;
  return g && n && n.type !== "space" && n.type !== "newline" && n.type !== "comma" && (n.type !== "scalar" || n.source !== "") && r(n.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space"), u && (c && u.indent <= o || (n == null ? void 0 : n.type) === "block-map" || (n == null ? void 0 : n.type) === "block-seq") && r(u, "TAB_AS_INDENT", "Tabs are not allowed as indentation"), {
    comma: S,
    found: k,
    spaceBefore: a,
    comment: f,
    hasNewline: h,
    anchor: m,
    tag: y,
    newlineAfterProp: b,
    end: A,
    start: N ?? A
  };
}
function ye(s) {
  if (!s)
    return null;
  switch (s.type) {
    case "alias":
    case "scalar":
    case "double-quoted-scalar":
    case "single-quoted-scalar":
      if (s.source.includes(`
`))
        return !0;
      if (s.end) {
        for (const e of s.end)
          if (e.type === "newline")
            return !0;
      }
      return !1;
    case "flow-collection":
      for (const e of s.items) {
        for (const t of e.start)
          if (t.type === "newline")
            return !0;
        if (e.sep) {
          for (const t of e.sep)
            if (t.type === "newline")
              return !0;
        }
        if (ye(e.key) || ye(e.value))
          return !0;
      }
      return !1;
    default:
      return !0;
  }
}
function rt(s, e, t) {
  if ((e == null ? void 0 : e.type) === "flow-collection") {
    const n = e.end[0];
    n.indent === s && (n.source === "]" || n.source === "}") && ye(e) && t(n, "BAD_INDENT", "Flow end indicator should be more indented than parent", !0);
  }
}
function ms(s, e, t) {
  const { uniqueKeys: n } = s.options;
  if (n === !1)
    return !1;
  const i = typeof n == "function" ? n : (r, o) => r === o || I(r) && I(o) && r.value === o.value;
  return e.some((r) => i(r.key, t));
}
const vt = "All mapping items must start at the same column";
function ln({ composeNode: s, composeEmptyNode: e }, t, n, i, r) {
  var p;
  const o = (r == null ? void 0 : r.nodeClass) ?? P, l = new o(t.schema);
  t.atRoot && (t.atRoot = !1);
  let a = n.offset, c = null;
  for (const f of n.items) {
    const { start: d, key: h, sep: g, value: u } = f, m = re(d, {
      indicator: "explicit-key-ind",
      next: h ?? (g == null ? void 0 : g[0]),
      offset: a,
      onError: i,
      parentIndent: n.indent,
      startOnNewline: !0
    }), y = !m.found;
    if (y) {
      if (h && (h.type === "block-seq" ? i(a, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key") : "indent" in h && h.indent !== n.indent && i(a, "BAD_INDENT", vt)), !m.anchor && !m.tag && !g) {
        c = m.end, m.comment && (l.comment ? l.comment += `
` + m.comment : l.comment = m.comment);
        continue;
      }
      (m.newlineAfterProp || ye(h)) && i(h ?? d[d.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
    } else ((p = m.found) == null ? void 0 : p.indent) !== n.indent && i(a, "BAD_INDENT", vt);
    t.atKey = !0;
    const b = m.end, S = h ? s(t, h, m, i) : e(t, b, d, null, m, i);
    t.schema.compat && rt(n.indent, h, i), t.atKey = !1, ms(t, l.items, S) && i(b, "DUPLICATE_KEY", "Map keys must be unique");
    const k = re(g ?? [], {
      indicator: "map-value-ind",
      next: u,
      offset: S.range[2],
      onError: i,
      parentIndent: n.indent,
      startOnNewline: !h || h.type === "block-scalar"
    });
    if (a = k.end, k.found) {
      y && ((u == null ? void 0 : u.type) === "block-map" && !k.hasNewline && i(a, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings"), t.options.strict && m.start < k.found.offset - 1024 && i(S.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key"));
      const N = u ? s(t, u, k, i) : e(t, a, g, null, k, i);
      t.schema.compat && rt(n.indent, u, i), a = N.range[2];
      const T = new M(S, N);
      t.options.keepSourceTokens && (T.srcToken = f), l.items.push(T);
    } else {
      y && i(S.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values"), k.comment && (S.comment ? S.comment += `
` + k.comment : S.comment = k.comment);
      const N = new M(S);
      t.options.keepSourceTokens && (N.srcToken = f), l.items.push(N);
    }
  }
  return c && c < a && i(c, "IMPOSSIBLE", "Map comment with trailing content"), l.range = [n.offset, a, c ?? a], l;
}
function an({ composeNode: s, composeEmptyNode: e }, t, n, i, r) {
  const o = (r == null ? void 0 : r.nodeClass) ?? X, l = new o(t.schema);
  t.atRoot && (t.atRoot = !1), t.atKey && (t.atKey = !1);
  let a = n.offset, c = null;
  for (const { start: p, value: f } of n.items) {
    const d = re(p, {
      indicator: "seq-item-ind",
      next: f,
      offset: a,
      onError: i,
      parentIndent: n.indent,
      startOnNewline: !0
    });
    if (!d.found)
      if (d.anchor || d.tag || f)
        (f == null ? void 0 : f.type) === "block-seq" ? i(d.end, "BAD_INDENT", "All sequence items must start at the same column") : i(a, "MISSING_CHAR", "Sequence item without - indicator");
      else {
        c = d.end, d.comment && (l.comment = d.comment);
        continue;
      }
    const h = f ? s(t, f, d, i) : e(t, d.end, p, null, d, i);
    t.schema.compat && rt(n.indent, f, i), a = h.range[2], l.items.push(h);
  }
  return l.range = [n.offset, a, c ?? a], l;
}
function Te(s, e, t, n) {
  let i = "";
  if (s) {
    let r = !1, o = "";
    for (const l of s) {
      const { source: a, type: c } = l;
      switch (c) {
        case "space":
          r = !0;
          break;
        case "comment": {
          t && !r && n(l, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const p = a.substring(1) || " ";
          i ? i += o + p : i = p, o = "";
          break;
        }
        case "newline":
          i && (o += a), r = !0;
          break;
        default:
          n(l, "UNEXPECTED_TOKEN", `Unexpected ${c} at node end`);
      }
      e += a.length;
    }
  }
  return { comment: i, offset: e };
}
const ze = "Block collections are not allowed within flow collections", Ze = (s) => s && (s.type === "block-map" || s.type === "block-seq");
function cn({ composeNode: s, composeEmptyNode: e }, t, n, i, r) {
  var m;
  const o = n.start.source === "{", l = o ? "flow map" : "flow sequence", a = (r == null ? void 0 : r.nodeClass) ?? (o ? P : X), c = new a(t.schema);
  c.flow = !0;
  const p = t.atRoot;
  p && (t.atRoot = !1), t.atKey && (t.atKey = !1);
  let f = n.offset + n.start.source.length;
  for (let y = 0; y < n.items.length; ++y) {
    const b = n.items[y], { start: S, key: k, sep: N, value: T } = b, A = re(S, {
      flow: l,
      indicator: "explicit-key-ind",
      next: k ?? (N == null ? void 0 : N[0]),
      offset: f,
      onError: i,
      parentIndent: n.indent,
      startOnNewline: !1
    });
    if (!A.found) {
      if (!A.anchor && !A.tag && !N && !T) {
        y === 0 && A.comma ? i(A.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${l}`) : y < n.items.length - 1 && i(A.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${l}`), A.comment && (c.comment ? c.comment += `
` + A.comment : c.comment = A.comment), f = A.end;
        continue;
      }
      !o && t.options.strict && ye(k) && i(
        k,
        // checked by containsNewline()
        "MULTILINE_IMPLICIT_KEY",
        "Implicit keys of flow sequence pairs need to be on a single line"
      );
    }
    if (y === 0)
      A.comma && i(A.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${l}`);
    else if (A.comma || i(A.start, "MISSING_CHAR", `Missing , between ${l} items`), A.comment) {
      let w = "";
      e: for (const E of S)
        switch (E.type) {
          case "comma":
          case "space":
            break;
          case "comment":
            w = E.source.substring(1);
            break e;
          default:
            break e;
        }
      if (w) {
        let E = c.items[c.items.length - 1];
        C(E) && (E = E.value ?? E.key), E.comment ? E.comment += `
` + w : E.comment = w, A.comment = A.comment.substring(w.length + 1);
      }
    }
    if (!o && !N && !A.found) {
      const w = T ? s(t, T, A, i) : e(t, A.end, N, null, A, i);
      c.items.push(w), f = w.range[2], Ze(T) && i(w.range, "BLOCK_IN_FLOW", ze);
    } else {
      t.atKey = !0;
      const w = A.end, E = k ? s(t, k, A, i) : e(t, w, S, null, A, i);
      Ze(k) && i(E.range, "BLOCK_IN_FLOW", ze), t.atKey = !1;
      const _ = re(N ?? [], {
        flow: l,
        indicator: "map-value-ind",
        next: T,
        offset: E.range[2],
        onError: i,
        parentIndent: n.indent,
        startOnNewline: !1
      });
      if (_.found) {
        if (!o && !A.found && t.options.strict) {
          if (N)
            for (const j of N) {
              if (j === _.found)
                break;
              if (j.type === "newline") {
                i(j, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                break;
              }
            }
          A.start < _.found.offset - 1024 && i(_.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
        }
      } else T && ("source" in T && ((m = T.source) == null ? void 0 : m[0]) === ":" ? i(T, "MISSING_CHAR", `Missing space after : in ${l}`) : i(_.start, "MISSING_CHAR", `Missing , or : between ${l} items`));
      const q = T ? s(t, T, _, i) : _.found ? e(t, _.end, N, null, _, i) : null;
      q ? Ze(T) && i(q.range, "BLOCK_IN_FLOW", ze) : _.comment && (E.comment ? E.comment += `
` + _.comment : E.comment = _.comment);
      const D = new M(E, q);
      if (t.options.keepSourceTokens && (D.srcToken = b), o) {
        const j = c;
        ms(t, j.items, E) && i(w, "DUPLICATE_KEY", "Map keys must be unique"), j.items.push(D);
      } else {
        const j = new P(t.schema);
        j.flow = !0, j.items.push(D);
        const Tt = (q ?? E).range;
        j.range = [E.range[0], Tt[1], Tt[2]], c.items.push(j);
      }
      f = q ? q.range[2] : _.end;
    }
  }
  const d = o ? "}" : "]", [h, ...g] = n.end;
  let u = f;
  if ((h == null ? void 0 : h.source) === d)
    u = h.offset + h.source.length;
  else {
    const y = l[0].toUpperCase() + l.substring(1), b = p ? `${y} must end with a ${d}` : `${y} in block collection must be sufficiently indented and end with a ${d}`;
    i(f, p ? "MISSING_CHAR" : "BAD_INDENT", b), h && h.source.length !== 1 && g.unshift(h);
  }
  if (g.length > 0) {
    const y = Te(g, u, t.options.strict, i);
    y.comment && (c.comment ? c.comment += `
` + y.comment : c.comment = y.comment), c.range = [n.offset, u, y.offset];
  } else
    c.range = [n.offset, u, u];
  return c;
}
function xe(s, e, t, n, i, r) {
  const o = t.type === "block-map" ? ln(s, e, t, n, r) : t.type === "block-seq" ? an(s, e, t, n, r) : cn(s, e, t, n, r), l = o.constructor;
  return i === "!" || i === l.tagName ? (o.tag = l.tagName, o) : (i && (o.tag = i), o);
}
function fn(s, e, t, n, i) {
  var d;
  const r = n.tag, o = r ? e.directives.tagName(r.source, (h) => i(r, "TAG_RESOLVE_FAILED", h)) : null;
  if (t.type === "block-seq") {
    const { anchor: h, newlineAfterProp: g } = n, u = h && r ? h.offset > r.offset ? h : r : h ?? r;
    u && (!g || g.offset < u.offset) && i(u, "MISSING_CHAR", "Missing newline after block sequence props");
  }
  const l = t.type === "block-map" ? "map" : t.type === "block-seq" ? "seq" : t.start.source === "{" ? "map" : "seq";
  if (!r || !o || o === "!" || o === P.tagName && l === "map" || o === X.tagName && l === "seq")
    return xe(s, e, t, i, o);
  let a = e.schema.tags.find((h) => h.tag === o && h.collection === l);
  if (!a) {
    const h = e.schema.knownTags[o];
    if ((h == null ? void 0 : h.collection) === l)
      e.schema.tags.push(Object.assign({}, h, { default: !1 })), a = h;
    else
      return h ? i(r, "BAD_COLLECTION_TYPE", `${h.tag} used for ${l} collection, but expects ${h.collection ?? "scalar"}`, !0) : i(r, "TAG_RESOLVE_FAILED", `Unresolved tag: ${o}`, !0), xe(s, e, t, i, o);
  }
  const c = xe(s, e, t, i, o, a), p = ((d = a.resolve) == null ? void 0 : d.call(a, c, (h) => i(r, "TAG_RESOLVE_FAILED", h), e.options)) ?? c, f = $(p) ? p : new O(p);
  return f.range = c.range, f.tag = o, a != null && a.format && (f.format = a.format), f;
}
function un(s, e, t) {
  const n = e.offset, i = hn(e, s.options.strict, t);
  if (!i)
    return { value: "", type: null, comment: "", range: [n, n, n] };
  const r = i.mode === ">" ? O.BLOCK_FOLDED : O.BLOCK_LITERAL, o = e.source ? dn(e.source) : [];
  let l = o.length;
  for (let u = o.length - 1; u >= 0; --u) {
    const m = o[u][1];
    if (m === "" || m === "\r")
      l = u;
    else
      break;
  }
  if (l === 0) {
    const u = i.chomp === "+" && o.length > 0 ? `
`.repeat(Math.max(1, o.length - 1)) : "";
    let m = n + i.length;
    return e.source && (m += e.source.length), { value: u, type: r, comment: i.comment, range: [n, m, m] };
  }
  let a = e.indent + i.indent, c = e.offset + i.length, p = 0;
  for (let u = 0; u < l; ++u) {
    const [m, y] = o[u];
    if (y === "" || y === "\r")
      i.indent === 0 && m.length > a && (a = m.length);
    else {
      m.length < a && t(c + m.length, "MISSING_CHAR", "Block scalars with more-indented leading empty lines must use an explicit indentation indicator"), i.indent === 0 && (a = m.length), p = u, a === 0 && !s.atRoot && t(c, "BAD_INDENT", "Block scalar values in collections must be indented");
      break;
    }
    c += m.length + y.length + 1;
  }
  for (let u = o.length - 1; u >= l; --u)
    o[u][0].length > a && (l = u + 1);
  let f = "", d = "", h = !1;
  for (let u = 0; u < p; ++u)
    f += o[u][0].slice(a) + `
`;
  for (let u = p; u < l; ++u) {
    let [m, y] = o[u];
    c += m.length + y.length + 1;
    const b = y[y.length - 1] === "\r";
    if (b && (y = y.slice(0, -1)), y && m.length < a) {
      const k = `Block scalar lines must not be less indented than their ${i.indent ? "explicit indentation indicator" : "first line"}`;
      t(c - y.length - (b ? 2 : 1), "BAD_INDENT", k), m = "";
    }
    r === O.BLOCK_LITERAL ? (f += d + m.slice(a) + y, d = `
`) : m.length > a || y[0] === "	" ? (d === " " ? d = `
` : !h && d === `
` && (d = `

`), f += d + m.slice(a) + y, d = `
`, h = !0) : y === "" ? d === `
` ? f += `
` : d = `
` : (f += d + y, d = " ", h = !1);
  }
  switch (i.chomp) {
    case "-":
      break;
    case "+":
      for (let u = l; u < o.length; ++u)
        f += `
` + o[u][0].slice(a);
      f[f.length - 1] !== `
` && (f += `
`);
      break;
    default:
      f += `
`;
  }
  const g = n + i.length + e.source.length;
  return { value: f, type: r, comment: i.comment, range: [n, g, g] };
}
function hn({ offset: s, props: e }, t, n) {
  if (e[0].type !== "block-scalar-header")
    return n(e[0], "IMPOSSIBLE", "Block scalar header not found"), null;
  const { source: i } = e[0], r = i[0];
  let o = 0, l = "", a = -1;
  for (let d = 1; d < i.length; ++d) {
    const h = i[d];
    if (!l && (h === "-" || h === "+"))
      l = h;
    else {
      const g = Number(h);
      !o && g ? o = g : a === -1 && (a = s + d);
    }
  }
  a !== -1 && n(a, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${i}`);
  let c = !1, p = "", f = i.length;
  for (let d = 1; d < e.length; ++d) {
    const h = e[d];
    switch (h.type) {
      case "space":
        c = !0;
      // fallthrough
      case "newline":
        f += h.source.length;
        break;
      case "comment":
        t && !c && n(h, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters"), f += h.source.length, p = h.source.substring(1);
        break;
      case "error":
        n(h, "UNEXPECTED_TOKEN", h.message), f += h.source.length;
        break;
      /* istanbul ignore next should not happen */
      default: {
        const g = `Unexpected token in block scalar header: ${h.type}`;
        n(h, "UNEXPECTED_TOKEN", g);
        const u = h.source;
        u && typeof u == "string" && (f += u.length);
      }
    }
  }
  return { mode: r, indent: o, chomp: l, comment: p, length: f };
}
function dn(s) {
  const e = s.split(/\n( *)/), t = e[0], n = t.match(/^( *)/), r = [n != null && n[1] ? [n[1], t.slice(n[1].length)] : ["", t]];
  for (let o = 1; o < e.length; o += 2)
    r.push([e[o], e[o + 1]]);
  return r;
}
function pn(s, e, t) {
  const { offset: n, type: i, source: r, end: o } = s;
  let l, a;
  const c = (d, h, g) => t(n + d, h, g);
  switch (i) {
    case "scalar":
      l = O.PLAIN, a = mn(r, c);
      break;
    case "single-quoted-scalar":
      l = O.QUOTE_SINGLE, a = gn(r, c);
      break;
    case "double-quoted-scalar":
      l = O.QUOTE_DOUBLE, a = yn(r, c);
      break;
    /* istanbul ignore next should not happen */
    default:
      return t(s, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${i}`), {
        value: "",
        type: null,
        comment: "",
        range: [n, n + r.length, n + r.length]
      };
  }
  const p = n + r.length, f = Te(o, p, e, t);
  return {
    value: a,
    type: l,
    comment: f.comment,
    range: [n, p, f.offset]
  };
}
function mn(s, e) {
  let t = "";
  switch (s[0]) {
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
      t = `block scalar indicator ${s[0]}`;
      break;
    }
    case "@":
    case "`": {
      t = `reserved character ${s[0]}`;
      break;
    }
  }
  return t && e(0, "BAD_SCALAR_START", `Plain value cannot start with ${t}`), gs(s);
}
function gn(s, e) {
  return (s[s.length - 1] !== "'" || s.length === 1) && e(s.length, "MISSING_CHAR", "Missing closing 'quote"), gs(s.slice(1, -1)).replace(/''/g, "'");
}
function gs(s) {
  let e, t;
  try {
    e = new RegExp(`(.*?)(?<![ 	])[ 	]*\r?
`, "sy"), t = new RegExp(`[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?
`, "sy");
  } catch {
    e = /(.*?)[ \t]*\r?\n/sy, t = /[ \t]*(.*?)[ \t]*\r?\n/sy;
  }
  let n = e.exec(s);
  if (!n)
    return s;
  let i = n[1], r = " ", o = e.lastIndex;
  for (t.lastIndex = o; n = t.exec(s); )
    n[1] === "" ? r === `
` ? i += r : r = `
` : (i += r + n[1], r = " "), o = t.lastIndex;
  const l = /[ \t]*(.*)/sy;
  return l.lastIndex = o, n = l.exec(s), i + r + ((n == null ? void 0 : n[1]) ?? "");
}
function yn(s, e) {
  let t = "";
  for (let n = 1; n < s.length - 1; ++n) {
    const i = s[n];
    if (!(i === "\r" && s[n + 1] === `
`))
      if (i === `
`) {
        const { fold: r, offset: o } = bn(s, n);
        t += r, n = o;
      } else if (i === "\\") {
        let r = s[++n];
        const o = wn[r];
        if (o)
          t += o;
        else if (r === `
`)
          for (r = s[n + 1]; r === " " || r === "	"; )
            r = s[++n + 1];
        else if (r === "\r" && s[n + 1] === `
`)
          for (r = s[++n + 1]; r === " " || r === "	"; )
            r = s[++n + 1];
        else if (r === "x" || r === "u" || r === "U") {
          const l = r === "x" ? 2 : r === "u" ? 4 : 8;
          t += kn(s, n + 1, l, e), n += l;
        } else {
          const l = s.substr(n - 1, 2);
          e(n - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${l}`), t += l;
        }
      } else if (i === " " || i === "	") {
        const r = n;
        let o = s[n + 1];
        for (; o === " " || o === "	"; )
          o = s[++n + 1];
        o !== `
` && !(o === "\r" && s[n + 2] === `
`) && (t += n > r ? s.slice(r, n + 1) : i);
      } else
        t += i;
  }
  return (s[s.length - 1] !== '"' || s.length === 1) && e(s.length, "MISSING_CHAR", 'Missing closing "quote'), t;
}
function bn(s, e) {
  let t = "", n = s[e + 1];
  for (; (n === " " || n === "	" || n === `
` || n === "\r") && !(n === "\r" && s[e + 2] !== `
`); )
    n === `
` && (t += `
`), e += 1, n = s[e + 1];
  return t || (t = " "), { fold: t, offset: e };
}
const wn = {
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
function kn(s, e, t, n) {
  const i = s.substr(e, t), o = i.length === t && /^[0-9a-fA-F]+$/.test(i) ? parseInt(i, 16) : NaN;
  try {
    return String.fromCodePoint(o);
  } catch {
    const l = s.substr(e - 2, t + 2);
    return n(e - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${l}`), l;
  }
}
function ys(s, e, t, n) {
  const { value: i, type: r, comment: o, range: l } = e.type === "block-scalar" ? un(s, e, n) : pn(e, s.options.strict, n), a = t ? s.directives.tagName(t.source, (f) => n(t, "TAG_RESOLVE_FAILED", f)) : null;
  let c;
  s.options.stringKeys && s.atKey ? c = s.schema[U] : a ? c = Sn(s.schema, i, a, t, n) : e.type === "scalar" ? c = Nn(s, i, e, n) : c = s.schema[U];
  let p;
  try {
    const f = c.resolve(i, (d) => n(t ?? e, "TAG_RESOLVE_FAILED", d), s.options);
    p = I(f) ? f : new O(f);
  } catch (f) {
    const d = f instanceof Error ? f.message : String(f);
    n(t ?? e, "TAG_RESOLVE_FAILED", d), p = new O(i);
  }
  return p.range = l, p.source = i, r && (p.type = r), a && (p.tag = a), c.format && (p.format = c.format), o && (p.comment = o), p;
}
function Sn(s, e, t, n, i) {
  var l;
  if (t === "!")
    return s[U];
  const r = [];
  for (const a of s.tags)
    if (!a.collection && a.tag === t)
      if (a.default && a.test)
        r.push(a);
      else
        return a;
  for (const a of r)
    if ((l = a.test) != null && l.test(e))
      return a;
  const o = s.knownTags[t];
  return o && !o.collection ? (s.tags.push(Object.assign({}, o, { default: !1, test: void 0 })), o) : (i(n, "TAG_RESOLVE_FAILED", `Unresolved tag: ${t}`, t !== "tag:yaml.org,2002:str"), s[U]);
}
function Nn({ atKey: s, directives: e, schema: t }, n, i, r) {
  const o = t.tags.find((l) => {
    var a;
    return (l.default === !0 || s && l.default === "key") && ((a = l.test) == null ? void 0 : a.test(n));
  }) || t[U];
  if (t.compat) {
    const l = t.compat.find((a) => {
      var c;
      return a.default && ((c = a.test) == null ? void 0 : c.test(n));
    }) ?? t[U];
    if (o.tag !== l.tag) {
      const a = e.tagString(o.tag), c = e.tagString(l.tag), p = `Value may be parsed as either ${a} or ${c}`;
      r(i, "TAG_RESOLVE_FAILED", p, !0);
    }
  }
  return o;
}
function On(s, e, t) {
  if (e) {
    t ?? (t = e.length);
    for (let n = t - 1; n >= 0; --n) {
      let i = e[n];
      switch (i.type) {
        case "space":
        case "comment":
        case "newline":
          s -= i.source.length;
          continue;
      }
      for (i = e[++n]; (i == null ? void 0 : i.type) === "space"; )
        s += i.source.length, i = e[++n];
      break;
    }
  }
  return s;
}
const An = { composeNode: bs, composeEmptyNode: Nt };
function bs(s, e, t, n) {
  const i = s.atKey, { spaceBefore: r, comment: o, anchor: l, tag: a } = t;
  let c, p = !0;
  switch (e.type) {
    case "alias":
      c = Tn(s, e, n), (l || a) && n(e, "ALIAS_PROPS", "An alias node must not specify any properties");
      break;
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "block-scalar":
      c = ys(s, e, a, n), l && (c.anchor = l.source.substring(1));
      break;
    case "block-map":
    case "block-seq":
    case "flow-collection":
      try {
        c = fn(An, s, e, t, n), l && (c.anchor = l.source.substring(1));
      } catch (f) {
        const d = f instanceof Error ? f.message : String(f);
        n(e, "RESOURCE_EXHAUSTION", d);
      }
      break;
    default: {
      const f = e.type === "error" ? e.message : `Unsupported token (type: ${e.type})`;
      n(e, "UNEXPECTED_TOKEN", f), p = !1;
    }
  }
  return c ?? (c = Nt(s, e.offset, void 0, null, t, n)), l && c.anchor === "" && n(l, "BAD_ALIAS", "Anchor cannot be an empty string"), i && s.options.stringKeys && (!I(c) || typeof c.value != "string" || c.tag && c.tag !== "tag:yaml.org,2002:str") && n(a ?? e, "NON_STRING_KEY", "With stringKeys, all keys must be strings"), r && (c.spaceBefore = !0), o && (e.type === "scalar" && e.source === "" ? c.comment = o : c.commentBefore = o), s.options.keepSourceTokens && p && (c.srcToken = e), c;
}
function Nt(s, e, t, n, { spaceBefore: i, comment: r, anchor: o, tag: l, end: a }, c) {
  const p = {
    type: "scalar",
    offset: On(e, t, n),
    indent: -1,
    source: ""
  }, f = ys(s, p, l, c);
  return o && (f.anchor = o.source.substring(1), f.anchor === "" && c(o, "BAD_ALIAS", "Anchor cannot be an empty string")), i && (f.spaceBefore = !0), r && (f.comment = r, f.range[2] = a), f;
}
function Tn({ options: s }, { offset: e, source: t, end: n }, i) {
  const r = new ft(t.substring(1));
  r.source === "" && i(e, "BAD_ALIAS", "Alias cannot be an empty string"), r.source.endsWith(":") && i(e + t.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", !0);
  const o = e + t.length, l = Te(n, o, s.strict, i);
  return r.range = [e, o, l.offset], l.comment && (r.comment = l.comment), r;
}
function En(s, e, { offset: t, start: n, value: i, end: r }, o) {
  const l = Object.assign({ _directives: e }, s), a = new Ae(void 0, l), c = {
    atKey: !1,
    atRoot: !0,
    directives: a.directives,
    options: a.options,
    schema: a.schema
  }, p = re(n, {
    indicator: "doc-start",
    next: i ?? (r == null ? void 0 : r[0]),
    offset: t,
    onError: o,
    parentIndent: 0,
    startOnNewline: !0
  });
  p.found && (a.directives.docStart = !0, i && (i.type === "block-map" || i.type === "block-seq") && !p.hasNewline && o(p.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker")), a.contents = i ? bs(c, i, p, o) : Nt(c, p.end, n, null, p, o);
  const f = a.contents.range[2], d = Te(r, f, !1, o);
  return d.comment && (a.comment = d.comment), a.range = [t, f, d.offset], a;
}
function ue(s) {
  if (typeof s == "number")
    return [s, s + 1];
  if (Array.isArray(s))
    return s.length === 2 ? s : [s[0], s[1]];
  const { offset: e, source: t } = s;
  return [e, e + (typeof t == "string" ? t.length : 1)];
}
function Mt(s) {
  var i;
  let e = "", t = !1, n = !1;
  for (let r = 0; r < s.length; ++r) {
    const o = s[r];
    switch (o[0]) {
      case "#":
        e += (e === "" ? "" : n ? `

` : `
`) + (o.substring(1) || " "), t = !0, n = !1;
        break;
      case "%":
        ((i = s[r + 1]) == null ? void 0 : i[0]) !== "#" && (r += 1), t = !1;
        break;
      default:
        t || (n = !0), t = !1;
    }
  }
  return { comment: e, afterEmptyLine: n };
}
class In {
  constructor(e = {}) {
    this.doc = null, this.atDirectives = !1, this.prelude = [], this.errors = [], this.warnings = [], this.onError = (t, n, i, r) => {
      const o = ue(t);
      r ? this.warnings.push(new on(o, n, i)) : this.errors.push(new de(o, n, i));
    }, this.directives = new v({ version: e.version || "1.2" }), this.options = e;
  }
  decorate(e, t) {
    const { comment: n, afterEmptyLine: i } = Mt(this.prelude);
    if (n) {
      const r = e.contents;
      if (t)
        e.comment = e.comment ? `${e.comment}
${n}` : n;
      else if (i || e.directives.docStart || !r)
        e.commentBefore = n;
      else if (L(r) && !r.flow && r.items.length > 0) {
        let o = r.items[0];
        C(o) && (o = o.key);
        const l = o.commentBefore;
        o.commentBefore = l ? `${n}
${l}` : n;
      } else {
        const o = r.commentBefore;
        r.commentBefore = o ? `${n}
${o}` : n;
      }
    }
    if (t) {
      for (let r = 0; r < this.errors.length; ++r)
        e.errors.push(this.errors[r]);
      for (let r = 0; r < this.warnings.length; ++r)
        e.warnings.push(this.warnings[r]);
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
      comment: Mt(this.prelude).comment,
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
  *compose(e, t = !1, n = -1) {
    for (const i of e)
      yield* this.next(i);
    yield* this.end(t, n);
  }
  /** Advance the composer by one CST token. */
  *next(e) {
    switch (e.type) {
      case "directive":
        this.directives.add(e.source, (t, n, i) => {
          const r = ue(e);
          r[0] += t, this.onError(r, "BAD_DIRECTIVE", n, i);
        }), this.prelude.push(e.source), this.atDirectives = !0;
        break;
      case "document": {
        const t = En(this.options, this.directives, e, this.onError);
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
        const t = e.source ? `${e.message}: ${JSON.stringify(e.source)}` : e.message, n = new de(ue(e), "UNEXPECTED_TOKEN", t);
        this.atDirectives || !this.doc ? this.errors.push(n) : this.doc.errors.push(n);
        break;
      }
      case "doc-end": {
        if (!this.doc) {
          const n = "Unexpected doc-end without preceding document";
          this.errors.push(new de(ue(e), "UNEXPECTED_TOKEN", n));
          break;
        }
        this.doc.directives.docEnd = !0;
        const t = Te(e.end, e.offset + e.source.length, this.doc.options.strict, this.onError);
        if (this.decorate(this.doc, !0), t.comment) {
          const n = this.doc.comment;
          this.doc.comment = n ? `${n}
${t.comment}` : t.comment;
        }
        this.doc.range[2] = t.offset;
        break;
      }
      default:
        this.errors.push(new de(ue(e), "UNEXPECTED_TOKEN", `Unsupported token ${e.type}`));
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
      const n = Object.assign({ _directives: this.directives }, this.options), i = new Ae(void 0, n);
      this.atDirectives && this.onError(t, "MISSING_CHAR", "Missing directives-end indicator line"), i.range = [0, t, t], this.decorate(i, !1), yield i;
    }
  }
}
const ws = "\uFEFF", ks = "", Ss = "", ot = "";
function Ln(s) {
  switch (s) {
    case ws:
      return "byte-order-mark";
    case ks:
      return "doc-mode";
    case Ss:
      return "flow-error-end";
    case ot:
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
  switch (s[0]) {
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
function R(s) {
  switch (s) {
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
const Pt = new Set("0123456789ABCDEFabcdef"), $n = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()"), $e = new Set(",[]{}"), Cn = new Set(` ,[]{}
\r	`), et = (s) => !s || Cn.has(s);
class _n {
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
    let n = this.next ?? "stream";
    for (; n && (t || this.hasChars(1)); )
      n = yield* this.parseNext(n);
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
      let n = 0;
      for (; t === " "; )
        t = this.buffer[++n + e];
      if (t === "\r") {
        const i = this.buffer[n + e + 1];
        if (i === `
` || !i && !this.atEnd)
          return e + n + 1;
      }
      return t === `
` || n >= this.indentNext || !t && !this.atEnd ? e + n : -1;
    }
    if (t === "-" || t === ".") {
      const n = this.buffer.substr(e, 3);
      if ((n === "---" || n === "...") && R(this.buffer[e + 3]))
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
    if (e[0] === ws && (yield* this.pushCount(1), e = e.substring(1)), e[0] === "%") {
      let t = e.length, n = e.indexOf("#");
      for (; n !== -1; ) {
        const r = e[n - 1];
        if (r === " " || r === "	") {
          t = n - 1;
          break;
        } else
          n = e.indexOf("#", n + 1);
      }
      for (; ; ) {
        const r = e[t - 1];
        if (r === " " || r === "	")
          t -= 1;
        else
          break;
      }
      const i = (yield* this.pushCount(t)) + (yield* this.pushSpaces(!0));
      return yield* this.pushCount(e.length - i), this.pushNewline(), "stream";
    }
    if (this.atLineEnd()) {
      const t = yield* this.pushSpaces(!0);
      return yield* this.pushCount(e.length - t), yield* this.pushNewline(), "stream";
    }
    return yield ks, yield* this.parseLineStart();
  }
  *parseLineStart() {
    const e = this.charAt(0);
    if (!e && !this.atEnd)
      return this.setNext("line-start");
    if (e === "-" || e === ".") {
      if (!this.atEnd && !this.hasChars(4))
        return this.setNext("line-start");
      const t = this.peek(3);
      if ((t === "---" || t === "...") && R(this.charAt(3)))
        return yield* this.pushCount(3), this.indentValue = 0, this.indentNext = 0, t === "---" ? "doc" : "stream";
    }
    return this.indentValue = yield* this.pushSpaces(!1), this.indentNext > this.indentValue && !R(this.charAt(1)) && (this.indentNext = this.indentValue), yield* this.parseBlockStart();
  }
  *parseBlockStart() {
    const [e, t] = this.peek(2);
    if (!t && !this.atEnd)
      return this.setNext("block-start");
    if ((e === "-" || e === "?" || e === ":") && R(t)) {
      const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(!0));
      return this.indentNext = this.indentValue + 1, this.indentValue += n, "block-start";
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
    let e, t, n = -1;
    do
      e = yield* this.pushNewline(), e > 0 ? (t = yield* this.pushSpaces(!1), this.indentValue = n = t) : t = 0, t += yield* this.pushSpaces(!0);
    while (e + t > 0);
    const i = this.getLine();
    if (i === null)
      return this.setNext("flow");
    if ((n !== -1 && n < this.indentNext && i[0] !== "#" || n === 0 && (i.startsWith("---") || i.startsWith("...")) && R(i[3])) && !(n === this.indentNext - 1 && this.flowLevel === 1 && (i[0] === "]" || i[0] === "}")))
      return this.flowLevel = 0, yield Ss, yield* this.parseLineStart();
    let r = 0;
    for (; i[r] === ","; )
      r += yield* this.pushCount(1), r += yield* this.pushSpaces(!0), this.flowKey = !1;
    switch (r += yield* this.pushIndicators(), i[r]) {
      case void 0:
        return "flow";
      case "#":
        return yield* this.pushCount(i.length - r), "flow";
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
        const o = this.charAt(1);
        if (this.flowKey || R(o) || o === ",")
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
        let r = 0;
        for (; this.buffer[t - 1 - r] === "\\"; )
          r += 1;
        if (r % 2 === 0)
          break;
        t = this.buffer.indexOf('"', t + 1);
      }
    const n = this.buffer.substring(0, t);
    let i = n.indexOf(`
`, this.pos);
    if (i !== -1) {
      for (; i !== -1; ) {
        const r = this.continueScalar(i + 1);
        if (r === -1)
          break;
        i = n.indexOf(`
`, r);
      }
      i !== -1 && (t = i - (n[i - 1] === "\r" ? 2 : 1));
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
    return yield* this.pushUntil((t) => R(t) || t === "#");
  }
  *parseBlockScalar() {
    let e = this.pos - 1, t = 0, n;
    e: for (let r = this.pos; n = this.buffer[r]; ++r)
      switch (n) {
        case " ":
          t += 1;
          break;
        case `
`:
          e = r, t = 0;
          break;
        case "\r": {
          const o = this.buffer[r + 1];
          if (!o && !this.atEnd)
            return this.setNext("block-scalar");
          if (o === `
`)
            break;
        }
        // fallthrough
        default:
          break e;
      }
    if (!n && !this.atEnd)
      return this.setNext("block-scalar");
    if (t >= this.indentNext) {
      this.blockScalarIndent === -1 ? this.indentNext = t : this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
      do {
        const r = this.continueScalar(e + 1);
        if (r === -1)
          break;
        e = this.buffer.indexOf(`
`, r);
      } while (e !== -1);
      if (e === -1) {
        if (!this.atEnd)
          return this.setNext("block-scalar");
        e = this.buffer.length;
      }
    }
    let i = e + 1;
    for (n = this.buffer[i]; n === " "; )
      n = this.buffer[++i];
    if (n === "	") {
      for (; n === "	" || n === " " || n === "\r" || n === `
`; )
        n = this.buffer[++i];
      e = i - 1;
    } else if (!this.blockScalarKeep)
      do {
        let r = e - 1, o = this.buffer[r];
        o === "\r" && (o = this.buffer[--r]);
        const l = r;
        for (; o === " "; )
          o = this.buffer[--r];
        if (o === `
` && r >= this.pos && r + 1 + t > l)
          e = r;
        else
          break;
      } while (!0);
    return yield ot, yield* this.pushToIndex(e + 1, !0), yield* this.parseLineStart();
  }
  *parsePlainScalar() {
    const e = this.flowLevel > 0;
    let t = this.pos - 1, n = this.pos - 1, i;
    for (; i = this.buffer[++n]; )
      if (i === ":") {
        const r = this.buffer[n + 1];
        if (R(r) || e && $e.has(r))
          break;
        t = n;
      } else if (R(i)) {
        let r = this.buffer[n + 1];
        if (i === "\r" && (r === `
` ? (n += 1, i = `
`, r = this.buffer[n + 1]) : t = n), r === "#" || e && $e.has(r))
          break;
        if (i === `
`) {
          const o = this.continueScalar(n + 1);
          if (o === -1)
            break;
          n = Math.max(n, o - 2);
        }
      } else {
        if (e && $e.has(i))
          break;
        t = n;
      }
    return !i && !this.atEnd ? this.setNext("plain-scalar") : (yield ot, yield* this.pushToIndex(t + 1, !0), e ? "flow" : "doc");
  }
  *pushCount(e) {
    return e > 0 ? (yield this.buffer.substr(this.pos, e), this.pos += e, e) : 0;
  }
  *pushToIndex(e, t) {
    const n = this.buffer.slice(this.pos, e);
    return n ? (yield n, this.pos += n.length, n.length) : (t && (yield ""), 0);
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
          const t = this.flowLevel > 0, n = this.charAt(1);
          if (R(n) || t && $e.has(n)) {
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
      for (; !R(t) && t !== ">"; )
        t = this.buffer[++e];
      return yield* this.pushToIndex(t === ">" ? e + 1 : e, !1);
    } else {
      let e = this.pos + 1, t = this.buffer[e];
      for (; t; )
        if ($n.has(t))
          t = this.buffer[++e];
        else if (t === "%" && Pt.has(this.buffer[e + 1]) && Pt.has(this.buffer[e + 2]))
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
    let t = this.pos - 1, n;
    do
      n = this.buffer[++t];
    while (n === " " || e && n === "	");
    const i = t - this.pos;
    return i > 0 && (yield this.buffer.substr(this.pos, i), this.pos = t), i;
  }
  *pushUntil(e) {
    let t = this.pos, n = this.buffer[t];
    for (; !e(n); )
      n = this.buffer[++t];
    return yield* this.pushToIndex(t, !1);
  }
}
class vn {
  constructor() {
    this.lineStarts = [], this.addNewLine = (e) => this.lineStarts.push(e), this.linePos = (e) => {
      let t = 0, n = this.lineStarts.length;
      for (; t < n; ) {
        const r = t + n >> 1;
        this.lineStarts[r] < e ? t = r + 1 : n = r;
      }
      if (this.lineStarts[t] === e)
        return { line: t + 1, col: 1 };
      if (t === 0)
        return { line: 0, col: e };
      const i = this.lineStarts[t - 1];
      return { line: t, col: e - i + 1 };
    };
  }
}
function Y(s, e) {
  for (let t = 0; t < s.length; ++t)
    if (s[t].type === e)
      return !0;
  return !1;
}
function Bt(s) {
  for (let e = 0; e < s.length; ++e)
    switch (s[e].type) {
      case "space":
      case "comment":
      case "newline":
        break;
      default:
        return e;
    }
  return -1;
}
function Ns(s) {
  switch (s == null ? void 0 : s.type) {
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
function Ce(s) {
  switch (s.type) {
    case "document":
      return s.start;
    case "block-map": {
      const e = s.items[s.items.length - 1];
      return e.sep ?? e.start;
    }
    case "block-seq":
      return s.items[s.items.length - 1].start;
    /* istanbul ignore next should not happen */
    default:
      return [];
  }
}
function Z(s) {
  var t;
  if (s.length === 0)
    return [];
  let e = s.length;
  e: for (; --e >= 0; )
    switch (s[e].type) {
      case "doc-start":
      case "explicit-key-ind":
      case "map-value-ind":
      case "seq-item-ind":
      case "newline":
        break e;
    }
  for (; ((t = s[++e]) == null ? void 0 : t.type) === "space"; )
    ;
  return s.splice(e, s.length);
}
function je(s, e) {
  if (e.length < 1e5)
    Array.prototype.push.apply(s, e);
  else
    for (let t = 0; t < e.length; ++t)
      s.push(e[t]);
}
function Kt(s) {
  if (s.start.type === "flow-seq-start")
    for (const e of s.items)
      e.sep && !e.value && !Y(e.start, "explicit-key-ind") && !Y(e.sep, "map-value-ind") && (e.key && (e.value = e.key), delete e.key, Ns(e.value) ? e.value.end ? je(e.value.end, e.sep) : e.value.end = e.sep : je(e.start, e.sep), delete e.sep);
}
class Mn {
  /**
   * @param onNewLine - If defined, called separately with the start position of
   *   each new line (in `parse()`, including the start of input).
   */
  constructor(e) {
    this.atNewLine = !0, this.atScalar = !1, this.indent = 0, this.offset = 0, this.onKeyLine = !1, this.stack = [], this.source = "", this.type = "", this.lexer = new _n(), this.onNewLine = e;
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
    for (const n of this.lexer.lex(e, t))
      yield* this.next(n);
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
    const t = Ln(e);
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
      const n = `Not a YAML token: ${e}`;
      yield* this.pop({ type: "error", offset: this.offset, message: n, source: e }), this.offset += e.length;
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
      const n = this.peek(1);
      switch (t.type === "block-scalar" ? t.indent = "indent" in n ? n.indent : 0 : t.type === "flow-collection" && n.type === "document" && (t.indent = 0), t.type === "flow-collection" && Kt(t), n.type) {
        case "document":
          n.value = t;
          break;
        case "block-scalar":
          n.props.push(t);
          break;
        case "block-map": {
          const i = n.items[n.items.length - 1];
          if (i.value) {
            n.items.push({ start: [], key: t, sep: [] }), this.onKeyLine = !0;
            return;
          } else if (i.sep)
            i.value = t;
          else {
            Object.assign(i, { key: t, sep: [] }), this.onKeyLine = !i.explicitKey;
            return;
          }
          break;
        }
        case "block-seq": {
          const i = n.items[n.items.length - 1];
          i.value ? n.items.push({ start: [], value: t }) : i.value = t;
          break;
        }
        case "flow-collection": {
          const i = n.items[n.items.length - 1];
          !i || i.value ? n.items.push({ start: [], key: t, sep: [] }) : i.sep ? i.value = t : Object.assign(i, { key: t, sep: [] });
          return;
        }
        /* istanbul ignore next should not happen */
        default:
          yield* this.pop(), yield* this.pop(t);
      }
      if ((n.type === "document" || n.type === "block-map" || n.type === "block-seq") && (t.type === "block-map" || t.type === "block-seq")) {
        const i = t.items[t.items.length - 1];
        i && !i.sep && !i.value && i.start.length > 0 && Bt(i.start) === -1 && (t.indent === 0 || i.start.every((r) => r.type !== "comment" || r.indent < t.indent)) && (n.type === "document" ? n.end = i.start : n.items.push({ start: i.start }), t.items.splice(-1, 1));
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
        Bt(e.start) !== -1 ? (yield* this.pop(), yield* this.step()) : e.start.push(this.sourceToken);
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
      const t = Ce(this.peek(2)), n = Z(t);
      let i;
      e.end ? (i = e.end, i.push(this.sourceToken), delete e.end) : i = [this.sourceToken];
      const r = {
        type: "block-map",
        offset: e.offset,
        indent: e.indent,
        items: [{ start: n, key: e, sep: i }]
      };
      this.onKeyLine = !0, this.stack[this.stack.length - 1] = r;
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
    var n;
    const t = e.items[e.items.length - 1];
    switch (this.type) {
      case "newline":
        if (this.onKeyLine = !1, t.value) {
          const i = "end" in t.value ? t.value.end : void 0, r = Array.isArray(i) ? i[i.length - 1] : void 0;
          (r == null ? void 0 : r.type) === "comment" ? i == null || i.push(this.sourceToken) : e.items.push({ start: [this.sourceToken] });
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
            const i = e.items[e.items.length - 2], r = (n = i == null ? void 0 : i.value) == null ? void 0 : n.end;
            if (Array.isArray(r)) {
              je(r, t.start), r.push(this.sourceToken), e.items.pop();
              return;
            }
          }
          t.start.push(this.sourceToken);
        }
        return;
    }
    if (this.indent >= e.indent) {
      const i = !this.onKeyLine && this.indent === e.indent, r = i && (t.sep || t.explicitKey) && this.type !== "seq-item-ind";
      let o = [];
      if (r && t.sep && !t.value) {
        const l = [];
        for (let a = 0; a < t.sep.length; ++a) {
          const c = t.sep[a];
          switch (c.type) {
            case "newline":
              l.push(a);
              break;
            case "space":
              break;
            case "comment":
              c.indent > e.indent && (l.length = 0);
              break;
            default:
              l.length = 0;
          }
        }
        l.length >= 2 && (o = t.sep.splice(l[1]));
      }
      switch (this.type) {
        case "anchor":
        case "tag":
          r || t.value ? (o.push(this.sourceToken), e.items.push({ start: o }), this.onKeyLine = !0) : t.sep ? t.sep.push(this.sourceToken) : t.start.push(this.sourceToken);
          return;
        case "explicit-key-ind":
          !t.sep && !t.explicitKey ? (t.start.push(this.sourceToken), t.explicitKey = !0) : r || t.value ? (o.push(this.sourceToken), e.items.push({ start: o, explicitKey: !0 })) : this.stack.push({
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
              else if (Y(t.sep, "map-value-ind"))
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: o, key: null, sep: [this.sourceToken] }]
                });
              else if (Ns(t.key) && !Y(t.sep, "newline")) {
                const l = Z(t.start), a = t.key, c = t.sep;
                c.push(this.sourceToken), delete t.key, delete t.sep, this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: l, key: a, sep: c }]
                });
              } else o.length > 0 ? t.sep = t.sep.concat(o, this.sourceToken) : t.sep.push(this.sourceToken);
            else if (Y(t.start, "newline"))
              Object.assign(t, { key: null, sep: [this.sourceToken] });
            else {
              const l = Z(t.start);
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: l, key: null, sep: [this.sourceToken] }]
              });
            }
          else
            t.sep ? t.value || r ? e.items.push({ start: o, key: null, sep: [this.sourceToken] }) : Y(t.sep, "map-value-ind") ? this.stack.push({
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
          const l = this.flowScalar(this.type);
          r || t.value ? (e.items.push({ start: o, key: l, sep: [] }), this.onKeyLine = !0) : t.sep ? this.stack.push(l) : (Object.assign(t, { key: l, sep: [] }), this.onKeyLine = !0);
          return;
        }
        default: {
          const l = this.startBlockValue(e);
          if (l) {
            if (l.type === "block-seq") {
              if (!t.explicitKey && t.sep && !Y(t.sep, "newline")) {
                yield* this.pop({
                  type: "error",
                  offset: this.offset,
                  message: "Unexpected block-seq-ind on same line with key",
                  source: this.source
                });
                return;
              }
            } else i && e.items.push({ start: o });
            this.stack.push(l);
            return;
          }
        }
      }
    }
    yield* this.pop(), yield* this.step();
  }
  *blockSequence(e) {
    var n;
    const t = e.items[e.items.length - 1];
    switch (this.type) {
      case "newline":
        if (t.value) {
          const i = "end" in t.value ? t.value.end : void 0, r = Array.isArray(i) ? i[i.length - 1] : void 0;
          (r == null ? void 0 : r.type) === "comment" ? i == null || i.push(this.sourceToken) : e.items.push({ start: [this.sourceToken] });
        } else
          t.start.push(this.sourceToken);
        return;
      case "space":
      case "comment":
        if (t.value)
          e.items.push({ start: [this.sourceToken] });
        else {
          if (this.atIndentedComment(t.start, e.indent)) {
            const i = e.items[e.items.length - 2], r = (n = i == null ? void 0 : i.value) == null ? void 0 : n.end;
            if (Array.isArray(r)) {
              je(r, t.start), r.push(this.sourceToken), e.items.pop();
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
        t.value || Y(t.start, "seq-item-ind") ? e.items.push({ start: [this.sourceToken] }) : t.start.push(this.sourceToken);
        return;
    }
    if (this.indent > e.indent) {
      const i = this.startBlockValue(e);
      if (i) {
        this.stack.push(i);
        return;
      }
    }
    yield* this.pop(), yield* this.step();
  }
  *flowCollection(e) {
    const t = e.items[e.items.length - 1];
    if (this.type === "flow-error-end") {
      let n;
      do
        yield* this.pop(), n = this.peek(1);
      while ((n == null ? void 0 : n.type) === "flow-collection");
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
          const i = this.flowScalar(this.type);
          !t || t.value ? e.items.push({ start: [], key: i, sep: [] }) : t.sep ? this.stack.push(i) : Object.assign(t, { key: i, sep: [] });
          return;
        }
        case "flow-map-end":
        case "flow-seq-end":
          e.end.push(this.sourceToken);
          return;
      }
      const n = this.startBlockValue(e);
      n ? this.stack.push(n) : (yield* this.pop(), yield* this.step());
    } else {
      const n = this.peek(2);
      if (n.type === "block-map" && (this.type === "map-value-ind" && n.indent === e.indent || this.type === "newline" && !n.items[n.items.length - 1].sep))
        yield* this.pop(), yield* this.step();
      else if (this.type === "map-value-ind" && n.type !== "flow-collection") {
        const i = Ce(n), r = Z(i);
        Kt(e);
        const o = e.end.splice(1, e.end.length);
        o.push(this.sourceToken);
        const l = {
          type: "block-map",
          offset: e.offset,
          indent: e.indent,
          items: [{ start: r, key: e, sep: o }]
        };
        this.onKeyLine = !0, this.stack[this.stack.length - 1] = l;
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
        const t = Ce(e), n = Z(t);
        return n.push(this.sourceToken), {
          type: "block-map",
          offset: this.offset,
          indent: this.indent,
          items: [{ start: n, explicitKey: !0 }]
        };
      }
      case "map-value-ind": {
        this.onKeyLine = !0;
        const t = Ce(e), n = Z(t);
        return {
          type: "block-map",
          offset: this.offset,
          indent: this.indent,
          items: [{ start: n, key: null, sep: [this.sourceToken] }]
        };
      }
    }
    return null;
  }
  atIndentedComment(e, t) {
    return this.type !== "comment" || this.indent <= t ? !1 : e.every((n) => n.type === "newline" || n.type === "space");
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
function Pn(s) {
  const e = s.prettyErrors !== !1;
  return { lineCounter: s.lineCounter || e && new vn() || null, prettyErrors: e };
}
function Bn(s, e = {}) {
  const { lineCounter: t, prettyErrors: n } = Pn(e), i = new Mn(t == null ? void 0 : t.addNewLine), r = new In(e);
  let o = null;
  for (const l of r.compose(i.parse(s), !0, s.length))
    if (!o)
      o = l;
    else if (o.options.logLevel !== "silent") {
      o.errors.push(new de(l.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
      break;
    }
  return n && t && (o.errors.forEach(_t(s, t)), o.warnings.forEach(_t(s, t))), o;
}
function Kn(s, e, t) {
  let n;
  const i = Bn(s, t);
  if (!i)
    return null;
  if (i.warnings.forEach((r) => Wt(i.options.logLevel, r)), i.errors.length > 0) {
    if (i.options.logLevel !== "silent")
      throw i.errors[0];
    i.errors = [];
  }
  return i.toJS(Object.assign({ reviver: n }, t));
}
function Dn(s, e, t) {
  let n = null;
  if (typeof e == "function" || Array.isArray(e) ? n = e : t === void 0 && e && (t = e), typeof t == "string" && (t = t.length), typeof t == "number") {
    const i = Math.round(t);
    t = i < 1 ? void 0 : i > 8 ? { indent: 8 } : { indent: i };
  }
  if (s === void 0) {
    const { keepUndefined: i } = t ?? e ?? {};
    if (!i)
      return;
  }
  return ke(s) && !n ? s.toString(t) : new Ae(s, n, t).toString(t);
}
class Ot {
  constructor() {
    this.buckets = /* @__PURE__ */ new Map(), this.dirty = /* @__PURE__ */ new Set(), this.removed = /* @__PURE__ */ new Set();
  }
  static from(e) {
    const t = new Ot();
    return t.replaceAll(e), t.clearChanges(), t;
  }
  get(e, t) {
    var n;
    if (t != null)
      return (n = this.buckets.get(e)) == null ? void 0 : n.get(t);
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
    let n = this.buckets.get(e);
    n || (n = /* @__PURE__ */ new Map(), this.buckets.set(e, n));
    const i = be(t);
    return n.set(i.id, i), this.dirty.add(ve(e, i.id)), this.removed.delete(ve(e, i.id)), i;
  }
  /** Shallow-merge a patch into an existing element. No-op if it is absent. */
  patch(e, t, n) {
    const i = this.get(e, t);
    if (i)
      return this.put(e, { ...i, ...n });
  }
  remove(e, t) {
    const n = this.buckets.get(e);
    return n != null && n.delete(t) ? (this.dirty.delete(ve(e, t)), this.removed.add(ve(e, t)), !0) : !1;
  }
  /**
   * Add `value` to an element's list field, keeping it unique. This is the
   * back-reference maintenance that a third of the commands do by hand today
   * (e.g. an aggregate's id inside its bounded context's `aggregateIds`).
   */
  addToList(e, t, n, i) {
    const r = this.get(e, t);
    if (!r) return;
    const o = _e(r[n]);
    o.includes(i) || this.put(e, { ...r, [n]: [...o, i] });
  }
  removeFromList(e, t, n, i) {
    const r = this.get(e, t);
    if (!r) return;
    const o = _e(r[n]);
    o.includes(i) && this.put(e, { ...r, [n]: o.filter((l) => l !== i) });
  }
  /** Drop `value` from this list field wherever it appears, across a whole type. */
  removeFromAllLists(e, t, n) {
    for (const i of this.all(e))
      _e(i[t]).includes(n) && this.removeFromList(e, i.id, t, n);
  }
  /** The first element of `type` whose list field contains `value`. */
  findByListMember(e, t, n) {
    return this.all(e).find((i) => _e(i[t]).includes(n));
  }
  /**
   * The first element of any of `types` that owns a nested item with this id —
   * how polymorphic ownership is resolved (an invariant lives inside an
   * aggregate, a value object or an entity).
   */
  findOwner(e, t, n) {
    for (const i of e) {
      const r = this.all(i).find((o) => Fe(o[t]).some((l) => l.id === n));
      if (r) return { type: i, element: r };
    }
  }
  /**
   * Replace the whole content, keeping the instance. Change tracking is NOT
   * reset: a rollback has to leave behind whatever the caller had already
   * recorded, and a reload clears it explicitly.
   */
  replaceAll(e) {
    this.buckets.clear();
    for (const [t, n] of Object.entries(e)) {
      const i = /* @__PURE__ */ new Map();
      for (const r of n ?? []) {
        const o = be(r);
        i.set(o.id, o);
      }
      i.size && this.buckets.set(t, i);
    }
  }
  changes() {
    return {
      written: [...this.dirty].map(Dt),
      deleted: [...this.removed].map(Dt)
    };
  }
  clearChanges() {
    this.dirty.clear(), this.removed.clear();
  }
  /** Snapshot back to the plain shape the file tree serializes. */
  toData() {
    const e = {};
    for (const [t, n] of this.buckets) e[t] = [...n.values()];
    return e;
  }
}
function be(s) {
  if (Array.isArray(s))
    return s.map(be).filter(Re);
  if (s && typeof s == "object") {
    const e = {};
    for (const [t, n] of Object.entries(s)) {
      const i = be(n);
      Re(i) && (e[t] = i);
    }
    return e;
  }
  return s;
}
function Re(s) {
  return s == null || s === !1 ? !1 : typeof s == "string" || Array.isArray(s) ? s.length > 0 : typeof s == "object" ? Object.keys(s).length > 0 : !0;
}
function _e(s) {
  return Array.isArray(s) ? s : [];
}
function Fe(s) {
  return Array.isArray(s) ? s : [];
}
const Os = "\0", ve = (s, e) => `${s}${Os}${e}`, Dt = (s) => {
  const [e, t] = s.split(Os);
  return { type: e, id: t };
}, At = [
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
], As = (s) => `deployment-${s}`;
function jn(s) {
  const e = { relations: 0, externalSystems: 0, deployments: 0 };
  for (const t of s.all("projects")) {
    const n = Fe(t.contextMap), i = Fe(t.externalSystems);
    if (n.length || i.length) {
      for (const r of n) s.put("contextMapRelations", r);
      for (const r of i) s.put("externalSystems", r);
      s.put("projects", jt(t, ["contextMap", "externalSystems"])), e.relations += n.length, e.externalSystems += i.length;
    }
  }
  for (const t of s.all("projects"))
    s.has("deployments", As(t.id)) || Rn(t) && (s.put("deployments", Fn(t)), s.put("projects", jt(t, At)), e.deployments += 1);
  return e;
}
function Rn(s) {
  return At.some((e) => Re(s[e]));
}
function Fn(s) {
  const e = { id: As(s.id) };
  for (const t of At)
    Re(s[t]) && (e[t] = s[t]);
  return e;
}
function jt(s, e) {
  const t = { ...s };
  for (const n of e) delete t[n];
  return t;
}
function Un(s) {
  const e = s.all("modules");
  let t = 0;
  for (const n of s.all("boundedContexts"))
    e.some((i) => i.boundedContextId === n.id) || (s.put("modules", {
      id: qn(n.id),
      name: n.name ?? n.id,
      boundedContextId: n.id,
      main: !0
    }), t += 1);
  return t;
}
const qn = (s) => `${s}-main`, Vn = [
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
function Jn(s) {
  const e = new Set(Vn);
  let t = 0;
  for (const n of s.all("workflows")) {
    const i = Fe(n.steps);
    if (!i.length) continue;
    let r = !1;
    const o = i.map((l) => {
      const a = typeof l.type == "string" ? l.type : "";
      if (a && e.has(a)) return l;
      r = !0;
      const c = a === "SPLIT" ? "FORK" : a === "JOIN" ? "JOIN" : l.roleId || l.formPageId ? "USER_TASK" : "ACTION";
      return { ...l, type: c };
    });
    r && (s.patch("workflows", n.id, { steps: o }), t += 1);
  }
  return t;
}
function Yn(s) {
  const e = jn(s);
  return Jn(s), Un(s), e;
}
const Gn = ".modux";
function Hn(s) {
  return `${s.replace(/[^A-Za-z0-9._-]/g, "_")}.yaml`;
}
const lt = (s, e) => `${s}/${Hn(e)}`;
function Qn(s) {
  return s.replace(/\/+$/, "").split("/").filter(Boolean).at(-1) === Gn;
}
async function Xn(s, e) {
  const t = {};
  for (const i of await s.listDirs(e)) {
    const r = (await s.list(we(e, i))).filter((l) => l.endsWith(".yaml")), o = [];
    for (const l of r.sort()) {
      const a = await Wn(s, we(e, `${i}/${l}`));
      a && o.push(a);
    }
    o.length && (t[i] = o);
  }
  const n = Ot.from(t);
  return n.clearChanges(), Yn(n), n;
}
async function zn(s, e, t) {
  const n = t.changes();
  if (!n.written.length && !n.deleted.length) return n;
  for (const { type: i, id: r } of n.written) {
    if (i === "views") continue;
    const o = t.get(i, r);
    o && await s.write(we(e, lt(i, r)), Ts(o));
  }
  for (const { type: i, id: r } of n.deleted) {
    const o = we(e, lt(i, r));
    await s.exists(o) && await s.delete(o);
  }
  return t.clearChanges(), n;
}
async function Zn(s, e, t) {
  for (const n of t.types())
    for (const i of t.all(n))
      await s.write(we(e, lt(n, i.id)), Ts(i));
  t.clearChanges();
}
async function Wn(s, e) {
  if (!await s.exists(e)) return;
  const t = await s.read(e);
  return t.trim() ? Kn(t) : void 0;
}
function Ts(s) {
  return Dn(be(s), { lineWidth: 0 });
}
const we = (s, e) => s ? `${s}/${e}` : e;
async function xn(s, e) {
  const t = await s({ op: "resolveProject", ...e });
  return typeof t == "string" && t ? t : null;
}
function ei(s, e) {
  const t = () => {
    throw new Error("El modelo de otro proyecto se lee, no se escribe");
  };
  return {
    list: async (n) => await s({ op: "list", path: n, root: e }),
    listDirs: async (n) => await s({ op: "listDirs", path: n, root: e }),
    read: async (n) => await s({ op: "read", path: n, root: e }),
    exists: async (n) => await s({ op: "exists", path: n, root: e }),
    write: t,
    delete: t
  };
}
async function ti(s) {
  return await s({ op: "readView" });
}
async function si(s, e) {
  await s({ op: "writeView", content: e });
}
function ni() {
  const s = globalThis.moduxBridge;
  return typeof s == "function" ? s : null;
}
function ii(s) {
  const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Set(), n = (i) => e.has(i);
  return {
    async list(i) {
      const r = await s({ op: "list", path: i }), o = [...e.keys()].filter((a) => a.startsWith(`${i}/`) && !a.slice(i.length + 1).includes("/")).map((a) => a.slice(i.length + 1)), l = new Set([...t].map((a) => a.slice(a.lastIndexOf("/") + 1)));
      return [.../* @__PURE__ */ new Set([...r, ...o])].filter((a) => !l.has(`${i}/${a}`.slice(i.length + 1)));
    },
    listDirs: async (i) => await s({ op: "listDirs", path: i }),
    async read(i) {
      const r = e.get(i);
      return r !== void 0 ? r : await s({ op: "read", path: i });
    },
    async write(i, r) {
      e.set(i, r), t.delete(i);
    },
    async delete(i) {
      e.delete(i), t.add(i);
    },
    async exists(i) {
      return t.has(i) ? !1 : n(i) ? !0 : await s({ op: "exists", path: i });
    },
    pending() {
      return e.size + t.size;
    },
    async commit() {
      if (!e.size && !t.size) return;
      const i = {
        op: "flush",
        writes: [...e].map(([r, o]) => ({ path: r, content: o })),
        deletes: [...t]
      };
      e.clear(), t.clear(), await s(i);
    }
  };
}
export {
  Ot as M,
  _e as a,
  xn as b,
  ei as c,
  Qn as d,
  Zn as e,
  zn as f,
  ni as h,
  ii as i,
  Xn as l,
  Fe as n,
  Kn as p,
  ti as r,
  Dn as s,
  si as w
};
