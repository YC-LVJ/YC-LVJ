const path = require('path');
const { serialize, fs, yaml } = require('hydrooj');
const nunjucks = require('nunjucks');
const jsesc = require('jsesc');
const argv = require('cac')().parse();
const { findFileSync } = require('@hydrooj/utils/lib/utils');
const status = require('@hydrooj/utils/lib/status');
const markdown = require('./markdown');
const { xss, ensureTag } = require('./markdown-it-xss');
const misc = require('./misc');

const { buildContent, avatar } = global.Hydro.lib;

let { template } = argv.options;
if (template && typeof template !== 'string') template = findFileSync('@hydrooj/ui-default/templates');
else template &&= findFileSync(template);

class Loader extends nunjucks.Loader {
  getSource(name) {
    const src = global.Hydro.ui.template[name];
    const ref = global.Hydro.ui.template[`${name}.source`];
    if (!process.env.DEV) {
      if (!src) throw new Error(`Cannot get template ${name}`);
      return {
        src,
        path: name,
        noCache: false,
      };
    }
    let fullpath = null;
    const p = path.resolve(template, name);
    if (fs.existsSync(p)) fullpath = p;
    if (!fullpath && ref && fs.existsSync(ref)) fullpath = ref;
    if (!fullpath) {
      if (src) {
        return {
          src,
          path: name,
          noCache: true,
        };
      }
      throw new Error(`Cannot get template ${name}`);
    }
    return {
      src: fs.readFileSync(fullpath, 'utf-8'),
      path: fullpath,
      noCache: true,
    };
  }
}

const replacer = (k, v) => {
  if (k.startsWith('_') && k !== '_id') return undefined;
  if (typeof v === 'bigint') return `BigInt::${v.toString()}`;
  return v;
};

