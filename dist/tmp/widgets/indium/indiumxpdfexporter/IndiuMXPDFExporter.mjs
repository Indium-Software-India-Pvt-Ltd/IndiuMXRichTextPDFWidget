import { useState, useRef, useMemo, useCallback, createElement, Fragment } from 'react';
import html2pdf from 'html2pdf.js';

/*! @license DOMPurify 3.2.6 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.2.6/LICENSE */

const {
  entries,
  setPrototypeOf,
  isFrozen,
  getPrototypeOf,
  getOwnPropertyDescriptor
} = Object;
let {
  freeze,
  seal,
  create
} = Object; // eslint-disable-line import/no-mutable-exports
let {
  apply,
  construct
} = typeof Reflect !== 'undefined' && Reflect;
if (!freeze) {
  freeze = function freeze(x) {
    return x;
  };
}
if (!seal) {
  seal = function seal(x) {
    return x;
  };
}
if (!apply) {
  apply = function apply(fun, thisValue, args) {
    return fun.apply(thisValue, args);
  };
}
if (!construct) {
  construct = function construct(Func, args) {
    return new Func(...args);
  };
}
const arrayForEach = unapply(Array.prototype.forEach);
const arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
const arrayPop = unapply(Array.prototype.pop);
const arrayPush = unapply(Array.prototype.push);
const arraySplice = unapply(Array.prototype.splice);
const stringToLowerCase = unapply(String.prototype.toLowerCase);
const stringToString = unapply(String.prototype.toString);
const stringMatch = unapply(String.prototype.match);
const stringReplace = unapply(String.prototype.replace);
const stringIndexOf = unapply(String.prototype.indexOf);
const stringTrim = unapply(String.prototype.trim);
const objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
const regExpTest = unapply(RegExp.prototype.test);
const typeErrorCreate = unconstruct(TypeError);
/**
 * Creates a new function that calls the given function with a specified thisArg and arguments.
 *
 * @param func - The function to be wrapped and called.
 * @returns A new function that calls the given function with a specified thisArg and arguments.
 */
function unapply(func) {
  return function (thisArg) {
    if (thisArg instanceof RegExp) {
      thisArg.lastIndex = 0;
    }
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    return apply(func, thisArg, args);
  };
}
/**
 * Creates a new function that constructs an instance of the given constructor function with the provided arguments.
 *
 * @param func - The constructor function to be wrapped and called.
 * @returns A new function that constructs an instance of the given constructor function with the provided arguments.
 */
function unconstruct(func) {
  return function () {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }
    return construct(func, args);
  };
}
/**
 * Add properties to a lookup table
 *
 * @param set - The set to which elements will be added.
 * @param array - The array containing elements to be added to the set.
 * @param transformCaseFunc - An optional function to transform the case of each element before adding to the set.
 * @returns The modified set with added elements.
 */
function addToSet(set, array) {
  let transformCaseFunc = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : stringToLowerCase;
  if (setPrototypeOf) {
    // Make 'in' and truthy checks like Boolean(set.constructor)
    // independent of any properties defined on Object.prototype.
    // Prevent prototype setters from intercepting set as a this value.
    setPrototypeOf(set, null);
  }
  let l = array.length;
  while (l--) {
    let element = array[l];
    if (typeof element === 'string') {
      const lcElement = transformCaseFunc(element);
      if (lcElement !== element) {
        // Config presets (e.g. tags.js, attrs.js) are immutable.
        if (!isFrozen(array)) {
          array[l] = lcElement;
        }
        element = lcElement;
      }
    }
    set[element] = true;
  }
  return set;
}
/**
 * Clean up an array to harden against CSPP
 *
 * @param array - The array to be cleaned.
 * @returns The cleaned version of the array
 */
function cleanArray(array) {
  for (let index = 0; index < array.length; index++) {
    const isPropertyExist = objectHasOwnProperty(array, index);
    if (!isPropertyExist) {
      array[index] = null;
    }
  }
  return array;
}
/**
 * Shallow clone an object
 *
 * @param object - The object to be cloned.
 * @returns A new object that copies the original.
 */
function clone(object) {
  const newObject = create(null);
  for (const [property, value] of entries(object)) {
    const isPropertyExist = objectHasOwnProperty(object, property);
    if (isPropertyExist) {
      if (Array.isArray(value)) {
        newObject[property] = cleanArray(value);
      } else if (value && typeof value === 'object' && value.constructor === Object) {
        newObject[property] = clone(value);
      } else {
        newObject[property] = value;
      }
    }
  }
  return newObject;
}
/**
 * This method automatically checks if the prop is function or getter and behaves accordingly.
 *
 * @param object - The object to look up the getter function in its prototype chain.
 * @param prop - The property name for which to find the getter function.
 * @returns The getter function found in the prototype chain or a fallback function.
 */
function lookupGetter(object, prop) {
  while (object !== null) {
    const desc = getOwnPropertyDescriptor(object, prop);
    if (desc) {
      if (desc.get) {
        return unapply(desc.get);
      }
      if (typeof desc.value === 'function') {
        return unapply(desc.value);
      }
    }
    object = getPrototypeOf(object);
  }
  function fallbackValue() {
    return null;
  }
  return fallbackValue;
}
const html$1 = freeze(['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'content', 'data', 'datalist', 'dd', 'decorator', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'nav', 'nobr', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'select', 'shadow', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr']);
const svg$1 = freeze(['svg', 'a', 'altglyph', 'altglyphdef', 'altglyphitem', 'animatecolor', 'animatemotion', 'animatetransform', 'circle', 'clippath', 'defs', 'desc', 'ellipse', 'filter', 'font', 'g', 'glyph', 'glyphref', 'hkern', 'image', 'line', 'lineargradient', 'marker', 'mask', 'metadata', 'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialgradient', 'rect', 'stop', 'style', 'switch', 'symbol', 'text', 'textpath', 'title', 'tref', 'tspan', 'view', 'vkern']);
const svgFilters = freeze(['feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence']);
// List of SVG elements that are disallowed by default.
// We still need to know them so that we can do namespace
// checks properly in case one wants to add them to
// allow-list.
const svgDisallowed = freeze(['animate', 'color-profile', 'cursor', 'discard', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri', 'foreignobject', 'hatch', 'hatchpath', 'mesh', 'meshgradient', 'meshpatch', 'meshrow', 'missing-glyph', 'script', 'set', 'solidcolor', 'unknown', 'use']);
const mathMl$1 = freeze(['math', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover', 'mprescripts']);
// Similarly to SVG, we want to know all MathML elements,
// even those that we disallow by default.
const mathMlDisallowed = freeze(['maction', 'maligngroup', 'malignmark', 'mlongdiv', 'mscarries', 'mscarry', 'msgroup', 'mstack', 'msline', 'msrow', 'semantics', 'annotation', 'annotation-xml', 'mprescripts', 'none']);
const text = freeze(['#text']);
const html = freeze(['accept', 'action', 'align', 'alt', 'autocapitalize', 'autocomplete', 'autopictureinpicture', 'autoplay', 'background', 'bgcolor', 'border', 'capture', 'cellpadding', 'cellspacing', 'checked', 'cite', 'class', 'clear', 'color', 'cols', 'colspan', 'controls', 'controlslist', 'coords', 'crossorigin', 'datetime', 'decoding', 'default', 'dir', 'disabled', 'disablepictureinpicture', 'disableremoteplayback', 'download', 'draggable', 'enctype', 'enterkeyhint', 'face', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'inputmode', 'integrity', 'ismap', 'kind', 'label', 'lang', 'list', 'loading', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'minlength', 'multiple', 'muted', 'name', 'nonce', 'noshade', 'novalidate', 'nowrap', 'open', 'optimum', 'pattern', 'placeholder', 'playsinline', 'popover', 'popovertarget', 'popovertargetaction', 'poster', 'preload', 'pubdate', 'radiogroup', 'readonly', 'rel', 'required', 'rev', 'reversed', 'role', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'sizes', 'span', 'srclang', 'start', 'src', 'srcset', 'step', 'style', 'summary', 'tabindex', 'title', 'translate', 'type', 'usemap', 'valign', 'value', 'width', 'wrap', 'xmlns', 'slot']);
const svg = freeze(['accent-height', 'accumulate', 'additive', 'alignment-baseline', 'amplitude', 'ascent', 'attributename', 'attributetype', 'azimuth', 'basefrequency', 'baseline-shift', 'begin', 'bias', 'by', 'class', 'clip', 'clippathunits', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cx', 'cy', 'd', 'dx', 'dy', 'diffuseconstant', 'direction', 'display', 'divisor', 'dur', 'edgemode', 'elevation', 'end', 'exponent', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'filterunits', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'fx', 'fy', 'g1', 'g2', 'glyph-name', 'glyphref', 'gradientunits', 'gradienttransform', 'height', 'href', 'id', 'image-rendering', 'in', 'in2', 'intercept', 'k', 'k1', 'k2', 'k3', 'k4', 'kerning', 'keypoints', 'keysplines', 'keytimes', 'lang', 'lengthadjust', 'letter-spacing', 'kernelmatrix', 'kernelunitlength', 'lighting-color', 'local', 'marker-end', 'marker-mid', 'marker-start', 'markerheight', 'markerunits', 'markerwidth', 'maskcontentunits', 'maskunits', 'max', 'mask', 'media', 'method', 'mode', 'min', 'name', 'numoctaves', 'offset', 'operator', 'opacity', 'order', 'orient', 'orientation', 'origin', 'overflow', 'paint-order', 'path', 'pathlength', 'patterncontentunits', 'patterntransform', 'patternunits', 'points', 'preservealpha', 'preserveaspectratio', 'primitiveunits', 'r', 'rx', 'ry', 'radius', 'refx', 'refy', 'repeatcount', 'repeatdur', 'restart', 'result', 'rotate', 'scale', 'seed', 'shape-rendering', 'slope', 'specularconstant', 'specularexponent', 'spreadmethod', 'startoffset', 'stddeviation', 'stitchtiles', 'stop-color', 'stop-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke', 'stroke-width', 'style', 'surfacescale', 'systemlanguage', 'tabindex', 'tablevalues', 'targetx', 'targety', 'transform', 'transform-origin', 'text-anchor', 'text-decoration', 'text-rendering', 'textlength', 'type', 'u1', 'u2', 'unicode', 'values', 'viewbox', 'visibility', 'version', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'width', 'word-spacing', 'wrap', 'writing-mode', 'xchannelselector', 'ychannelselector', 'x', 'x1', 'x2', 'xmlns', 'y', 'y1', 'y2', 'z', 'zoomandpan']);
const mathMl = freeze(['accent', 'accentunder', 'align', 'bevelled', 'close', 'columnsalign', 'columnlines', 'columnspan', 'denomalign', 'depth', 'dir', 'display', 'displaystyle', 'encoding', 'fence', 'frame', 'height', 'href', 'id', 'largeop', 'length', 'linethickness', 'lspace', 'lquote', 'mathbackground', 'mathcolor', 'mathsize', 'mathvariant', 'maxsize', 'minsize', 'movablelimits', 'notation', 'numalign', 'open', 'rowalign', 'rowlines', 'rowspacing', 'rowspan', 'rspace', 'rquote', 'scriptlevel', 'scriptminsize', 'scriptsizemultiplier', 'selection', 'separator', 'separators', 'stretchy', 'subscriptshift', 'supscriptshift', 'symmetric', 'voffset', 'width', 'xmlns']);
const xml = freeze(['xlink:href', 'xml:id', 'xlink:title', 'xml:space', 'xmlns:xlink']);

// eslint-disable-next-line unicorn/better-regex
const MUSTACHE_EXPR = seal(/\{\{[\w\W]*|[\w\W]*\}\}/gm); // Specify template detection regex for SAFE_FOR_TEMPLATES mode
const ERB_EXPR = seal(/<%[\w\W]*|[\w\W]*%>/gm);
const TMPLIT_EXPR = seal(/\$\{[\w\W]*/gm); // eslint-disable-line unicorn/better-regex
const DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/); // eslint-disable-line no-useless-escape
const ARIA_ATTR = seal(/^aria-[\-\w]+$/); // eslint-disable-line no-useless-escape
const IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i // eslint-disable-line no-useless-escape
);
const IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
const ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g // eslint-disable-line no-control-regex
);
const DOCTYPE_NAME = seal(/^html$/i);
const CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
var EXPRESSIONS = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ARIA_ATTR: ARIA_ATTR,
  ATTR_WHITESPACE: ATTR_WHITESPACE,
  CUSTOM_ELEMENT: CUSTOM_ELEMENT,
  DATA_ATTR: DATA_ATTR,
  DOCTYPE_NAME: DOCTYPE_NAME,
  ERB_EXPR: ERB_EXPR,
  IS_ALLOWED_URI: IS_ALLOWED_URI,
  IS_SCRIPT_OR_DATA: IS_SCRIPT_OR_DATA,
  MUSTACHE_EXPR: MUSTACHE_EXPR,
  TMPLIT_EXPR: TMPLIT_EXPR
});

/* eslint-disable @typescript-eslint/indent */
// https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
const NODE_TYPE = {
  element: 1,
  attribute: 2,
  text: 3,
  cdataSection: 4,
  entityReference: 5,
  // Deprecated
  entityNode: 6,
  // Deprecated
  progressingInstruction: 7,
  comment: 8,
  document: 9,
  documentType: 10,
  documentFragment: 11,
  notation: 12 // Deprecated
};
const getGlobal = function getGlobal() {
  return typeof window === 'undefined' ? null : window;
};
/**
 * Creates a no-op policy for internal use only.
 * Don't export this function outside this module!
 * @param trustedTypes The policy factory.
 * @param purifyHostElement The Script element used to load DOMPurify (to determine policy name suffix).
 * @return The policy created (or null, if Trusted Types
 * are not supported or creating the policy failed).
 */
const _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, purifyHostElement) {
  if (typeof trustedTypes !== 'object' || typeof trustedTypes.createPolicy !== 'function') {
    return null;
  }
  // Allow the callers to control the unique policy name
  // by adding a data-tt-policy-suffix to the script element with the DOMPurify.
  // Policy creation with duplicate names throws in Trusted Types.
  let suffix = null;
  const ATTR_NAME = 'data-tt-policy-suffix';
  if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) {
    suffix = purifyHostElement.getAttribute(ATTR_NAME);
  }
  const policyName = 'dompurify' + (suffix ? '#' + suffix : '');
  try {
    return trustedTypes.createPolicy(policyName, {
      createHTML(html) {
        return html;
      },
      createScriptURL(scriptUrl) {
        return scriptUrl;
      }
    });
  } catch (_) {
    // Policy creation failed (most likely another DOMPurify script has
    // already run). Skip creating the policy, as this will only cause errors
    // if TT are enforced.
    console.warn('TrustedTypes policy ' + policyName + ' could not be created.');
    return null;
  }
};
const _createHooksMap = function _createHooksMap() {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
};
function createDOMPurify() {
  let window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getGlobal();
  const DOMPurify = root => createDOMPurify(root);
  DOMPurify.version = '3.2.6';
  DOMPurify.removed = [];
  if (!window || !window.document || window.document.nodeType !== NODE_TYPE.document || !window.Element) {
    // Not running in a browser, provide a factory function
    // so that you can pass your own Window
    DOMPurify.isSupported = false;
    return DOMPurify;
  }
  let {
    document
  } = window;
  const originalDocument = document;
  const currentScript = originalDocument.currentScript;
  const {
    DocumentFragment,
    HTMLTemplateElement,
    Node,
    Element,
    NodeFilter,
    NamedNodeMap = window.NamedNodeMap || window.MozNamedAttrMap,
    HTMLFormElement,
    DOMParser,
    trustedTypes
  } = window;
  const ElementPrototype = Element.prototype;
  const cloneNode = lookupGetter(ElementPrototype, 'cloneNode');
  const remove = lookupGetter(ElementPrototype, 'remove');
  const getNextSibling = lookupGetter(ElementPrototype, 'nextSibling');
  const getChildNodes = lookupGetter(ElementPrototype, 'childNodes');
  const getParentNode = lookupGetter(ElementPrototype, 'parentNode');
  // As per issue #47, the web-components registry is inherited by a
  // new document created via createHTMLDocument. As per the spec
  // (http://w3c.github.io/webcomponents/spec/custom/#creating-and-passing-registries)
  // a new empty registry is used when creating a template contents owner
  // document, so we use that as our parent document to ensure nothing
  // is inherited.
  if (typeof HTMLTemplateElement === 'function') {
    const template = document.createElement('template');
    if (template.content && template.content.ownerDocument) {
      document = template.content.ownerDocument;
    }
  }
  let trustedTypesPolicy;
  let emptyHTML = '';
  const {
    implementation,
    createNodeIterator,
    createDocumentFragment,
    getElementsByTagName
  } = document;
  const {
    importNode
  } = originalDocument;
  let hooks = _createHooksMap();
  /**
   * Expose whether this browser supports running the full DOMPurify.
   */
  DOMPurify.isSupported = typeof entries === 'function' && typeof getParentNode === 'function' && implementation && implementation.createHTMLDocument !== undefined;
  const {
    MUSTACHE_EXPR,
    ERB_EXPR,
    TMPLIT_EXPR,
    DATA_ATTR,
    ARIA_ATTR,
    IS_SCRIPT_OR_DATA,
    ATTR_WHITESPACE,
    CUSTOM_ELEMENT
  } = EXPRESSIONS;
  let {
    IS_ALLOWED_URI: IS_ALLOWED_URI$1
  } = EXPRESSIONS;
  /**
   * We consider the elements and attributes below to be safe. Ideally
   * don't add any new ones but feel free to remove unwanted ones.
   */
  /* allowed element names */
  let ALLOWED_TAGS = null;
  const DEFAULT_ALLOWED_TAGS = addToSet({}, [...html$1, ...svg$1, ...svgFilters, ...mathMl$1, ...text]);
  /* Allowed attribute names */
  let ALLOWED_ATTR = null;
  const DEFAULT_ALLOWED_ATTR = addToSet({}, [...html, ...svg, ...mathMl, ...xml]);
  /*
   * Configure how DOMPurify should handle custom elements and their attributes as well as customized built-in elements.
   * @property {RegExp|Function|null} tagNameCheck one of [null, regexPattern, predicate]. Default: `null` (disallow any custom elements)
   * @property {RegExp|Function|null} attributeNameCheck one of [null, regexPattern, predicate]. Default: `null` (disallow any attributes not on the allow list)
   * @property {boolean} allowCustomizedBuiltInElements allow custom elements derived from built-ins if they pass CUSTOM_ELEMENT_HANDLING.tagNameCheck. Default: `false`.
   */
  let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
    tagNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: false
    }
  }));
  /* Explicitly forbidden tags (overrides ALLOWED_TAGS/ADD_TAGS) */
  let FORBID_TAGS = null;
  /* Explicitly forbidden attributes (overrides ALLOWED_ATTR/ADD_ATTR) */
  let FORBID_ATTR = null;
  /* Decide if ARIA attributes are okay */
  let ALLOW_ARIA_ATTR = true;
  /* Decide if custom data attributes are okay */
  let ALLOW_DATA_ATTR = true;
  /* Decide if unknown protocols are okay */
  let ALLOW_UNKNOWN_PROTOCOLS = false;
  /* Decide if self-closing tags in attributes are allowed.
   * Usually removed due to a mXSS issue in jQuery 3.0 */
  let ALLOW_SELF_CLOSE_IN_ATTR = true;
  /* Output should be safe for common template engines.
   * This means, DOMPurify removes data attributes, mustaches and ERB
   */
  let SAFE_FOR_TEMPLATES = false;
  /* Output should be safe even for XML used within HTML and alike.
   * This means, DOMPurify removes comments when containing risky content.
   */
  let SAFE_FOR_XML = true;
  /* Decide if document with <html>... should be returned */
  let WHOLE_DOCUMENT = false;
  /* Track whether config is already set on this instance of DOMPurify. */
  let SET_CONFIG = false;
  /* Decide if all elements (e.g. style, script) must be children of
   * document.body. By default, browsers might move them to document.head */
  let FORCE_BODY = false;
  /* Decide if a DOM `HTMLBodyElement` should be returned, instead of a html
   * string (or a TrustedHTML object if Trusted Types are supported).
   * If `WHOLE_DOCUMENT` is enabled a `HTMLHtmlElement` will be returned instead
   */
  let RETURN_DOM = false;
  /* Decide if a DOM `DocumentFragment` should be returned, instead of a html
   * string  (or a TrustedHTML object if Trusted Types are supported) */
  let RETURN_DOM_FRAGMENT = false;
  /* Try to return a Trusted Type object instead of a string, return a string in
   * case Trusted Types are not supported  */
  let RETURN_TRUSTED_TYPE = false;
  /* Output should be free from DOM clobbering attacks?
   * This sanitizes markups named with colliding, clobberable built-in DOM APIs.
   */
  let SANITIZE_DOM = true;
  /* Achieve full DOM Clobbering protection by isolating the namespace of named
   * properties and JS variables, mitigating attacks that abuse the HTML/DOM spec rules.
   *
   * HTML/DOM spec rules that enable DOM Clobbering:
   *   - Named Access on Window (§7.3.3)
   *   - DOM Tree Accessors (§3.1.5)
   *   - Form Element Parent-Child Relations (§4.10.3)
   *   - Iframe srcdoc / Nested WindowProxies (§4.8.5)
   *   - HTMLCollection (§4.2.10.2)
   *
   * Namespace isolation is implemented by prefixing `id` and `name` attributes
   * with a constant string, i.e., `user-content-`
   */
  let SANITIZE_NAMED_PROPS = false;
  const SANITIZE_NAMED_PROPS_PREFIX = 'user-content-';
  /* Keep element content when removing element? */
  let KEEP_CONTENT = true;
  /* If a `Node` is passed to sanitize(), then performs sanitization in-place instead
   * of importing it into a new Document and returning a sanitized copy */
  let IN_PLACE = false;
  /* Allow usage of profiles like html, svg and mathMl */
  let USE_PROFILES = {};
  /* Tags to ignore content of when KEEP_CONTENT is true */
  let FORBID_CONTENTS = null;
  const DEFAULT_FORBID_CONTENTS = addToSet({}, ['annotation-xml', 'audio', 'colgroup', 'desc', 'foreignobject', 'head', 'iframe', 'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'noembed', 'noframes', 'noscript', 'plaintext', 'script', 'style', 'svg', 'template', 'thead', 'title', 'video', 'xmp']);
  /* Tags that are safe for data: URIs */
  let DATA_URI_TAGS = null;
  const DEFAULT_DATA_URI_TAGS = addToSet({}, ['audio', 'video', 'img', 'source', 'image', 'track']);
  /* Attributes safe for values like "javascript:" */
  let URI_SAFE_ATTRIBUTES = null;
  const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ['alt', 'class', 'for', 'id', 'label', 'name', 'pattern', 'placeholder', 'role', 'summary', 'title', 'value', 'style', 'xmlns']);
  const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
  const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
  /* Document namespace */
  let NAMESPACE = HTML_NAMESPACE;
  let IS_EMPTY_INPUT = false;
  /* Allowed XHTML+XML namespaces */
  let ALLOWED_NAMESPACES = null;
  const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [MATHML_NAMESPACE, SVG_NAMESPACE, HTML_NAMESPACE], stringToString);
  let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, ['mi', 'mo', 'mn', 'ms', 'mtext']);
  let HTML_INTEGRATION_POINTS = addToSet({}, ['annotation-xml']);
  // Certain elements are allowed in both SVG and HTML
  // namespace. We need to specify them explicitly
  // so that they don't get erroneously deleted from
  // HTML namespace.
  const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, ['title', 'style', 'font', 'a', 'script']);
  /* Parsing of strict XHTML documents */
  let PARSER_MEDIA_TYPE = null;
  const SUPPORTED_PARSER_MEDIA_TYPES = ['application/xhtml+xml', 'text/html'];
  const DEFAULT_PARSER_MEDIA_TYPE = 'text/html';
  let transformCaseFunc = null;
  /* Keep a reference to config to pass to hooks */
  let CONFIG = null;
  /* Ideally, do not touch anything below this line */
  /* ______________________________________________ */
  const formElement = document.createElement('form');
  const isRegexOrFunction = function isRegexOrFunction(testValue) {
    return testValue instanceof RegExp || testValue instanceof Function;
  };
  /**
   * _parseConfig
   *
   * @param cfg optional config literal
   */
  // eslint-disable-next-line complexity
  const _parseConfig = function _parseConfig() {
    let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    if (CONFIG && CONFIG === cfg) {
      return;
    }
    /* Shield configuration object from tampering */
    if (!cfg || typeof cfg !== 'object') {
      cfg = {};
    }
    /* Shield configuration object from prototype pollution */
    cfg = clone(cfg);
    PARSER_MEDIA_TYPE =
    // eslint-disable-next-line unicorn/prefer-includes
    SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
    // HTML tags and attributes are not case-sensitive, converting to lowercase. Keeping XHTML as is.
    transformCaseFunc = PARSER_MEDIA_TYPE === 'application/xhtml+xml' ? stringToString : stringToLowerCase;
    /* Set configuration parameters */
    ALLOWED_TAGS = objectHasOwnProperty(cfg, 'ALLOWED_TAGS') ? addToSet({}, cfg.ALLOWED_TAGS, transformCaseFunc) : DEFAULT_ALLOWED_TAGS;
    ALLOWED_ATTR = objectHasOwnProperty(cfg, 'ALLOWED_ATTR') ? addToSet({}, cfg.ALLOWED_ATTR, transformCaseFunc) : DEFAULT_ALLOWED_ATTR;
    ALLOWED_NAMESPACES = objectHasOwnProperty(cfg, 'ALLOWED_NAMESPACES') ? addToSet({}, cfg.ALLOWED_NAMESPACES, stringToString) : DEFAULT_ALLOWED_NAMESPACES;
    URI_SAFE_ATTRIBUTES = objectHasOwnProperty(cfg, 'ADD_URI_SAFE_ATTR') ? addToSet(clone(DEFAULT_URI_SAFE_ATTRIBUTES), cfg.ADD_URI_SAFE_ATTR, transformCaseFunc) : DEFAULT_URI_SAFE_ATTRIBUTES;
    DATA_URI_TAGS = objectHasOwnProperty(cfg, 'ADD_DATA_URI_TAGS') ? addToSet(clone(DEFAULT_DATA_URI_TAGS), cfg.ADD_DATA_URI_TAGS, transformCaseFunc) : DEFAULT_DATA_URI_TAGS;
    FORBID_CONTENTS = objectHasOwnProperty(cfg, 'FORBID_CONTENTS') ? addToSet({}, cfg.FORBID_CONTENTS, transformCaseFunc) : DEFAULT_FORBID_CONTENTS;
    FORBID_TAGS = objectHasOwnProperty(cfg, 'FORBID_TAGS') ? addToSet({}, cfg.FORBID_TAGS, transformCaseFunc) : clone({});
    FORBID_ATTR = objectHasOwnProperty(cfg, 'FORBID_ATTR') ? addToSet({}, cfg.FORBID_ATTR, transformCaseFunc) : clone({});
    USE_PROFILES = objectHasOwnProperty(cfg, 'USE_PROFILES') ? cfg.USE_PROFILES : false;
    ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false; // Default true
    ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false; // Default true
    ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false; // Default false
    ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false; // Default true
    SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false; // Default false
    SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false; // Default true
    WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false; // Default false
    RETURN_DOM = cfg.RETURN_DOM || false; // Default false
    RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false; // Default false
    RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false; // Default false
    FORCE_BODY = cfg.FORCE_BODY || false; // Default false
    SANITIZE_DOM = cfg.SANITIZE_DOM !== false; // Default true
    SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false; // Default false
    KEEP_CONTENT = cfg.KEEP_CONTENT !== false; // Default true
    IN_PLACE = cfg.IN_PLACE || false; // Default false
    IS_ALLOWED_URI$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI;
    NAMESPACE = cfg.NAMESPACE || HTML_NAMESPACE;
    MATHML_TEXT_INTEGRATION_POINTS = cfg.MATHML_TEXT_INTEGRATION_POINTS || MATHML_TEXT_INTEGRATION_POINTS;
    HTML_INTEGRATION_POINTS = cfg.HTML_INTEGRATION_POINTS || HTML_INTEGRATION_POINTS;
    CUSTOM_ELEMENT_HANDLING = cfg.CUSTOM_ELEMENT_HANDLING || {};
    if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck)) {
      CUSTOM_ELEMENT_HANDLING.tagNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck;
    }
    if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)) {
      CUSTOM_ELEMENT_HANDLING.attributeNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck;
    }
    if (cfg.CUSTOM_ELEMENT_HANDLING && typeof cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements === 'boolean') {
      CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements;
    }
    if (SAFE_FOR_TEMPLATES) {
      ALLOW_DATA_ATTR = false;
    }
    if (RETURN_DOM_FRAGMENT) {
      RETURN_DOM = true;
    }
    /* Parse profile info */
    if (USE_PROFILES) {
      ALLOWED_TAGS = addToSet({}, text);
      ALLOWED_ATTR = [];
      if (USE_PROFILES.html === true) {
        addToSet(ALLOWED_TAGS, html$1);
        addToSet(ALLOWED_ATTR, html);
      }
      if (USE_PROFILES.svg === true) {
        addToSet(ALLOWED_TAGS, svg$1);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.svgFilters === true) {
        addToSet(ALLOWED_TAGS, svgFilters);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.mathMl === true) {
        addToSet(ALLOWED_TAGS, mathMl$1);
        addToSet(ALLOWED_ATTR, mathMl);
        addToSet(ALLOWED_ATTR, xml);
      }
    }
    /* Merge configuration parameters */
    if (cfg.ADD_TAGS) {
      if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
        ALLOWED_TAGS = clone(ALLOWED_TAGS);
      }
      addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
    }
    if (cfg.ADD_ATTR) {
      if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
        ALLOWED_ATTR = clone(ALLOWED_ATTR);
      }
      addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
    }
    if (cfg.ADD_URI_SAFE_ATTR) {
      addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR, transformCaseFunc);
    }
    if (cfg.FORBID_CONTENTS) {
      if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
        FORBID_CONTENTS = clone(FORBID_CONTENTS);
      }
      addToSet(FORBID_CONTENTS, cfg.FORBID_CONTENTS, transformCaseFunc);
    }
    /* Add #text in case KEEP_CONTENT is set to true */
    if (KEEP_CONTENT) {
      ALLOWED_TAGS['#text'] = true;
    }
    /* Add html, head and body to ALLOWED_TAGS in case WHOLE_DOCUMENT is true */
    if (WHOLE_DOCUMENT) {
      addToSet(ALLOWED_TAGS, ['html', 'head', 'body']);
    }
    /* Add tbody to ALLOWED_TAGS in case tables are permitted, see #286, #365 */
    if (ALLOWED_TAGS.table) {
      addToSet(ALLOWED_TAGS, ['tbody']);
      delete FORBID_TAGS.tbody;
    }
    if (cfg.TRUSTED_TYPES_POLICY) {
      if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== 'function') {
        throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
      }
      if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== 'function') {
        throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
      }
      // Overwrite existing TrustedTypes policy.
      trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
      // Sign local variables required by `sanitize`.
      emptyHTML = trustedTypesPolicy.createHTML('');
    } else {
      // Uninitialized policy, attempt to initialize the internal dompurify policy.
      if (trustedTypesPolicy === undefined) {
        trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
      }
      // If creating the internal policy succeeded sign internal variables.
      if (trustedTypesPolicy !== null && typeof emptyHTML === 'string') {
        emptyHTML = trustedTypesPolicy.createHTML('');
      }
    }
    // Prevent further manipulation of configuration.
    // Not available in IE8, Safari 5, etc.
    if (freeze) {
      freeze(cfg);
    }
    CONFIG = cfg;
  };
  /* Keep track of all possible SVG and MathML tags
   * so that we can perform the namespace checks
   * correctly. */
  const ALL_SVG_TAGS = addToSet({}, [...svg$1, ...svgFilters, ...svgDisallowed]);
  const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
  /**
   * @param element a DOM element whose namespace is being checked
   * @returns Return false if the element has a
   *  namespace that a spec-compliant parser would never
   *  return. Return true otherwise.
   */
  const _checkValidNamespace = function _checkValidNamespace(element) {
    let parent = getParentNode(element);
    // In JSDOM, if we're inside shadow DOM, then parentNode
    // can be null. We just simulate parent in this case.
    if (!parent || !parent.tagName) {
      parent = {
        namespaceURI: NAMESPACE,
        tagName: 'template'
      };
    }
    const tagName = stringToLowerCase(element.tagName);
    const parentTagName = stringToLowerCase(parent.tagName);
    if (!ALLOWED_NAMESPACES[element.namespaceURI]) {
      return false;
    }
    if (element.namespaceURI === SVG_NAMESPACE) {
      // The only way to switch from HTML namespace to SVG
      // is via <svg>. If it happens via any other tag, then
      // it should be killed.
      if (parent.namespaceURI === HTML_NAMESPACE) {
        return tagName === 'svg';
      }
      // The only way to switch from MathML to SVG is via`
      // svg if parent is either <annotation-xml> or MathML
      // text integration points.
      if (parent.namespaceURI === MATHML_NAMESPACE) {
        return tagName === 'svg' && (parentTagName === 'annotation-xml' || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
      }
      // We only allow elements that are defined in SVG
      // spec. All others are disallowed in SVG namespace.
      return Boolean(ALL_SVG_TAGS[tagName]);
    }
    if (element.namespaceURI === MATHML_NAMESPACE) {
      // The only way to switch from HTML namespace to MathML
      // is via <math>. If it happens via any other tag, then
      // it should be killed.
      if (parent.namespaceURI === HTML_NAMESPACE) {
        return tagName === 'math';
      }
      // The only way to switch from SVG to MathML is via
      // <math> and HTML integration points
      if (parent.namespaceURI === SVG_NAMESPACE) {
        return tagName === 'math' && HTML_INTEGRATION_POINTS[parentTagName];
      }
      // We only allow elements that are defined in MathML
      // spec. All others are disallowed in MathML namespace.
      return Boolean(ALL_MATHML_TAGS[tagName]);
    }
    if (element.namespaceURI === HTML_NAMESPACE) {
      // The only way to switch from SVG to HTML is via
      // HTML integration points, and from MathML to HTML
      // is via MathML text integration points
      if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
        return false;
      }
      if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
        return false;
      }
      // We disallow tags that are specific for MathML
      // or SVG and should never appear in HTML namespace
      return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
    }
    // For XHTML and XML documents that support custom namespaces
    if (PARSER_MEDIA_TYPE === 'application/xhtml+xml' && ALLOWED_NAMESPACES[element.namespaceURI]) {
      return true;
    }
    // The code should never reach this place (this means
    // that the element somehow got namespace that is not
    // HTML, SVG, MathML or allowed via ALLOWED_NAMESPACES).
    // Return false just in case.
    return false;
  };
  /**
   * _forceRemove
   *
   * @param node a DOM node
   */
  const _forceRemove = function _forceRemove(node) {
    arrayPush(DOMPurify.removed, {
      element: node
    });
    try {
      // eslint-disable-next-line unicorn/prefer-dom-node-remove
      getParentNode(node).removeChild(node);
    } catch (_) {
      remove(node);
    }
  };
  /**
   * _removeAttribute
   *
   * @param name an Attribute name
   * @param element a DOM node
   */
  const _removeAttribute = function _removeAttribute(name, element) {
    try {
      arrayPush(DOMPurify.removed, {
        attribute: element.getAttributeNode(name),
        from: element
      });
    } catch (_) {
      arrayPush(DOMPurify.removed, {
        attribute: null,
        from: element
      });
    }
    element.removeAttribute(name);
    // We void attribute values for unremovable "is" attributes
    if (name === 'is') {
      if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
        try {
          _forceRemove(element);
        } catch (_) {}
      } else {
        try {
          element.setAttribute(name, '');
        } catch (_) {}
      }
    }
  };
  /**
   * _initDocument
   *
   * @param dirty - a string of dirty markup
   * @return a DOM, filled with the dirty markup
   */
  const _initDocument = function _initDocument(dirty) {
    /* Create a HTML document */
    let doc = null;
    let leadingWhitespace = null;
    if (FORCE_BODY) {
      dirty = '<remove></remove>' + dirty;
    } else {
      /* If FORCE_BODY isn't used, leading whitespace needs to be preserved manually */
      const matches = stringMatch(dirty, /^[\r\n\t ]+/);
      leadingWhitespace = matches && matches[0];
    }
    if (PARSER_MEDIA_TYPE === 'application/xhtml+xml' && NAMESPACE === HTML_NAMESPACE) {
      // Root of XHTML doc must contain xmlns declaration (see https://www.w3.org/TR/xhtml1/normative.html#strict)
      dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + '</body></html>';
    }
    const dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
    /*
     * Use the DOMParser API by default, fallback later if needs be
     * DOMParser not work for svg when has multiple root element.
     */
    if (NAMESPACE === HTML_NAMESPACE) {
      try {
        doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
      } catch (_) {}
    }
    /* Use createHTMLDocument in case DOMParser is not available */
    if (!doc || !doc.documentElement) {
      doc = implementation.createDocument(NAMESPACE, 'template', null);
      try {
        doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
      } catch (_) {
        // Syntax error if dirtyPayload is invalid xml
      }
    }
    const body = doc.body || doc.documentElement;
    if (dirty && leadingWhitespace) {
      body.insertBefore(document.createTextNode(leadingWhitespace), body.childNodes[0] || null);
    }
    /* Work on whole document or just its body */
    if (NAMESPACE === HTML_NAMESPACE) {
      return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? 'html' : 'body')[0];
    }
    return WHOLE_DOCUMENT ? doc.documentElement : body;
  };
  /**
   * Creates a NodeIterator object that you can use to traverse filtered lists of nodes or elements in a document.
   *
   * @param root The root element or node to start traversing on.
   * @return The created NodeIterator
   */
  const _createNodeIterator = function _createNodeIterator(root) {
    return createNodeIterator.call(root.ownerDocument || root, root,
    // eslint-disable-next-line no-bitwise
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION, null);
  };
  /**
   * _isClobbered
   *
   * @param element element to check for clobbering attacks
   * @return true if clobbered, false if safe
   */
  const _isClobbered = function _isClobbered(element) {
    return element instanceof HTMLFormElement && (typeof element.nodeName !== 'string' || typeof element.textContent !== 'string' || typeof element.removeChild !== 'function' || !(element.attributes instanceof NamedNodeMap) || typeof element.removeAttribute !== 'function' || typeof element.setAttribute !== 'function' || typeof element.namespaceURI !== 'string' || typeof element.insertBefore !== 'function' || typeof element.hasChildNodes !== 'function');
  };
  /**
   * Checks whether the given object is a DOM node.
   *
   * @param value object to check whether it's a DOM node
   * @return true is object is a DOM node
   */
  const _isNode = function _isNode(value) {
    return typeof Node === 'function' && value instanceof Node;
  };
  function _executeHooks(hooks, currentNode, data) {
    arrayForEach(hooks, hook => {
      hook.call(DOMPurify, currentNode, data, CONFIG);
    });
  }
  /**
   * _sanitizeElements
   *
   * @protect nodeName
   * @protect textContent
   * @protect removeChild
   * @param currentNode to check for permission to exist
   * @return true if node was killed, false if left alive
   */
  const _sanitizeElements = function _sanitizeElements(currentNode) {
    let content = null;
    /* Execute a hook if present */
    _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
    /* Check if element is clobbered or can clobber */
    if (_isClobbered(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Now let's check the element's type and name */
    const tagName = transformCaseFunc(currentNode.nodeName);
    /* Execute a hook if present */
    _executeHooks(hooks.uponSanitizeElement, currentNode, {
      tagName,
      allowedTags: ALLOWED_TAGS
    });
    /* Detect mXSS attempts abusing namespace confusion */
    if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(/<[/\w!]/g, currentNode.innerHTML) && regExpTest(/<[/\w!]/g, currentNode.textContent)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Remove any occurrence of processing instructions */
    if (currentNode.nodeType === NODE_TYPE.progressingInstruction) {
      _forceRemove(currentNode);
      return true;
    }
    /* Remove any kind of possibly harmful comments */
    if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(/<[/\w]/g, currentNode.data)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Remove element if anything forbids its presence */
    if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
      /* Check if we have a custom element to handle */
      if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName)) {
        if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) {
          return false;
        }
        if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(tagName)) {
          return false;
        }
      }
      /* Keep content except for bad-listed elements */
      if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
        const parentNode = getParentNode(currentNode) || currentNode.parentNode;
        const childNodes = getChildNodes(currentNode) || currentNode.childNodes;
        if (childNodes && parentNode) {
          const childCount = childNodes.length;
          for (let i = childCount - 1; i >= 0; --i) {
            const childClone = cloneNode(childNodes[i], true);
            childClone.__removalCount = (currentNode.__removalCount || 0) + 1;
            parentNode.insertBefore(childClone, getNextSibling(currentNode));
          }
        }
      }
      _forceRemove(currentNode);
      return true;
    }
    /* Check whether element has a valid namespace */
    if (currentNode instanceof Element && !_checkValidNamespace(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Make sure that older browsers don't get fallback-tag mXSS */
    if ((tagName === 'noscript' || tagName === 'noembed' || tagName === 'noframes') && regExpTest(/<\/no(script|embed|frames)/i, currentNode.innerHTML)) {
      _forceRemove(currentNode);
      return true;
    }
    /* Sanitize element content to be template-safe */
    if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
      /* Get the element's text content */
      content = currentNode.textContent;
      arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
        content = stringReplace(content, expr, ' ');
      });
      if (currentNode.textContent !== content) {
        arrayPush(DOMPurify.removed, {
          element: currentNode.cloneNode()
        });
        currentNode.textContent = content;
      }
    }
    /* Execute a hook if present */
    _executeHooks(hooks.afterSanitizeElements, currentNode, null);
    return false;
  };
  /**
   * _isValidAttribute
   *
   * @param lcTag Lowercase tag name of containing element.
   * @param lcName Lowercase attribute name.
   * @param value Attribute value.
   * @return Returns true if `value` is valid, otherwise false.
   */
  // eslint-disable-next-line complexity
  const _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
    /* Make sure attribute cannot clobber */
    if (SANITIZE_DOM && (lcName === 'id' || lcName === 'name') && (value in document || value in formElement)) {
      return false;
    }
    /* Allow valid data-* attributes: At least one character after "-"
        (https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes)
        XML-compatible (https://html.spec.whatwg.org/multipage/infrastructure.html#xml-compatible and http://www.w3.org/TR/xml/#d0e804)
        We don't need to check the value; it's always URI safe. */
    if (ALLOW_DATA_ATTR && !FORBID_ATTR[lcName] && regExpTest(DATA_ATTR, lcName)) ;else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR, lcName)) ;else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
      if (
      // First condition does a very basic check if a) it's basically a valid custom element tagname AND
      // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
      // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
      _isBasicCustomElement(lcTag) && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(lcTag)) && (CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName) || CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.attributeNameCheck(lcName)) ||
      // Alternative, second condition checks if it's an `is`-attribute, AND
      // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
      lcName === 'is' && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(value))) ;else {
        return false;
      }
      /* Check value is safe. First, is attr inert? If so, is safe */
    } else if (URI_SAFE_ATTRIBUTES[lcName]) ;else if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE, ''))) ;else if ((lcName === 'src' || lcName === 'xlink:href' || lcName === 'href') && lcTag !== 'script' && stringIndexOf(value, 'data:') === 0 && DATA_URI_TAGS[lcTag]) ;else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA, stringReplace(value, ATTR_WHITESPACE, ''))) ;else if (value) {
      return false;
    } else ;
    return true;
  };
  /**
   * _isBasicCustomElement
   * checks if at least one dash is included in tagName, and it's not the first char
   * for more sophisticated checking see https://github.com/sindresorhus/validate-element-name
   *
   * @param tagName name of the tag of the node to sanitize
   * @returns Returns true if the tag name meets the basic criteria for a custom element, otherwise false.
   */
  const _isBasicCustomElement = function _isBasicCustomElement(tagName) {
    return tagName !== 'annotation-xml' && stringMatch(tagName, CUSTOM_ELEMENT);
  };
  /**
   * _sanitizeAttributes
   *
   * @protect attributes
   * @protect nodeName
   * @protect removeAttribute
   * @protect setAttribute
   *
   * @param currentNode to sanitize
   */
  const _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
    /* Execute a hook if present */
    _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
    const {
      attributes
    } = currentNode;
    /* Check if we have attributes; if not we might have a text node */
    if (!attributes || _isClobbered(currentNode)) {
      return;
    }
    const hookEvent = {
      attrName: '',
      attrValue: '',
      keepAttr: true,
      allowedAttributes: ALLOWED_ATTR,
      forceKeepAttr: undefined
    };
    let l = attributes.length;
    /* Go backwards over all attributes; safely remove bad ones */
    while (l--) {
      const attr = attributes[l];
      const {
        name,
        namespaceURI,
        value: attrValue
      } = attr;
      const lcName = transformCaseFunc(name);
      const initValue = attrValue;
      let value = name === 'value' ? initValue : stringTrim(initValue);
      /* Execute a hook if present */
      hookEvent.attrName = lcName;
      hookEvent.attrValue = value;
      hookEvent.keepAttr = true;
      hookEvent.forceKeepAttr = undefined; // Allows developers to see this is a property they can set
      _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
      value = hookEvent.attrValue;
      /* Full DOM Clobbering protection via namespace isolation,
       * Prefix id and name attributes with `user-content-`
       */
      if (SANITIZE_NAMED_PROPS && (lcName === 'id' || lcName === 'name')) {
        // Remove the attribute with this value
        _removeAttribute(name, currentNode);
        // Prefix the value and later re-create the attribute with the sanitized value
        value = SANITIZE_NAMED_PROPS_PREFIX + value;
      }
      /* Work around a security issue with comments inside attributes */
      if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|title)/i, value)) {
        _removeAttribute(name, currentNode);
        continue;
      }
      /* Did the hooks approve of the attribute? */
      if (hookEvent.forceKeepAttr) {
        continue;
      }
      /* Did the hooks approve of the attribute? */
      if (!hookEvent.keepAttr) {
        _removeAttribute(name, currentNode);
        continue;
      }
      /* Work around a security issue in jQuery 3.0 */
      if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(/\/>/i, value)) {
        _removeAttribute(name, currentNode);
        continue;
      }
      /* Sanitize attribute content to be template-safe */
      if (SAFE_FOR_TEMPLATES) {
        arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
          value = stringReplace(value, expr, ' ');
        });
      }
      /* Is `value` valid for this attribute? */
      const lcTag = transformCaseFunc(currentNode.nodeName);
      if (!_isValidAttribute(lcTag, lcName, value)) {
        _removeAttribute(name, currentNode);
        continue;
      }
      /* Handle attributes that require Trusted Types */
      if (trustedTypesPolicy && typeof trustedTypes === 'object' && typeof trustedTypes.getAttributeType === 'function') {
        if (namespaceURI) ;else {
          switch (trustedTypes.getAttributeType(lcTag, lcName)) {
            case 'TrustedHTML':
              {
                value = trustedTypesPolicy.createHTML(value);
                break;
              }
            case 'TrustedScriptURL':
              {
                value = trustedTypesPolicy.createScriptURL(value);
                break;
              }
          }
        }
      }
      /* Handle invalid data-* attribute set by try-catching it */
      if (value !== initValue) {
        try {
          if (namespaceURI) {
            currentNode.setAttributeNS(namespaceURI, name, value);
          } else {
            /* Fallback to setAttribute() for browser-unrecognized namespaces e.g. "x-schema". */
            currentNode.setAttribute(name, value);
          }
          if (_isClobbered(currentNode)) {
            _forceRemove(currentNode);
          } else {
            arrayPop(DOMPurify.removed);
          }
        } catch (_) {
          _removeAttribute(name, currentNode);
        }
      }
    }
    /* Execute a hook if present */
    _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
  };
  /**
   * _sanitizeShadowDOM
   *
   * @param fragment to iterate over recursively
   */
  const _sanitizeShadowDOM = function _sanitizeShadowDOM(fragment) {
    let shadowNode = null;
    const shadowIterator = _createNodeIterator(fragment);
    /* Execute a hook if present */
    _executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
    while (shadowNode = shadowIterator.nextNode()) {
      /* Execute a hook if present */
      _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
      /* Sanitize tags and elements */
      _sanitizeElements(shadowNode);
      /* Check attributes next */
      _sanitizeAttributes(shadowNode);
      /* Deep shadow DOM detected */
      if (shadowNode.content instanceof DocumentFragment) {
        _sanitizeShadowDOM(shadowNode.content);
      }
    }
    /* Execute a hook if present */
    _executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
  };
  // eslint-disable-next-line complexity
  DOMPurify.sanitize = function (dirty) {
    let cfg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let body = null;
    let importedNode = null;
    let currentNode = null;
    let returnNode = null;
    /* Make sure we have a string to sanitize.
      DO NOT return early, as this will return the wrong type if
      the user has requested a DOM object rather than a string */
    IS_EMPTY_INPUT = !dirty;
    if (IS_EMPTY_INPUT) {
      dirty = '<!-->';
    }
    /* Stringify, in case dirty is an object */
    if (typeof dirty !== 'string' && !_isNode(dirty)) {
      if (typeof dirty.toString === 'function') {
        dirty = dirty.toString();
        if (typeof dirty !== 'string') {
          throw typeErrorCreate('dirty is not a string, aborting');
        }
      } else {
        throw typeErrorCreate('toString is not a function');
      }
    }
    /* Return dirty HTML if DOMPurify cannot run */
    if (!DOMPurify.isSupported) {
      return dirty;
    }
    /* Assign config vars */
    if (!SET_CONFIG) {
      _parseConfig(cfg);
    }
    /* Clean up removed elements */
    DOMPurify.removed = [];
    /* Check if dirty is correctly typed for IN_PLACE */
    if (typeof dirty === 'string') {
      IN_PLACE = false;
    }
    if (IN_PLACE) {
      /* Do some early pre-sanitization to avoid unsafe root nodes */
      if (dirty.nodeName) {
        const tagName = transformCaseFunc(dirty.nodeName);
        if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
          throw typeErrorCreate('root node is forbidden and cannot be sanitized in-place');
        }
      }
    } else if (dirty instanceof Node) {
      /* If dirty is a DOM element, append to an empty document to avoid
         elements being stripped by the parser */
      body = _initDocument('<!---->');
      importedNode = body.ownerDocument.importNode(dirty, true);
      if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === 'BODY') {
        /* Node is already a body, use as is */
        body = importedNode;
      } else if (importedNode.nodeName === 'HTML') {
        body = importedNode;
      } else {
        // eslint-disable-next-line unicorn/prefer-dom-node-append
        body.appendChild(importedNode);
      }
    } else {
      /* Exit directly if we have nothing to do */
      if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT &&
      // eslint-disable-next-line unicorn/prefer-includes
      dirty.indexOf('<') === -1) {
        return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
      }
      /* Initialize the document to work on */
      body = _initDocument(dirty);
      /* Check we have a DOM node from the data */
      if (!body) {
        return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : '';
      }
    }
    /* Remove first element node (ours) if FORCE_BODY is set */
    if (body && FORCE_BODY) {
      _forceRemove(body.firstChild);
    }
    /* Get node iterator */
    const nodeIterator = _createNodeIterator(IN_PLACE ? dirty : body);
    /* Now start iterating over the created document */
    while (currentNode = nodeIterator.nextNode()) {
      /* Sanitize tags and elements */
      _sanitizeElements(currentNode);
      /* Check attributes next */
      _sanitizeAttributes(currentNode);
      /* Shadow DOM detected, sanitize it */
      if (currentNode.content instanceof DocumentFragment) {
        _sanitizeShadowDOM(currentNode.content);
      }
    }
    /* If we sanitized `dirty` in-place, return it. */
    if (IN_PLACE) {
      return dirty;
    }
    /* Return sanitized string or DOM */
    if (RETURN_DOM) {
      if (RETURN_DOM_FRAGMENT) {
        returnNode = createDocumentFragment.call(body.ownerDocument);
        while (body.firstChild) {
          // eslint-disable-next-line unicorn/prefer-dom-node-append
          returnNode.appendChild(body.firstChild);
        }
      } else {
        returnNode = body;
      }
      if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) {
        /*
          AdoptNode() is not used because internal state is not reset
          (e.g. the past names map of a HTMLFormElement), this is safe
          in theory but we would rather not risk another attack vector.
          The state that is cloned by importNode() is explicitly defined
          by the specs.
        */
        returnNode = importNode.call(originalDocument, returnNode, true);
      }
      return returnNode;
    }
    let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
    /* Serialize doctype if allowed */
    if (WHOLE_DOCUMENT && ALLOWED_TAGS['!doctype'] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) {
      serializedHTML = '<!DOCTYPE ' + body.ownerDocument.doctype.name + '>\n' + serializedHTML;
    }
    /* Sanitize final string template-safe */
    if (SAFE_FOR_TEMPLATES) {
      arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
        serializedHTML = stringReplace(serializedHTML, expr, ' ');
      });
    }
    return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
  };
  DOMPurify.setConfig = function () {
    let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _parseConfig(cfg);
    SET_CONFIG = true;
  };
  DOMPurify.clearConfig = function () {
    CONFIG = null;
    SET_CONFIG = false;
  };
  DOMPurify.isValidAttribute = function (tag, attr, value) {
    /* Initialize shared config vars if necessary. */
    if (!CONFIG) {
      _parseConfig({});
    }
    const lcTag = transformCaseFunc(tag);
    const lcName = transformCaseFunc(attr);
    return _isValidAttribute(lcTag, lcName, value);
  };
  DOMPurify.addHook = function (entryPoint, hookFunction) {
    if (typeof hookFunction !== 'function') {
      return;
    }
    arrayPush(hooks[entryPoint], hookFunction);
  };
  DOMPurify.removeHook = function (entryPoint, hookFunction) {
    if (hookFunction !== undefined) {
      const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
      return index === -1 ? undefined : arraySplice(hooks[entryPoint], index, 1)[0];
    }
    return arrayPop(hooks[entryPoint]);
  };
  DOMPurify.removeHooks = function (entryPoint) {
    hooks[entryPoint] = [];
  };
  DOMPurify.removeAllHooks = function () {
    hooks = _createHooksMap();
  };
  return DOMPurify;
}
var purify = createDOMPurify();