class Nunjucks extends nunjucks.Environment {
  constructor() {
    super(new Loader(), { autoescape: true, trimBlocks: true });
    this.addFilter('await', async (promise, callback) => {
      try {
        const result = await promise;
        callback(null, result);
      } catch (error) {
        callback(error);
      }
    }, true);
    this.addFilter('json', (self) => (self ? JSON.stringify(self, replacer) : ''));
    this.addFilter('parseYaml', (self) => yaml.load(self));
    this.addFilter('dumpYaml', (self) => yaml.dump(self));
    this.addFilter('serialize', (self, ignoreFunction = true) => serialize(self, { ignoreFunction }));
    this.addFilter('assign', (self, data) => Object.assign(self, data));
    this.addFilter('markdown', (self, html = false) => ensureTag(markdown.render(self, html)));
    this.addFilter('markdownInline', (self, html = false) => ensureTag(markdown.renderInline(self, html)));
    this.addFilter('ansi', (self) => misc.ansiToHtml(self));
    this.addFilter('base64_encode', (s) => Buffer.from(s).toString('base64'));
    this.addFilter('base64_decode', (s) => Buffer.from(s, 'base64').toString());
    this.addFilter('jsesc', (self) => jsesc(self, { isScriptContext: true }));
    this.addFilter('bitand', (self, val) => self & val);
    this.addFilter('toString', (self) => (typeof self === 'string' ? self : JSON.stringify(self, replacer)));
    this.addFilter('content', (content, language, html) => {
      let s = '';
      try {
        s = JSON.parse(content);
      } catch {
        s = content;
      }
      if (typeof s === 'object' && !(s instanceof Array)) {
        const langs = Object.keys(s);
        const f = langs.filter((i) => i.startsWith(language));
        if (s[language]) s = s[language];
        else if (f.length) s = s[f[0]];
        else s = s[langs[0]];
      }
      if (s instanceof Array) s = buildContent(s, html ? 'html' : 'markdown', (str) => str.translate(language));
      return ensureTag(html ? xss.process(s) : markdown.render(s));
    });
    this.addFilter('contentLang', (content) => {
      let s = '';
      try {
        s = JSON.parse(content);
      } catch {
        s = content;
      }
      if (typeof s === 'object' && !(s instanceof Array)) {
        return Object.keys(s);
      }
      return [];
    });
    this.addFilter('log', (self) => {
      console.log(self);
      return self;
    });

    // Luogu-style difficulty mappings
    const PROBLEMS_DIFFICULTY = [
      '暂无评定',
      '入门',
      '普及-',
      '普及/提高-',
      '普及+/提高',
      '提高+/省选-',
      '省选/NOI-',
      'NOI/NOI+',
      'NOI+/CSTC',
      'NOI+/CSTC',
      'NOI+/CSTC',
    ];
    const PROBLEMS_DIFFICULTY_SHORT = [
      '无',
      '入门',
      '普及-',
      '提高-',
      '提高',
      '省选-',
      '省选',
      'NOI',
      'NOI+',
      'NOI+',
      'NOI+',
    ];
    const rgb = (r, g, b) => `#${r.toString(16).padStart(2, '0')}${g.toString(16)}${b.toString(16)}`;
    const PROBLEMS_DIFFICULTY_COLOR = {
      0: rgb(191, 191, 191),
      1: rgb(254, 76, 97),
      2: rgb(243, 156, 17),
      3: rgb(255, 193, 22),
      4: rgb(82, 196, 26),
      5: rgb(52, 152, 219),
      6: rgb(157, 61, 207),
      7: rgb(14, 29, 105),
      8: rgb(14, 29, 105),
      9: rgb(14, 29, 105),
      10: rgb(14, 29, 105),
    };
    const clampLevel = (lv) => {
      lv = Number(lv);
      if (!Number.isFinite(lv)) lv = 0;
      if (lv < 0) lv = 0;
      if (lv > 10) lv = 10;
      return Math.round(lv);
    };
    const difficultyLabel = (lv) => PROBLEMS_DIFFICULTY[clampLevel(lv)];
    const difficultyLabelShort = (lv) => PROBLEMS_DIFFICULTY_SHORT[clampLevel(lv)];
    const difficultyColor = (lv) => PROBLEMS_DIFFICULTY_COLOR[clampLevel(lv)];
    this.addGlobal('difficultyLabel', difficultyLabel);
    this.addGlobal('difficultyLabelShort', difficultyLabelShort);
    this.addGlobal('difficultyColor', difficultyColor);
  }
}
nunjucks.runtime.memberLookup = function memberLookup(obj, val) {
  if ((obj || {})._original) obj = obj._original;
  if (obj === undefined || obj === null) return undefined;
  if (typeof obj[val] === 'function') {
    const fn = function (...args) {
      return obj[val].call(obj, ...args);
    };
    fn._original = obj[val];
    return fn;
  }
  return obj[val];
};
const env = new Nunjucks();
env.addGlobal('static_url', (assetName) => {
  // DEPRECATED
  const cdnPrefix = process.env.DEV ? '/' : global.Hydro.model.system.get('server.cdn');
  return `${cdnPrefix}${assetName}`;
});
// eslint-disable-next-line no-eval
env.addGlobal('eval', eval);
env.addGlobal('Date', Date);
env.addGlobal('Object', Object);
env.addGlobal('String', String);
env.addGlobal('Array', Array);
env.addGlobal('Math', Math);
env.addGlobal('process', process);
env.addGlobal('global', global);
env.addGlobal('typeof', (o) => typeof o);
env.addGlobal('instanceof', (a, b) => a instanceof b);
env.addGlobal('paginate', misc.paginate);
env.addGlobal('size', misc.size);
env.addGlobal('utils', { status });
env.addGlobal('avatarUrl', avatar);
env.addGlobal('formatSeconds', misc.formatSeconds);
env.addGlobal('lib', global.Hydro.lib);
env.addGlobal('model', global.Hydro.model);
env.addGlobal('ui', global.Hydro.ui);
env.addGlobal('isIE', (str) => {
  if (!str) return false;
  if (['MSIE', 'rv:11.0'].some((i) => str.includes(i))) return true;
  if (str.includes('Chrome/') && +str.split('Chrome/')[1].split('.')[0] < 60) return true;
  return false;
});
env.addGlobal('set', (obj, key, val) => {
  if (val !== undefined) obj[key] = val;
  else Object.assign(obj, key);
  return '';
});
env.addGlobal('findSubModule', (prefix) => Object.keys(global.Hydro.ui.template).filter((n) => n.startsWith(prefix)));
env.addGlobal('templateExists', (name) => !!global.Hydro.ui.template[name]);

async function render(name, state) {
  return await new Promise((resolve, reject) => {
    env.render(name, {
      page_name: name.split('.')[0],
      ...state,
      formatJudgeTexts: (texts) => texts.map((text) => {
        if (typeof text === 'string') return text;
        return state._(text.message).format(...text.params || []) + ((process.env.DEV && text.stack) ? `\n${text.stack}` : '');
      }).join('\n'),
      datetimeSpan: (arg0, arg1, arg2) => misc.datetimeSpan(arg0, arg1, arg2, state.handler.user?.timeZone),
      perm: global.Hydro.model.builtin.PERM,
      PRIV: global.Hydro.model.builtin.PRIV,
      STATUS: global.Hydro.model.builtin.STATUS,
      UiContext: state.handler?.UiContext || {},
    }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

module.exports = render;

global.Hydro.lib.template = { render };