function IndiuMXPDFExporter(props) {
    const [busy, setBusy] = useState(false);
    const btnRef = useRef(null);
    const mappings = useMemo(() => {
        const list = [];
        if (props.richSelector1 && props.richHtml1?.value)
            list.push({ selector: props.richSelector1, html: props.richHtml1.value });
        if (props.richSelector2 && props.richHtml2?.value)
            list.push({ selector: props.richSelector2, html: props.richHtml2.value });
        if (props.richSelector3 && props.richHtml3?.value)
            list.push({ selector: props.richSelector3, html: props.richHtml3.value });
        return list;
    }, [props.richSelector1, props.richHtml1?.value, props.richSelector2, props.richHtml2?.value, props.richSelector3, props.richHtml3?.value]);
    const doExport = useCallback(async () => {
        if (busy)
            return;
        setBusy(true);
        try {
            const target = document.querySelector(`.${props.targetClass}`);
            if (!target)
                throw new Error(`PdfExporterPlus: no element with class .${props.targetClass} found on the page.`);
            // Clone node to avoid mutating live UI
            const clone = target.cloneNode(true);
            // Strip iframes inside clone (they won't render and can taint canvas)
            clone.querySelectorAll("iframe").forEach(ifr => ifr.replaceWith(document.createElement("div")));
            // Inline Rich Text HTML where mapped
            for (const map of mappings) {
                if (!map.selector || !map.html)
                    continue;
                const nodes = clone.querySelectorAll(map.selector);
                const clean = purify.sanitize(map.html, { USE_PROFILES: { html: true } });
                nodes.forEach(n => {
                    n.innerHTML = clean;
                });
            }
            // Prepare an offscreen container to render clone for PDF
            const host = document.createElement("div");
            host.style.position = "fixed";
            host.style.left = "-99999px";
            host.style.top = "0";
            host.style.width = target.offsetWidth + "px"; // keep widths stable
            host.appendChild(clone);
            document.body.appendChild(host);
            const filename = (props.fileName?.value ?? "export").replace(/[\/:*?"<>|]+/g, "_");
            // Normalize options to match html2pdf.js typings
            const marginNumber = (() => {
                const raw = props.pageMargin ?? "10"; // allow "10mm" or "10"
                const n = parseFloat(String(raw));
                return Number.isFinite(n) ? n : 10;
            })();
            const scaleNumber = (() => {
                // Mendix decimals come in as Big.js; coerce to number
                const raw = props.scale;
                const n = typeof raw === "string" ? parseFloat(raw) : Number(raw);
                return Number.isFinite(n) && n > 0 ? n : 1;
            })();
            // html2pdf options
            // Use html2pdf to create the PDF and also access the Blob for Base64/preview
            const opt = {
                margin: marginNumber, // number per html2pdf.js Options
                filename: filename,
                image: { type: "jpeg", quality: 0.95 },
                html2canvas: {
                    scale: scaleNumber,
                    useCORS: true,
                    allowTaint: false,
                    logging: false
                },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
            }; // cast to relax strict typing vs. library defs
            // Build the pdf instance so we can branch behavior
            const worker = html2pdf().from(clone).set(opt).toPdf();
            const blob = await worker.output("blob");
            // Set attribute values if configured
            if (props.pdfNameAttr && props.pdfNameAttr.setValue) {
                props.pdfNameAttr.setValue(filename);
            }
            // Option handling mirroring the marketplace widget
            const option = (props.fileOption ?? "download");
            if (option === "base64") {
                const base64 = await new Promise((resolve, reject) => {
                    const fr = new FileReader();
                    fr.onerror = () => reject(fr.error);
                    fr.onload = () => {
                        // fr.result is a data URL like "data:application/pdf;base64,...." → store only the base64 payload
                        const result = String(fr.result ?? "");
                        const commaIdx = result.indexOf(",");
                        resolve(commaIdx >= 0 ? result.substring(commaIdx + 1) : result);
                    };
                    fr.readAsDataURL(blob);
                });
                if (props.base64Attr && props.base64Attr.setValue) {
                    props.base64Attr.setValue(base64);
                }
            }
            else if (option === "preview") {
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank", "noopener,noreferrer");
                // do not revoke immediately—let the new tab load; revoke on unload automatically
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
            }
            else {
                // Default: Download File
                const dl = document.createElement("a");
                const url = URL.createObjectURL(blob);
                dl.href = url;
                dl.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
                document.body.appendChild(dl);
                dl.click();
                document.body.removeChild(dl);
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
            }
            // Clean up
            document.body.removeChild(host);
            if (props.onAfterGenerate?.canExecute)
                props.onAfterGenerate.execute();
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            alert(e.message);
        }
        finally {
            setBusy(false);
        }
    }, [busy, mappings, props.targetClass, props.fileName?.value, props.pageMargin, props.scale, props.onAfterGenerate]);
    if (props.hideButton)
        return createElement(Fragment, null);
    return (createElement("button", { ref: btnRef, className: props.buttonClass ?? "btn btn-primary", disabled: busy, onClick: doExport }, busy ? "Generating…" : props.buttonCaption?.value ?? "Download PDF"));
}

export { IndiuMXPDFExporter };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kaXVNWFBERkV4cG9ydGVyLm1qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2RvbXB1cmlmeS9kaXN0L3B1cmlmeS5lcy5tanMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvSW5kaXVNWFBERkV4cG9ydGVyLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiEgQGxpY2Vuc2UgRE9NUHVyaWZ5IDMuMi42IHwgKGMpIEN1cmU1MyBhbmQgb3RoZXIgY29udHJpYnV0b3JzIHwgUmVsZWFzZWQgdW5kZXIgdGhlIEFwYWNoZSBsaWNlbnNlIDIuMCBhbmQgTW96aWxsYSBQdWJsaWMgTGljZW5zZSAyLjAgfCBnaXRodWIuY29tL2N1cmU1My9ET01QdXJpZnkvYmxvYi8zLjIuNi9MSUNFTlNFICovXG5cbmNvbnN0IHtcbiAgZW50cmllcyxcbiAgc2V0UHJvdG90eXBlT2YsXG4gIGlzRnJvemVuLFxuICBnZXRQcm90b3R5cGVPZixcbiAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yXG59ID0gT2JqZWN0O1xubGV0IHtcbiAgZnJlZXplLFxuICBzZWFsLFxuICBjcmVhdGVcbn0gPSBPYmplY3Q7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgaW1wb3J0L25vLW11dGFibGUtZXhwb3J0c1xubGV0IHtcbiAgYXBwbHksXG4gIGNvbnN0cnVjdFxufSA9IHR5cGVvZiBSZWZsZWN0ICE9PSAndW5kZWZpbmVkJyAmJiBSZWZsZWN0O1xuaWYgKCFmcmVlemUpIHtcbiAgZnJlZXplID0gZnVuY3Rpb24gZnJlZXplKHgpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn1cbmlmICghc2VhbCkge1xuICBzZWFsID0gZnVuY3Rpb24gc2VhbCh4KSB7XG4gICAgcmV0dXJuIHg7XG4gIH07XG59XG5pZiAoIWFwcGx5KSB7XG4gIGFwcGx5ID0gZnVuY3Rpb24gYXBwbHkoZnVuLCB0aGlzVmFsdWUsIGFyZ3MpIHtcbiAgICByZXR1cm4gZnVuLmFwcGx5KHRoaXNWYWx1ZSwgYXJncyk7XG4gIH07XG59XG5pZiAoIWNvbnN0cnVjdCkge1xuICBjb25zdHJ1Y3QgPSBmdW5jdGlvbiBjb25zdHJ1Y3QoRnVuYywgYXJncykge1xuICAgIHJldHVybiBuZXcgRnVuYyguLi5hcmdzKTtcbiAgfTtcbn1cbmNvbnN0IGFycmF5Rm9yRWFjaCA9IHVuYXBwbHkoQXJyYXkucHJvdG90eXBlLmZvckVhY2gpO1xuY29uc3QgYXJyYXlMYXN0SW5kZXhPZiA9IHVuYXBwbHkoQXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mKTtcbmNvbnN0IGFycmF5UG9wID0gdW5hcHBseShBcnJheS5wcm90b3R5cGUucG9wKTtcbmNvbnN0IGFycmF5UHVzaCA9IHVuYXBwbHkoQXJyYXkucHJvdG90eXBlLnB1c2gpO1xuY29uc3QgYXJyYXlTcGxpY2UgPSB1bmFwcGx5KEFycmF5LnByb3RvdHlwZS5zcGxpY2UpO1xuY29uc3Qgc3RyaW5nVG9Mb3dlckNhc2UgPSB1bmFwcGx5KFN0cmluZy5wcm90b3R5cGUudG9Mb3dlckNhc2UpO1xuY29uc3Qgc3RyaW5nVG9TdHJpbmcgPSB1bmFwcGx5KFN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcpO1xuY29uc3Qgc3RyaW5nTWF0Y2ggPSB1bmFwcGx5KFN0cmluZy5wcm90b3R5cGUubWF0Y2gpO1xuY29uc3Qgc3RyaW5nUmVwbGFjZSA9IHVuYXBwbHkoU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlKTtcbmNvbnN0IHN0cmluZ0luZGV4T2YgPSB1bmFwcGx5KFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZik7XG5jb25zdCBzdHJpbmdUcmltID0gdW5hcHBseShTdHJpbmcucHJvdG90eXBlLnRyaW0pO1xuY29uc3Qgb2JqZWN0SGFzT3duUHJvcGVydHkgPSB1bmFwcGx5KE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xuY29uc3QgcmVnRXhwVGVzdCA9IHVuYXBwbHkoUmVnRXhwLnByb3RvdHlwZS50ZXN0KTtcbmNvbnN0IHR5cGVFcnJvckNyZWF0ZSA9IHVuY29uc3RydWN0KFR5cGVFcnJvcik7XG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZnVuY3Rpb24gdGhhdCBjYWxscyB0aGUgZ2l2ZW4gZnVuY3Rpb24gd2l0aCBhIHNwZWNpZmllZCB0aGlzQXJnIGFuZCBhcmd1bWVudHMuXG4gKlxuICogQHBhcmFtIGZ1bmMgLSBUaGUgZnVuY3Rpb24gdG8gYmUgd3JhcHBlZCBhbmQgY2FsbGVkLlxuICogQHJldHVybnMgQSBuZXcgZnVuY3Rpb24gdGhhdCBjYWxscyB0aGUgZ2l2ZW4gZnVuY3Rpb24gd2l0aCBhIHNwZWNpZmllZCB0aGlzQXJnIGFuZCBhcmd1bWVudHMuXG4gKi9cbmZ1bmN0aW9uIHVuYXBwbHkoZnVuYykge1xuICByZXR1cm4gZnVuY3Rpb24gKHRoaXNBcmcpIHtcbiAgICBpZiAodGhpc0FyZyBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgdGhpc0FyZy5sYXN0SW5kZXggPSAwO1xuICAgIH1cbiAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IG5ldyBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICBhcmdzW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIGFwcGx5KGZ1bmMsIHRoaXNBcmcsIGFyZ3MpO1xuICB9O1xufVxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGZ1bmN0aW9uIHRoYXQgY29uc3RydWN0cyBhbiBpbnN0YW5jZSBvZiB0aGUgZ2l2ZW4gY29uc3RydWN0b3IgZnVuY3Rpb24gd2l0aCB0aGUgcHJvdmlkZWQgYXJndW1lbnRzLlxuICpcbiAqIEBwYXJhbSBmdW5jIC0gVGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGJlIHdyYXBwZWQgYW5kIGNhbGxlZC5cbiAqIEByZXR1cm5zIEEgbmV3IGZ1bmN0aW9uIHRoYXQgY29uc3RydWN0cyBhbiBpbnN0YW5jZSBvZiB0aGUgZ2l2ZW4gY29uc3RydWN0b3IgZnVuY3Rpb24gd2l0aCB0aGUgcHJvdmlkZWQgYXJndW1lbnRzLlxuICovXG5mdW5jdGlvbiB1bmNvbnN0cnVjdChmdW5jKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgX2xlbjIgPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gbmV3IEFycmF5KF9sZW4yKSwgX2tleTIgPSAwOyBfa2V5MiA8IF9sZW4yOyBfa2V5MisrKSB7XG4gICAgICBhcmdzW19rZXkyXSA9IGFyZ3VtZW50c1tfa2V5Ml07XG4gICAgfVxuICAgIHJldHVybiBjb25zdHJ1Y3QoZnVuYywgYXJncyk7XG4gIH07XG59XG4vKipcbiAqIEFkZCBwcm9wZXJ0aWVzIHRvIGEgbG9va3VwIHRhYmxlXG4gKlxuICogQHBhcmFtIHNldCAtIFRoZSBzZXQgdG8gd2hpY2ggZWxlbWVudHMgd2lsbCBiZSBhZGRlZC5cbiAqIEBwYXJhbSBhcnJheSAtIFRoZSBhcnJheSBjb250YWluaW5nIGVsZW1lbnRzIHRvIGJlIGFkZGVkIHRvIHRoZSBzZXQuXG4gKiBAcGFyYW0gdHJhbnNmb3JtQ2FzZUZ1bmMgLSBBbiBvcHRpb25hbCBmdW5jdGlvbiB0byB0cmFuc2Zvcm0gdGhlIGNhc2Ugb2YgZWFjaCBlbGVtZW50IGJlZm9yZSBhZGRpbmcgdG8gdGhlIHNldC5cbiAqIEByZXR1cm5zIFRoZSBtb2RpZmllZCBzZXQgd2l0aCBhZGRlZCBlbGVtZW50cy5cbiAqL1xuZnVuY3Rpb24gYWRkVG9TZXQoc2V0LCBhcnJheSkge1xuICBsZXQgdHJhbnNmb3JtQ2FzZUZ1bmMgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IHN0cmluZ1RvTG93ZXJDYXNlO1xuICBpZiAoc2V0UHJvdG90eXBlT2YpIHtcbiAgICAvLyBNYWtlICdpbicgYW5kIHRydXRoeSBjaGVja3MgbGlrZSBCb29sZWFuKHNldC5jb25zdHJ1Y3RvcilcbiAgICAvLyBpbmRlcGVuZGVudCBvZiBhbnkgcHJvcGVydGllcyBkZWZpbmVkIG9uIE9iamVjdC5wcm90b3R5cGUuXG4gICAgLy8gUHJldmVudCBwcm90b3R5cGUgc2V0dGVycyBmcm9tIGludGVyY2VwdGluZyBzZXQgYXMgYSB0aGlzIHZhbHVlLlxuICAgIHNldFByb3RvdHlwZU9mKHNldCwgbnVsbCk7XG4gIH1cbiAgbGV0IGwgPSBhcnJheS5sZW5ndGg7XG4gIHdoaWxlIChsLS0pIHtcbiAgICBsZXQgZWxlbWVudCA9IGFycmF5W2xdO1xuICAgIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnN0IGxjRWxlbWVudCA9IHRyYW5zZm9ybUNhc2VGdW5jKGVsZW1lbnQpO1xuICAgICAgaWYgKGxjRWxlbWVudCAhPT0gZWxlbWVudCkge1xuICAgICAgICAvLyBDb25maWcgcHJlc2V0cyAoZS5nLiB0YWdzLmpzLCBhdHRycy5qcykgYXJlIGltbXV0YWJsZS5cbiAgICAgICAgaWYgKCFpc0Zyb3plbihhcnJheSkpIHtcbiAgICAgICAgICBhcnJheVtsXSA9IGxjRWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50ID0gbGNFbGVtZW50O1xuICAgICAgfVxuICAgIH1cbiAgICBzZXRbZWxlbWVudF0gPSB0cnVlO1xuICB9XG4gIHJldHVybiBzZXQ7XG59XG4vKipcbiAqIENsZWFuIHVwIGFuIGFycmF5IHRvIGhhcmRlbiBhZ2FpbnN0IENTUFBcbiAqXG4gKiBAcGFyYW0gYXJyYXkgLSBUaGUgYXJyYXkgdG8gYmUgY2xlYW5lZC5cbiAqIEByZXR1cm5zIFRoZSBjbGVhbmVkIHZlcnNpb24gb2YgdGhlIGFycmF5XG4gKi9cbmZ1bmN0aW9uIGNsZWFuQXJyYXkoYXJyYXkpIHtcbiAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGFycmF5Lmxlbmd0aDsgaW5kZXgrKykge1xuICAgIGNvbnN0IGlzUHJvcGVydHlFeGlzdCA9IG9iamVjdEhhc093blByb3BlcnR5KGFycmF5LCBpbmRleCk7XG4gICAgaWYgKCFpc1Byb3BlcnR5RXhpc3QpIHtcbiAgICAgIGFycmF5W2luZGV4XSA9IG51bGw7XG4gICAgfVxuICB9XG4gIHJldHVybiBhcnJheTtcbn1cbi8qKlxuICogU2hhbGxvdyBjbG9uZSBhbiBvYmplY3RcbiAqXG4gKiBAcGFyYW0gb2JqZWN0IC0gVGhlIG9iamVjdCB0byBiZSBjbG9uZWQuXG4gKiBAcmV0dXJucyBBIG5ldyBvYmplY3QgdGhhdCBjb3BpZXMgdGhlIG9yaWdpbmFsLlxuICovXG5mdW5jdGlvbiBjbG9uZShvYmplY3QpIHtcbiAgY29uc3QgbmV3T2JqZWN0ID0gY3JlYXRlKG51bGwpO1xuICBmb3IgKGNvbnN0IFtwcm9wZXJ0eSwgdmFsdWVdIG9mIGVudHJpZXMob2JqZWN0KSkge1xuICAgIGNvbnN0IGlzUHJvcGVydHlFeGlzdCA9IG9iamVjdEhhc093blByb3BlcnR5KG9iamVjdCwgcHJvcGVydHkpO1xuICAgIGlmIChpc1Byb3BlcnR5RXhpc3QpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBuZXdPYmplY3RbcHJvcGVydHldID0gY2xlYW5BcnJheSh2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09IE9iamVjdCkge1xuICAgICAgICBuZXdPYmplY3RbcHJvcGVydHldID0gY2xvbmUodmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3T2JqZWN0W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gbmV3T2JqZWN0O1xufVxuLyoqXG4gKiBUaGlzIG1ldGhvZCBhdXRvbWF0aWNhbGx5IGNoZWNrcyBpZiB0aGUgcHJvcCBpcyBmdW5jdGlvbiBvciBnZXR0ZXIgYW5kIGJlaGF2ZXMgYWNjb3JkaW5nbHkuXG4gKlxuICogQHBhcmFtIG9iamVjdCAtIFRoZSBvYmplY3QgdG8gbG9vayB1cCB0aGUgZ2V0dGVyIGZ1bmN0aW9uIGluIGl0cyBwcm90b3R5cGUgY2hhaW4uXG4gKiBAcGFyYW0gcHJvcCAtIFRoZSBwcm9wZXJ0eSBuYW1lIGZvciB3aGljaCB0byBmaW5kIHRoZSBnZXR0ZXIgZnVuY3Rpb24uXG4gKiBAcmV0dXJucyBUaGUgZ2V0dGVyIGZ1bmN0aW9uIGZvdW5kIGluIHRoZSBwcm90b3R5cGUgY2hhaW4gb3IgYSBmYWxsYmFjayBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gbG9va3VwR2V0dGVyKG9iamVjdCwgcHJvcCkge1xuICB3aGlsZSAob2JqZWN0ICE9PSBudWxsKSB7XG4gICAgY29uc3QgZGVzYyA9IGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIHByb3ApO1xuICAgIGlmIChkZXNjKSB7XG4gICAgICBpZiAoZGVzYy5nZXQpIHtcbiAgICAgICAgcmV0dXJuIHVuYXBwbHkoZGVzYy5nZXQpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBkZXNjLnZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiB1bmFwcGx5KGRlc2MudmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICBvYmplY3QgPSBnZXRQcm90b3R5cGVPZihvYmplY3QpO1xuICB9XG4gIGZ1bmN0aW9uIGZhbGxiYWNrVmFsdWUoKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIGZhbGxiYWNrVmFsdWU7XG59XG5cbmNvbnN0IGh0bWwkMSA9IGZyZWV6ZShbJ2EnLCAnYWJicicsICdhY3JvbnltJywgJ2FkZHJlc3MnLCAnYXJlYScsICdhcnRpY2xlJywgJ2FzaWRlJywgJ2F1ZGlvJywgJ2InLCAnYmRpJywgJ2JkbycsICdiaWcnLCAnYmxpbmsnLCAnYmxvY2txdW90ZScsICdib2R5JywgJ2JyJywgJ2J1dHRvbicsICdjYW52YXMnLCAnY2FwdGlvbicsICdjZW50ZXInLCAnY2l0ZScsICdjb2RlJywgJ2NvbCcsICdjb2xncm91cCcsICdjb250ZW50JywgJ2RhdGEnLCAnZGF0YWxpc3QnLCAnZGQnLCAnZGVjb3JhdG9yJywgJ2RlbCcsICdkZXRhaWxzJywgJ2RmbicsICdkaWFsb2cnLCAnZGlyJywgJ2RpdicsICdkbCcsICdkdCcsICdlbGVtZW50JywgJ2VtJywgJ2ZpZWxkc2V0JywgJ2ZpZ2NhcHRpb24nLCAnZmlndXJlJywgJ2ZvbnQnLCAnZm9vdGVyJywgJ2Zvcm0nLCAnaDEnLCAnaDInLCAnaDMnLCAnaDQnLCAnaDUnLCAnaDYnLCAnaGVhZCcsICdoZWFkZXInLCAnaGdyb3VwJywgJ2hyJywgJ2h0bWwnLCAnaScsICdpbWcnLCAnaW5wdXQnLCAnaW5zJywgJ2tiZCcsICdsYWJlbCcsICdsZWdlbmQnLCAnbGknLCAnbWFpbicsICdtYXAnLCAnbWFyaycsICdtYXJxdWVlJywgJ21lbnUnLCAnbWVudWl0ZW0nLCAnbWV0ZXInLCAnbmF2JywgJ25vYnInLCAnb2wnLCAnb3B0Z3JvdXAnLCAnb3B0aW9uJywgJ291dHB1dCcsICdwJywgJ3BpY3R1cmUnLCAncHJlJywgJ3Byb2dyZXNzJywgJ3EnLCAncnAnLCAncnQnLCAncnVieScsICdzJywgJ3NhbXAnLCAnc2VjdGlvbicsICdzZWxlY3QnLCAnc2hhZG93JywgJ3NtYWxsJywgJ3NvdXJjZScsICdzcGFjZXInLCAnc3BhbicsICdzdHJpa2UnLCAnc3Ryb25nJywgJ3N0eWxlJywgJ3N1YicsICdzdW1tYXJ5JywgJ3N1cCcsICd0YWJsZScsICd0Ym9keScsICd0ZCcsICd0ZW1wbGF0ZScsICd0ZXh0YXJlYScsICd0Zm9vdCcsICd0aCcsICd0aGVhZCcsICd0aW1lJywgJ3RyJywgJ3RyYWNrJywgJ3R0JywgJ3UnLCAndWwnLCAndmFyJywgJ3ZpZGVvJywgJ3diciddKTtcbmNvbnN0IHN2ZyQxID0gZnJlZXplKFsnc3ZnJywgJ2EnLCAnYWx0Z2x5cGgnLCAnYWx0Z2x5cGhkZWYnLCAnYWx0Z2x5cGhpdGVtJywgJ2FuaW1hdGVjb2xvcicsICdhbmltYXRlbW90aW9uJywgJ2FuaW1hdGV0cmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2NsaXBwYXRoJywgJ2RlZnMnLCAnZGVzYycsICdlbGxpcHNlJywgJ2ZpbHRlcicsICdmb250JywgJ2cnLCAnZ2x5cGgnLCAnZ2x5cGhyZWYnLCAnaGtlcm4nLCAnaW1hZ2UnLCAnbGluZScsICdsaW5lYXJncmFkaWVudCcsICdtYXJrZXInLCAnbWFzaycsICdtZXRhZGF0YScsICdtcGF0aCcsICdwYXRoJywgJ3BhdHRlcm4nLCAncG9seWdvbicsICdwb2x5bGluZScsICdyYWRpYWxncmFkaWVudCcsICdyZWN0JywgJ3N0b3AnLCAnc3R5bGUnLCAnc3dpdGNoJywgJ3N5bWJvbCcsICd0ZXh0JywgJ3RleHRwYXRoJywgJ3RpdGxlJywgJ3RyZWYnLCAndHNwYW4nLCAndmlldycsICd2a2VybiddKTtcbmNvbnN0IHN2Z0ZpbHRlcnMgPSBmcmVlemUoWydmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLCAnZmVDb21wb25lbnRUcmFuc2ZlcicsICdmZUNvbXBvc2l0ZScsICdmZUNvbnZvbHZlTWF0cml4JywgJ2ZlRGlmZnVzZUxpZ2h0aW5nJywgJ2ZlRGlzcGxhY2VtZW50TWFwJywgJ2ZlRGlzdGFudExpZ2h0JywgJ2ZlRHJvcFNoYWRvdycsICdmZUZsb29kJywgJ2ZlRnVuY0EnLCAnZmVGdW5jQicsICdmZUZ1bmNHJywgJ2ZlRnVuY1InLCAnZmVHYXVzc2lhbkJsdXInLCAnZmVJbWFnZScsICdmZU1lcmdlJywgJ2ZlTWVyZ2VOb2RlJywgJ2ZlTW9ycGhvbG9neScsICdmZU9mZnNldCcsICdmZVBvaW50TGlnaHQnLCAnZmVTcGVjdWxhckxpZ2h0aW5nJywgJ2ZlU3BvdExpZ2h0JywgJ2ZlVGlsZScsICdmZVR1cmJ1bGVuY2UnXSk7XG4vLyBMaXN0IG9mIFNWRyBlbGVtZW50cyB0aGF0IGFyZSBkaXNhbGxvd2VkIGJ5IGRlZmF1bHQuXG4vLyBXZSBzdGlsbCBuZWVkIHRvIGtub3cgdGhlbSBzbyB0aGF0IHdlIGNhbiBkbyBuYW1lc3BhY2Vcbi8vIGNoZWNrcyBwcm9wZXJseSBpbiBjYXNlIG9uZSB3YW50cyB0byBhZGQgdGhlbSB0b1xuLy8gYWxsb3ctbGlzdC5cbmNvbnN0IHN2Z0Rpc2FsbG93ZWQgPSBmcmVlemUoWydhbmltYXRlJywgJ2NvbG9yLXByb2ZpbGUnLCAnY3Vyc29yJywgJ2Rpc2NhcmQnLCAnZm9udC1mYWNlJywgJ2ZvbnQtZmFjZS1mb3JtYXQnLCAnZm9udC1mYWNlLW5hbWUnLCAnZm9udC1mYWNlLXNyYycsICdmb250LWZhY2UtdXJpJywgJ2ZvcmVpZ25vYmplY3QnLCAnaGF0Y2gnLCAnaGF0Y2hwYXRoJywgJ21lc2gnLCAnbWVzaGdyYWRpZW50JywgJ21lc2hwYXRjaCcsICdtZXNocm93JywgJ21pc3NpbmctZ2x5cGgnLCAnc2NyaXB0JywgJ3NldCcsICdzb2xpZGNvbG9yJywgJ3Vua25vd24nLCAndXNlJ10pO1xuY29uc3QgbWF0aE1sJDEgPSBmcmVlemUoWydtYXRoJywgJ21lbmNsb3NlJywgJ21lcnJvcicsICdtZmVuY2VkJywgJ21mcmFjJywgJ21nbHlwaCcsICdtaScsICdtbGFiZWxlZHRyJywgJ21tdWx0aXNjcmlwdHMnLCAnbW4nLCAnbW8nLCAnbW92ZXInLCAnbXBhZGRlZCcsICdtcGhhbnRvbScsICdtcm9vdCcsICdtcm93JywgJ21zJywgJ21zcGFjZScsICdtc3FydCcsICdtc3R5bGUnLCAnbXN1YicsICdtc3VwJywgJ21zdWJzdXAnLCAnbXRhYmxlJywgJ210ZCcsICdtdGV4dCcsICdtdHInLCAnbXVuZGVyJywgJ211bmRlcm92ZXInLCAnbXByZXNjcmlwdHMnXSk7XG4vLyBTaW1pbGFybHkgdG8gU1ZHLCB3ZSB3YW50IHRvIGtub3cgYWxsIE1hdGhNTCBlbGVtZW50cyxcbi8vIGV2ZW4gdGhvc2UgdGhhdCB3ZSBkaXNhbGxvdyBieSBkZWZhdWx0LlxuY29uc3QgbWF0aE1sRGlzYWxsb3dlZCA9IGZyZWV6ZShbJ21hY3Rpb24nLCAnbWFsaWduZ3JvdXAnLCAnbWFsaWdubWFyaycsICdtbG9uZ2RpdicsICdtc2NhcnJpZXMnLCAnbXNjYXJyeScsICdtc2dyb3VwJywgJ21zdGFjaycsICdtc2xpbmUnLCAnbXNyb3cnLCAnc2VtYW50aWNzJywgJ2Fubm90YXRpb24nLCAnYW5ub3RhdGlvbi14bWwnLCAnbXByZXNjcmlwdHMnLCAnbm9uZSddKTtcbmNvbnN0IHRleHQgPSBmcmVlemUoWycjdGV4dCddKTtcblxuY29uc3QgaHRtbCA9IGZyZWV6ZShbJ2FjY2VwdCcsICdhY3Rpb24nLCAnYWxpZ24nLCAnYWx0JywgJ2F1dG9jYXBpdGFsaXplJywgJ2F1dG9jb21wbGV0ZScsICdhdXRvcGljdHVyZWlucGljdHVyZScsICdhdXRvcGxheScsICdiYWNrZ3JvdW5kJywgJ2JnY29sb3InLCAnYm9yZGVyJywgJ2NhcHR1cmUnLCAnY2VsbHBhZGRpbmcnLCAnY2VsbHNwYWNpbmcnLCAnY2hlY2tlZCcsICdjaXRlJywgJ2NsYXNzJywgJ2NsZWFyJywgJ2NvbG9yJywgJ2NvbHMnLCAnY29sc3BhbicsICdjb250cm9scycsICdjb250cm9sc2xpc3QnLCAnY29vcmRzJywgJ2Nyb3Nzb3JpZ2luJywgJ2RhdGV0aW1lJywgJ2RlY29kaW5nJywgJ2RlZmF1bHQnLCAnZGlyJywgJ2Rpc2FibGVkJywgJ2Rpc2FibGVwaWN0dXJlaW5waWN0dXJlJywgJ2Rpc2FibGVyZW1vdGVwbGF5YmFjaycsICdkb3dubG9hZCcsICdkcmFnZ2FibGUnLCAnZW5jdHlwZScsICdlbnRlcmtleWhpbnQnLCAnZmFjZScsICdmb3InLCAnaGVhZGVycycsICdoZWlnaHQnLCAnaGlkZGVuJywgJ2hpZ2gnLCAnaHJlZicsICdocmVmbGFuZycsICdpZCcsICdpbnB1dG1vZGUnLCAnaW50ZWdyaXR5JywgJ2lzbWFwJywgJ2tpbmQnLCAnbGFiZWwnLCAnbGFuZycsICdsaXN0JywgJ2xvYWRpbmcnLCAnbG9vcCcsICdsb3cnLCAnbWF4JywgJ21heGxlbmd0aCcsICdtZWRpYScsICdtZXRob2QnLCAnbWluJywgJ21pbmxlbmd0aCcsICdtdWx0aXBsZScsICdtdXRlZCcsICduYW1lJywgJ25vbmNlJywgJ25vc2hhZGUnLCAnbm92YWxpZGF0ZScsICdub3dyYXAnLCAnb3BlbicsICdvcHRpbXVtJywgJ3BhdHRlcm4nLCAncGxhY2Vob2xkZXInLCAncGxheXNpbmxpbmUnLCAncG9wb3ZlcicsICdwb3BvdmVydGFyZ2V0JywgJ3BvcG92ZXJ0YXJnZXRhY3Rpb24nLCAncG9zdGVyJywgJ3ByZWxvYWQnLCAncHViZGF0ZScsICdyYWRpb2dyb3VwJywgJ3JlYWRvbmx5JywgJ3JlbCcsICdyZXF1aXJlZCcsICdyZXYnLCAncmV2ZXJzZWQnLCAncm9sZScsICdyb3dzJywgJ3Jvd3NwYW4nLCAnc3BlbGxjaGVjaycsICdzY29wZScsICdzZWxlY3RlZCcsICdzaGFwZScsICdzaXplJywgJ3NpemVzJywgJ3NwYW4nLCAnc3JjbGFuZycsICdzdGFydCcsICdzcmMnLCAnc3Jjc2V0JywgJ3N0ZXAnLCAnc3R5bGUnLCAnc3VtbWFyeScsICd0YWJpbmRleCcsICd0aXRsZScsICd0cmFuc2xhdGUnLCAndHlwZScsICd1c2VtYXAnLCAndmFsaWduJywgJ3ZhbHVlJywgJ3dpZHRoJywgJ3dyYXAnLCAneG1sbnMnLCAnc2xvdCddKTtcbmNvbnN0IHN2ZyA9IGZyZWV6ZShbJ2FjY2VudC1oZWlnaHQnLCAnYWNjdW11bGF0ZScsICdhZGRpdGl2ZScsICdhbGlnbm1lbnQtYmFzZWxpbmUnLCAnYW1wbGl0dWRlJywgJ2FzY2VudCcsICdhdHRyaWJ1dGVuYW1lJywgJ2F0dHJpYnV0ZXR5cGUnLCAnYXppbXV0aCcsICdiYXNlZnJlcXVlbmN5JywgJ2Jhc2VsaW5lLXNoaWZ0JywgJ2JlZ2luJywgJ2JpYXMnLCAnYnknLCAnY2xhc3MnLCAnY2xpcCcsICdjbGlwcGF0aHVuaXRzJywgJ2NsaXAtcGF0aCcsICdjbGlwLXJ1bGUnLCAnY29sb3InLCAnY29sb3ItaW50ZXJwb2xhdGlvbicsICdjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnMnLCAnY29sb3ItcHJvZmlsZScsICdjb2xvci1yZW5kZXJpbmcnLCAnY3gnLCAnY3knLCAnZCcsICdkeCcsICdkeScsICdkaWZmdXNlY29uc3RhbnQnLCAnZGlyZWN0aW9uJywgJ2Rpc3BsYXknLCAnZGl2aXNvcicsICdkdXInLCAnZWRnZW1vZGUnLCAnZWxldmF0aW9uJywgJ2VuZCcsICdleHBvbmVudCcsICdmaWxsJywgJ2ZpbGwtb3BhY2l0eScsICdmaWxsLXJ1bGUnLCAnZmlsdGVyJywgJ2ZpbHRlcnVuaXRzJywgJ2Zsb29kLWNvbG9yJywgJ2Zsb29kLW9wYWNpdHknLCAnZm9udC1mYW1pbHknLCAnZm9udC1zaXplJywgJ2ZvbnQtc2l6ZS1hZGp1c3QnLCAnZm9udC1zdHJldGNoJywgJ2ZvbnQtc3R5bGUnLCAnZm9udC12YXJpYW50JywgJ2ZvbnQtd2VpZ2h0JywgJ2Z4JywgJ2Z5JywgJ2cxJywgJ2cyJywgJ2dseXBoLW5hbWUnLCAnZ2x5cGhyZWYnLCAnZ3JhZGllbnR1bml0cycsICdncmFkaWVudHRyYW5zZm9ybScsICdoZWlnaHQnLCAnaHJlZicsICdpZCcsICdpbWFnZS1yZW5kZXJpbmcnLCAnaW4nLCAnaW4yJywgJ2ludGVyY2VwdCcsICdrJywgJ2sxJywgJ2syJywgJ2szJywgJ2s0JywgJ2tlcm5pbmcnLCAna2V5cG9pbnRzJywgJ2tleXNwbGluZXMnLCAna2V5dGltZXMnLCAnbGFuZycsICdsZW5ndGhhZGp1c3QnLCAnbGV0dGVyLXNwYWNpbmcnLCAna2VybmVsbWF0cml4JywgJ2tlcm5lbHVuaXRsZW5ndGgnLCAnbGlnaHRpbmctY29sb3InLCAnbG9jYWwnLCAnbWFya2VyLWVuZCcsICdtYXJrZXItbWlkJywgJ21hcmtlci1zdGFydCcsICdtYXJrZXJoZWlnaHQnLCAnbWFya2VydW5pdHMnLCAnbWFya2Vyd2lkdGgnLCAnbWFza2NvbnRlbnR1bml0cycsICdtYXNrdW5pdHMnLCAnbWF4JywgJ21hc2snLCAnbWVkaWEnLCAnbWV0aG9kJywgJ21vZGUnLCAnbWluJywgJ25hbWUnLCAnbnVtb2N0YXZlcycsICdvZmZzZXQnLCAnb3BlcmF0b3InLCAnb3BhY2l0eScsICdvcmRlcicsICdvcmllbnQnLCAnb3JpZW50YXRpb24nLCAnb3JpZ2luJywgJ292ZXJmbG93JywgJ3BhaW50LW9yZGVyJywgJ3BhdGgnLCAncGF0aGxlbmd0aCcsICdwYXR0ZXJuY29udGVudHVuaXRzJywgJ3BhdHRlcm50cmFuc2Zvcm0nLCAncGF0dGVybnVuaXRzJywgJ3BvaW50cycsICdwcmVzZXJ2ZWFscGhhJywgJ3ByZXNlcnZlYXNwZWN0cmF0aW8nLCAncHJpbWl0aXZldW5pdHMnLCAncicsICdyeCcsICdyeScsICdyYWRpdXMnLCAncmVmeCcsICdyZWZ5JywgJ3JlcGVhdGNvdW50JywgJ3JlcGVhdGR1cicsICdyZXN0YXJ0JywgJ3Jlc3VsdCcsICdyb3RhdGUnLCAnc2NhbGUnLCAnc2VlZCcsICdzaGFwZS1yZW5kZXJpbmcnLCAnc2xvcGUnLCAnc3BlY3VsYXJjb25zdGFudCcsICdzcGVjdWxhcmV4cG9uZW50JywgJ3NwcmVhZG1ldGhvZCcsICdzdGFydG9mZnNldCcsICdzdGRkZXZpYXRpb24nLCAnc3RpdGNodGlsZXMnLCAnc3RvcC1jb2xvcicsICdzdG9wLW9wYWNpdHknLCAnc3Ryb2tlLWRhc2hhcnJheScsICdzdHJva2UtZGFzaG9mZnNldCcsICdzdHJva2UtbGluZWNhcCcsICdzdHJva2UtbGluZWpvaW4nLCAnc3Ryb2tlLW1pdGVybGltaXQnLCAnc3Ryb2tlLW9wYWNpdHknLCAnc3Ryb2tlJywgJ3N0cm9rZS13aWR0aCcsICdzdHlsZScsICdzdXJmYWNlc2NhbGUnLCAnc3lzdGVtbGFuZ3VhZ2UnLCAndGFiaW5kZXgnLCAndGFibGV2YWx1ZXMnLCAndGFyZ2V0eCcsICd0YXJnZXR5JywgJ3RyYW5zZm9ybScsICd0cmFuc2Zvcm0tb3JpZ2luJywgJ3RleHQtYW5jaG9yJywgJ3RleHQtZGVjb3JhdGlvbicsICd0ZXh0LXJlbmRlcmluZycsICd0ZXh0bGVuZ3RoJywgJ3R5cGUnLCAndTEnLCAndTInLCAndW5pY29kZScsICd2YWx1ZXMnLCAndmlld2JveCcsICd2aXNpYmlsaXR5JywgJ3ZlcnNpb24nLCAndmVydC1hZHYteScsICd2ZXJ0LW9yaWdpbi14JywgJ3ZlcnQtb3JpZ2luLXknLCAnd2lkdGgnLCAnd29yZC1zcGFjaW5nJywgJ3dyYXAnLCAnd3JpdGluZy1tb2RlJywgJ3hjaGFubmVsc2VsZWN0b3InLCAneWNoYW5uZWxzZWxlY3RvcicsICd4JywgJ3gxJywgJ3gyJywgJ3htbG5zJywgJ3knLCAneTEnLCAneTInLCAneicsICd6b29tYW5kcGFuJ10pO1xuY29uc3QgbWF0aE1sID0gZnJlZXplKFsnYWNjZW50JywgJ2FjY2VudHVuZGVyJywgJ2FsaWduJywgJ2JldmVsbGVkJywgJ2Nsb3NlJywgJ2NvbHVtbnNhbGlnbicsICdjb2x1bW5saW5lcycsICdjb2x1bW5zcGFuJywgJ2Rlbm9tYWxpZ24nLCAnZGVwdGgnLCAnZGlyJywgJ2Rpc3BsYXknLCAnZGlzcGxheXN0eWxlJywgJ2VuY29kaW5nJywgJ2ZlbmNlJywgJ2ZyYW1lJywgJ2hlaWdodCcsICdocmVmJywgJ2lkJywgJ2xhcmdlb3AnLCAnbGVuZ3RoJywgJ2xpbmV0aGlja25lc3MnLCAnbHNwYWNlJywgJ2xxdW90ZScsICdtYXRoYmFja2dyb3VuZCcsICdtYXRoY29sb3InLCAnbWF0aHNpemUnLCAnbWF0aHZhcmlhbnQnLCAnbWF4c2l6ZScsICdtaW5zaXplJywgJ21vdmFibGVsaW1pdHMnLCAnbm90YXRpb24nLCAnbnVtYWxpZ24nLCAnb3BlbicsICdyb3dhbGlnbicsICdyb3dsaW5lcycsICdyb3dzcGFjaW5nJywgJ3Jvd3NwYW4nLCAncnNwYWNlJywgJ3JxdW90ZScsICdzY3JpcHRsZXZlbCcsICdzY3JpcHRtaW5zaXplJywgJ3NjcmlwdHNpemVtdWx0aXBsaWVyJywgJ3NlbGVjdGlvbicsICdzZXBhcmF0b3InLCAnc2VwYXJhdG9ycycsICdzdHJldGNoeScsICdzdWJzY3JpcHRzaGlmdCcsICdzdXBzY3JpcHRzaGlmdCcsICdzeW1tZXRyaWMnLCAndm9mZnNldCcsICd3aWR0aCcsICd4bWxucyddKTtcbmNvbnN0IHhtbCA9IGZyZWV6ZShbJ3hsaW5rOmhyZWYnLCAneG1sOmlkJywgJ3hsaW5rOnRpdGxlJywgJ3htbDpzcGFjZScsICd4bWxuczp4bGluayddKTtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHVuaWNvcm4vYmV0dGVyLXJlZ2V4XG5jb25zdCBNVVNUQUNIRV9FWFBSID0gc2VhbCgvXFx7XFx7W1xcd1xcV10qfFtcXHdcXFddKlxcfVxcfS9nbSk7IC8vIFNwZWNpZnkgdGVtcGxhdGUgZGV0ZWN0aW9uIHJlZ2V4IGZvciBTQUZFX0ZPUl9URU1QTEFURVMgbW9kZVxuY29uc3QgRVJCX0VYUFIgPSBzZWFsKC88JVtcXHdcXFddKnxbXFx3XFxXXSolPi9nbSk7XG5jb25zdCBUTVBMSVRfRVhQUiA9IHNlYWwoL1xcJFxce1tcXHdcXFddKi9nbSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgdW5pY29ybi9iZXR0ZXItcmVnZXhcbmNvbnN0IERBVEFfQVRUUiA9IHNlYWwoL15kYXRhLVtcXC1cXHcuXFx1MDBCNy1cXHVGRkZGXSskLyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdXNlbGVzcy1lc2NhcGVcbmNvbnN0IEFSSUFfQVRUUiA9IHNlYWwoL15hcmlhLVtcXC1cXHddKyQvKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11c2VsZXNzLWVzY2FwZVxuY29uc3QgSVNfQUxMT1dFRF9VUkkgPSBzZWFsKC9eKD86KD86KD86ZnxodCl0cHM/fG1haWx0b3x0ZWx8Y2FsbHRvfHNtc3xjaWR8eG1wcHxtYXRyaXgpOnxbXmEtel18W2EteisuXFwtXSsoPzpbXmEteisuXFwtOl18JCkpL2kgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11c2VsZXNzLWVzY2FwZVxuKTtcbmNvbnN0IElTX1NDUklQVF9PUl9EQVRBID0gc2VhbCgvXig/OlxcdytzY3JpcHR8ZGF0YSk6L2kpO1xuY29uc3QgQVRUUl9XSElURVNQQUNFID0gc2VhbCgvW1xcdTAwMDAtXFx1MDAyMFxcdTAwQTBcXHUxNjgwXFx1MTgwRVxcdTIwMDAtXFx1MjAyOVxcdTIwNUZcXHUzMDAwXS9nIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29udHJvbC1yZWdleFxuKTtcbmNvbnN0IERPQ1RZUEVfTkFNRSA9IHNlYWwoL15odG1sJC9pKTtcbmNvbnN0IENVU1RPTV9FTEVNRU5UID0gc2VhbCgvXlthLXpdWy5cXHddKigtWy5cXHddKykrJC9pKTtcblxudmFyIEVYUFJFU1NJT05TID0gLyojX19QVVJFX18qL09iamVjdC5mcmVlemUoe1xuICBfX3Byb3RvX186IG51bGwsXG4gIEFSSUFfQVRUUjogQVJJQV9BVFRSLFxuICBBVFRSX1dISVRFU1BBQ0U6IEFUVFJfV0hJVEVTUEFDRSxcbiAgQ1VTVE9NX0VMRU1FTlQ6IENVU1RPTV9FTEVNRU5ULFxuICBEQVRBX0FUVFI6IERBVEFfQVRUUixcbiAgRE9DVFlQRV9OQU1FOiBET0NUWVBFX05BTUUsXG4gIEVSQl9FWFBSOiBFUkJfRVhQUixcbiAgSVNfQUxMT1dFRF9VUkk6IElTX0FMTE9XRURfVVJJLFxuICBJU19TQ1JJUFRfT1JfREFUQTogSVNfU0NSSVBUX09SX0RBVEEsXG4gIE1VU1RBQ0hFX0VYUFI6IE1VU1RBQ0hFX0VYUFIsXG4gIFRNUExJVF9FWFBSOiBUTVBMSVRfRVhQUlxufSk7XG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQgKi9cbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9Ob2RlL25vZGVUeXBlXG5jb25zdCBOT0RFX1RZUEUgPSB7XG4gIGVsZW1lbnQ6IDEsXG4gIGF0dHJpYnV0ZTogMixcbiAgdGV4dDogMyxcbiAgY2RhdGFTZWN0aW9uOiA0LFxuICBlbnRpdHlSZWZlcmVuY2U6IDUsXG4gIC8vIERlcHJlY2F0ZWRcbiAgZW50aXR5Tm9kZTogNixcbiAgLy8gRGVwcmVjYXRlZFxuICBwcm9ncmVzc2luZ0luc3RydWN0aW9uOiA3LFxuICBjb21tZW50OiA4LFxuICBkb2N1bWVudDogOSxcbiAgZG9jdW1lbnRUeXBlOiAxMCxcbiAgZG9jdW1lbnRGcmFnbWVudDogMTEsXG4gIG5vdGF0aW9uOiAxMiAvLyBEZXByZWNhdGVkXG59O1xuY29uc3QgZ2V0R2xvYmFsID0gZnVuY3Rpb24gZ2V0R2xvYmFsKCkge1xuICByZXR1cm4gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogd2luZG93O1xufTtcbi8qKlxuICogQ3JlYXRlcyBhIG5vLW9wIHBvbGljeSBmb3IgaW50ZXJuYWwgdXNlIG9ubHkuXG4gKiBEb24ndCBleHBvcnQgdGhpcyBmdW5jdGlvbiBvdXRzaWRlIHRoaXMgbW9kdWxlIVxuICogQHBhcmFtIHRydXN0ZWRUeXBlcyBUaGUgcG9saWN5IGZhY3RvcnkuXG4gKiBAcGFyYW0gcHVyaWZ5SG9zdEVsZW1lbnQgVGhlIFNjcmlwdCBlbGVtZW50IHVzZWQgdG8gbG9hZCBET01QdXJpZnkgKHRvIGRldGVybWluZSBwb2xpY3kgbmFtZSBzdWZmaXgpLlxuICogQHJldHVybiBUaGUgcG9saWN5IGNyZWF0ZWQgKG9yIG51bGwsIGlmIFRydXN0ZWQgVHlwZXNcbiAqIGFyZSBub3Qgc3VwcG9ydGVkIG9yIGNyZWF0aW5nIHRoZSBwb2xpY3kgZmFpbGVkKS5cbiAqL1xuY29uc3QgX2NyZWF0ZVRydXN0ZWRUeXBlc1BvbGljeSA9IGZ1bmN0aW9uIF9jcmVhdGVUcnVzdGVkVHlwZXNQb2xpY3kodHJ1c3RlZFR5cGVzLCBwdXJpZnlIb3N0RWxlbWVudCkge1xuICBpZiAodHlwZW9mIHRydXN0ZWRUeXBlcyAhPT0gJ29iamVjdCcgfHwgdHlwZW9mIHRydXN0ZWRUeXBlcy5jcmVhdGVQb2xpY3kgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICAvLyBBbGxvdyB0aGUgY2FsbGVycyB0byBjb250cm9sIHRoZSB1bmlxdWUgcG9saWN5IG5hbWVcbiAgLy8gYnkgYWRkaW5nIGEgZGF0YS10dC1wb2xpY3ktc3VmZml4IHRvIHRoZSBzY3JpcHQgZWxlbWVudCB3aXRoIHRoZSBET01QdXJpZnkuXG4gIC8vIFBvbGljeSBjcmVhdGlvbiB3aXRoIGR1cGxpY2F0ZSBuYW1lcyB0aHJvd3MgaW4gVHJ1c3RlZCBUeXBlcy5cbiAgbGV0IHN1ZmZpeCA9IG51bGw7XG4gIGNvbnN0IEFUVFJfTkFNRSA9ICdkYXRhLXR0LXBvbGljeS1zdWZmaXgnO1xuICBpZiAocHVyaWZ5SG9zdEVsZW1lbnQgJiYgcHVyaWZ5SG9zdEVsZW1lbnQuaGFzQXR0cmlidXRlKEFUVFJfTkFNRSkpIHtcbiAgICBzdWZmaXggPSBwdXJpZnlIb3N0RWxlbWVudC5nZXRBdHRyaWJ1dGUoQVRUUl9OQU1FKTtcbiAgfVxuICBjb25zdCBwb2xpY3lOYW1lID0gJ2RvbXB1cmlmeScgKyAoc3VmZml4ID8gJyMnICsgc3VmZml4IDogJycpO1xuICB0cnkge1xuICAgIHJldHVybiB0cnVzdGVkVHlwZXMuY3JlYXRlUG9saWN5KHBvbGljeU5hbWUsIHtcbiAgICAgIGNyZWF0ZUhUTUwoaHRtbCkge1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICAgIH0sXG4gICAgICBjcmVhdGVTY3JpcHRVUkwoc2NyaXB0VXJsKSB7XG4gICAgICAgIHJldHVybiBzY3JpcHRVcmw7XG4gICAgICB9XG4gICAgfSk7XG4gIH0gY2F0Y2ggKF8pIHtcbiAgICAvLyBQb2xpY3kgY3JlYXRpb24gZmFpbGVkIChtb3N0IGxpa2VseSBhbm90aGVyIERPTVB1cmlmeSBzY3JpcHQgaGFzXG4gICAgLy8gYWxyZWFkeSBydW4pLiBTa2lwIGNyZWF0aW5nIHRoZSBwb2xpY3ksIGFzIHRoaXMgd2lsbCBvbmx5IGNhdXNlIGVycm9yc1xuICAgIC8vIGlmIFRUIGFyZSBlbmZvcmNlZC5cbiAgICBjb25zb2xlLndhcm4oJ1RydXN0ZWRUeXBlcyBwb2xpY3kgJyArIHBvbGljeU5hbWUgKyAnIGNvdWxkIG5vdCBiZSBjcmVhdGVkLicpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59O1xuY29uc3QgX2NyZWF0ZUhvb2tzTWFwID0gZnVuY3Rpb24gX2NyZWF0ZUhvb2tzTWFwKCkge1xuICByZXR1cm4ge1xuICAgIGFmdGVyU2FuaXRpemVBdHRyaWJ1dGVzOiBbXSxcbiAgICBhZnRlclNhbml0aXplRWxlbWVudHM6IFtdLFxuICAgIGFmdGVyU2FuaXRpemVTaGFkb3dET006IFtdLFxuICAgIGJlZm9yZVNhbml0aXplQXR0cmlidXRlczogW10sXG4gICAgYmVmb3JlU2FuaXRpemVFbGVtZW50czogW10sXG4gICAgYmVmb3JlU2FuaXRpemVTaGFkb3dET006IFtdLFxuICAgIHVwb25TYW5pdGl6ZUF0dHJpYnV0ZTogW10sXG4gICAgdXBvblNhbml0aXplRWxlbWVudDogW10sXG4gICAgdXBvblNhbml0aXplU2hhZG93Tm9kZTogW11cbiAgfTtcbn07XG5mdW5jdGlvbiBjcmVhdGVET01QdXJpZnkoKSB7XG4gIGxldCB3aW5kb3cgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IGdldEdsb2JhbCgpO1xuICBjb25zdCBET01QdXJpZnkgPSByb290ID0+IGNyZWF0ZURPTVB1cmlmeShyb290KTtcbiAgRE9NUHVyaWZ5LnZlcnNpb24gPSAnMy4yLjYnO1xuICBET01QdXJpZnkucmVtb3ZlZCA9IFtdO1xuICBpZiAoIXdpbmRvdyB8fCAhd2luZG93LmRvY3VtZW50IHx8IHdpbmRvdy5kb2N1bWVudC5ub2RlVHlwZSAhPT0gTk9ERV9UWVBFLmRvY3VtZW50IHx8ICF3aW5kb3cuRWxlbWVudCkge1xuICAgIC8vIE5vdCBydW5uaW5nIGluIGEgYnJvd3NlciwgcHJvdmlkZSBhIGZhY3RvcnkgZnVuY3Rpb25cbiAgICAvLyBzbyB0aGF0IHlvdSBjYW4gcGFzcyB5b3VyIG93biBXaW5kb3dcbiAgICBET01QdXJpZnkuaXNTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICByZXR1cm4gRE9NUHVyaWZ5O1xuICB9XG4gIGxldCB7XG4gICAgZG9jdW1lbnRcbiAgfSA9IHdpbmRvdztcbiAgY29uc3Qgb3JpZ2luYWxEb2N1bWVudCA9IGRvY3VtZW50O1xuICBjb25zdCBjdXJyZW50U2NyaXB0ID0gb3JpZ2luYWxEb2N1bWVudC5jdXJyZW50U2NyaXB0O1xuICBjb25zdCB7XG4gICAgRG9jdW1lbnRGcmFnbWVudCxcbiAgICBIVE1MVGVtcGxhdGVFbGVtZW50LFxuICAgIE5vZGUsXG4gICAgRWxlbWVudCxcbiAgICBOb2RlRmlsdGVyLFxuICAgIE5hbWVkTm9kZU1hcCA9IHdpbmRvdy5OYW1lZE5vZGVNYXAgfHwgd2luZG93Lk1vek5hbWVkQXR0ck1hcCxcbiAgICBIVE1MRm9ybUVsZW1lbnQsXG4gICAgRE9NUGFyc2VyLFxuICAgIHRydXN0ZWRUeXBlc1xuICB9ID0gd2luZG93O1xuICBjb25zdCBFbGVtZW50UHJvdG90eXBlID0gRWxlbWVudC5wcm90b3R5cGU7XG4gIGNvbnN0IGNsb25lTm9kZSA9IGxvb2t1cEdldHRlcihFbGVtZW50UHJvdG90eXBlLCAnY2xvbmVOb2RlJyk7XG4gIGNvbnN0IHJlbW92ZSA9IGxvb2t1cEdldHRlcihFbGVtZW50UHJvdG90eXBlLCAncmVtb3ZlJyk7XG4gIGNvbnN0IGdldE5leHRTaWJsaW5nID0gbG9va3VwR2V0dGVyKEVsZW1lbnRQcm90b3R5cGUsICduZXh0U2libGluZycpO1xuICBjb25zdCBnZXRDaGlsZE5vZGVzID0gbG9va3VwR2V0dGVyKEVsZW1lbnRQcm90b3R5cGUsICdjaGlsZE5vZGVzJyk7XG4gIGNvbnN0IGdldFBhcmVudE5vZGUgPSBsb29rdXBHZXR0ZXIoRWxlbWVudFByb3RvdHlwZSwgJ3BhcmVudE5vZGUnKTtcbiAgLy8gQXMgcGVyIGlzc3VlICM0NywgdGhlIHdlYi1jb21wb25lbnRzIHJlZ2lzdHJ5IGlzIGluaGVyaXRlZCBieSBhXG4gIC8vIG5ldyBkb2N1bWVudCBjcmVhdGVkIHZpYSBjcmVhdGVIVE1MRG9jdW1lbnQuIEFzIHBlciB0aGUgc3BlY1xuICAvLyAoaHR0cDovL3czYy5naXRodWIuaW8vd2ViY29tcG9uZW50cy9zcGVjL2N1c3RvbS8jY3JlYXRpbmctYW5kLXBhc3NpbmctcmVnaXN0cmllcylcbiAgLy8gYSBuZXcgZW1wdHkgcmVnaXN0cnkgaXMgdXNlZCB3aGVuIGNyZWF0aW5nIGEgdGVtcGxhdGUgY29udGVudHMgb3duZXJcbiAgLy8gZG9jdW1lbnQsIHNvIHdlIHVzZSB0aGF0IGFzIG91ciBwYXJlbnQgZG9jdW1lbnQgdG8gZW5zdXJlIG5vdGhpbmdcbiAgLy8gaXMgaW5oZXJpdGVkLlxuICBpZiAodHlwZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgaWYgKHRlbXBsYXRlLmNvbnRlbnQgJiYgdGVtcGxhdGUuY29udGVudC5vd25lckRvY3VtZW50KSB7XG4gICAgICBkb2N1bWVudCA9IHRlbXBsYXRlLmNvbnRlbnQub3duZXJEb2N1bWVudDtcbiAgICB9XG4gIH1cbiAgbGV0IHRydXN0ZWRUeXBlc1BvbGljeTtcbiAgbGV0IGVtcHR5SFRNTCA9ICcnO1xuICBjb25zdCB7XG4gICAgaW1wbGVtZW50YXRpb24sXG4gICAgY3JlYXRlTm9kZUl0ZXJhdG9yLFxuICAgIGNyZWF0ZURvY3VtZW50RnJhZ21lbnQsXG4gICAgZ2V0RWxlbWVudHNCeVRhZ05hbWVcbiAgfSA9IGRvY3VtZW50O1xuICBjb25zdCB7XG4gICAgaW1wb3J0Tm9kZVxuICB9ID0gb3JpZ2luYWxEb2N1bWVudDtcbiAgbGV0IGhvb2tzID0gX2NyZWF0ZUhvb2tzTWFwKCk7XG4gIC8qKlxuICAgKiBFeHBvc2Ugd2hldGhlciB0aGlzIGJyb3dzZXIgc3VwcG9ydHMgcnVubmluZyB0aGUgZnVsbCBET01QdXJpZnkuXG4gICAqL1xuICBET01QdXJpZnkuaXNTdXBwb3J0ZWQgPSB0eXBlb2YgZW50cmllcyA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZ2V0UGFyZW50Tm9kZSA9PT0gJ2Z1bmN0aW9uJyAmJiBpbXBsZW1lbnRhdGlvbiAmJiBpbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQgIT09IHVuZGVmaW5lZDtcbiAgY29uc3Qge1xuICAgIE1VU1RBQ0hFX0VYUFIsXG4gICAgRVJCX0VYUFIsXG4gICAgVE1QTElUX0VYUFIsXG4gICAgREFUQV9BVFRSLFxuICAgIEFSSUFfQVRUUixcbiAgICBJU19TQ1JJUFRfT1JfREFUQSxcbiAgICBBVFRSX1dISVRFU1BBQ0UsXG4gICAgQ1VTVE9NX0VMRU1FTlRcbiAgfSA9IEVYUFJFU1NJT05TO1xuICBsZXQge1xuICAgIElTX0FMTE9XRURfVVJJOiBJU19BTExPV0VEX1VSSSQxXG4gIH0gPSBFWFBSRVNTSU9OUztcbiAgLyoqXG4gICAqIFdlIGNvbnNpZGVyIHRoZSBlbGVtZW50cyBhbmQgYXR0cmlidXRlcyBiZWxvdyB0byBiZSBzYWZlLiBJZGVhbGx5XG4gICAqIGRvbid0IGFkZCBhbnkgbmV3IG9uZXMgYnV0IGZlZWwgZnJlZSB0byByZW1vdmUgdW53YW50ZWQgb25lcy5cbiAgICovXG4gIC8qIGFsbG93ZWQgZWxlbWVudCBuYW1lcyAqL1xuICBsZXQgQUxMT1dFRF9UQUdTID0gbnVsbDtcbiAgY29uc3QgREVGQVVMVF9BTExPV0VEX1RBR1MgPSBhZGRUb1NldCh7fSwgWy4uLmh0bWwkMSwgLi4uc3ZnJDEsIC4uLnN2Z0ZpbHRlcnMsIC4uLm1hdGhNbCQxLCAuLi50ZXh0XSk7XG4gIC8qIEFsbG93ZWQgYXR0cmlidXRlIG5hbWVzICovXG4gIGxldCBBTExPV0VEX0FUVFIgPSBudWxsO1xuICBjb25zdCBERUZBVUxUX0FMTE9XRURfQVRUUiA9IGFkZFRvU2V0KHt9LCBbLi4uaHRtbCwgLi4uc3ZnLCAuLi5tYXRoTWwsIC4uLnhtbF0pO1xuICAvKlxuICAgKiBDb25maWd1cmUgaG93IERPTVB1cmlmeSBzaG91bGQgaGFuZGxlIGN1c3RvbSBlbGVtZW50cyBhbmQgdGhlaXIgYXR0cmlidXRlcyBhcyB3ZWxsIGFzIGN1c3RvbWl6ZWQgYnVpbHQtaW4gZWxlbWVudHMuXG4gICAqIEBwcm9wZXJ0eSB7UmVnRXhwfEZ1bmN0aW9ufG51bGx9IHRhZ05hbWVDaGVjayBvbmUgb2YgW251bGwsIHJlZ2V4UGF0dGVybiwgcHJlZGljYXRlXS4gRGVmYXVsdDogYG51bGxgIChkaXNhbGxvdyBhbnkgY3VzdG9tIGVsZW1lbnRzKVxuICAgKiBAcHJvcGVydHkge1JlZ0V4cHxGdW5jdGlvbnxudWxsfSBhdHRyaWJ1dGVOYW1lQ2hlY2sgb25lIG9mIFtudWxsLCByZWdleFBhdHRlcm4sIHByZWRpY2F0ZV0uIERlZmF1bHQ6IGBudWxsYCAoZGlzYWxsb3cgYW55IGF0dHJpYnV0ZXMgbm90IG9uIHRoZSBhbGxvdyBsaXN0KVxuICAgKiBAcHJvcGVydHkge2Jvb2xlYW59IGFsbG93Q3VzdG9taXplZEJ1aWx0SW5FbGVtZW50cyBhbGxvdyBjdXN0b20gZWxlbWVudHMgZGVyaXZlZCBmcm9tIGJ1aWx0LWlucyBpZiB0aGV5IHBhc3MgQ1VTVE9NX0VMRU1FTlRfSEFORExJTkcudGFnTmFtZUNoZWNrLiBEZWZhdWx0OiBgZmFsc2VgLlxuICAgKi9cbiAgbGV0IENVU1RPTV9FTEVNRU5UX0hBTkRMSU5HID0gT2JqZWN0LnNlYWwoY3JlYXRlKG51bGwsIHtcbiAgICB0YWdOYW1lQ2hlY2s6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICB2YWx1ZTogbnVsbFxuICAgIH0sXG4gICAgYXR0cmlidXRlTmFtZUNoZWNrOiB7XG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6IG51bGxcbiAgICB9LFxuICAgIGFsbG93Q3VzdG9taXplZEJ1aWx0SW5FbGVtZW50czoge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIHZhbHVlOiBmYWxzZVxuICAgIH1cbiAgfSkpO1xuICAvKiBFeHBsaWNpdGx5IGZvcmJpZGRlbiB0YWdzIChvdmVycmlkZXMgQUxMT1dFRF9UQUdTL0FERF9UQUdTKSAqL1xuICBsZXQgRk9SQklEX1RBR1MgPSBudWxsO1xuICAvKiBFeHBsaWNpdGx5IGZvcmJpZGRlbiBhdHRyaWJ1dGVzIChvdmVycmlkZXMgQUxMT1dFRF9BVFRSL0FERF9BVFRSKSAqL1xuICBsZXQgRk9SQklEX0FUVFIgPSBudWxsO1xuICAvKiBEZWNpZGUgaWYgQVJJQSBhdHRyaWJ1dGVzIGFyZSBva2F5ICovXG4gIGxldCBBTExPV19BUklBX0FUVFIgPSB0cnVlO1xuICAvKiBEZWNpZGUgaWYgY3VzdG9tIGRhdGEgYXR0cmlidXRlcyBhcmUgb2theSAqL1xuICBsZXQgQUxMT1dfREFUQV9BVFRSID0gdHJ1ZTtcbiAgLyogRGVjaWRlIGlmIHVua25vd24gcHJvdG9jb2xzIGFyZSBva2F5ICovXG4gIGxldCBBTExPV19VTktOT1dOX1BST1RPQ09MUyA9IGZhbHNlO1xuICAvKiBEZWNpZGUgaWYgc2VsZi1jbG9zaW5nIHRhZ3MgaW4gYXR0cmlidXRlcyBhcmUgYWxsb3dlZC5cbiAgICogVXN1YWxseSByZW1vdmVkIGR1ZSB0byBhIG1YU1MgaXNzdWUgaW4galF1ZXJ5IDMuMCAqL1xuICBsZXQgQUxMT1dfU0VMRl9DTE9TRV9JTl9BVFRSID0gdHJ1ZTtcbiAgLyogT3V0cHV0IHNob3VsZCBiZSBzYWZlIGZvciBjb21tb24gdGVtcGxhdGUgZW5naW5lcy5cbiAgICogVGhpcyBtZWFucywgRE9NUHVyaWZ5IHJlbW92ZXMgZGF0YSBhdHRyaWJ1dGVzLCBtdXN0YWNoZXMgYW5kIEVSQlxuICAgKi9cbiAgbGV0IFNBRkVfRk9SX1RFTVBMQVRFUyA9IGZhbHNlO1xuICAvKiBPdXRwdXQgc2hvdWxkIGJlIHNhZmUgZXZlbiBmb3IgWE1MIHVzZWQgd2l0aGluIEhUTUwgYW5kIGFsaWtlLlxuICAgKiBUaGlzIG1lYW5zLCBET01QdXJpZnkgcmVtb3ZlcyBjb21tZW50cyB3aGVuIGNvbnRhaW5pbmcgcmlza3kgY29udGVudC5cbiAgICovXG4gIGxldCBTQUZFX0ZPUl9YTUwgPSB0cnVlO1xuICAvKiBEZWNpZGUgaWYgZG9jdW1lbnQgd2l0aCA8aHRtbD4uLi4gc2hvdWxkIGJlIHJldHVybmVkICovXG4gIGxldCBXSE9MRV9ET0NVTUVOVCA9IGZhbHNlO1xuICAvKiBUcmFjayB3aGV0aGVyIGNvbmZpZyBpcyBhbHJlYWR5IHNldCBvbiB0aGlzIGluc3RhbmNlIG9mIERPTVB1cmlmeS4gKi9cbiAgbGV0IFNFVF9DT05GSUcgPSBmYWxzZTtcbiAgLyogRGVjaWRlIGlmIGFsbCBlbGVtZW50cyAoZS5nLiBzdHlsZSwgc2NyaXB0KSBtdXN0IGJlIGNoaWxkcmVuIG9mXG4gICAqIGRvY3VtZW50LmJvZHkuIEJ5IGRlZmF1bHQsIGJyb3dzZXJzIG1pZ2h0IG1vdmUgdGhlbSB0byBkb2N1bWVudC5oZWFkICovXG4gIGxldCBGT1JDRV9CT0RZID0gZmFsc2U7XG4gIC8qIERlY2lkZSBpZiBhIERPTSBgSFRNTEJvZHlFbGVtZW50YCBzaG91bGQgYmUgcmV0dXJuZWQsIGluc3RlYWQgb2YgYSBodG1sXG4gICAqIHN0cmluZyAob3IgYSBUcnVzdGVkSFRNTCBvYmplY3QgaWYgVHJ1c3RlZCBUeXBlcyBhcmUgc3VwcG9ydGVkKS5cbiAgICogSWYgYFdIT0xFX0RPQ1VNRU5UYCBpcyBlbmFibGVkIGEgYEhUTUxIdG1sRWxlbWVudGAgd2lsbCBiZSByZXR1cm5lZCBpbnN0ZWFkXG4gICAqL1xuICBsZXQgUkVUVVJOX0RPTSA9IGZhbHNlO1xuICAvKiBEZWNpZGUgaWYgYSBET00gYERvY3VtZW50RnJhZ21lbnRgIHNob3VsZCBiZSByZXR1cm5lZCwgaW5zdGVhZCBvZiBhIGh0bWxcbiAgICogc3RyaW5nICAob3IgYSBUcnVzdGVkSFRNTCBvYmplY3QgaWYgVHJ1c3RlZCBUeXBlcyBhcmUgc3VwcG9ydGVkKSAqL1xuICBsZXQgUkVUVVJOX0RPTV9GUkFHTUVOVCA9IGZhbHNlO1xuICAvKiBUcnkgdG8gcmV0dXJuIGEgVHJ1c3RlZCBUeXBlIG9iamVjdCBpbnN0ZWFkIG9mIGEgc3RyaW5nLCByZXR1cm4gYSBzdHJpbmcgaW5cbiAgICogY2FzZSBUcnVzdGVkIFR5cGVzIGFyZSBub3Qgc3VwcG9ydGVkICAqL1xuICBsZXQgUkVUVVJOX1RSVVNURURfVFlQRSA9IGZhbHNlO1xuICAvKiBPdXRwdXQgc2hvdWxkIGJlIGZyZWUgZnJvbSBET00gY2xvYmJlcmluZyBhdHRhY2tzP1xuICAgKiBUaGlzIHNhbml0aXplcyBtYXJrdXBzIG5hbWVkIHdpdGggY29sbGlkaW5nLCBjbG9iYmVyYWJsZSBidWlsdC1pbiBET00gQVBJcy5cbiAgICovXG4gIGxldCBTQU5JVElaRV9ET00gPSB0cnVlO1xuICAvKiBBY2hpZXZlIGZ1bGwgRE9NIENsb2JiZXJpbmcgcHJvdGVjdGlvbiBieSBpc29sYXRpbmcgdGhlIG5hbWVzcGFjZSBvZiBuYW1lZFxuICAgKiBwcm9wZXJ0aWVzIGFuZCBKUyB2YXJpYWJsZXMsIG1pdGlnYXRpbmcgYXR0YWNrcyB0aGF0IGFidXNlIHRoZSBIVE1ML0RPTSBzcGVjIHJ1bGVzLlxuICAgKlxuICAgKiBIVE1ML0RPTSBzcGVjIHJ1bGVzIHRoYXQgZW5hYmxlIERPTSBDbG9iYmVyaW5nOlxuICAgKiAgIC0gTmFtZWQgQWNjZXNzIG9uIFdpbmRvdyAowqc3LjMuMylcbiAgICogICAtIERPTSBUcmVlIEFjY2Vzc29ycyAowqczLjEuNSlcbiAgICogICAtIEZvcm0gRWxlbWVudCBQYXJlbnQtQ2hpbGQgUmVsYXRpb25zICjCpzQuMTAuMylcbiAgICogICAtIElmcmFtZSBzcmNkb2MgLyBOZXN0ZWQgV2luZG93UHJveGllcyAowqc0LjguNSlcbiAgICogICAtIEhUTUxDb2xsZWN0aW9uICjCpzQuMi4xMC4yKVxuICAgKlxuICAgKiBOYW1lc3BhY2UgaXNvbGF0aW9uIGlzIGltcGxlbWVudGVkIGJ5IHByZWZpeGluZyBgaWRgIGFuZCBgbmFtZWAgYXR0cmlidXRlc1xuICAgKiB3aXRoIGEgY29uc3RhbnQgc3RyaW5nLCBpLmUuLCBgdXNlci1jb250ZW50LWBcbiAgICovXG4gIGxldCBTQU5JVElaRV9OQU1FRF9QUk9QUyA9IGZhbHNlO1xuICBjb25zdCBTQU5JVElaRV9OQU1FRF9QUk9QU19QUkVGSVggPSAndXNlci1jb250ZW50LSc7XG4gIC8qIEtlZXAgZWxlbWVudCBjb250ZW50IHdoZW4gcmVtb3ZpbmcgZWxlbWVudD8gKi9cbiAgbGV0IEtFRVBfQ09OVEVOVCA9IHRydWU7XG4gIC8qIElmIGEgYE5vZGVgIGlzIHBhc3NlZCB0byBzYW5pdGl6ZSgpLCB0aGVuIHBlcmZvcm1zIHNhbml0aXphdGlvbiBpbi1wbGFjZSBpbnN0ZWFkXG4gICAqIG9mIGltcG9ydGluZyBpdCBpbnRvIGEgbmV3IERvY3VtZW50IGFuZCByZXR1cm5pbmcgYSBzYW5pdGl6ZWQgY29weSAqL1xuICBsZXQgSU5fUExBQ0UgPSBmYWxzZTtcbiAgLyogQWxsb3cgdXNhZ2Ugb2YgcHJvZmlsZXMgbGlrZSBodG1sLCBzdmcgYW5kIG1hdGhNbCAqL1xuICBsZXQgVVNFX1BST0ZJTEVTID0ge307XG4gIC8qIFRhZ3MgdG8gaWdub3JlIGNvbnRlbnQgb2Ygd2hlbiBLRUVQX0NPTlRFTlQgaXMgdHJ1ZSAqL1xuICBsZXQgRk9SQklEX0NPTlRFTlRTID0gbnVsbDtcbiAgY29uc3QgREVGQVVMVF9GT1JCSURfQ09OVEVOVFMgPSBhZGRUb1NldCh7fSwgWydhbm5vdGF0aW9uLXhtbCcsICdhdWRpbycsICdjb2xncm91cCcsICdkZXNjJywgJ2ZvcmVpZ25vYmplY3QnLCAnaGVhZCcsICdpZnJhbWUnLCAnbWF0aCcsICdtaScsICdtbicsICdtbycsICdtcycsICdtdGV4dCcsICdub2VtYmVkJywgJ25vZnJhbWVzJywgJ25vc2NyaXB0JywgJ3BsYWludGV4dCcsICdzY3JpcHQnLCAnc3R5bGUnLCAnc3ZnJywgJ3RlbXBsYXRlJywgJ3RoZWFkJywgJ3RpdGxlJywgJ3ZpZGVvJywgJ3htcCddKTtcbiAgLyogVGFncyB0aGF0IGFyZSBzYWZlIGZvciBkYXRhOiBVUklzICovXG4gIGxldCBEQVRBX1VSSV9UQUdTID0gbnVsbDtcbiAgY29uc3QgREVGQVVMVF9EQVRBX1VSSV9UQUdTID0gYWRkVG9TZXQoe30sIFsnYXVkaW8nLCAndmlkZW8nLCAnaW1nJywgJ3NvdXJjZScsICdpbWFnZScsICd0cmFjayddKTtcbiAgLyogQXR0cmlidXRlcyBzYWZlIGZvciB2YWx1ZXMgbGlrZSBcImphdmFzY3JpcHQ6XCIgKi9cbiAgbGV0IFVSSV9TQUZFX0FUVFJJQlVURVMgPSBudWxsO1xuICBjb25zdCBERUZBVUxUX1VSSV9TQUZFX0FUVFJJQlVURVMgPSBhZGRUb1NldCh7fSwgWydhbHQnLCAnY2xhc3MnLCAnZm9yJywgJ2lkJywgJ2xhYmVsJywgJ25hbWUnLCAncGF0dGVybicsICdwbGFjZWhvbGRlcicsICdyb2xlJywgJ3N1bW1hcnknLCAndGl0bGUnLCAndmFsdWUnLCAnc3R5bGUnLCAneG1sbnMnXSk7XG4gIGNvbnN0IE1BVEhNTF9OQU1FU1BBQ0UgPSAnaHR0cDovL3d3dy53My5vcmcvMTk5OC9NYXRoL01hdGhNTCc7XG4gIGNvbnN0IFNWR19OQU1FU1BBQ0UgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnO1xuICBjb25zdCBIVE1MX05BTUVTUEFDRSA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sJztcbiAgLyogRG9jdW1lbnQgbmFtZXNwYWNlICovXG4gIGxldCBOQU1FU1BBQ0UgPSBIVE1MX05BTUVTUEFDRTtcbiAgbGV0IElTX0VNUFRZX0lOUFVUID0gZmFsc2U7XG4gIC8qIEFsbG93ZWQgWEhUTUwrWE1MIG5hbWVzcGFjZXMgKi9cbiAgbGV0IEFMTE9XRURfTkFNRVNQQUNFUyA9IG51bGw7XG4gIGNvbnN0IERFRkFVTFRfQUxMT1dFRF9OQU1FU1BBQ0VTID0gYWRkVG9TZXQoe30sIFtNQVRITUxfTkFNRVNQQUNFLCBTVkdfTkFNRVNQQUNFLCBIVE1MX05BTUVTUEFDRV0sIHN0cmluZ1RvU3RyaW5nKTtcbiAgbGV0IE1BVEhNTF9URVhUX0lOVEVHUkFUSU9OX1BPSU5UUyA9IGFkZFRvU2V0KHt9LCBbJ21pJywgJ21vJywgJ21uJywgJ21zJywgJ210ZXh0J10pO1xuICBsZXQgSFRNTF9JTlRFR1JBVElPTl9QT0lOVFMgPSBhZGRUb1NldCh7fSwgWydhbm5vdGF0aW9uLXhtbCddKTtcbiAgLy8gQ2VydGFpbiBlbGVtZW50cyBhcmUgYWxsb3dlZCBpbiBib3RoIFNWRyBhbmQgSFRNTFxuICAvLyBuYW1lc3BhY2UuIFdlIG5lZWQgdG8gc3BlY2lmeSB0aGVtIGV4cGxpY2l0bHlcbiAgLy8gc28gdGhhdCB0aGV5IGRvbid0IGdldCBlcnJvbmVvdXNseSBkZWxldGVkIGZyb21cbiAgLy8gSFRNTCBuYW1lc3BhY2UuXG4gIGNvbnN0IENPTU1PTl9TVkdfQU5EX0hUTUxfRUxFTUVOVFMgPSBhZGRUb1NldCh7fSwgWyd0aXRsZScsICdzdHlsZScsICdmb250JywgJ2EnLCAnc2NyaXB0J10pO1xuICAvKiBQYXJzaW5nIG9mIHN0cmljdCBYSFRNTCBkb2N1bWVudHMgKi9cbiAgbGV0IFBBUlNFUl9NRURJQV9UWVBFID0gbnVsbDtcbiAgY29uc3QgU1VQUE9SVEVEX1BBUlNFUl9NRURJQV9UWVBFUyA9IFsnYXBwbGljYXRpb24veGh0bWwreG1sJywgJ3RleHQvaHRtbCddO1xuICBjb25zdCBERUZBVUxUX1BBUlNFUl9NRURJQV9UWVBFID0gJ3RleHQvaHRtbCc7XG4gIGxldCB0cmFuc2Zvcm1DYXNlRnVuYyA9IG51bGw7XG4gIC8qIEtlZXAgYSByZWZlcmVuY2UgdG8gY29uZmlnIHRvIHBhc3MgdG8gaG9va3MgKi9cbiAgbGV0IENPTkZJRyA9IG51bGw7XG4gIC8qIElkZWFsbHksIGRvIG5vdCB0b3VjaCBhbnl0aGluZyBiZWxvdyB0aGlzIGxpbmUgKi9cbiAgLyogX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXyAqL1xuICBjb25zdCBmb3JtRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Zvcm0nKTtcbiAgY29uc3QgaXNSZWdleE9yRnVuY3Rpb24gPSBmdW5jdGlvbiBpc1JlZ2V4T3JGdW5jdGlvbih0ZXN0VmFsdWUpIHtcbiAgICByZXR1cm4gdGVzdFZhbHVlIGluc3RhbmNlb2YgUmVnRXhwIHx8IHRlc3RWYWx1ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uO1xuICB9O1xuICAvKipcbiAgICogX3BhcnNlQ29uZmlnXG4gICAqXG4gICAqIEBwYXJhbSBjZmcgb3B0aW9uYWwgY29uZmlnIGxpdGVyYWxcbiAgICovXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb21wbGV4aXR5XG4gIGNvbnN0IF9wYXJzZUNvbmZpZyA9IGZ1bmN0aW9uIF9wYXJzZUNvbmZpZygpIHtcbiAgICBsZXQgY2ZnID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiB7fTtcbiAgICBpZiAoQ09ORklHICYmIENPTkZJRyA9PT0gY2ZnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8qIFNoaWVsZCBjb25maWd1cmF0aW9uIG9iamVjdCBmcm9tIHRhbXBlcmluZyAqL1xuICAgIGlmICghY2ZnIHx8IHR5cGVvZiBjZmcgIT09ICdvYmplY3QnKSB7XG4gICAgICBjZmcgPSB7fTtcbiAgICB9XG4gICAgLyogU2hpZWxkIGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gcHJvdG90eXBlIHBvbGx1dGlvbiAqL1xuICAgIGNmZyA9IGNsb25lKGNmZyk7XG4gICAgUEFSU0VSX01FRElBX1RZUEUgPVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSB1bmljb3JuL3ByZWZlci1pbmNsdWRlc1xuICAgIFNVUFBPUlRFRF9QQVJTRVJfTUVESUFfVFlQRVMuaW5kZXhPZihjZmcuUEFSU0VSX01FRElBX1RZUEUpID09PSAtMSA/IERFRkFVTFRfUEFSU0VSX01FRElBX1RZUEUgOiBjZmcuUEFSU0VSX01FRElBX1RZUEU7XG4gICAgLy8gSFRNTCB0YWdzIGFuZCBhdHRyaWJ1dGVzIGFyZSBub3QgY2FzZS1zZW5zaXRpdmUsIGNvbnZlcnRpbmcgdG8gbG93ZXJjYXNlLiBLZWVwaW5nIFhIVE1MIGFzIGlzLlxuICAgIHRyYW5zZm9ybUNhc2VGdW5jID0gUEFSU0VSX01FRElBX1RZUEUgPT09ICdhcHBsaWNhdGlvbi94aHRtbCt4bWwnID8gc3RyaW5nVG9TdHJpbmcgOiBzdHJpbmdUb0xvd2VyQ2FzZTtcbiAgICAvKiBTZXQgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzICovXG4gICAgQUxMT1dFRF9UQUdTID0gb2JqZWN0SGFzT3duUHJvcGVydHkoY2ZnLCAnQUxMT1dFRF9UQUdTJykgPyBhZGRUb1NldCh7fSwgY2ZnLkFMTE9XRURfVEFHUywgdHJhbnNmb3JtQ2FzZUZ1bmMpIDogREVGQVVMVF9BTExPV0VEX1RBR1M7XG4gICAgQUxMT1dFRF9BVFRSID0gb2JqZWN0SGFzT3duUHJvcGVydHkoY2ZnLCAnQUxMT1dFRF9BVFRSJykgPyBhZGRUb1NldCh7fSwgY2ZnLkFMTE9XRURfQVRUUiwgdHJhbnNmb3JtQ2FzZUZ1bmMpIDogREVGQVVMVF9BTExPV0VEX0FUVFI7XG4gICAgQUxMT1dFRF9OQU1FU1BBQ0VTID0gb2JqZWN0SGFzT3duUHJvcGVydHkoY2ZnLCAnQUxMT1dFRF9OQU1FU1BBQ0VTJykgPyBhZGRUb1NldCh7fSwgY2ZnLkFMTE9XRURfTkFNRVNQQUNFUywgc3RyaW5nVG9TdHJpbmcpIDogREVGQVVMVF9BTExPV0VEX05BTUVTUEFDRVM7XG4gICAgVVJJX1NBRkVfQVRUUklCVVRFUyA9IG9iamVjdEhhc093blByb3BlcnR5KGNmZywgJ0FERF9VUklfU0FGRV9BVFRSJykgPyBhZGRUb1NldChjbG9uZShERUZBVUxUX1VSSV9TQUZFX0FUVFJJQlVURVMpLCBjZmcuQUREX1VSSV9TQUZFX0FUVFIsIHRyYW5zZm9ybUNhc2VGdW5jKSA6IERFRkFVTFRfVVJJX1NBRkVfQVRUUklCVVRFUztcbiAgICBEQVRBX1VSSV9UQUdTID0gb2JqZWN0SGFzT3duUHJvcGVydHkoY2ZnLCAnQUREX0RBVEFfVVJJX1RBR1MnKSA/IGFkZFRvU2V0KGNsb25lKERFRkFVTFRfREFUQV9VUklfVEFHUyksIGNmZy5BRERfREFUQV9VUklfVEFHUywgdHJhbnNmb3JtQ2FzZUZ1bmMpIDogREVGQVVMVF9EQVRBX1VSSV9UQUdTO1xuICAgIEZPUkJJRF9DT05URU5UUyA9IG9iamVjdEhhc093blByb3BlcnR5KGNmZywgJ0ZPUkJJRF9DT05URU5UUycpID8gYWRkVG9TZXQoe30sIGNmZy5GT1JCSURfQ09OVEVOVFMsIHRyYW5zZm9ybUNhc2VGdW5jKSA6IERFRkFVTFRfRk9SQklEX0NPTlRFTlRTO1xuICAgIEZPUkJJRF9UQUdTID0gb2JqZWN0SGFzT3duUHJvcGVydHkoY2ZnLCAnRk9SQklEX1RBR1MnKSA/IGFkZFRvU2V0KHt9LCBjZmcuRk9SQklEX1RBR1MsIHRyYW5zZm9ybUNhc2VGdW5jKSA6IGNsb25lKHt9KTtcbiAgICBGT1JCSURfQVRUUiA9IG9iamVjdEhhc093blByb3BlcnR5KGNmZywgJ0ZPUkJJRF9BVFRSJykgPyBhZGRUb1NldCh7fSwgY2ZnLkZPUkJJRF9BVFRSLCB0cmFuc2Zvcm1DYXNlRnVuYykgOiBjbG9uZSh7fSk7XG4gICAgVVNFX1BST0ZJTEVTID0gb2JqZWN0SGFzT3duUHJvcGVydHkoY2ZnLCAnVVNFX1BST0ZJTEVTJykgPyBjZmcuVVNFX1BST0ZJTEVTIDogZmFsc2U7XG4gICAgQUxMT1dfQVJJQV9BVFRSID0gY2ZnLkFMTE9XX0FSSUFfQVRUUiAhPT0gZmFsc2U7IC8vIERlZmF1bHQgdHJ1ZVxuICAgIEFMTE9XX0RBVEFfQVRUUiA9IGNmZy5BTExPV19EQVRBX0FUVFIgIT09IGZhbHNlOyAvLyBEZWZhdWx0IHRydWVcbiAgICBBTExPV19VTktOT1dOX1BST1RPQ09MUyA9IGNmZy5BTExPV19VTktOT1dOX1BST1RPQ09MUyB8fCBmYWxzZTsgLy8gRGVmYXVsdCBmYWxzZVxuICAgIEFMTE9XX1NFTEZfQ0xPU0VfSU5fQVRUUiA9IGNmZy5BTExPV19TRUxGX0NMT1NFX0lOX0FUVFIgIT09IGZhbHNlOyAvLyBEZWZhdWx0IHRydWVcbiAgICBTQUZFX0ZPUl9URU1QTEFURVMgPSBjZmcuU0FGRV9GT1JfVEVNUExBVEVTIHx8IGZhbHNlOyAvLyBEZWZhdWx0IGZhbHNlXG4gICAgU0FGRV9GT1JfWE1MID0gY2ZnLlNBRkVfRk9SX1hNTCAhPT0gZmFsc2U7IC8vIERlZmF1bHQgdHJ1ZVxuICAgIFdIT0xFX0RPQ1VNRU5UID0gY2ZnLldIT0xFX0RPQ1VNRU5UIHx8IGZhbHNlOyAvLyBEZWZhdWx0IGZhbHNlXG4gICAgUkVUVVJOX0RPTSA9IGNmZy5SRVRVUk5fRE9NIHx8IGZhbHNlOyAvLyBEZWZhdWx0IGZhbHNlXG4gICAgUkVUVVJOX0RPTV9GUkFHTUVOVCA9IGNmZy5SRVRVUk5fRE9NX0ZSQUdNRU5UIHx8IGZhbHNlOyAvLyBEZWZhdWx0IGZhbHNlXG4gICAgUkVUVVJOX1RSVVNURURfVFlQRSA9IGNmZy5SRVRVUk5fVFJVU1RFRF9UWVBFIHx8IGZhbHNlOyAvLyBEZWZhdWx0IGZhbHNlXG4gICAgRk9SQ0VfQk9EWSA9IGNmZy5GT1JDRV9CT0RZIHx8IGZhbHNlOyAvLyBEZWZhdWx0IGZhbHNlXG4gICAgU0FOSVRJWkVfRE9NID0gY2ZnLlNBTklUSVpFX0RPTSAhPT0gZmFsc2U7IC8vIERlZmF1bHQgdHJ1ZVxuICAgIFNBTklUSVpFX05BTUVEX1BST1BTID0gY2ZnLlNBTklUSVpFX05BTUVEX1BST1BTIHx8IGZhbHNlOyAvLyBEZWZhdWx0IGZhbHNlXG4gICAgS0VFUF9DT05URU5UID0gY2ZnLktFRVBfQ09OVEVOVCAhPT0gZmFsc2U7IC8vIERlZmF1bHQgdHJ1ZVxuICAgIElOX1BMQUNFID0gY2ZnLklOX1BMQUNFIHx8IGZhbHNlOyAvLyBEZWZhdWx0IGZhbHNlXG4gICAgSVNfQUxMT1dFRF9VUkkkMSA9IGNmZy5BTExPV0VEX1VSSV9SRUdFWFAgfHwgSVNfQUxMT1dFRF9VUkk7XG4gICAgTkFNRVNQQUNFID0gY2ZnLk5BTUVTUEFDRSB8fCBIVE1MX05BTUVTUEFDRTtcbiAgICBNQVRITUxfVEVYVF9JTlRFR1JBVElPTl9QT0lOVFMgPSBjZmcuTUFUSE1MX1RFWFRfSU5URUdSQVRJT05fUE9JTlRTIHx8IE1BVEhNTF9URVhUX0lOVEVHUkFUSU9OX1BPSU5UUztcbiAgICBIVE1MX0lOVEVHUkFUSU9OX1BPSU5UUyA9IGNmZy5IVE1MX0lOVEVHUkFUSU9OX1BPSU5UUyB8fCBIVE1MX0lOVEVHUkFUSU9OX1BPSU5UUztcbiAgICBDVVNUT01fRUxFTUVOVF9IQU5ETElORyA9IGNmZy5DVVNUT01fRUxFTUVOVF9IQU5ETElORyB8fCB7fTtcbiAgICBpZiAoY2ZnLkNVU1RPTV9FTEVNRU5UX0hBTkRMSU5HICYmIGlzUmVnZXhPckZ1bmN0aW9uKGNmZy5DVVNUT01fRUxFTUVOVF9IQU5ETElORy50YWdOYW1lQ2hlY2spKSB7XG4gICAgICBDVVNUT01fRUxFTUVOVF9IQU5ETElORy50YWdOYW1lQ2hlY2sgPSBjZmcuQ1VTVE9NX0VMRU1FTlRfSEFORExJTkcudGFnTmFtZUNoZWNrO1xuICAgIH1cbiAgICBpZiAoY2ZnLkNVU1RPTV9FTEVNRU5UX0hBTkRMSU5HICYmIGlzUmVnZXhPckZ1bmN0aW9uKGNmZy5DVVNUT01fRUxFTUVOVF9IQU5ETElORy5hdHRyaWJ1dGVOYW1lQ2hlY2spKSB7XG4gICAgICBDVVNUT01fRUxFTUVOVF9IQU5ETElORy5hdHRyaWJ1dGVOYW1lQ2hlY2sgPSBjZmcuQ1VTVE9NX0VMRU1FTlRfSEFORExJTkcuYXR0cmlidXRlTmFtZUNoZWNrO1xuICAgIH1cbiAgICBpZiAoY2ZnLkNVU1RPTV9FTEVNRU5UX0hBTkRMSU5HICYmIHR5cGVvZiBjZmcuQ1VTVE9NX0VMRU1FTlRfSEFORExJTkcuYWxsb3dDdXN0b21pemVkQnVpbHRJbkVsZW1lbnRzID09PSAnYm9vbGVhbicpIHtcbiAgICAgIENVU1RPTV9FTEVNRU5UX0hBTkRMSU5HLmFsbG93Q3VzdG9taXplZEJ1aWx0SW5FbGVtZW50cyA9IGNmZy5DVVNUT01fRUxFTUVOVF9IQU5ETElORy5hbGxvd0N1c3RvbWl6ZWRCdWlsdEluRWxlbWVudHM7XG4gICAgfVxuICAgIGlmIChTQUZFX0ZPUl9URU1QTEFURVMpIHtcbiAgICAgIEFMTE9XX0RBVEFfQVRUUiA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoUkVUVVJOX0RPTV9GUkFHTUVOVCkge1xuICAgICAgUkVUVVJOX0RPTSA9IHRydWU7XG4gICAgfVxuICAgIC8qIFBhcnNlIHByb2ZpbGUgaW5mbyAqL1xuICAgIGlmIChVU0VfUFJPRklMRVMpIHtcbiAgICAgIEFMTE9XRURfVEFHUyA9IGFkZFRvU2V0KHt9LCB0ZXh0KTtcbiAgICAgIEFMTE9XRURfQVRUUiA9IFtdO1xuICAgICAgaWYgKFVTRV9QUk9GSUxFUy5odG1sID09PSB0cnVlKSB7XG4gICAgICAgIGFkZFRvU2V0KEFMTE9XRURfVEFHUywgaHRtbCQxKTtcbiAgICAgICAgYWRkVG9TZXQoQUxMT1dFRF9BVFRSLCBodG1sKTtcbiAgICAgIH1cbiAgICAgIGlmIChVU0VfUFJPRklMRVMuc3ZnID09PSB0cnVlKSB7XG4gICAgICAgIGFkZFRvU2V0KEFMTE9XRURfVEFHUywgc3ZnJDEpO1xuICAgICAgICBhZGRUb1NldChBTExPV0VEX0FUVFIsIHN2Zyk7XG4gICAgICAgIGFkZFRvU2V0KEFMTE9XRURfQVRUUiwgeG1sKTtcbiAgICAgIH1cbiAgICAgIGlmIChVU0VfUFJPRklMRVMuc3ZnRmlsdGVycyA9PT0gdHJ1ZSkge1xuICAgICAgICBhZGRUb1NldChBTExPV0VEX1RBR1MsIHN2Z0ZpbHRlcnMpO1xuICAgICAgICBhZGRUb1NldChBTExPV0VEX0FUVFIsIHN2Zyk7XG4gICAgICAgIGFkZFRvU2V0KEFMTE9XRURfQVRUUiwgeG1sKTtcbiAgICAgIH1cbiAgICAgIGlmIChVU0VfUFJPRklMRVMubWF0aE1sID09PSB0cnVlKSB7XG4gICAgICAgIGFkZFRvU2V0KEFMTE9XRURfVEFHUywgbWF0aE1sJDEpO1xuICAgICAgICBhZGRUb1NldChBTExPV0VEX0FUVFIsIG1hdGhNbCk7XG4gICAgICAgIGFkZFRvU2V0KEFMTE9XRURfQVRUUiwgeG1sKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLyogTWVyZ2UgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzICovXG4gICAgaWYgKGNmZy5BRERfVEFHUykge1xuICAgICAgaWYgKEFMTE9XRURfVEFHUyA9PT0gREVGQVVMVF9BTExPV0VEX1RBR1MpIHtcbiAgICAgICAgQUxMT1dFRF9UQUdTID0gY2xvbmUoQUxMT1dFRF9UQUdTKTtcbiAgICAgIH1cbiAgICAgIGFkZFRvU2V0KEFMTE9XRURfVEFHUywgY2ZnLkFERF9UQUdTLCB0cmFuc2Zvcm1DYXNlRnVuYyk7XG4gICAgfVxuICAgIGlmIChjZmcuQUREX0FUVFIpIHtcbiAgICAgIGlmIChBTExPV0VEX0FUVFIgPT09IERFRkFVTFRfQUxMT1dFRF9BVFRSKSB7XG4gICAgICAgIEFMTE9XRURfQVRUUiA9IGNsb25lKEFMTE9XRURfQVRUUik7XG4gICAgICB9XG4gICAgICBhZGRUb1NldChBTExPV0VEX0FUVFIsIGNmZy5BRERfQVRUUiwgdHJhbnNmb3JtQ2FzZUZ1bmMpO1xuICAgIH1cbiAgICBpZiAoY2ZnLkFERF9VUklfU0FGRV9BVFRSKSB7XG4gICAgICBhZGRUb1NldChVUklfU0FGRV9BVFRSSUJVVEVTLCBjZmcuQUREX1VSSV9TQUZFX0FUVFIsIHRyYW5zZm9ybUNhc2VGdW5jKTtcbiAgICB9XG4gICAgaWYgKGNmZy5GT1JCSURfQ09OVEVOVFMpIHtcbiAgICAgIGlmIChGT1JCSURfQ09OVEVOVFMgPT09IERFRkFVTFRfRk9SQklEX0NPTlRFTlRTKSB7XG4gICAgICAgIEZPUkJJRF9DT05URU5UUyA9IGNsb25lKEZPUkJJRF9DT05URU5UUyk7XG4gICAgICB9XG4gICAgICBhZGRUb1NldChGT1JCSURfQ09OVEVOVFMsIGNmZy5GT1JCSURfQ09OVEVOVFMsIHRyYW5zZm9ybUNhc2VGdW5jKTtcbiAgICB9XG4gICAgLyogQWRkICN0ZXh0IGluIGNhc2UgS0VFUF9DT05URU5UIGlzIHNldCB0byB0cnVlICovXG4gICAgaWYgKEtFRVBfQ09OVEVOVCkge1xuICAgICAgQUxMT1dFRF9UQUdTWycjdGV4dCddID0gdHJ1ZTtcbiAgICB9XG4gICAgLyogQWRkIGh0bWwsIGhlYWQgYW5kIGJvZHkgdG8gQUxMT1dFRF9UQUdTIGluIGNhc2UgV0hPTEVfRE9DVU1FTlQgaXMgdHJ1ZSAqL1xuICAgIGlmIChXSE9MRV9ET0NVTUVOVCkge1xuICAgICAgYWRkVG9TZXQoQUxMT1dFRF9UQUdTLCBbJ2h0bWwnLCAnaGVhZCcsICdib2R5J10pO1xuICAgIH1cbiAgICAvKiBBZGQgdGJvZHkgdG8gQUxMT1dFRF9UQUdTIGluIGNhc2UgdGFibGVzIGFyZSBwZXJtaXR0ZWQsIHNlZSAjMjg2LCAjMzY1ICovXG4gICAgaWYgKEFMTE9XRURfVEFHUy50YWJsZSkge1xuICAgICAgYWRkVG9TZXQoQUxMT1dFRF9UQUdTLCBbJ3Rib2R5J10pO1xuICAgICAgZGVsZXRlIEZPUkJJRF9UQUdTLnRib2R5O1xuICAgIH1cbiAgICBpZiAoY2ZnLlRSVVNURURfVFlQRVNfUE9MSUNZKSB7XG4gICAgICBpZiAodHlwZW9mIGNmZy5UUlVTVEVEX1RZUEVTX1BPTElDWS5jcmVhdGVIVE1MICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IHR5cGVFcnJvckNyZWF0ZSgnVFJVU1RFRF9UWVBFU19QT0xJQ1kgY29uZmlndXJhdGlvbiBvcHRpb24gbXVzdCBwcm92aWRlIGEgXCJjcmVhdGVIVE1MXCIgaG9vay4nKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgY2ZnLlRSVVNURURfVFlQRVNfUE9MSUNZLmNyZWF0ZVNjcmlwdFVSTCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyB0eXBlRXJyb3JDcmVhdGUoJ1RSVVNURURfVFlQRVNfUE9MSUNZIGNvbmZpZ3VyYXRpb24gb3B0aW9uIG11c3QgcHJvdmlkZSBhIFwiY3JlYXRlU2NyaXB0VVJMXCIgaG9vay4nKTtcbiAgICAgIH1cbiAgICAgIC8vIE92ZXJ3cml0ZSBleGlzdGluZyBUcnVzdGVkVHlwZXMgcG9saWN5LlxuICAgICAgdHJ1c3RlZFR5cGVzUG9saWN5ID0gY2ZnLlRSVVNURURfVFlQRVNfUE9MSUNZO1xuICAgICAgLy8gU2lnbiBsb2NhbCB2YXJpYWJsZXMgcmVxdWlyZWQgYnkgYHNhbml0aXplYC5cbiAgICAgIGVtcHR5SFRNTCA9IHRydXN0ZWRUeXBlc1BvbGljeS5jcmVhdGVIVE1MKCcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVW5pbml0aWFsaXplZCBwb2xpY3ksIGF0dGVtcHQgdG8gaW5pdGlhbGl6ZSB0aGUgaW50ZXJuYWwgZG9tcHVyaWZ5IHBvbGljeS5cbiAgICAgIGlmICh0cnVzdGVkVHlwZXNQb2xpY3kgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0cnVzdGVkVHlwZXNQb2xpY3kgPSBfY3JlYXRlVHJ1c3RlZFR5cGVzUG9saWN5KHRydXN0ZWRUeXBlcywgY3VycmVudFNjcmlwdCk7XG4gICAgICB9XG4gICAgICAvLyBJZiBjcmVhdGluZyB0aGUgaW50ZXJuYWwgcG9saWN5IHN1Y2NlZWRlZCBzaWduIGludGVybmFsIHZhcmlhYmxlcy5cbiAgICAgIGlmICh0cnVzdGVkVHlwZXNQb2xpY3kgIT09IG51bGwgJiYgdHlwZW9mIGVtcHR5SFRNTCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgZW1wdHlIVE1MID0gdHJ1c3RlZFR5cGVzUG9saWN5LmNyZWF0ZUhUTUwoJycpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBQcmV2ZW50IGZ1cnRoZXIgbWFuaXB1bGF0aW9uIG9mIGNvbmZpZ3VyYXRpb24uXG4gICAgLy8gTm90IGF2YWlsYWJsZSBpbiBJRTgsIFNhZmFyaSA1LCBldGMuXG4gICAgaWYgKGZyZWV6ZSkge1xuICAgICAgZnJlZXplKGNmZyk7XG4gICAgfVxuICAgIENPTkZJRyA9IGNmZztcbiAgfTtcbiAgLyogS2VlcCB0cmFjayBvZiBhbGwgcG9zc2libGUgU1ZHIGFuZCBNYXRoTUwgdGFnc1xuICAgKiBzbyB0aGF0IHdlIGNhbiBwZXJmb3JtIHRoZSBuYW1lc3BhY2UgY2hlY2tzXG4gICAqIGNvcnJlY3RseS4gKi9cbiAgY29uc3QgQUxMX1NWR19UQUdTID0gYWRkVG9TZXQoe30sIFsuLi5zdmckMSwgLi4uc3ZnRmlsdGVycywgLi4uc3ZnRGlzYWxsb3dlZF0pO1xuICBjb25zdCBBTExfTUFUSE1MX1RBR1MgPSBhZGRUb1NldCh7fSwgWy4uLm1hdGhNbCQxLCAuLi5tYXRoTWxEaXNhbGxvd2VkXSk7XG4gIC8qKlxuICAgKiBAcGFyYW0gZWxlbWVudCBhIERPTSBlbGVtZW50IHdob3NlIG5hbWVzcGFjZSBpcyBiZWluZyBjaGVja2VkXG4gICAqIEByZXR1cm5zIFJldHVybiBmYWxzZSBpZiB0aGUgZWxlbWVudCBoYXMgYVxuICAgKiAgbmFtZXNwYWNlIHRoYXQgYSBzcGVjLWNvbXBsaWFudCBwYXJzZXIgd291bGQgbmV2ZXJcbiAgICogIHJldHVybi4gUmV0dXJuIHRydWUgb3RoZXJ3aXNlLlxuICAgKi9cbiAgY29uc3QgX2NoZWNrVmFsaWROYW1lc3BhY2UgPSBmdW5jdGlvbiBfY2hlY2tWYWxpZE5hbWVzcGFjZShlbGVtZW50KSB7XG4gICAgbGV0IHBhcmVudCA9IGdldFBhcmVudE5vZGUoZWxlbWVudCk7XG4gICAgLy8gSW4gSlNET00sIGlmIHdlJ3JlIGluc2lkZSBzaGFkb3cgRE9NLCB0aGVuIHBhcmVudE5vZGVcbiAgICAvLyBjYW4gYmUgbnVsbC4gV2UganVzdCBzaW11bGF0ZSBwYXJlbnQgaW4gdGhpcyBjYXNlLlxuICAgIGlmICghcGFyZW50IHx8ICFwYXJlbnQudGFnTmFtZSkge1xuICAgICAgcGFyZW50ID0ge1xuICAgICAgICBuYW1lc3BhY2VVUkk6IE5BTUVTUEFDRSxcbiAgICAgICAgdGFnTmFtZTogJ3RlbXBsYXRlJ1xuICAgICAgfTtcbiAgICB9XG4gICAgY29uc3QgdGFnTmFtZSA9IHN0cmluZ1RvTG93ZXJDYXNlKGVsZW1lbnQudGFnTmFtZSk7XG4gICAgY29uc3QgcGFyZW50VGFnTmFtZSA9IHN0cmluZ1RvTG93ZXJDYXNlKHBhcmVudC50YWdOYW1lKTtcbiAgICBpZiAoIUFMTE9XRURfTkFNRVNQQUNFU1tlbGVtZW50Lm5hbWVzcGFjZVVSSV0pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGVsZW1lbnQubmFtZXNwYWNlVVJJID09PSBTVkdfTkFNRVNQQUNFKSB7XG4gICAgICAvLyBUaGUgb25seSB3YXkgdG8gc3dpdGNoIGZyb20gSFRNTCBuYW1lc3BhY2UgdG8gU1ZHXG4gICAgICAvLyBpcyB2aWEgPHN2Zz4uIElmIGl0IGhhcHBlbnMgdmlhIGFueSBvdGhlciB0YWcsIHRoZW5cbiAgICAgIC8vIGl0IHNob3VsZCBiZSBraWxsZWQuXG4gICAgICBpZiAocGFyZW50Lm5hbWVzcGFjZVVSSSA9PT0gSFRNTF9OQU1FU1BBQ0UpIHtcbiAgICAgICAgcmV0dXJuIHRhZ05hbWUgPT09ICdzdmcnO1xuICAgICAgfVxuICAgICAgLy8gVGhlIG9ubHkgd2F5IHRvIHN3aXRjaCBmcm9tIE1hdGhNTCB0byBTVkcgaXMgdmlhYFxuICAgICAgLy8gc3ZnIGlmIHBhcmVudCBpcyBlaXRoZXIgPGFubm90YXRpb24teG1sPiBvciBNYXRoTUxcbiAgICAgIC8vIHRleHQgaW50ZWdyYXRpb24gcG9pbnRzLlxuICAgICAgaWYgKHBhcmVudC5uYW1lc3BhY2VVUkkgPT09IE1BVEhNTF9OQU1FU1BBQ0UpIHtcbiAgICAgICAgcmV0dXJuIHRhZ05hbWUgPT09ICdzdmcnICYmIChwYXJlbnRUYWdOYW1lID09PSAnYW5ub3RhdGlvbi14bWwnIHx8IE1BVEhNTF9URVhUX0lOVEVHUkFUSU9OX1BPSU5UU1twYXJlbnRUYWdOYW1lXSk7XG4gICAgICB9XG4gICAgICAvLyBXZSBvbmx5IGFsbG93IGVsZW1lbnRzIHRoYXQgYXJlIGRlZmluZWQgaW4gU1ZHXG4gICAgICAvLyBzcGVjLiBBbGwgb3RoZXJzIGFyZSBkaXNhbGxvd2VkIGluIFNWRyBuYW1lc3BhY2UuXG4gICAgICByZXR1cm4gQm9vbGVhbihBTExfU1ZHX1RBR1NbdGFnTmFtZV0pO1xuICAgIH1cbiAgICBpZiAoZWxlbWVudC5uYW1lc3BhY2VVUkkgPT09IE1BVEhNTF9OQU1FU1BBQ0UpIHtcbiAgICAgIC8vIFRoZSBvbmx5IHdheSB0byBzd2l0Y2ggZnJvbSBIVE1MIG5hbWVzcGFjZSB0byBNYXRoTUxcbiAgICAgIC8vIGlzIHZpYSA8bWF0aD4uIElmIGl0IGhhcHBlbnMgdmlhIGFueSBvdGhlciB0YWcsIHRoZW5cbiAgICAgIC8vIGl0IHNob3VsZCBiZSBraWxsZWQuXG4gICAgICBpZiAocGFyZW50Lm5hbWVzcGFjZVVSSSA9PT0gSFRNTF9OQU1FU1BBQ0UpIHtcbiAgICAgICAgcmV0dXJuIHRhZ05hbWUgPT09ICdtYXRoJztcbiAgICAgIH1cbiAgICAgIC8vIFRoZSBvbmx5IHdheSB0byBzd2l0Y2ggZnJvbSBTVkcgdG8gTWF0aE1MIGlzIHZpYVxuICAgICAgLy8gPG1hdGg+IGFuZCBIVE1MIGludGVncmF0aW9uIHBvaW50c1xuICAgICAgaWYgKHBhcmVudC5uYW1lc3BhY2VVUkkgPT09IFNWR19OQU1FU1BBQ0UpIHtcbiAgICAgICAgcmV0dXJuIHRhZ05hbWUgPT09ICdtYXRoJyAmJiBIVE1MX0lOVEVHUkFUSU9OX1BPSU5UU1twYXJlbnRUYWdOYW1lXTtcbiAgICAgIH1cbiAgICAgIC8vIFdlIG9ubHkgYWxsb3cgZWxlbWVudHMgdGhhdCBhcmUgZGVmaW5lZCBpbiBNYXRoTUxcbiAgICAgIC8vIHNwZWMuIEFsbCBvdGhlcnMgYXJlIGRpc2FsbG93ZWQgaW4gTWF0aE1MIG5hbWVzcGFjZS5cbiAgICAgIHJldHVybiBCb29sZWFuKEFMTF9NQVRITUxfVEFHU1t0YWdOYW1lXSk7XG4gICAgfVxuICAgIGlmIChlbGVtZW50Lm5hbWVzcGFjZVVSSSA9PT0gSFRNTF9OQU1FU1BBQ0UpIHtcbiAgICAgIC8vIFRoZSBvbmx5IHdheSB0byBzd2l0Y2ggZnJvbSBTVkcgdG8gSFRNTCBpcyB2aWFcbiAgICAgIC8vIEhUTUwgaW50ZWdyYXRpb24gcG9pbnRzLCBhbmQgZnJvbSBNYXRoTUwgdG8gSFRNTFxuICAgICAgLy8gaXMgdmlhIE1hdGhNTCB0ZXh0IGludGVncmF0aW9uIHBvaW50c1xuICAgICAgaWYgKHBhcmVudC5uYW1lc3BhY2VVUkkgPT09IFNWR19OQU1FU1BBQ0UgJiYgIUhUTUxfSU5URUdSQVRJT05fUE9JTlRTW3BhcmVudFRhZ05hbWVdKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChwYXJlbnQubmFtZXNwYWNlVVJJID09PSBNQVRITUxfTkFNRVNQQUNFICYmICFNQVRITUxfVEVYVF9JTlRFR1JBVElPTl9QT0lOVFNbcGFyZW50VGFnTmFtZV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gV2UgZGlzYWxsb3cgdGFncyB0aGF0IGFyZSBzcGVjaWZpYyBmb3IgTWF0aE1MXG4gICAgICAvLyBvciBTVkcgYW5kIHNob3VsZCBuZXZlciBhcHBlYXIgaW4gSFRNTCBuYW1lc3BhY2VcbiAgICAgIHJldHVybiAhQUxMX01BVEhNTF9UQUdTW3RhZ05hbWVdICYmIChDT01NT05fU1ZHX0FORF9IVE1MX0VMRU1FTlRTW3RhZ05hbWVdIHx8ICFBTExfU1ZHX1RBR1NbdGFnTmFtZV0pO1xuICAgIH1cbiAgICAvLyBGb3IgWEhUTUwgYW5kIFhNTCBkb2N1bWVudHMgdGhhdCBzdXBwb3J0IGN1c3RvbSBuYW1lc3BhY2VzXG4gICAgaWYgKFBBUlNFUl9NRURJQV9UWVBFID09PSAnYXBwbGljYXRpb24veGh0bWwreG1sJyAmJiBBTExPV0VEX05BTUVTUEFDRVNbZWxlbWVudC5uYW1lc3BhY2VVUkldKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gVGhlIGNvZGUgc2hvdWxkIG5ldmVyIHJlYWNoIHRoaXMgcGxhY2UgKHRoaXMgbWVhbnNcbiAgICAvLyB0aGF0IHRoZSBlbGVtZW50IHNvbWVob3cgZ290IG5hbWVzcGFjZSB0aGF0IGlzIG5vdFxuICAgIC8vIEhUTUwsIFNWRywgTWF0aE1MIG9yIGFsbG93ZWQgdmlhIEFMTE9XRURfTkFNRVNQQUNFUykuXG4gICAgLy8gUmV0dXJuIGZhbHNlIGp1c3QgaW4gY2FzZS5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIC8qKlxuICAgKiBfZm9yY2VSZW1vdmVcbiAgICpcbiAgICogQHBhcmFtIG5vZGUgYSBET00gbm9kZVxuICAgKi9cbiAgY29uc3QgX2ZvcmNlUmVtb3ZlID0gZnVuY3Rpb24gX2ZvcmNlUmVtb3ZlKG5vZGUpIHtcbiAgICBhcnJheVB1c2goRE9NUHVyaWZ5LnJlbW92ZWQsIHtcbiAgICAgIGVsZW1lbnQ6IG5vZGVcbiAgICB9KTtcbiAgICB0cnkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHVuaWNvcm4vcHJlZmVyLWRvbS1ub2RlLXJlbW92ZVxuICAgICAgZ2V0UGFyZW50Tm9kZShub2RlKS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICB9IGNhdGNoIChfKSB7XG4gICAgICByZW1vdmUobm9kZSk7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogX3JlbW92ZUF0dHJpYnV0ZVxuICAgKlxuICAgKiBAcGFyYW0gbmFtZSBhbiBBdHRyaWJ1dGUgbmFtZVxuICAgKiBAcGFyYW0gZWxlbWVudCBhIERPTSBub2RlXG4gICAqL1xuICBjb25zdCBfcmVtb3ZlQXR0cmlidXRlID0gZnVuY3Rpb24gX3JlbW92ZUF0dHJpYnV0ZShuYW1lLCBlbGVtZW50KSB7XG4gICAgdHJ5IHtcbiAgICAgIGFycmF5UHVzaChET01QdXJpZnkucmVtb3ZlZCwge1xuICAgICAgICBhdHRyaWJ1dGU6IGVsZW1lbnQuZ2V0QXR0cmlidXRlTm9kZShuYW1lKSxcbiAgICAgICAgZnJvbTogZWxlbWVudFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoXykge1xuICAgICAgYXJyYXlQdXNoKERPTVB1cmlmeS5yZW1vdmVkLCB7XG4gICAgICAgIGF0dHJpYnV0ZTogbnVsbCxcbiAgICAgICAgZnJvbTogZWxlbWVudFxuICAgICAgfSk7XG4gICAgfVxuICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIC8vIFdlIHZvaWQgYXR0cmlidXRlIHZhbHVlcyBmb3IgdW5yZW1vdmFibGUgXCJpc1wiIGF0dHJpYnV0ZXNcbiAgICBpZiAobmFtZSA9PT0gJ2lzJykge1xuICAgICAgaWYgKFJFVFVSTl9ET00gfHwgUkVUVVJOX0RPTV9GUkFHTUVOVCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIF9mb3JjZVJlbW92ZShlbGVtZW50KTtcbiAgICAgICAgfSBjYXRjaCAoXykge31cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgJycpO1xuICAgICAgICB9IGNhdGNoIChfKSB7fVxuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIF9pbml0RG9jdW1lbnRcbiAgICpcbiAgICogQHBhcmFtIGRpcnR5IC0gYSBzdHJpbmcgb2YgZGlydHkgbWFya3VwXG4gICAqIEByZXR1cm4gYSBET00sIGZpbGxlZCB3aXRoIHRoZSBkaXJ0eSBtYXJrdXBcbiAgICovXG4gIGNvbnN0IF9pbml0RG9jdW1lbnQgPSBmdW5jdGlvbiBfaW5pdERvY3VtZW50KGRpcnR5KSB7XG4gICAgLyogQ3JlYXRlIGEgSFRNTCBkb2N1bWVudCAqL1xuICAgIGxldCBkb2MgPSBudWxsO1xuICAgIGxldCBsZWFkaW5nV2hpdGVzcGFjZSA9IG51bGw7XG4gICAgaWYgKEZPUkNFX0JPRFkpIHtcbiAgICAgIGRpcnR5ID0gJzxyZW1vdmU+PC9yZW1vdmU+JyArIGRpcnR5O1xuICAgIH0gZWxzZSB7XG4gICAgICAvKiBJZiBGT1JDRV9CT0RZIGlzbid0IHVzZWQsIGxlYWRpbmcgd2hpdGVzcGFjZSBuZWVkcyB0byBiZSBwcmVzZXJ2ZWQgbWFudWFsbHkgKi9cbiAgICAgIGNvbnN0IG1hdGNoZXMgPSBzdHJpbmdNYXRjaChkaXJ0eSwgL15bXFxyXFxuXFx0IF0rLyk7XG4gICAgICBsZWFkaW5nV2hpdGVzcGFjZSA9IG1hdGNoZXMgJiYgbWF0Y2hlc1swXTtcbiAgICB9XG4gICAgaWYgKFBBUlNFUl9NRURJQV9UWVBFID09PSAnYXBwbGljYXRpb24veGh0bWwreG1sJyAmJiBOQU1FU1BBQ0UgPT09IEhUTUxfTkFNRVNQQUNFKSB7XG4gICAgICAvLyBSb290IG9mIFhIVE1MIGRvYyBtdXN0IGNvbnRhaW4geG1sbnMgZGVjbGFyYXRpb24gKHNlZSBodHRwczovL3d3dy53My5vcmcvVFIveGh0bWwxL25vcm1hdGl2ZS5odG1sI3N0cmljdClcbiAgICAgIGRpcnR5ID0gJzxodG1sIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiPjxoZWFkPjwvaGVhZD48Ym9keT4nICsgZGlydHkgKyAnPC9ib2R5PjwvaHRtbD4nO1xuICAgIH1cbiAgICBjb25zdCBkaXJ0eVBheWxvYWQgPSB0cnVzdGVkVHlwZXNQb2xpY3kgPyB0cnVzdGVkVHlwZXNQb2xpY3kuY3JlYXRlSFRNTChkaXJ0eSkgOiBkaXJ0eTtcbiAgICAvKlxuICAgICAqIFVzZSB0aGUgRE9NUGFyc2VyIEFQSSBieSBkZWZhdWx0LCBmYWxsYmFjayBsYXRlciBpZiBuZWVkcyBiZVxuICAgICAqIERPTVBhcnNlciBub3Qgd29yayBmb3Igc3ZnIHdoZW4gaGFzIG11bHRpcGxlIHJvb3QgZWxlbWVudC5cbiAgICAgKi9cbiAgICBpZiAoTkFNRVNQQUNFID09PSBIVE1MX05BTUVTUEFDRSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZG9jID0gbmV3IERPTVBhcnNlcigpLnBhcnNlRnJvbVN0cmluZyhkaXJ0eVBheWxvYWQsIFBBUlNFUl9NRURJQV9UWVBFKTtcbiAgICAgIH0gY2F0Y2ggKF8pIHt9XG4gICAgfVxuICAgIC8qIFVzZSBjcmVhdGVIVE1MRG9jdW1lbnQgaW4gY2FzZSBET01QYXJzZXIgaXMgbm90IGF2YWlsYWJsZSAqL1xuICAgIGlmICghZG9jIHx8ICFkb2MuZG9jdW1lbnRFbGVtZW50KSB7XG4gICAgICBkb2MgPSBpbXBsZW1lbnRhdGlvbi5jcmVhdGVEb2N1bWVudChOQU1FU1BBQ0UsICd0ZW1wbGF0ZScsIG51bGwpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZG9jLmRvY3VtZW50RWxlbWVudC5pbm5lckhUTUwgPSBJU19FTVBUWV9JTlBVVCA/IGVtcHR5SFRNTCA6IGRpcnR5UGF5bG9hZDtcbiAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgLy8gU3ludGF4IGVycm9yIGlmIGRpcnR5UGF5bG9hZCBpcyBpbnZhbGlkIHhtbFxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBib2R5ID0gZG9jLmJvZHkgfHwgZG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICBpZiAoZGlydHkgJiYgbGVhZGluZ1doaXRlc3BhY2UpIHtcbiAgICAgIGJvZHkuaW5zZXJ0QmVmb3JlKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGxlYWRpbmdXaGl0ZXNwYWNlKSwgYm9keS5jaGlsZE5vZGVzWzBdIHx8IG51bGwpO1xuICAgIH1cbiAgICAvKiBXb3JrIG9uIHdob2xlIGRvY3VtZW50IG9yIGp1c3QgaXRzIGJvZHkgKi9cbiAgICBpZiAoTkFNRVNQQUNFID09PSBIVE1MX05BTUVTUEFDRSkge1xuICAgICAgcmV0dXJuIGdldEVsZW1lbnRzQnlUYWdOYW1lLmNhbGwoZG9jLCBXSE9MRV9ET0NVTUVOVCA/ICdodG1sJyA6ICdib2R5JylbMF07XG4gICAgfVxuICAgIHJldHVybiBXSE9MRV9ET0NVTUVOVCA/IGRvYy5kb2N1bWVudEVsZW1lbnQgOiBib2R5O1xuICB9O1xuICAvKipcbiAgICogQ3JlYXRlcyBhIE5vZGVJdGVyYXRvciBvYmplY3QgdGhhdCB5b3UgY2FuIHVzZSB0byB0cmF2ZXJzZSBmaWx0ZXJlZCBsaXN0cyBvZiBub2RlcyBvciBlbGVtZW50cyBpbiBhIGRvY3VtZW50LlxuICAgKlxuICAgKiBAcGFyYW0gcm9vdCBUaGUgcm9vdCBlbGVtZW50IG9yIG5vZGUgdG8gc3RhcnQgdHJhdmVyc2luZyBvbi5cbiAgICogQHJldHVybiBUaGUgY3JlYXRlZCBOb2RlSXRlcmF0b3JcbiAgICovXG4gIGNvbnN0IF9jcmVhdGVOb2RlSXRlcmF0b3IgPSBmdW5jdGlvbiBfY3JlYXRlTm9kZUl0ZXJhdG9yKHJvb3QpIHtcbiAgICByZXR1cm4gY3JlYXRlTm9kZUl0ZXJhdG9yLmNhbGwocm9vdC5vd25lckRvY3VtZW50IHx8IHJvb3QsIHJvb3QsXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWJpdHdpc2VcbiAgICBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCB8IE5vZGVGaWx0ZXIuU0hPV19DT01NRU5UIHwgTm9kZUZpbHRlci5TSE9XX1RFWFQgfCBOb2RlRmlsdGVyLlNIT1dfUFJPQ0VTU0lOR19JTlNUUlVDVElPTiB8IE5vZGVGaWx0ZXIuU0hPV19DREFUQV9TRUNUSU9OLCBudWxsKTtcbiAgfTtcbiAgLyoqXG4gICAqIF9pc0Nsb2JiZXJlZFxuICAgKlxuICAgKiBAcGFyYW0gZWxlbWVudCBlbGVtZW50IHRvIGNoZWNrIGZvciBjbG9iYmVyaW5nIGF0dGFja3NcbiAgICogQHJldHVybiB0cnVlIGlmIGNsb2JiZXJlZCwgZmFsc2UgaWYgc2FmZVxuICAgKi9cbiAgY29uc3QgX2lzQ2xvYmJlcmVkID0gZnVuY3Rpb24gX2lzQ2xvYmJlcmVkKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxGb3JtRWxlbWVudCAmJiAodHlwZW9mIGVsZW1lbnQubm9kZU5hbWUgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBlbGVtZW50LnRleHRDb250ZW50ICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgZWxlbWVudC5yZW1vdmVDaGlsZCAhPT0gJ2Z1bmN0aW9uJyB8fCAhKGVsZW1lbnQuYXR0cmlidXRlcyBpbnN0YW5jZW9mIE5hbWVkTm9kZU1hcCkgfHwgdHlwZW9mIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBlbGVtZW50LnNldEF0dHJpYnV0ZSAhPT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2YgZWxlbWVudC5uYW1lc3BhY2VVUkkgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBlbGVtZW50Lmluc2VydEJlZm9yZSAhPT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2YgZWxlbWVudC5oYXNDaGlsZE5vZGVzICE9PSAnZnVuY3Rpb24nKTtcbiAgfTtcbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSBET00gbm9kZS5cbiAgICpcbiAgICogQHBhcmFtIHZhbHVlIG9iamVjdCB0byBjaGVjayB3aGV0aGVyIGl0J3MgYSBET00gbm9kZVxuICAgKiBAcmV0dXJuIHRydWUgaXMgb2JqZWN0IGlzIGEgRE9NIG5vZGVcbiAgICovXG4gIGNvbnN0IF9pc05vZGUgPSBmdW5jdGlvbiBfaXNOb2RlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBOb2RlID09PSAnZnVuY3Rpb24nICYmIHZhbHVlIGluc3RhbmNlb2YgTm9kZTtcbiAgfTtcbiAgZnVuY3Rpb24gX2V4ZWN1dGVIb29rcyhob29rcywgY3VycmVudE5vZGUsIGRhdGEpIHtcbiAgICBhcnJheUZvckVhY2goaG9va3MsIGhvb2sgPT4ge1xuICAgICAgaG9vay5jYWxsKERPTVB1cmlmeSwgY3VycmVudE5vZGUsIGRhdGEsIENPTkZJRyk7XG4gICAgfSk7XG4gIH1cbiAgLyoqXG4gICAqIF9zYW5pdGl6ZUVsZW1lbnRzXG4gICAqXG4gICAqIEBwcm90ZWN0IG5vZGVOYW1lXG4gICAqIEBwcm90ZWN0IHRleHRDb250ZW50XG4gICAqIEBwcm90ZWN0IHJlbW92ZUNoaWxkXG4gICAqIEBwYXJhbSBjdXJyZW50Tm9kZSB0byBjaGVjayBmb3IgcGVybWlzc2lvbiB0byBleGlzdFxuICAgKiBAcmV0dXJuIHRydWUgaWYgbm9kZSB3YXMga2lsbGVkLCBmYWxzZSBpZiBsZWZ0IGFsaXZlXG4gICAqL1xuICBjb25zdCBfc2FuaXRpemVFbGVtZW50cyA9IGZ1bmN0aW9uIF9zYW5pdGl6ZUVsZW1lbnRzKGN1cnJlbnROb2RlKSB7XG4gICAgbGV0IGNvbnRlbnQgPSBudWxsO1xuICAgIC8qIEV4ZWN1dGUgYSBob29rIGlmIHByZXNlbnQgKi9cbiAgICBfZXhlY3V0ZUhvb2tzKGhvb2tzLmJlZm9yZVNhbml0aXplRWxlbWVudHMsIGN1cnJlbnROb2RlLCBudWxsKTtcbiAgICAvKiBDaGVjayBpZiBlbGVtZW50IGlzIGNsb2JiZXJlZCBvciBjYW4gY2xvYmJlciAqL1xuICAgIGlmIChfaXNDbG9iYmVyZWQoY3VycmVudE5vZGUpKSB7XG4gICAgICBfZm9yY2VSZW1vdmUoY3VycmVudE5vZGUpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8qIE5vdyBsZXQncyBjaGVjayB0aGUgZWxlbWVudCdzIHR5cGUgYW5kIG5hbWUgKi9cbiAgICBjb25zdCB0YWdOYW1lID0gdHJhbnNmb3JtQ2FzZUZ1bmMoY3VycmVudE5vZGUubm9kZU5hbWUpO1xuICAgIC8qIEV4ZWN1dGUgYSBob29rIGlmIHByZXNlbnQgKi9cbiAgICBfZXhlY3V0ZUhvb2tzKGhvb2tzLnVwb25TYW5pdGl6ZUVsZW1lbnQsIGN1cnJlbnROb2RlLCB7XG4gICAgICB0YWdOYW1lLFxuICAgICAgYWxsb3dlZFRhZ3M6IEFMTE9XRURfVEFHU1xuICAgIH0pO1xuICAgIC8qIERldGVjdCBtWFNTIGF0dGVtcHRzIGFidXNpbmcgbmFtZXNwYWNlIGNvbmZ1c2lvbiAqL1xuICAgIGlmIChTQUZFX0ZPUl9YTUwgJiYgY3VycmVudE5vZGUuaGFzQ2hpbGROb2RlcygpICYmICFfaXNOb2RlKGN1cnJlbnROb2RlLmZpcnN0RWxlbWVudENoaWxkKSAmJiByZWdFeHBUZXN0KC88Wy9cXHchXS9nLCBjdXJyZW50Tm9kZS5pbm5lckhUTUwpICYmIHJlZ0V4cFRlc3QoLzxbL1xcdyFdL2csIGN1cnJlbnROb2RlLnRleHRDb250ZW50KSkge1xuICAgICAgX2ZvcmNlUmVtb3ZlKGN1cnJlbnROb2RlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvKiBSZW1vdmUgYW55IG9jY3VycmVuY2Ugb2YgcHJvY2Vzc2luZyBpbnN0cnVjdGlvbnMgKi9cbiAgICBpZiAoY3VycmVudE5vZGUubm9kZVR5cGUgPT09IE5PREVfVFlQRS5wcm9ncmVzc2luZ0luc3RydWN0aW9uKSB7XG4gICAgICBfZm9yY2VSZW1vdmUoY3VycmVudE5vZGUpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8qIFJlbW92ZSBhbnkga2luZCBvZiBwb3NzaWJseSBoYXJtZnVsIGNvbW1lbnRzICovXG4gICAgaWYgKFNBRkVfRk9SX1hNTCAmJiBjdXJyZW50Tm9kZS5ub2RlVHlwZSA9PT0gTk9ERV9UWVBFLmNvbW1lbnQgJiYgcmVnRXhwVGVzdCgvPFsvXFx3XS9nLCBjdXJyZW50Tm9kZS5kYXRhKSkge1xuICAgICAgX2ZvcmNlUmVtb3ZlKGN1cnJlbnROb2RlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvKiBSZW1vdmUgZWxlbWVudCBpZiBhbnl0aGluZyBmb3JiaWRzIGl0cyBwcmVzZW5jZSAqL1xuICAgIGlmICghQUxMT1dFRF9UQUdTW3RhZ05hbWVdIHx8IEZPUkJJRF9UQUdTW3RhZ05hbWVdKSB7XG4gICAgICAvKiBDaGVjayBpZiB3ZSBoYXZlIGEgY3VzdG9tIGVsZW1lbnQgdG8gaGFuZGxlICovXG4gICAgICBpZiAoIUZPUkJJRF9UQUdTW3RhZ05hbWVdICYmIF9pc0Jhc2ljQ3VzdG9tRWxlbWVudCh0YWdOYW1lKSkge1xuICAgICAgICBpZiAoQ1VTVE9NX0VMRU1FTlRfSEFORExJTkcudGFnTmFtZUNoZWNrIGluc3RhbmNlb2YgUmVnRXhwICYmIHJlZ0V4cFRlc3QoQ1VTVE9NX0VMRU1FTlRfSEFORExJTkcudGFnTmFtZUNoZWNrLCB0YWdOYW1lKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoQ1VTVE9NX0VMRU1FTlRfSEFORExJTkcudGFnTmFtZUNoZWNrIGluc3RhbmNlb2YgRnVuY3Rpb24gJiYgQ1VTVE9NX0VMRU1FTlRfSEFORExJTkcudGFnTmFtZUNoZWNrKHRhZ05hbWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvKiBLZWVwIGNvbnRlbnQgZXhjZXB0IGZvciBiYWQtbGlzdGVkIGVsZW1lbnRzICovXG4gICAgICBpZiAoS0VFUF9DT05URU5UICYmICFGT1JCSURfQ09OVEVOVFNbdGFnTmFtZV0pIHtcbiAgICAgICAgY29uc3QgcGFyZW50Tm9kZSA9IGdldFBhcmVudE5vZGUoY3VycmVudE5vZGUpIHx8IGN1cnJlbnROb2RlLnBhcmVudE5vZGU7XG4gICAgICAgIGNvbnN0IGNoaWxkTm9kZXMgPSBnZXRDaGlsZE5vZGVzKGN1cnJlbnROb2RlKSB8fCBjdXJyZW50Tm9kZS5jaGlsZE5vZGVzO1xuICAgICAgICBpZiAoY2hpbGROb2RlcyAmJiBwYXJlbnROb2RlKSB7XG4gICAgICAgICAgY29uc3QgY2hpbGRDb3VudCA9IGNoaWxkTm9kZXMubGVuZ3RoO1xuICAgICAgICAgIGZvciAobGV0IGkgPSBjaGlsZENvdW50IC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkQ2xvbmUgPSBjbG9uZU5vZGUoY2hpbGROb2Rlc1tpXSwgdHJ1ZSk7XG4gICAgICAgICAgICBjaGlsZENsb25lLl9fcmVtb3ZhbENvdW50ID0gKGN1cnJlbnROb2RlLl9fcmVtb3ZhbENvdW50IHx8IDApICsgMTtcbiAgICAgICAgICAgIHBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGNoaWxkQ2xvbmUsIGdldE5leHRTaWJsaW5nKGN1cnJlbnROb2RlKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBfZm9yY2VSZW1vdmUoY3VycmVudE5vZGUpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8qIENoZWNrIHdoZXRoZXIgZWxlbWVudCBoYXMgYSB2YWxpZCBuYW1lc3BhY2UgKi9cbiAgICBpZiAoY3VycmVudE5vZGUgaW5zdGFuY2VvZiBFbGVtZW50ICYmICFfY2hlY2tWYWxpZE5hbWVzcGFjZShjdXJyZW50Tm9kZSkpIHtcbiAgICAgIF9mb3JjZVJlbW92ZShjdXJyZW50Tm9kZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLyogTWFrZSBzdXJlIHRoYXQgb2xkZXIgYnJvd3NlcnMgZG9uJ3QgZ2V0IGZhbGxiYWNrLXRhZyBtWFNTICovXG4gICAgaWYgKCh0YWdOYW1lID09PSAnbm9zY3JpcHQnIHx8IHRhZ05hbWUgPT09ICdub2VtYmVkJyB8fCB0YWdOYW1lID09PSAnbm9mcmFtZXMnKSAmJiByZWdFeHBUZXN0KC88XFwvbm8oc2NyaXB0fGVtYmVkfGZyYW1lcykvaSwgY3VycmVudE5vZGUuaW5uZXJIVE1MKSkge1xuICAgICAgX2ZvcmNlUmVtb3ZlKGN1cnJlbnROb2RlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvKiBTYW5pdGl6ZSBlbGVtZW50IGNvbnRlbnQgdG8gYmUgdGVtcGxhdGUtc2FmZSAqL1xuICAgIGlmIChTQUZFX0ZPUl9URU1QTEFURVMgJiYgY3VycmVudE5vZGUubm9kZVR5cGUgPT09IE5PREVfVFlQRS50ZXh0KSB7XG4gICAgICAvKiBHZXQgdGhlIGVsZW1lbnQncyB0ZXh0IGNvbnRlbnQgKi9cbiAgICAgIGNvbnRlbnQgPSBjdXJyZW50Tm9kZS50ZXh0Q29udGVudDtcbiAgICAgIGFycmF5Rm9yRWFjaChbTVVTVEFDSEVfRVhQUiwgRVJCX0VYUFIsIFRNUExJVF9FWFBSXSwgZXhwciA9PiB7XG4gICAgICAgIGNvbnRlbnQgPSBzdHJpbmdSZXBsYWNlKGNvbnRlbnQsIGV4cHIsICcgJyk7XG4gICAgICB9KTtcbiAgICAgIGlmIChjdXJyZW50Tm9kZS50ZXh0Q29udGVudCAhPT0gY29udGVudCkge1xuICAgICAgICBhcnJheVB1c2goRE9NUHVyaWZ5LnJlbW92ZWQsIHtcbiAgICAgICAgICBlbGVtZW50OiBjdXJyZW50Tm9kZS5jbG9uZU5vZGUoKVxuICAgICAgICB9KTtcbiAgICAgICAgY3VycmVudE5vZGUudGV4dENvbnRlbnQgPSBjb250ZW50O1xuICAgICAgfVxuICAgIH1cbiAgICAvKiBFeGVjdXRlIGEgaG9vayBpZiBwcmVzZW50ICovXG4gICAgX2V4ZWN1dGVIb29rcyhob29rcy5hZnRlclNhbml0aXplRWxlbWVudHMsIGN1cnJlbnROb2RlLCBudWxsKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIC8qKlxuICAgKiBfaXNWYWxpZEF0dHJpYnV0ZVxuICAgKlxuICAgKiBAcGFyYW0gbGNUYWcgTG93ZXJjYXNlIHRhZyBuYW1lIG9mIGNvbnRhaW5pbmcgZWxlbWVudC5cbiAgICogQHBhcmFtIGxjTmFtZSBMb3dlcmNhc2UgYXR0cmlidXRlIG5hbWUuXG4gICAqIEBwYXJhbSB2YWx1ZSBBdHRyaWJ1dGUgdmFsdWUuXG4gICAqIEByZXR1cm4gUmV0dXJucyB0cnVlIGlmIGB2YWx1ZWAgaXMgdmFsaWQsIG90aGVyd2lzZSBmYWxzZS5cbiAgICovXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb21wbGV4aXR5XG4gIGNvbnN0IF9pc1ZhbGlkQXR0cmlidXRlID0gZnVuY3Rpb24gX2lzVmFsaWRBdHRyaWJ1dGUobGNUYWcsIGxjTmFtZSwgdmFsdWUpIHtcbiAgICAvKiBNYWtlIHN1cmUgYXR0cmlidXRlIGNhbm5vdCBjbG9iYmVyICovXG4gICAgaWYgKFNBTklUSVpFX0RPTSAmJiAobGNOYW1lID09PSAnaWQnIHx8IGxjTmFtZSA9PT0gJ25hbWUnKSAmJiAodmFsdWUgaW4gZG9jdW1lbnQgfHwgdmFsdWUgaW4gZm9ybUVsZW1lbnQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8qIEFsbG93IHZhbGlkIGRhdGEtKiBhdHRyaWJ1dGVzOiBBdCBsZWFzdCBvbmUgY2hhcmFjdGVyIGFmdGVyIFwiLVwiXG4gICAgICAgIChodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9kb20uaHRtbCNlbWJlZGRpbmctY3VzdG9tLW5vbi12aXNpYmxlLWRhdGEtd2l0aC10aGUtZGF0YS0qLWF0dHJpYnV0ZXMpXG4gICAgICAgIFhNTC1jb21wYXRpYmxlIChodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9pbmZyYXN0cnVjdHVyZS5odG1sI3htbC1jb21wYXRpYmxlIGFuZCBodHRwOi8vd3d3LnczLm9yZy9UUi94bWwvI2QwZTgwNClcbiAgICAgICAgV2UgZG9uJ3QgbmVlZCB0byBjaGVjayB0aGUgdmFsdWU7IGl0J3MgYWx3YXlzIFVSSSBzYWZlLiAqL1xuICAgIGlmIChBTExPV19EQVRBX0FUVFIgJiYgIUZPUkJJRF9BVFRSW2xjTmFtZV0gJiYgcmVnRXhwVGVzdChEQVRBX0FUVFIsIGxjTmFtZSkpIDsgZWxzZSBpZiAoQUxMT1dfQVJJQV9BVFRSICYmIHJlZ0V4cFRlc3QoQVJJQV9BVFRSLCBsY05hbWUpKSA7IGVsc2UgaWYgKCFBTExPV0VEX0FUVFJbbGNOYW1lXSB8fCBGT1JCSURfQVRUUltsY05hbWVdKSB7XG4gICAgICBpZiAoXG4gICAgICAvLyBGaXJzdCBjb25kaXRpb24gZG9lcyBhIHZlcnkgYmFzaWMgY2hlY2sgaWYgYSkgaXQncyBiYXNpY2FsbHkgYSB2YWxpZCBjdXN0b20gZWxlbWVudCB0YWduYW1lIEFORFxuICAgICAgLy8gYikgaWYgdGhlIHRhZ05hbWUgcGFzc2VzIHdoYXRldmVyIHRoZSB1c2VyIGhhcyBjb25maWd1cmVkIGZvciBDVVNUT01fRUxFTUVOVF9IQU5ETElORy50YWdOYW1lQ2hlY2tcbiAgICAgIC8vIGFuZCBjKSBpZiB0aGUgYXR0cmlidXRlIG5hbWUgcGFzc2VzIHdoYXRldmVyIHRoZSB1c2VyIGhhcyBjb25maWd1cmVkIGZvciBDVVNUT01fRUxFTUVOVF9IQU5ETElORy5hdHRyaWJ1dGVOYW1lQ2hlY2tcbiAgICAgIF9pc0Jhc2ljQ3VzdG9tRWxlbWVudChsY1RhZykgJiYgKENVU1RPTV9FTEVNRU5UX0hBTkRMSU5HLnRhZ05hbWVDaGVjayBpbnN0YW5jZW9mIFJlZ0V4cCAmJiByZWdFeHBUZXN0KENVU1RPTV9FTEVNRU5UX0hBTkRMSU5HLnRhZ05hbWVDaGVjaywgbGNUYWcpIHx8IENVU1RPTV9FTEVNRU5UX0hBTkRMSU5HLnRhZ05hbWVDaGVjayBpbnN0YW5jZW9mIEZ1bmN0aW9uICYmIENVU1RPTV9FTEVNRU5UX0hBTkRMSU5HLnRhZ05hbWVDaGVjayhsY1RhZykpICYmIChDVVNUT01fRUxFTUVOVF9IQU5ETElORy5hdHRyaWJ1dGVOYW1lQ2hlY2sgaW5zdGFuY2VvZiBSZWdFeHAgJiYgcmVnRXhwVGVzdChDVVNUT01fRUxFTUVOVF9IQU5ETElORy5hdHRyaWJ1dGVOYW1lQ2hlY2ssIGxjTmFtZSkgfHwgQ1VTVE9NX0VMRU1FTlRfSEFORExJTkcuYXR0cmlidXRlTmFtZUNoZWNrIGluc3RhbmNlb2YgRnVuY3Rpb24gJiYgQ1VTVE9NX0VMRU1FTlRfSEFORExJTkcuYXR0cmlidXRlTmFtZUNoZWNrKGxjTmFtZSkpIHx8XG4gICAgICAvLyBBbHRlcm5hdGl2ZSwgc2Vjb25kIGNvbmRpdGlvbiBjaGVja3MgaWYgaXQncyBhbiBgaXNgLWF0dHJpYnV0ZSwgQU5EXG4gICAgICAvLyB0aGUgdmFsdWUgcGFzc2VzIHdoYXRldmVyIHRoZSB1c2VyIGhhcyBjb25maWd1cmVkIGZvciBDVVNUT01fRUxFTUVOVF9IQU5ETElORy50YWdOYW1lQ2hlY2tcbiAgICAgIGxjTmFtZSA9PT0gJ2lzJyAmJiBDVVNUT01fRUxFTUVOVF9IQU5ETElORy5hbGxvd0N1c3RvbWl6ZWRCdWlsdEluRWxlbWVudHMgJiYgKENVU1RPTV9FTEVNRU5UX0hBTkRMSU5HLnRhZ05hbWVDaGVjayBpbnN0YW5jZW9mIFJlZ0V4cCAmJiByZWdFeHBUZXN0KENVU1RPTV9FTEVNRU5UX0hBTkRMSU5HLnRhZ05hbWVDaGVjaywgdmFsdWUpIHx8IENVU1RPTV9FTEVNRU5UX0hBTkRMSU5HLnRhZ05hbWVDaGVjayBpbnN0YW5jZW9mIEZ1bmN0aW9uICYmIENVU1RPTV9FTEVNRU5UX0hBTkRMSU5HLnRhZ05hbWVDaGVjayh2YWx1ZSkpKSA7IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvKiBDaGVjayB2YWx1ZSBpcyBzYWZlLiBGaXJzdCwgaXMgYXR0ciBpbmVydD8gSWYgc28sIGlzIHNhZmUgKi9cbiAgICB9IGVsc2UgaWYgKFVSSV9TQUZFX0FUVFJJQlVURVNbbGNOYW1lXSkgOyBlbHNlIGlmIChyZWdFeHBUZXN0KElTX0FMTE9XRURfVVJJJDEsIHN0cmluZ1JlcGxhY2UodmFsdWUsIEFUVFJfV0hJVEVTUEFDRSwgJycpKSkgOyBlbHNlIGlmICgobGNOYW1lID09PSAnc3JjJyB8fCBsY05hbWUgPT09ICd4bGluazpocmVmJyB8fCBsY05hbWUgPT09ICdocmVmJykgJiYgbGNUYWcgIT09ICdzY3JpcHQnICYmIHN0cmluZ0luZGV4T2YodmFsdWUsICdkYXRhOicpID09PSAwICYmIERBVEFfVVJJX1RBR1NbbGNUYWddKSA7IGVsc2UgaWYgKEFMTE9XX1VOS05PV05fUFJPVE9DT0xTICYmICFyZWdFeHBUZXN0KElTX1NDUklQVF9PUl9EQVRBLCBzdHJpbmdSZXBsYWNlKHZhbHVlLCBBVFRSX1dISVRFU1BBQ0UsICcnKSkpIDsgZWxzZSBpZiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuICAvKipcbiAgICogX2lzQmFzaWNDdXN0b21FbGVtZW50XG4gICAqIGNoZWNrcyBpZiBhdCBsZWFzdCBvbmUgZGFzaCBpcyBpbmNsdWRlZCBpbiB0YWdOYW1lLCBhbmQgaXQncyBub3QgdGhlIGZpcnN0IGNoYXJcbiAgICogZm9yIG1vcmUgc29waGlzdGljYXRlZCBjaGVja2luZyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy92YWxpZGF0ZS1lbGVtZW50LW5hbWVcbiAgICpcbiAgICogQHBhcmFtIHRhZ05hbWUgbmFtZSBvZiB0aGUgdGFnIG9mIHRoZSBub2RlIHRvIHNhbml0aXplXG4gICAqIEByZXR1cm5zIFJldHVybnMgdHJ1ZSBpZiB0aGUgdGFnIG5hbWUgbWVldHMgdGhlIGJhc2ljIGNyaXRlcmlhIGZvciBhIGN1c3RvbSBlbGVtZW50LCBvdGhlcndpc2UgZmFsc2UuXG4gICAqL1xuICBjb25zdCBfaXNCYXNpY0N1c3RvbUVsZW1lbnQgPSBmdW5jdGlvbiBfaXNCYXNpY0N1c3RvbUVsZW1lbnQodGFnTmFtZSkge1xuICAgIHJldHVybiB0YWdOYW1lICE9PSAnYW5ub3RhdGlvbi14bWwnICYmIHN0cmluZ01hdGNoKHRhZ05hbWUsIENVU1RPTV9FTEVNRU5UKTtcbiAgfTtcbiAgLyoqXG4gICAqIF9zYW5pdGl6ZUF0dHJpYnV0ZXNcbiAgICpcbiAgICogQHByb3RlY3QgYXR0cmlidXRlc1xuICAgKiBAcHJvdGVjdCBub2RlTmFtZVxuICAgKiBAcHJvdGVjdCByZW1vdmVBdHRyaWJ1dGVcbiAgICogQHByb3RlY3Qgc2V0QXR0cmlidXRlXG4gICAqXG4gICAqIEBwYXJhbSBjdXJyZW50Tm9kZSB0byBzYW5pdGl6ZVxuICAgKi9cbiAgY29uc3QgX3Nhbml0aXplQXR0cmlidXRlcyA9IGZ1bmN0aW9uIF9zYW5pdGl6ZUF0dHJpYnV0ZXMoY3VycmVudE5vZGUpIHtcbiAgICAvKiBFeGVjdXRlIGEgaG9vayBpZiBwcmVzZW50ICovXG4gICAgX2V4ZWN1dGVIb29rcyhob29rcy5iZWZvcmVTYW5pdGl6ZUF0dHJpYnV0ZXMsIGN1cnJlbnROb2RlLCBudWxsKTtcbiAgICBjb25zdCB7XG4gICAgICBhdHRyaWJ1dGVzXG4gICAgfSA9IGN1cnJlbnROb2RlO1xuICAgIC8qIENoZWNrIGlmIHdlIGhhdmUgYXR0cmlidXRlczsgaWYgbm90IHdlIG1pZ2h0IGhhdmUgYSB0ZXh0IG5vZGUgKi9cbiAgICBpZiAoIWF0dHJpYnV0ZXMgfHwgX2lzQ2xvYmJlcmVkKGN1cnJlbnROb2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBob29rRXZlbnQgPSB7XG4gICAgICBhdHRyTmFtZTogJycsXG4gICAgICBhdHRyVmFsdWU6ICcnLFxuICAgICAga2VlcEF0dHI6IHRydWUsXG4gICAgICBhbGxvd2VkQXR0cmlidXRlczogQUxMT1dFRF9BVFRSLFxuICAgICAgZm9yY2VLZWVwQXR0cjogdW5kZWZpbmVkXG4gICAgfTtcbiAgICBsZXQgbCA9IGF0dHJpYnV0ZXMubGVuZ3RoO1xuICAgIC8qIEdvIGJhY2t3YXJkcyBvdmVyIGFsbCBhdHRyaWJ1dGVzOyBzYWZlbHkgcmVtb3ZlIGJhZCBvbmVzICovXG4gICAgd2hpbGUgKGwtLSkge1xuICAgICAgY29uc3QgYXR0ciA9IGF0dHJpYnV0ZXNbbF07XG4gICAgICBjb25zdCB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIG5hbWVzcGFjZVVSSSxcbiAgICAgICAgdmFsdWU6IGF0dHJWYWx1ZVxuICAgICAgfSA9IGF0dHI7XG4gICAgICBjb25zdCBsY05hbWUgPSB0cmFuc2Zvcm1DYXNlRnVuYyhuYW1lKTtcbiAgICAgIGNvbnN0IGluaXRWYWx1ZSA9IGF0dHJWYWx1ZTtcbiAgICAgIGxldCB2YWx1ZSA9IG5hbWUgPT09ICd2YWx1ZScgPyBpbml0VmFsdWUgOiBzdHJpbmdUcmltKGluaXRWYWx1ZSk7XG4gICAgICAvKiBFeGVjdXRlIGEgaG9vayBpZiBwcmVzZW50ICovXG4gICAgICBob29rRXZlbnQuYXR0ck5hbWUgPSBsY05hbWU7XG4gICAgICBob29rRXZlbnQuYXR0clZhbHVlID0gdmFsdWU7XG4gICAgICBob29rRXZlbnQua2VlcEF0dHIgPSB0cnVlO1xuICAgICAgaG9va0V2ZW50LmZvcmNlS2VlcEF0dHIgPSB1bmRlZmluZWQ7IC8vIEFsbG93cyBkZXZlbG9wZXJzIHRvIHNlZSB0aGlzIGlzIGEgcHJvcGVydHkgdGhleSBjYW4gc2V0XG4gICAgICBfZXhlY3V0ZUhvb2tzKGhvb2tzLnVwb25TYW5pdGl6ZUF0dHJpYnV0ZSwgY3VycmVudE5vZGUsIGhvb2tFdmVudCk7XG4gICAgICB2YWx1ZSA9IGhvb2tFdmVudC5hdHRyVmFsdWU7XG4gICAgICAvKiBGdWxsIERPTSBDbG9iYmVyaW5nIHByb3RlY3Rpb24gdmlhIG5hbWVzcGFjZSBpc29sYXRpb24sXG4gICAgICAgKiBQcmVmaXggaWQgYW5kIG5hbWUgYXR0cmlidXRlcyB3aXRoIGB1c2VyLWNvbnRlbnQtYFxuICAgICAgICovXG4gICAgICBpZiAoU0FOSVRJWkVfTkFNRURfUFJPUFMgJiYgKGxjTmFtZSA9PT0gJ2lkJyB8fCBsY05hbWUgPT09ICduYW1lJykpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBhdHRyaWJ1dGUgd2l0aCB0aGlzIHZhbHVlXG4gICAgICAgIF9yZW1vdmVBdHRyaWJ1dGUobmFtZSwgY3VycmVudE5vZGUpO1xuICAgICAgICAvLyBQcmVmaXggdGhlIHZhbHVlIGFuZCBsYXRlciByZS1jcmVhdGUgdGhlIGF0dHJpYnV0ZSB3aXRoIHRoZSBzYW5pdGl6ZWQgdmFsdWVcbiAgICAgICAgdmFsdWUgPSBTQU5JVElaRV9OQU1FRF9QUk9QU19QUkVGSVggKyB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIC8qIFdvcmsgYXJvdW5kIGEgc2VjdXJpdHkgaXNzdWUgd2l0aCBjb21tZW50cyBpbnNpZGUgYXR0cmlidXRlcyAqL1xuICAgICAgaWYgKFNBRkVfRk9SX1hNTCAmJiByZWdFeHBUZXN0KC8oKC0tIT98XSk+KXw8XFwvKHN0eWxlfHRpdGxlKS9pLCB2YWx1ZSkpIHtcbiAgICAgICAgX3JlbW92ZUF0dHJpYnV0ZShuYW1lLCBjdXJyZW50Tm9kZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLyogRGlkIHRoZSBob29rcyBhcHByb3ZlIG9mIHRoZSBhdHRyaWJ1dGU/ICovXG4gICAgICBpZiAoaG9va0V2ZW50LmZvcmNlS2VlcEF0dHIpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvKiBEaWQgdGhlIGhvb2tzIGFwcHJvdmUgb2YgdGhlIGF0dHJpYnV0ZT8gKi9cbiAgICAgIGlmICghaG9va0V2ZW50LmtlZXBBdHRyKSB7XG4gICAgICAgIF9yZW1vdmVBdHRyaWJ1dGUobmFtZSwgY3VycmVudE5vZGUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8qIFdvcmsgYXJvdW5kIGEgc2VjdXJpdHkgaXNzdWUgaW4galF1ZXJ5IDMuMCAqL1xuICAgICAgaWYgKCFBTExPV19TRUxGX0NMT1NFX0lOX0FUVFIgJiYgcmVnRXhwVGVzdCgvXFwvPi9pLCB2YWx1ZSkpIHtcbiAgICAgICAgX3JlbW92ZUF0dHJpYnV0ZShuYW1lLCBjdXJyZW50Tm9kZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLyogU2FuaXRpemUgYXR0cmlidXRlIGNvbnRlbnQgdG8gYmUgdGVtcGxhdGUtc2FmZSAqL1xuICAgICAgaWYgKFNBRkVfRk9SX1RFTVBMQVRFUykge1xuICAgICAgICBhcnJheUZvckVhY2goW01VU1RBQ0hFX0VYUFIsIEVSQl9FWFBSLCBUTVBMSVRfRVhQUl0sIGV4cHIgPT4ge1xuICAgICAgICAgIHZhbHVlID0gc3RyaW5nUmVwbGFjZSh2YWx1ZSwgZXhwciwgJyAnKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAvKiBJcyBgdmFsdWVgIHZhbGlkIGZvciB0aGlzIGF0dHJpYnV0ZT8gKi9cbiAgICAgIGNvbnN0IGxjVGFnID0gdHJhbnNmb3JtQ2FzZUZ1bmMoY3VycmVudE5vZGUubm9kZU5hbWUpO1xuICAgICAgaWYgKCFfaXNWYWxpZEF0dHJpYnV0ZShsY1RhZywgbGNOYW1lLCB2YWx1ZSkpIHtcbiAgICAgICAgX3JlbW92ZUF0dHJpYnV0ZShuYW1lLCBjdXJyZW50Tm9kZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLyogSGFuZGxlIGF0dHJpYnV0ZXMgdGhhdCByZXF1aXJlIFRydXN0ZWQgVHlwZXMgKi9cbiAgICAgIGlmICh0cnVzdGVkVHlwZXNQb2xpY3kgJiYgdHlwZW9mIHRydXN0ZWRUeXBlcyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHRydXN0ZWRUeXBlcy5nZXRBdHRyaWJ1dGVUeXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGlmIChuYW1lc3BhY2VVUkkpIDsgZWxzZSB7XG4gICAgICAgICAgc3dpdGNoICh0cnVzdGVkVHlwZXMuZ2V0QXR0cmlidXRlVHlwZShsY1RhZywgbGNOYW1lKSkge1xuICAgICAgICAgICAgY2FzZSAnVHJ1c3RlZEhUTUwnOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0cnVzdGVkVHlwZXNQb2xpY3kuY3JlYXRlSFRNTCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ1RydXN0ZWRTY3JpcHRVUkwnOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0cnVzdGVkVHlwZXNQb2xpY3kuY3JlYXRlU2NyaXB0VVJMKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLyogSGFuZGxlIGludmFsaWQgZGF0YS0qIGF0dHJpYnV0ZSBzZXQgYnkgdHJ5LWNhdGNoaW5nIGl0ICovXG4gICAgICBpZiAodmFsdWUgIT09IGluaXRWYWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChuYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgICAgIGN1cnJlbnROb2RlLnNldEF0dHJpYnV0ZU5TKG5hbWVzcGFjZVVSSSwgbmFtZSwgdmFsdWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvKiBGYWxsYmFjayB0byBzZXRBdHRyaWJ1dGUoKSBmb3IgYnJvd3Nlci11bnJlY29nbml6ZWQgbmFtZXNwYWNlcyBlLmcuIFwieC1zY2hlbWFcIi4gKi9cbiAgICAgICAgICAgIGN1cnJlbnROb2RlLnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChfaXNDbG9iYmVyZWQoY3VycmVudE5vZGUpKSB7XG4gICAgICAgICAgICBfZm9yY2VSZW1vdmUoY3VycmVudE5vZGUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcnJheVBvcChET01QdXJpZnkucmVtb3ZlZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgX3JlbW92ZUF0dHJpYnV0ZShuYW1lLCBjdXJyZW50Tm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLyogRXhlY3V0ZSBhIGhvb2sgaWYgcHJlc2VudCAqL1xuICAgIF9leGVjdXRlSG9va3MoaG9va3MuYWZ0ZXJTYW5pdGl6ZUF0dHJpYnV0ZXMsIGN1cnJlbnROb2RlLCBudWxsKTtcbiAgfTtcbiAgLyoqXG4gICAqIF9zYW5pdGl6ZVNoYWRvd0RPTVxuICAgKlxuICAgKiBAcGFyYW0gZnJhZ21lbnQgdG8gaXRlcmF0ZSBvdmVyIHJlY3Vyc2l2ZWx5XG4gICAqL1xuICBjb25zdCBfc2FuaXRpemVTaGFkb3dET00gPSBmdW5jdGlvbiBfc2FuaXRpemVTaGFkb3dET00oZnJhZ21lbnQpIHtcbiAgICBsZXQgc2hhZG93Tm9kZSA9IG51bGw7XG4gICAgY29uc3Qgc2hhZG93SXRlcmF0b3IgPSBfY3JlYXRlTm9kZUl0ZXJhdG9yKGZyYWdtZW50KTtcbiAgICAvKiBFeGVjdXRlIGEgaG9vayBpZiBwcmVzZW50ICovXG4gICAgX2V4ZWN1dGVIb29rcyhob29rcy5iZWZvcmVTYW5pdGl6ZVNoYWRvd0RPTSwgZnJhZ21lbnQsIG51bGwpO1xuICAgIHdoaWxlIChzaGFkb3dOb2RlID0gc2hhZG93SXRlcmF0b3IubmV4dE5vZGUoKSkge1xuICAgICAgLyogRXhlY3V0ZSBhIGhvb2sgaWYgcHJlc2VudCAqL1xuICAgICAgX2V4ZWN1dGVIb29rcyhob29rcy51cG9uU2FuaXRpemVTaGFkb3dOb2RlLCBzaGFkb3dOb2RlLCBudWxsKTtcbiAgICAgIC8qIFNhbml0aXplIHRhZ3MgYW5kIGVsZW1lbnRzICovXG4gICAgICBfc2FuaXRpemVFbGVtZW50cyhzaGFkb3dOb2RlKTtcbiAgICAgIC8qIENoZWNrIGF0dHJpYnV0ZXMgbmV4dCAqL1xuICAgICAgX3Nhbml0aXplQXR0cmlidXRlcyhzaGFkb3dOb2RlKTtcbiAgICAgIC8qIERlZXAgc2hhZG93IERPTSBkZXRlY3RlZCAqL1xuICAgICAgaWYgKHNoYWRvd05vZGUuY29udGVudCBpbnN0YW5jZW9mIERvY3VtZW50RnJhZ21lbnQpIHtcbiAgICAgICAgX3Nhbml0aXplU2hhZG93RE9NKHNoYWRvd05vZGUuY29udGVudCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8qIEV4ZWN1dGUgYSBob29rIGlmIHByZXNlbnQgKi9cbiAgICBfZXhlY3V0ZUhvb2tzKGhvb2tzLmFmdGVyU2FuaXRpemVTaGFkb3dET00sIGZyYWdtZW50LCBudWxsKTtcbiAgfTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbXBsZXhpdHlcbiAgRE9NUHVyaWZ5LnNhbml0aXplID0gZnVuY3Rpb24gKGRpcnR5KSB7XG4gICAgbGV0IGNmZyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDoge307XG4gICAgbGV0IGJvZHkgPSBudWxsO1xuICAgIGxldCBpbXBvcnRlZE5vZGUgPSBudWxsO1xuICAgIGxldCBjdXJyZW50Tm9kZSA9IG51bGw7XG4gICAgbGV0IHJldHVybk5vZGUgPSBudWxsO1xuICAgIC8qIE1ha2Ugc3VyZSB3ZSBoYXZlIGEgc3RyaW5nIHRvIHNhbml0aXplLlxuICAgICAgRE8gTk9UIHJldHVybiBlYXJseSwgYXMgdGhpcyB3aWxsIHJldHVybiB0aGUgd3JvbmcgdHlwZSBpZlxuICAgICAgdGhlIHVzZXIgaGFzIHJlcXVlc3RlZCBhIERPTSBvYmplY3QgcmF0aGVyIHRoYW4gYSBzdHJpbmcgKi9cbiAgICBJU19FTVBUWV9JTlBVVCA9ICFkaXJ0eTtcbiAgICBpZiAoSVNfRU1QVFlfSU5QVVQpIHtcbiAgICAgIGRpcnR5ID0gJzwhLS0+JztcbiAgICB9XG4gICAgLyogU3RyaW5naWZ5LCBpbiBjYXNlIGRpcnR5IGlzIGFuIG9iamVjdCAqL1xuICAgIGlmICh0eXBlb2YgZGlydHkgIT09ICdzdHJpbmcnICYmICFfaXNOb2RlKGRpcnR5KSkge1xuICAgICAgaWYgKHR5cGVvZiBkaXJ0eS50b1N0cmluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBkaXJ0eSA9IGRpcnR5LnRvU3RyaW5nKCk7XG4gICAgICAgIGlmICh0eXBlb2YgZGlydHkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgdHlwZUVycm9yQ3JlYXRlKCdkaXJ0eSBpcyBub3QgYSBzdHJpbmcsIGFib3J0aW5nJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IHR5cGVFcnJvckNyZWF0ZSgndG9TdHJpbmcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLyogUmV0dXJuIGRpcnR5IEhUTUwgaWYgRE9NUHVyaWZ5IGNhbm5vdCBydW4gKi9cbiAgICBpZiAoIURPTVB1cmlmeS5pc1N1cHBvcnRlZCkge1xuICAgICAgcmV0dXJuIGRpcnR5O1xuICAgIH1cbiAgICAvKiBBc3NpZ24gY29uZmlnIHZhcnMgKi9cbiAgICBpZiAoIVNFVF9DT05GSUcpIHtcbiAgICAgIF9wYXJzZUNvbmZpZyhjZmcpO1xuICAgIH1cbiAgICAvKiBDbGVhbiB1cCByZW1vdmVkIGVsZW1lbnRzICovXG4gICAgRE9NUHVyaWZ5LnJlbW92ZWQgPSBbXTtcbiAgICAvKiBDaGVjayBpZiBkaXJ0eSBpcyBjb3JyZWN0bHkgdHlwZWQgZm9yIElOX1BMQUNFICovXG4gICAgaWYgKHR5cGVvZiBkaXJ0eSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIElOX1BMQUNFID0gZmFsc2U7XG4gICAgfVxuICAgIGlmIChJTl9QTEFDRSkge1xuICAgICAgLyogRG8gc29tZSBlYXJseSBwcmUtc2FuaXRpemF0aW9uIHRvIGF2b2lkIHVuc2FmZSByb290IG5vZGVzICovXG4gICAgICBpZiAoZGlydHkubm9kZU5hbWUpIHtcbiAgICAgICAgY29uc3QgdGFnTmFtZSA9IHRyYW5zZm9ybUNhc2VGdW5jKGRpcnR5Lm5vZGVOYW1lKTtcbiAgICAgICAgaWYgKCFBTExPV0VEX1RBR1NbdGFnTmFtZV0gfHwgRk9SQklEX1RBR1NbdGFnTmFtZV0pIHtcbiAgICAgICAgICB0aHJvdyB0eXBlRXJyb3JDcmVhdGUoJ3Jvb3Qgbm9kZSBpcyBmb3JiaWRkZW4gYW5kIGNhbm5vdCBiZSBzYW5pdGl6ZWQgaW4tcGxhY2UnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZGlydHkgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAvKiBJZiBkaXJ0eSBpcyBhIERPTSBlbGVtZW50LCBhcHBlbmQgdG8gYW4gZW1wdHkgZG9jdW1lbnQgdG8gYXZvaWRcbiAgICAgICAgIGVsZW1lbnRzIGJlaW5nIHN0cmlwcGVkIGJ5IHRoZSBwYXJzZXIgKi9cbiAgICAgIGJvZHkgPSBfaW5pdERvY3VtZW50KCc8IS0tLS0+Jyk7XG4gICAgICBpbXBvcnRlZE5vZGUgPSBib2R5Lm93bmVyRG9jdW1lbnQuaW1wb3J0Tm9kZShkaXJ0eSwgdHJ1ZSk7XG4gICAgICBpZiAoaW1wb3J0ZWROb2RlLm5vZGVUeXBlID09PSBOT0RFX1RZUEUuZWxlbWVudCAmJiBpbXBvcnRlZE5vZGUubm9kZU5hbWUgPT09ICdCT0RZJykge1xuICAgICAgICAvKiBOb2RlIGlzIGFscmVhZHkgYSBib2R5LCB1c2UgYXMgaXMgKi9cbiAgICAgICAgYm9keSA9IGltcG9ydGVkTm9kZTtcbiAgICAgIH0gZWxzZSBpZiAoaW1wb3J0ZWROb2RlLm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgICAgYm9keSA9IGltcG9ydGVkTm9kZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSB1bmljb3JuL3ByZWZlci1kb20tbm9kZS1hcHBlbmRcbiAgICAgICAgYm9keS5hcHBlbmRDaGlsZChpbXBvcnRlZE5vZGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvKiBFeGl0IGRpcmVjdGx5IGlmIHdlIGhhdmUgbm90aGluZyB0byBkbyAqL1xuICAgICAgaWYgKCFSRVRVUk5fRE9NICYmICFTQUZFX0ZPUl9URU1QTEFURVMgJiYgIVdIT0xFX0RPQ1VNRU5UICYmXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgdW5pY29ybi9wcmVmZXItaW5jbHVkZXNcbiAgICAgIGRpcnR5LmluZGV4T2YoJzwnKSA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIHRydXN0ZWRUeXBlc1BvbGljeSAmJiBSRVRVUk5fVFJVU1RFRF9UWVBFID8gdHJ1c3RlZFR5cGVzUG9saWN5LmNyZWF0ZUhUTUwoZGlydHkpIDogZGlydHk7XG4gICAgICB9XG4gICAgICAvKiBJbml0aWFsaXplIHRoZSBkb2N1bWVudCB0byB3b3JrIG9uICovXG4gICAgICBib2R5ID0gX2luaXREb2N1bWVudChkaXJ0eSk7XG4gICAgICAvKiBDaGVjayB3ZSBoYXZlIGEgRE9NIG5vZGUgZnJvbSB0aGUgZGF0YSAqL1xuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHJldHVybiBSRVRVUk5fRE9NID8gbnVsbCA6IFJFVFVSTl9UUlVTVEVEX1RZUEUgPyBlbXB0eUhUTUwgOiAnJztcbiAgICAgIH1cbiAgICB9XG4gICAgLyogUmVtb3ZlIGZpcnN0IGVsZW1lbnQgbm9kZSAob3VycykgaWYgRk9SQ0VfQk9EWSBpcyBzZXQgKi9cbiAgICBpZiAoYm9keSAmJiBGT1JDRV9CT0RZKSB7XG4gICAgICBfZm9yY2VSZW1vdmUoYm9keS5maXJzdENoaWxkKTtcbiAgICB9XG4gICAgLyogR2V0IG5vZGUgaXRlcmF0b3IgKi9cbiAgICBjb25zdCBub2RlSXRlcmF0b3IgPSBfY3JlYXRlTm9kZUl0ZXJhdG9yKElOX1BMQUNFID8gZGlydHkgOiBib2R5KTtcbiAgICAvKiBOb3cgc3RhcnQgaXRlcmF0aW5nIG92ZXIgdGhlIGNyZWF0ZWQgZG9jdW1lbnQgKi9cbiAgICB3aGlsZSAoY3VycmVudE5vZGUgPSBub2RlSXRlcmF0b3IubmV4dE5vZGUoKSkge1xuICAgICAgLyogU2FuaXRpemUgdGFncyBhbmQgZWxlbWVudHMgKi9cbiAgICAgIF9zYW5pdGl6ZUVsZW1lbnRzKGN1cnJlbnROb2RlKTtcbiAgICAgIC8qIENoZWNrIGF0dHJpYnV0ZXMgbmV4dCAqL1xuICAgICAgX3Nhbml0aXplQXR0cmlidXRlcyhjdXJyZW50Tm9kZSk7XG4gICAgICAvKiBTaGFkb3cgRE9NIGRldGVjdGVkLCBzYW5pdGl6ZSBpdCAqL1xuICAgICAgaWYgKGN1cnJlbnROb2RlLmNvbnRlbnQgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gICAgICAgIF9zYW5pdGl6ZVNoYWRvd0RPTShjdXJyZW50Tm9kZS5jb250ZW50KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLyogSWYgd2Ugc2FuaXRpemVkIGBkaXJ0eWAgaW4tcGxhY2UsIHJldHVybiBpdC4gKi9cbiAgICBpZiAoSU5fUExBQ0UpIHtcbiAgICAgIHJldHVybiBkaXJ0eTtcbiAgICB9XG4gICAgLyogUmV0dXJuIHNhbml0aXplZCBzdHJpbmcgb3IgRE9NICovXG4gICAgaWYgKFJFVFVSTl9ET00pIHtcbiAgICAgIGlmIChSRVRVUk5fRE9NX0ZSQUdNRU5UKSB7XG4gICAgICAgIHJldHVybk5vZGUgPSBjcmVhdGVEb2N1bWVudEZyYWdtZW50LmNhbGwoYm9keS5vd25lckRvY3VtZW50KTtcbiAgICAgICAgd2hpbGUgKGJvZHkuZmlyc3RDaGlsZCkge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSB1bmljb3JuL3ByZWZlci1kb20tbm9kZS1hcHBlbmRcbiAgICAgICAgICByZXR1cm5Ob2RlLmFwcGVuZENoaWxkKGJvZHkuZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybk5vZGUgPSBib2R5O1xuICAgICAgfVxuICAgICAgaWYgKEFMTE9XRURfQVRUUi5zaGFkb3dyb290IHx8IEFMTE9XRURfQVRUUi5zaGFkb3dyb290bW9kZSkge1xuICAgICAgICAvKlxuICAgICAgICAgIEFkb3B0Tm9kZSgpIGlzIG5vdCB1c2VkIGJlY2F1c2UgaW50ZXJuYWwgc3RhdGUgaXMgbm90IHJlc2V0XG4gICAgICAgICAgKGUuZy4gdGhlIHBhc3QgbmFtZXMgbWFwIG9mIGEgSFRNTEZvcm1FbGVtZW50KSwgdGhpcyBpcyBzYWZlXG4gICAgICAgICAgaW4gdGhlb3J5IGJ1dCB3ZSB3b3VsZCByYXRoZXIgbm90IHJpc2sgYW5vdGhlciBhdHRhY2sgdmVjdG9yLlxuICAgICAgICAgIFRoZSBzdGF0ZSB0aGF0IGlzIGNsb25lZCBieSBpbXBvcnROb2RlKCkgaXMgZXhwbGljaXRseSBkZWZpbmVkXG4gICAgICAgICAgYnkgdGhlIHNwZWNzLlxuICAgICAgICAqL1xuICAgICAgICByZXR1cm5Ob2RlID0gaW1wb3J0Tm9kZS5jYWxsKG9yaWdpbmFsRG9jdW1lbnQsIHJldHVybk5vZGUsIHRydWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldHVybk5vZGU7XG4gICAgfVxuICAgIGxldCBzZXJpYWxpemVkSFRNTCA9IFdIT0xFX0RPQ1VNRU5UID8gYm9keS5vdXRlckhUTUwgOiBib2R5LmlubmVySFRNTDtcbiAgICAvKiBTZXJpYWxpemUgZG9jdHlwZSBpZiBhbGxvd2VkICovXG4gICAgaWYgKFdIT0xFX0RPQ1VNRU5UICYmIEFMTE9XRURfVEFHU1snIWRvY3R5cGUnXSAmJiBib2R5Lm93bmVyRG9jdW1lbnQgJiYgYm9keS5vd25lckRvY3VtZW50LmRvY3R5cGUgJiYgYm9keS5vd25lckRvY3VtZW50LmRvY3R5cGUubmFtZSAmJiByZWdFeHBUZXN0KERPQ1RZUEVfTkFNRSwgYm9keS5vd25lckRvY3VtZW50LmRvY3R5cGUubmFtZSkpIHtcbiAgICAgIHNlcmlhbGl6ZWRIVE1MID0gJzwhRE9DVFlQRSAnICsgYm9keS5vd25lckRvY3VtZW50LmRvY3R5cGUubmFtZSArICc+XFxuJyArIHNlcmlhbGl6ZWRIVE1MO1xuICAgIH1cbiAgICAvKiBTYW5pdGl6ZSBmaW5hbCBzdHJpbmcgdGVtcGxhdGUtc2FmZSAqL1xuICAgIGlmIChTQUZFX0ZPUl9URU1QTEFURVMpIHtcbiAgICAgIGFycmF5Rm9yRWFjaChbTVVTVEFDSEVfRVhQUiwgRVJCX0VYUFIsIFRNUExJVF9FWFBSXSwgZXhwciA9PiB7XG4gICAgICAgIHNlcmlhbGl6ZWRIVE1MID0gc3RyaW5nUmVwbGFjZShzZXJpYWxpemVkSFRNTCwgZXhwciwgJyAnKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1c3RlZFR5cGVzUG9saWN5ICYmIFJFVFVSTl9UUlVTVEVEX1RZUEUgPyB0cnVzdGVkVHlwZXNQb2xpY3kuY3JlYXRlSFRNTChzZXJpYWxpemVkSFRNTCkgOiBzZXJpYWxpemVkSFRNTDtcbiAgfTtcbiAgRE9NUHVyaWZ5LnNldENvbmZpZyA9IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgY2ZnID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiB7fTtcbiAgICBfcGFyc2VDb25maWcoY2ZnKTtcbiAgICBTRVRfQ09ORklHID0gdHJ1ZTtcbiAgfTtcbiAgRE9NUHVyaWZ5LmNsZWFyQ29uZmlnID0gZnVuY3Rpb24gKCkge1xuICAgIENPTkZJRyA9IG51bGw7XG4gICAgU0VUX0NPTkZJRyA9IGZhbHNlO1xuICB9O1xuICBET01QdXJpZnkuaXNWYWxpZEF0dHJpYnV0ZSA9IGZ1bmN0aW9uICh0YWcsIGF0dHIsIHZhbHVlKSB7XG4gICAgLyogSW5pdGlhbGl6ZSBzaGFyZWQgY29uZmlnIHZhcnMgaWYgbmVjZXNzYXJ5LiAqL1xuICAgIGlmICghQ09ORklHKSB7XG4gICAgICBfcGFyc2VDb25maWcoe30pO1xuICAgIH1cbiAgICBjb25zdCBsY1RhZyA9IHRyYW5zZm9ybUNhc2VGdW5jKHRhZyk7XG4gICAgY29uc3QgbGNOYW1lID0gdHJhbnNmb3JtQ2FzZUZ1bmMoYXR0cik7XG4gICAgcmV0dXJuIF9pc1ZhbGlkQXR0cmlidXRlKGxjVGFnLCBsY05hbWUsIHZhbHVlKTtcbiAgfTtcbiAgRE9NUHVyaWZ5LmFkZEhvb2sgPSBmdW5jdGlvbiAoZW50cnlQb2ludCwgaG9va0Z1bmN0aW9uKSB7XG4gICAgaWYgKHR5cGVvZiBob29rRnVuY3Rpb24gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXJyYXlQdXNoKGhvb2tzW2VudHJ5UG9pbnRdLCBob29rRnVuY3Rpb24pO1xuICB9O1xuICBET01QdXJpZnkucmVtb3ZlSG9vayA9IGZ1bmN0aW9uIChlbnRyeVBvaW50LCBob29rRnVuY3Rpb24pIHtcbiAgICBpZiAoaG9va0Z1bmN0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGluZGV4ID0gYXJyYXlMYXN0SW5kZXhPZihob29rc1tlbnRyeVBvaW50XSwgaG9va0Z1bmN0aW9uKTtcbiAgICAgIHJldHVybiBpbmRleCA9PT0gLTEgPyB1bmRlZmluZWQgOiBhcnJheVNwbGljZShob29rc1tlbnRyeVBvaW50XSwgaW5kZXgsIDEpWzBdO1xuICAgIH1cbiAgICByZXR1cm4gYXJyYXlQb3AoaG9va3NbZW50cnlQb2ludF0pO1xuICB9O1xuICBET01QdXJpZnkucmVtb3ZlSG9va3MgPSBmdW5jdGlvbiAoZW50cnlQb2ludCkge1xuICAgIGhvb2tzW2VudHJ5UG9pbnRdID0gW107XG4gIH07XG4gIERPTVB1cmlmeS5yZW1vdmVBbGxIb29rcyA9IGZ1bmN0aW9uICgpIHtcbiAgICBob29rcyA9IF9jcmVhdGVIb29rc01hcCgpO1xuICB9O1xuICByZXR1cm4gRE9NUHVyaWZ5O1xufVxudmFyIHB1cmlmeSA9IGNyZWF0ZURPTVB1cmlmeSgpO1xuXG5leHBvcnQgeyBwdXJpZnkgYXMgZGVmYXVsdCB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHVyaWZ5LmVzLm1qcy5tYXBcbiIsImltcG9ydCB7IGNyZWF0ZUVsZW1lbnQsIEZyYWdtZW50LCB1c2VDYWxsYmFjaywgdXNlTWVtbywgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IGh0bWwycGRmIGZyb20gXCJodG1sMnBkZi5qc1wiO1xuaW1wb3J0IERPTVB1cmlmeSBmcm9tIFwiZG9tcHVyaWZ5XCI7XG5pbXBvcnQgeyBJbmRpdU1YUERGRXhwb3J0ZXJDb250YWluZXJQcm9wcyB9IGZyb20gXCIuLi90eXBpbmdzL0luZGl1TVhQREZFeHBvcnRlclByb3BzXCI7XG5cbmltcG9ydCBcIi4vdWkvSW5kaXVNWFBERkV4cG9ydGVyLmNzc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gSW5kaXVNWFBERkV4cG9ydGVyKHByb3BzOiBJbmRpdU1YUERGRXhwb3J0ZXJDb250YWluZXJQcm9wcyk6IEpTWC5FbGVtZW50IHtcbiAgY29uc3QgW2J1c3ksIHNldEJ1c3ldID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBidG5SZWYgPSB1c2VSZWY8SFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsPihudWxsKTtcblxuICBjb25zdCBtYXBwaW5ncyA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IGxpc3Q6IEFycmF5PHsgc2VsZWN0b3I6IHN0cmluZzsgaHRtbD86IHN0cmluZyB9PiA9IFtdO1xuICAgIGlmIChwcm9wcy5yaWNoU2VsZWN0b3IxICYmIHByb3BzLnJpY2hIdG1sMT8udmFsdWUpIGxpc3QucHVzaCh7IHNlbGVjdG9yOiBwcm9wcy5yaWNoU2VsZWN0b3IxLCBodG1sOiBwcm9wcy5yaWNoSHRtbDEudmFsdWUgfSk7XG4gICAgaWYgKHByb3BzLnJpY2hTZWxlY3RvcjIgJiYgcHJvcHMucmljaEh0bWwyPy52YWx1ZSkgbGlzdC5wdXNoKHsgc2VsZWN0b3I6IHByb3BzLnJpY2hTZWxlY3RvcjIsIGh0bWw6IHByb3BzLnJpY2hIdG1sMi52YWx1ZSB9KTtcbiAgICBpZiAocHJvcHMucmljaFNlbGVjdG9yMyAmJiBwcm9wcy5yaWNoSHRtbDM/LnZhbHVlKSBsaXN0LnB1c2goeyBzZWxlY3RvcjogcHJvcHMucmljaFNlbGVjdG9yMywgaHRtbDogcHJvcHMucmljaEh0bWwzLnZhbHVlIH0pO1xuICAgIHJldHVybiBsaXN0O1xuICB9LCBbcHJvcHMucmljaFNlbGVjdG9yMSwgcHJvcHMucmljaEh0bWwxPy52YWx1ZSwgcHJvcHMucmljaFNlbGVjdG9yMiwgcHJvcHMucmljaEh0bWwyPy52YWx1ZSwgcHJvcHMucmljaFNlbGVjdG9yMywgcHJvcHMucmljaEh0bWwzPy52YWx1ZV0pO1xuXG4gIGNvbnN0IGRvRXhwb3J0ID0gdXNlQ2FsbGJhY2soYXN5bmMgKCkgPT4ge1xuICAgIGlmIChidXN5KSByZXR1cm47XG4gICAgc2V0QnVzeSh0cnVlKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgLiR7cHJvcHMudGFyZ2V0Q2xhc3N9YCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgaWYgKCF0YXJnZXQpIHRocm93IG5ldyBFcnJvcihgUGRmRXhwb3J0ZXJQbHVzOiBubyBlbGVtZW50IHdpdGggY2xhc3MgLiR7cHJvcHMudGFyZ2V0Q2xhc3N9IGZvdW5kIG9uIHRoZSBwYWdlLmApO1xuXG4gICAgICAvLyBDbG9uZSBub2RlIHRvIGF2b2lkIG11dGF0aW5nIGxpdmUgVUlcbiAgICAgIGNvbnN0IGNsb25lID0gdGFyZ2V0LmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcblxuICAgICAgLy8gU3RyaXAgaWZyYW1lcyBpbnNpZGUgY2xvbmUgKHRoZXkgd29uJ3QgcmVuZGVyIGFuZCBjYW4gdGFpbnQgY2FudmFzKVxuICAgICAgY2xvbmUucXVlcnlTZWxlY3RvckFsbChcImlmcmFtZVwiKS5mb3JFYWNoKGlmciA9PiBpZnIucmVwbGFjZVdpdGgoZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSkpO1xuXG4gICAgICAvLyBJbmxpbmUgUmljaCBUZXh0IEhUTUwgd2hlcmUgbWFwcGVkXG4gICAgICBmb3IgKGNvbnN0IG1hcCBvZiBtYXBwaW5ncykge1xuICAgICAgICBpZiAoIW1hcC5zZWxlY3RvciB8fCAhbWFwLmh0bWwpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBub2RlcyA9IGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwobWFwLnNlbGVjdG9yKTtcbiAgICAgICAgY29uc3QgY2xlYW4gPSBET01QdXJpZnkuc2FuaXRpemUobWFwLmh0bWwsIHsgVVNFX1BST0ZJTEVTOiB7IGh0bWw6IHRydWUgfSB9KTtcbiAgICAgICAgbm9kZXMuZm9yRWFjaChuID0+IHtcbiAgICAgICAgICAobiBhcyBIVE1MRWxlbWVudCkuaW5uZXJIVE1MID0gY2xlYW47XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBQcmVwYXJlIGFuIG9mZnNjcmVlbiBjb250YWluZXIgdG8gcmVuZGVyIGNsb25lIGZvciBQREZcbiAgICAgIGNvbnN0IGhvc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgaG9zdC5zdHlsZS5wb3NpdGlvbiA9IFwiZml4ZWRcIjtcbiAgICAgIGhvc3Quc3R5bGUubGVmdCA9IFwiLTk5OTk5cHhcIjtcbiAgICAgIGhvc3Quc3R5bGUudG9wID0gXCIwXCI7XG4gICAgICBob3N0LnN0eWxlLndpZHRoID0gdGFyZ2V0Lm9mZnNldFdpZHRoICsgXCJweFwiOyAvLyBrZWVwIHdpZHRocyBzdGFibGVcbiAgICAgIGhvc3QuYXBwZW5kQ2hpbGQoY2xvbmUpO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChob3N0KTtcblxuICAgICAgY29uc3QgZmlsZW5hbWUgPSAocHJvcHMuZmlsZU5hbWU/LnZhbHVlID8/IFwiZXhwb3J0XCIpLnJlcGxhY2UoL1tcXC86Kj9cIjw+fF0rL2csIFwiX1wiKTtcblxuICAgICAgLy8gTm9ybWFsaXplIG9wdGlvbnMgdG8gbWF0Y2ggaHRtbDJwZGYuanMgdHlwaW5nc1xuICAgICAgY29uc3QgbWFyZ2luTnVtYmVyID0gKCgpID0+IHtcbiAgICAgICAgY29uc3QgcmF3ID0gcHJvcHMucGFnZU1hcmdpbiA/PyBcIjEwXCI7IC8vIGFsbG93IFwiMTBtbVwiIG9yIFwiMTBcIlxuICAgICAgICBjb25zdCBuID0gcGFyc2VGbG9hdChTdHJpbmcocmF3KSk7XG4gICAgICAgIHJldHVybiBOdW1iZXIuaXNGaW5pdGUobikgPyBuIDogMTA7XG4gICAgICB9KSgpO1xuXG4gICAgICBjb25zdCBzY2FsZU51bWJlciA9ICgoKSA9PiB7XG4gICAgICAgIC8vIE1lbmRpeCBkZWNpbWFscyBjb21lIGluIGFzIEJpZy5qczsgY29lcmNlIHRvIG51bWJlclxuICAgICAgICBjb25zdCByYXcgPSAocHJvcHMuc2NhbGUgYXMgdW5rbm93bikgYXMgbnVtYmVyIHwgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBuID0gdHlwZW9mIHJhdyA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlRmxvYXQocmF3KSA6IE51bWJlcihyYXcpO1xuICAgICAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKG4pICYmIG4gPiAwID8gbiA6IDE7XG4gICAgICB9KSgpO1xuXG4gICAgICAvLyBodG1sMnBkZiBvcHRpb25zXG4gICAgICAvLyBVc2UgaHRtbDJwZGYgdG8gY3JlYXRlIHRoZSBQREYgYW5kIGFsc28gYWNjZXNzIHRoZSBCbG9iIGZvciBCYXNlNjQvcHJldmlld1xuICAgICAgY29uc3Qgb3B0ID0ge1xuICAgICAgICBtYXJnaW46IG1hcmdpbk51bWJlciwgLy8gbnVtYmVyIHBlciBodG1sMnBkZi5qcyBPcHRpb25zXG4gICAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZSxcbiAgICAgICAgaW1hZ2U6IHsgdHlwZTogXCJqcGVnXCIsIHF1YWxpdHk6IDAuOTUgfSxcbiAgICAgICAgaHRtbDJjYW52YXM6IHtcbiAgICAgICAgICBzY2FsZTogc2NhbGVOdW1iZXIsXG4gICAgICAgICAgdXNlQ09SUzogdHJ1ZSxcbiAgICAgICAgICBhbGxvd1RhaW50OiBmYWxzZSxcbiAgICAgICAgICBsb2dnaW5nOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBqc1BERjogeyB1bml0OiBcIm1tXCIsIGZvcm1hdDogXCJhNFwiLCBvcmllbnRhdGlvbjogXCJwb3J0cmFpdFwiIH1cbiAgICAgIH0gYXMgYW55OyAvLyBjYXN0IHRvIHJlbGF4IHN0cmljdCB0eXBpbmcgdnMuIGxpYnJhcnkgZGVmc1xuXG4gICAgICAvLyBCdWlsZCB0aGUgcGRmIGluc3RhbmNlIHNvIHdlIGNhbiBicmFuY2ggYmVoYXZpb3JcbiAgICAgIGNvbnN0IHdvcmtlciA9IGh0bWwycGRmKCkuZnJvbShjbG9uZSkuc2V0KG9wdCkudG9QZGYoKTtcbiAgICAgIGNvbnN0IGJsb2I6IEJsb2IgPSBhd2FpdCB3b3JrZXIub3V0cHV0KFwiYmxvYlwiKTtcblxuICAgICAgLy8gU2V0IGF0dHJpYnV0ZSB2YWx1ZXMgaWYgY29uZmlndXJlZFxuICAgICAgaWYgKHByb3BzLnBkZk5hbWVBdHRyICYmIHByb3BzLnBkZk5hbWVBdHRyLnNldFZhbHVlKSB7XG4gICAgICAgIHByb3BzLnBkZk5hbWVBdHRyLnNldFZhbHVlKGZpbGVuYW1lKTtcbiAgICAgIH1cblxuICAgICAgLy8gT3B0aW9uIGhhbmRsaW5nIG1pcnJvcmluZyB0aGUgbWFya2V0cGxhY2Ugd2lkZ2V0XG4gICAgICBjb25zdCBvcHRpb24gPSAocHJvcHMuZmlsZU9wdGlvbiA/PyBcImRvd25sb2FkXCIpIGFzIGFueTtcbiAgICAgIGlmIChvcHRpb24gPT09IFwiYmFzZTY0XCIpIHtcbiAgICAgICAgY29uc3QgYmFzZTY0ID0gYXdhaXQgbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgY29uc3QgZnIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICAgIGZyLm9uZXJyb3IgPSAoKSA9PiByZWplY3QoZnIuZXJyb3IpO1xuICAgICAgICAgIGZyLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgIC8vIGZyLnJlc3VsdCBpcyBhIGRhdGEgVVJMIGxpa2UgXCJkYXRhOmFwcGxpY2F0aW9uL3BkZjtiYXNlNjQsLi4uLlwiIOKGkiBzdG9yZSBvbmx5IHRoZSBiYXNlNjQgcGF5bG9hZFxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gU3RyaW5nKGZyLnJlc3VsdCA/PyBcIlwiKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbW1hSWR4ID0gcmVzdWx0LmluZGV4T2YoXCIsXCIpO1xuICAgICAgICAgICAgcmVzb2x2ZShjb21tYUlkeCA+PSAwID8gcmVzdWx0LnN1YnN0cmluZyhjb21tYUlkeCArIDEpIDogcmVzdWx0KTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGZyLnJlYWRBc0RhdGFVUkwoYmxvYik7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocHJvcHMuYmFzZTY0QXR0ciAmJiBwcm9wcy5iYXNlNjRBdHRyLnNldFZhbHVlKSB7XG4gICAgICAgICAgcHJvcHMuYmFzZTY0QXR0ci5zZXRWYWx1ZShiYXNlNjQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbiA9PT0gXCJwcmV2aWV3XCIpIHtcbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgd2luZG93Lm9wZW4odXJsLCBcIl9ibGFua1wiLCBcIm5vb3BlbmVyLG5vcmVmZXJyZXJcIik7XG4gICAgICAgIC8vIGRvIG5vdCByZXZva2UgaW1tZWRpYXRlbHnigJRsZXQgdGhlIG5ldyB0YWIgbG9hZDsgcmV2b2tlIG9uIHVubG9hZCBhdXRvbWF0aWNhbGx5XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpLCA2MF8wMDApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRGVmYXVsdDogRG93bmxvYWQgRmlsZVxuICAgICAgICBjb25zdCBkbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICBkbC5ocmVmID0gdXJsO1xuICAgICAgICBkbC5kb3dubG9hZCA9IGZpbGVuYW1lLmVuZHNXaXRoKFwiLnBkZlwiKSA/IGZpbGVuYW1lIDogYCR7ZmlsZW5hbWV9LnBkZmA7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZGwpO1xuICAgICAgICBkbC5jbGljaygpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGRsKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCksIDYwXzAwMCk7XG4gICAgICB9XG5cbiAgICAgIC8vIENsZWFuIHVwXG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGhvc3QpO1xuXG4gICAgICBpZiAocHJvcHMub25BZnRlckdlbmVyYXRlPy5jYW5FeGVjdXRlKSBwcm9wcy5vbkFmdGVyR2VuZXJhdGUuZXhlY3V0ZSgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgYWxlcnQoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRCdXN5KGZhbHNlKTtcbiAgICB9XG4gIH0sIFtidXN5LCBtYXBwaW5ncywgcHJvcHMudGFyZ2V0Q2xhc3MsIHByb3BzLmZpbGVOYW1lPy52YWx1ZSwgcHJvcHMucGFnZU1hcmdpbiwgcHJvcHMuc2NhbGUsIHByb3BzLm9uQWZ0ZXJHZW5lcmF0ZV0pO1xuXG4gIGlmIChwcm9wcy5oaWRlQnV0dG9uKSByZXR1cm4gPEZyYWdtZW50IC8+O1xuICByZXR1cm4gKFxuICAgIDxidXR0b24gcmVmPXtidG5SZWZ9IGNsYXNzTmFtZT17cHJvcHMuYnV0dG9uQ2xhc3MgPz8gXCJidG4gYnRuLXByaW1hcnlcIn0gZGlzYWJsZWQ9e2J1c3l9IG9uQ2xpY2s9e2RvRXhwb3J0fT5cbiAgICAgIHtidXN5ID8gXCJHZW5lcmF0aW5n4oCmXCIgOiBwcm9wcy5idXR0b25DYXB0aW9uPy52YWx1ZSA/PyBcIkRvd25sb2FkIFBERlwifVxuICAgIDwvYnV0dG9uPlxuICApO1xufVxuIl0sIm5hbWVzIjpbImVudHJpZXMiLCJzZXRQcm90b3R5cGVPZiIsImlzRnJvemVuIiwiZ2V0UHJvdG90eXBlT2YiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJPYmplY3QiLCJmcmVlemUiLCJzZWFsIiwiY3JlYXRlIiwiYXBwbHkiLCJjb25zdHJ1Y3QiLCJSZWZsZWN0IiwieCIsImZ1biIsInRoaXNWYWx1ZSIsImFyZ3MiLCJGdW5jIiwiYXJyYXlGb3JFYWNoIiwidW5hcHBseSIsIkFycmF5IiwicHJvdG90eXBlIiwiZm9yRWFjaCIsImFycmF5TGFzdEluZGV4T2YiLCJsYXN0SW5kZXhPZiIsImFycmF5UG9wIiwicG9wIiwiYXJyYXlQdXNoIiwicHVzaCIsImFycmF5U3BsaWNlIiwic3BsaWNlIiwic3RyaW5nVG9Mb3dlckNhc2UiLCJTdHJpbmciLCJ0b0xvd2VyQ2FzZSIsInN0cmluZ1RvU3RyaW5nIiwidG9TdHJpbmciLCJzdHJpbmdNYXRjaCIsIm1hdGNoIiwic3RyaW5nUmVwbGFjZSIsInJlcGxhY2UiLCJzdHJpbmdJbmRleE9mIiwiaW5kZXhPZiIsInN0cmluZ1RyaW0iLCJ0cmltIiwib2JqZWN0SGFzT3duUHJvcGVydHkiLCJoYXNPd25Qcm9wZXJ0eSIsInJlZ0V4cFRlc3QiLCJSZWdFeHAiLCJ0ZXN0IiwidHlwZUVycm9yQ3JlYXRlIiwidW5jb25zdHJ1Y3QiLCJUeXBlRXJyb3IiLCJmdW5jIiwidGhpc0FyZyIsImxhc3RJbmRleCIsIl9sZW4iLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJfa2V5IiwiX2xlbjIiLCJfa2V5MiIsImFkZFRvU2V0Iiwic2V0IiwiYXJyYXkiLCJ0cmFuc2Zvcm1DYXNlRnVuYyIsInVuZGVmaW5lZCIsImwiLCJlbGVtZW50IiwibGNFbGVtZW50IiwiY2xlYW5BcnJheSIsImluZGV4IiwiaXNQcm9wZXJ0eUV4aXN0IiwiY2xvbmUiLCJvYmplY3QiLCJuZXdPYmplY3QiLCJwcm9wZXJ0eSIsInZhbHVlIiwiaXNBcnJheSIsImNvbnN0cnVjdG9yIiwibG9va3VwR2V0dGVyIiwicHJvcCIsImRlc2MiLCJnZXQiLCJmYWxsYmFja1ZhbHVlIiwiRE9NUHVyaWZ5Il0sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE1BQU07RUFDSkEsT0FBTztFQUNQQyxjQUFjO0VBQ2RDLFFBQVE7RUFDUkMsY0FBYztBQUNkQyxFQUFBQSx3QkFBQUE7QUFDRCxDQUFBLEdBQUdDLE1BQU0sQ0FBQTtBQUVWLElBQUk7RUFBRUMsTUFBTTtFQUFFQyxJQUFJO0FBQUVDLEVBQUFBLE1BQUFBO0FBQU0sQ0FBRSxHQUFHSCxNQUFNLENBQUM7QUFDdEMsSUFBSTtFQUFFSSxLQUFLO0FBQUVDLEVBQUFBLFNBQUFBO0FBQVcsQ0FBQSxHQUFHLE9BQU9DLE9BQU8sS0FBSyxXQUFXLElBQUlBLE9BQU8sQ0FBQTtBQUVwRSxJQUFJLENBQUNMLE1BQU0sRUFBRTtBQUNYQSxFQUFBQSxNQUFNLEdBQUcsU0FBQUEsTUFBVUEsQ0FBQU0sQ0FBQyxFQUFBO0FBQ2xCLElBQUEsT0FBT0EsQ0FBQyxDQUFBO0FBQ1QsR0FBQSxDQUFBO0FBQ0gsQ0FBQTtBQUVBLElBQUksQ0FBQ0wsSUFBSSxFQUFFO0FBQ1RBLEVBQUFBLElBQUksR0FBRyxTQUFBQSxJQUFVQSxDQUFBSyxDQUFDLEVBQUE7QUFDaEIsSUFBQSxPQUFPQSxDQUFDLENBQUE7QUFDVCxHQUFBLENBQUE7QUFDSCxDQUFBO0FBRUEsSUFBSSxDQUFDSCxLQUFLLEVBQUU7RUFDVkEsS0FBSyxHQUFHLFNBQUFBLEtBQVVBLENBQUFJLEdBQUcsRUFBRUMsU0FBUyxFQUFFQyxJQUFJLEVBQUE7QUFDcEMsSUFBQSxPQUFPRixHQUFHLENBQUNKLEtBQUssQ0FB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QUE7QUFFQSxFQUFBLE9BQU9BLGFBQWEsQ0FBQTtBQUN0QixDQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUN0TU0sU0FBVSxrQkFBa0IsQ0FBQyxLQUF1QyxFQUFBO0lBQ3hFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3hDLElBQUEsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUEyQixJQUFJLENBQUMsQ0FBQztBQUV0RCxJQUFBLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxNQUFLO1FBQzVCLE1BQU0sSUFBSSxHQUErQyxFQUFFLENBQUM7UUFDNUQsSUFBSSxLQUFLLENBQUMsYUFBYSxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSztBQUFFLFlBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDN0gsSUFBSSxLQUFLLENBQUMsYUFBYSxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSztBQUFFLFlBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDN0gsSUFBSSxLQUFLLENBQUMsYUFBYSxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSztBQUFFLFlBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7QUFDN0gsUUFBQSxPQUFPLElBQUksQ0FBQztBQUNkLEtBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUU1SSxJQUFBLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxZQUFXO0FBQ3RDLFFBQUEsSUFBSSxJQUFJO1lBQUUsT0FBTztRQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDZCxRQUFBLElBQUk7QUFDRixZQUFBLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBSSxDQUFBLEVBQUEsS0FBSyxDQUFDLFdBQVcsQ0FBRSxDQUFBLENBQXVCLENBQUM7QUFDckYsWUFBQSxJQUFJLENBQUMsTUFBTTtnQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLENBQUEsd0NBQUEsRUFBMkMsS0FBSyxDQUFDLFdBQVcsQ0FBcUIsbUJBQUEsQ0FBQSxDQUFDLENBQUM7O1lBR2hILE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFnQixDQUFDOztZQUdwRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUdoRyxZQUFBLEtBQUssTUFBTSxHQUFHLElBQUksUUFBUSxFQUFFO2dCQUMxQixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJO29CQUFFLFNBQVM7Z0JBQ3pDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sS0FBSyxHQUFHQyxNQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzdFLGdCQUFBLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFHO0FBQ2Ysb0JBQUEsQ0FBaUIsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0FBQ3ZDLGlCQUFDLENBQUMsQ0FBQzthQUNKOztZQUdELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDM0MsWUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7QUFDOUIsWUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUM7QUFDN0IsWUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7QUFDckIsWUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztBQUM3QyxZQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDeEIsWUFBQSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUVoQyxZQUFBLE1BQU0sUUFBUSxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksUUFBUSxFQUFFLE9BQU8sQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUM7O0FBR25GLFlBQUEsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFLO2dCQUN6QixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQztnQkFDckMsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLGdCQUFBLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO2FBQ3BDLEdBQUcsQ0FBQztBQUVMLFlBQUEsTUFBTSxXQUFXLEdBQUcsQ0FBQyxNQUFLOztBQUV4QixnQkFBQSxNQUFNLEdBQUcsR0FBSSxLQUFLLENBQUMsS0FBZ0QsQ0FBQztnQkFDcEUsTUFBTSxDQUFDLEdBQUcsT0FBTyxHQUFHLEtBQUssUUFBUSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbEUsZ0JBQUEsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUM1QyxHQUFHLENBQUM7OztBQUlMLFlBQUEsTUFBTSxHQUFHLEdBQUc7Z0JBQ1YsTUFBTSxFQUFFLFlBQVk7QUFDcEIsZ0JBQUEsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtBQUN0QyxnQkFBQSxXQUFXLEVBQUU7QUFDWCxvQkFBQSxLQUFLLEVBQUUsV0FBVztBQUNsQixvQkFBQSxPQUFPLEVBQUUsSUFBSTtBQUNiLG9CQUFBLFVBQVUsRUFBRSxLQUFLO0FBQ2pCLG9CQUFBLE9BQU8sRUFBRSxLQUFLO0FBQ2YsaUJBQUE7QUFDRCxnQkFBQSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRTtBQUN0RCxhQUFBLENBQUM7O0FBR1QsWUFBQSxNQUFNLE1BQU0sR0FBRyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3ZELE1BQU0sSUFBSSxHQUFTLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzs7WUFHL0MsSUFBSSxLQUFLLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFO0FBQ25ELGdCQUFBLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ3RDOztZQUdELE1BQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksVUFBVSxDQUFRLENBQUM7QUFDdkQsWUFBQSxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7Z0JBQ3ZCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxLQUFJO0FBQzNELG9CQUFBLE1BQU0sRUFBRSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUM7QUFDNUIsb0JBQUEsRUFBRSxDQUFDLE9BQU8sR0FBRyxNQUFNLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDcEMsb0JBQUEsRUFBRSxDQUFDLE1BQU0sR0FBRyxNQUFLOzt3QkFFZixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsQ0FBQzt3QkFDdkMsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDckMsT0FBTyxDQUFDLFFBQVEsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7QUFDbkUscUJBQUMsQ0FBQztBQUNGLG9CQUFBLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDekIsaUJBQUMsQ0FBQyxDQUFDO2dCQUNILElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtBQUNqRCxvQkFBQSxLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDbkM7YUFDRjtBQUFNLGlCQUFBLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtnQkFDL0IsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixDQUFDLENBQUM7O0FBRWxELGdCQUFBLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDcEQ7aUJBQU07O2dCQUVMLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEMsZ0JBQUEsRUFBRSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7QUFDZCxnQkFBQSxFQUFFLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsUUFBUSxHQUFHLENBQUcsRUFBQSxRQUFRLE1BQU0sQ0FBQztBQUN2RSxnQkFBQSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDOUIsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ1gsZ0JBQUEsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDOUIsZ0JBQUEsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNwRDs7QUFHRCxZQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRWhDLFlBQUEsSUFBSSxLQUFLLENBQUMsZUFBZSxFQUFFLFVBQVU7QUFBRSxnQkFBQSxLQUFLLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ3hFO1FBQUMsT0FBTyxDQUFDLEVBQUU7O0FBRVYsWUFBQSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLFlBQUEsS0FBSyxDQUFFLENBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUM3QjtnQkFBUztZQUNSLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNoQjtBQUNILEtBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFFckgsSUFBSSxLQUFLLENBQUMsVUFBVTtRQUFFLE9BQU8sYUFBQSxDQUFDLFFBQVEsRUFBQSxJQUFBLENBQUcsQ0FBQztBQUMxQyxJQUFBLFFBQ0UsYUFBUSxDQUFBLFFBQUEsRUFBQSxFQUFBLEdBQUcsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxXQUFXLElBQUksaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxJQUN0RyxJQUFJLEdBQUcsYUFBYSxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsS0FBSyxJQUFJLGNBQWMsQ0FDN0QsRUFDVDtBQUNKOzs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswXX0=
