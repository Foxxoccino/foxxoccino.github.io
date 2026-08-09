const physicalKeys = [
  ["s", "S"], ["w", "C"], ["x", "Z"], ["d", "H"], ["e", "L"], ["c", "F"],
  ["f", "G"], ["r", "D"], ["v", "B"], ["g", "K"], ["t", "T"], ["b", "P"],
  ["j", "I"], ["u", "U"], ["m", "V"], [" ", "A"], ["k", "N"], ["i", "R"],
  ["l", "E"], ["o", "O"],
];

const validationRules = [
  /^([bpm])([iu]|a|i?e|o|[ae]i|i?ao|[oi]u|i?an|[ie]n|[ei]ng|ang|ong)$/,
  /^([fw])(u|a|o|[ae]i|ao|ou|an|en|eng|ang|ong)$/,
  /^([dt])([iu]|i?a|i?e|uo|[aeu]i|i?ao|[oi]u|[iu]?an|[ue]n|[ei]ng|ang|ong)$/,
  /^([nl])([iuv]|i?a|[iv]?e|u?o|[aeu]i|i?ao|[oi]u|[iu]?an|[iue]n|[ei]ng|i?ang|ong)$/,
  /^([gkh])(u|u?a|e|uo|u?ai|[ue]i|ao|ou|u?an|[ue]n|eng|u?ang|ong)$/,
  /^([zcs]h?|r)([iu]|u?a|e|uo|u?ai|[ue]i|ao|ou|u?an|[ue]n|eng|u?ang|ong)$/,
  /^([jqxy])([iu]|i?a|[iu]?e|o|i?ao|[oi]u|[iu]?an|[iu]n|ing|i?ang|i?ong)$/,
  /^([aeo]|[ae]i|ao|ou|[ae]ng?|er)$/,
];

function translit(value, from, to) {
  return value.replace(new RegExp(`[${from}]`, "g"), (char) => to[from.indexOf(char)]);
}

// Mirrors the official combo_pinyin_layouts.yaml algebra and validator.
function decodeChord(code) {
  if (code === "A") return null; // Space alone remains an ordinary space.
  let value = code;
  value = value.replace(/^ZF/, "zh").replace(/^CL/, "ch").replace(/^FB/, "m").replace(/^LD/, "n").replace(/^HG/, "r");
  value = translit(value, "BPFDTLGKHZCS", "bpfdtlgkhzcs");
  value = value.replace(/^([nlzcs])(IRO|VNE)$/, "$1ong");
  value = value.replace(/^[gz]([IV])/, "j$1").replace(/^[kc]([IV])/, "q$1").replace(/^[hs]([IV])/, "x$1");
  value = value.replace(/^R$/, "er").replace(/^([zcsr]h?)R?$/, "$1i");
  value = value.replace(/ANE$/, "ang").replace(/UARO$/, "uang").replace(/IRO$/, "iong").replace(/URO$/, "ong");
  value = value.replace(/VNE$/, "iong").replace(/UNE$/, "ong").replace(/INE$/, "ing").replace(/NE$/, "eng");
  value = value.replace(/AN$/, "an").replace(/VN$/, "vn").replace(/UN$/, "uen").replace(/IN$/, "in").replace(/N$/, "en");
  value = value.replace(/IAR$/, "iao").replace(/IR$/, "iou").replace(/UR$/, "uei").replace(/AO$/, "ao");
  value = value.replace(/RO$/, "ou").replace(/AR$/, "ai").replace(/RE?$/, "ei").replace(/AE$/, "a");
  value = translit(value, "AOEIUV", "aoeiuv");
  value = value.replace(/^i(ng?)$/, "yi$1").replace(/^i$/, "yi").replace(/^i/, "y");
  value = value.replace(/^ong$/, "weng").replace(/^u$/, "wu").replace(/^u/, "w").replace(/^v/, "yu").replace(/^([jqx])v/, "$1u");
  value = value.replace(/^([bpmf])uo$/, "$1o").replace(/^([dtngkhzcsr]h?)o$/, "$1uo").replace(/io$/, "iao");
  value = value.replace(/^([nl])uei$/, "$1ei").replace(/^([nl])iong$/, "$1ong");
  value = value.replace(/^([zcsr]h?)i([aoe])/, "$1$2").replace(/^([zcsr]h?)i(ng?)$/, "$1e$2");
  value = value.replace(/iou$/, "iu").replace(/uei$/, "ui").replace(/uen$/, "un");
  value = value.replace(/^([bpf])$/, "$1u").replace(/^([mdtnlgkh])$/, "$1e");
  return validationRules.some((rule) => rule.test(value)) ? value : null;
}

const defaultFinalPairs = [
  ["B", "BU"], ["P", "PU"], ["F", "FU"], ["FB", "FBE"],
  ["D", "DE"], ["T", "TE"], ["L", "LE"], ["LD", "LDE"],
  ["G", "GE"], ["K", "KE"], ["H", "HE"],
  ["ZF", "ZFR"], ["CL", "CLR"], ["SH", "SHR"], ["HG", "HGR"],
  ["Z", "ZR"], ["C", "CR"], ["S", "SR"],
];

function documentedAliasLabel(sound, primaryCode, optionCode) {
  if (defaultFinalPairs.some(([short, full]) =>
    (primaryCode === short && optionCode === full) || (primaryCode === full && optionCode === short)
  )) return primaryCode.length < optionCode.length ? "完整" : "缺省";
  if (sound.endsWith("ei") && (optionCode === `${primaryCode}E` || primaryCode === `${optionCode}E`)) {
    return primaryCode.length < optionCode.length ? "完整" : "通借";
  }
  const borrowedNgPairs = [
    [primaryCode.replace(/URO$/, "UNE"), primaryCode],
    [primaryCode.replace(/UARO$/, "UANE"), primaryCode],
    [primaryCode.replace(/IRO$/, "VNE"), primaryCode],
  ];
  if (borrowedNgPairs.some(([full, borrowed]) => full !== borrowed && optionCode === full)) return "完整";
  return null;
}

function enumerateSyllables() {
  const candidates = new Map();
  function visit(start, chosen) {
    if (chosen.length) {
      const code = chosen.map((i) => physicalKeys[i][1]).join("");
      const sound = decodeChord(code);
      if (sound) {
        const keys = chosen.map((i) => physicalKeys[i][0]);
        if (!candidates.has(sound)) candidates.set(sound, []);
        candidates.get(sound).push({ sound, keys, code });
      }
    }
    if (chosen.length === 6) return;
    for (let i = start; i < physicalKeys.length; i += 1) visit(i + 1, [...chosen, i]);
  }
  visit(0, []);
  return [...candidates.entries()].map(([sound, options]) => {
    const jqx = /^(j|q|x)/.test(sound);
    const initialRank = (code) => {
      if (sound.startsWith("zh")) return /^ZF/.test(code) ? 0 : 1;
      if (sound.startsWith("ch")) return /^CL/.test(code) ? 0 : 1;
      if (!jqx) return 0;
      if (/^[GKH]/.test(code)) return 0;
      if (/^[ZCS]/.test(code)) return 1;
      return 2;
    };
    const finalRank = (code) => /(?:URO|UARO|IRO)$/.test(code) ? 0 : 1;
    options.sort((a, b) =>
      a.keys.length - b.keys.length ||
      initialRank(a.code) - initialRank(b.code) ||
      finalRank(a.code) - finalRank(b.code) ||
      a.code.localeCompare(b.code)
    );
    const primary = options[0];
    const alternatives = options.filter((option) => {
      if (option.code === primary.code) return false;
      if (jqx && option.keys.length === primary.keys.length && /^[ZCS]/.test(option.code)) return true;
      return Boolean(documentedAliasLabel(sound, primary.code, option.code));
    }).map((option) => ({
      ...option,
      label: documentedAliasLabel(sound, primary.code, option.code) || "兼容",
    })).slice(0, 2);
    return { ...primary, alternatives };
  }).sort((a, b) => a.sound.localeCompare(b.sound, "en"));
}

// Mainland Putonghua whitelist from the linked 汉语拼音音节列表, intersected
// with syllables encodable by combo_pinyin 3.0. Taiwan-only yai/lüan and the
// independent ê syllable are excluded.
const mainlandSyllables = new Set(`
a ai an ang ao ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu
ca cai can cang cao ce cei cen ceng cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo ci cong cou cu cuan cui cun cuo
da dai dan dang dao de dei den deng di dia dian diao die ding diu dong dou du duan dui dun duo
e ei en eng er fa fan fang fei fen feng fo fou fu
ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo
ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo
ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun
ka kai kan kang kao ke kei ken keng kong kou ku kua kuai kuan kuang kui kun kuo
la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu lo long lou lu luan lun luo lv lve
ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu
na nai nan nang nao ne nei nen neng ni nia nian niang niao nie nin ning niu nong nou nu nuan nun nuo nv nve
o ou pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu
qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun
ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo
sa sai san sang sao se sei sen seng sha shai shan shang shao she shei shen sheng shi shong shou shu shua shuai shuan shuang shui shun shuo si song sou su suan sui sun suo
ta tai tan tang tao te tei teng ti tian tiao tie ting tong tou tu tuan tui tun tuo
wa wai wan wang wei wen weng wo wu
xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun
ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun
za zai zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo
`.trim().split(/\s+/));

const allSyllables = enumerateSyllables().filter((item) => mainlandSyllables.has(item.sound));
const starter = {
  basicInitials: [
    ["b", ["v"], "B"], ["p", ["b"], "P"], ["f", ["c"], "F"],
    ["d", ["r"], "D"], ["t", ["t"], "T"], ["l", ["e"], "L"],
    ["g", ["f"], "G"], ["k", ["g"], "K"], ["h", ["d"], "H"],
    ["z", ["x"], "Z"], ["c", ["w"], "C"], ["s", ["s"], "S"],
  ],
  chordInitials: [
    ["m", ["c", "v"], "FB"], ["n", ["e", "r"], "LD"], ["r", ["d", "f"], "HG"],
    ["zh", ["x", "c"], "ZF"], ["ch", ["w", "e"], "CL"], ["sh", ["s", "d"], "SH"],
  ],
};

function lessonItems(list) {
  return list.map(([sound, keys, code, extra = {}]) => ({ sound, keys, code, ...extra }));
}

function select(regex) {
  return allSyllables.filter((item) => regex.test(item.sound));
}

function orderedSyllables(sounds) {
  return sounds.map((sound) => allSyllables.find((item) => item.sound === sound)).filter(Boolean);
}

const pandaInitials = lessonItems([
  ["b", ["v"], "B", { alternatives: [{ keys: ["v", "u"], code: "BU", label: "完整" }], note: "声母单击缺省为 ⟨bu⟩" }],
  ["p", ["b"], "P", { alternatives: [{ keys: ["b", "u"], code: "PU", label: "完整" }], note: "声母单击缺省为 ⟨pu⟩" }],
  ["m", ["c", "v"], "FB", { alternatives: [{ keys: ["c", "v", "l"], code: "FBE", label: "完整" }], note: "声母单击缺省为 ⟨me⟩" }],
  ["f", ["c"], "F", { alternatives: [{ keys: ["c", "u"], code: "FU", label: "完整" }], note: "声母单击缺省为 ⟨fu⟩" }],
  ["d", ["r"], "D", { alternatives: [{ keys: ["r", "l"], code: "DE", label: "完整" }], note: "声母单击缺省为 ⟨de⟩" }],
  ["t", ["t"], "T", { alternatives: [{ keys: ["t", "l"], code: "TE", label: "完整" }], note: "声母单击缺省为 ⟨te⟩" }],
  ["n", ["e", "r"], "LD", { alternatives: [{ keys: ["e", "r", "l"], code: "LDE", label: "完整" }], note: "声母单击缺省为 ⟨ne⟩" }],
  ["l", ["e"], "L", { alternatives: [{ keys: ["e", "l"], code: "LE", label: "完整" }], note: "声母单击缺省为 ⟨le⟩" }],
  ["g", ["f"], "G", { alternatives: [{ keys: ["f", "l"], code: "GE", label: "完整" }], note: "声母单击缺省为 ⟨ge⟩" }],
  ["k", ["g"], "K", { alternatives: [{ keys: ["g", "l"], code: "KE", label: "完整" }], note: "声母单击缺省为 ⟨ke⟩" }],
  ["h", ["d"], "H", { alternatives: [{ keys: ["d", "l"], code: "HE", label: "完整" }], note: "声母单击缺省为 ⟨he⟩" }],
  ["j", ["f"], "G", { alternatives: [{ keys: ["x"], code: "Z", label: "兼容" }], note: "仅练声母键位；输入完整音节时须同时并击韵母" }],
  ["q", ["g"], "K", { alternatives: [{ keys: ["w"], code: "C", label: "兼容" }], note: "仅练声母键位；输入完整音节时须同时并击韵母" }],
  ["x", ["d"], "H", { alternatives: [{ keys: ["s"], code: "S", label: "兼容" }], note: "仅练声母键位；输入完整音节时须同时并击韵母" }],
  ["zh", ["x", "c"], "ZF", { alternatives: [{ keys: ["x", "c", "i"], code: "ZFR", label: "完整" }], note: "声母单击缺省为 ⟨zhi⟩" }],
  ["ch", ["w", "e"], "CL", { alternatives: [{ keys: ["w", "e", "i"], code: "CLR", label: "完整" }], note: "声母单击缺省为 ⟨chi⟩" }],
  ["sh", ["s", "d"], "SH", { alternatives: [{ keys: ["s", "d", "i"], code: "SHR", label: "完整" }], note: "声母单击缺省为 ⟨shi⟩" }],
  ["r", ["d", "f"], "HG", { alternatives: [{ keys: ["d", "f", "i"], code: "HGR", label: "完整" }], note: "声母单击缺省为 ⟨ri⟩" }],
  ["z", ["x"], "Z", { alternatives: [{ keys: ["x", "i"], code: "ZR", label: "完整" }], note: "声母单击缺省为 ⟨zi⟩" }],
  ["c", ["w"], "C", { alternatives: [{ keys: ["w", "i"], code: "CR", label: "完整" }], note: "声母单击缺省为 ⟨ci⟩" }],
  ["s", ["s"], "S", { alternatives: [{ keys: ["s", "i"], code: "SR", label: "完整" }], note: "声母单击缺省为 ⟨si⟩" }],
  ["y", ["j"], "I", { note: "零声母拼写：单击 [I] 输入 ⟨yi⟩" }],
  ["w", ["u"], "U", { note: "零声母拼写：单击 [U] 输入 ⟨wu⟩" }],
]);

const pandaFinals = lessonItems([
  ["a", [" ", "l"], "AE", { section: "单韵母" }], ["o", ["o"], "O", { section: "单韵母" }],
  ["e", ["l"], "E", { section: "单韵母" }], ["i", ["j"], "I", { section: "单韵母" }],
  ["u", ["u"], "U", { section: "单韵母" }], ["v", ["m"], "V", { section: "单韵母" }],
  ["ai", [" ", "i"], "AR", { section: "复韵母" }],
  ["ei", ["i", "l"], "RE", { section: "复韵母", note: "[R] 单用是 ⟨er⟩；仅与 b/p/m/f/d/t/n/l/g/k/h 相拼时可借作 ei" }],
  ["ui", ["u", "i"], "UR", { section: "复韵母" }], ["ao", [" ", "o"], "AO", { section: "复韵母" }],
  ["ou", ["i", "o"], "RO", { section: "复韵母" }], ["iu", ["j", "i"], "IR", { section: "复韵母" }],
  ["ie", ["j", "l"], "IE", { section: "复韵母" }], ["ve", ["m", "l"], "VE", { section: "复韵母" }],
  ["er", ["i"], "R", { section: "复韵母" }],
  ["an", [" ", "k"], "AN", { section: "前鼻韵母" }], ["en", ["k"], "N", { section: "前鼻韵母" }],
  ["in", ["j", "k"], "IN", { section: "前鼻韵母" }], ["un", ["u", "k"], "UN", { section: "前鼻韵母" }],
  ["vn", ["m", "k"], "VN", { section: "前鼻韵母" }],
  ["ang", [" ", "k", "l"], "ANE", { section: "后鼻韵母" }], ["eng", ["k", "l"], "NE", { section: "后鼻韵母" }],
  ["ing", ["j", "k", "l"], "INE", { section: "后鼻韵母" }],
  ["ong", ["u", "i", "o"], "URO", { section: "后鼻韵母", alternatives: [{ keys: ["u", "k", "l"], code: "UNE", label: "完整" }], note: "[RO] 通借为 -ng；[URO] 与 [UNE] 都可触发" }],
]);

const pandaWholeSyllables = orderedSyllables([
  "zhi", "chi", "shi", "ri", "zi", "ci", "si", "yi", "wu", "yu", "ye", "yue", "yuan", "yin", "yun", "ying",
]);

const courses = [
  { id: "panda-initials", title: "拼音表 · 声母", subtitle: "23个 · Panda顺序", items: pandaInitials },
  { id: "panda-finals", title: "拼音表 · 韵母", subtitle: "单韵母、复韵母与鼻韵母", items: pandaFinals },
  { id: "panda-whole", title: "拼音表 · 整体认读", subtitle: "16个整体认读音节", items: pandaWholeSyllables },
  { id: "initial-basic", title: "基础声母", subtitle: "12 个单键声母", items: pandaInitials.filter((item) => ["b", "p", "f", "d", "t", "l", "g", "k", "h", "z", "c", "s"].includes(item.sound)) },
  { id: "initial-chord", title: "并击声母", subtitle: "m n r 与翘舌音", items: pandaInitials.filter((item) => ["m", "n", "r", "zh", "ch", "sh"].includes(item.sound)) },
  { id: "jqx", title: "舌面音", subtitle: "j q x 与 i / ü", items: select(/^(j|q|x)/) },
  { id: "zero", title: "零声母音节", subtitle: "a o e 与 y / w 音节", items: select(/^[aeoyw]/) },
  { id: "bpmf", title: "唇音音节", subtitle: "b p m f", items: select(/^(b|p|m|f)/) },
  { id: "dtnl", title: "舌尖中音", subtitle: "d t n l", items: select(/^(d|t|n|l)/) },
  { id: "gkh", title: "舌根音节", subtitle: "g k h", items: select(/^(g|k|h)/) },
  { id: "zhchshr", title: "翘舌音节", subtitle: "zh ch sh r", items: select(/^(zh|ch|sh|r)/) },
  { id: "zcs", title: "平舌音节", subtitle: "z c s", items: select(/^(z(?!h)|c(?!h)|s(?!h))/) },
  { id: "single-final", title: "单韵母核心", subtitle: "单元音与 er", items: select(/^(a|o|e|er|yi|wu|yu)$/) },
  { id: "compound-final", title: "复韵母核心", subtitle: "ai ei ao ou 与介音", items: select(/^(ai|ei|ao|ou|yao|you|wai|wei)$/) },
  { id: "front-nasal", title: "前鼻韵母核心", subtitle: "-n 系列", items: select(/^(an|en|yin|wen|yun|yan|wan|yuan)$/) },
  { id: "back-nasal", title: "后鼻韵母核心", subtitle: "-ng 系列", items: select(/^(ang|eng|ying|weng|yong|yang|wang)$/) },
  { id: "all-order", title: "全音节 · 顺序", subtitle: `${allSyllables.length} 个大陆普通话音节`, items: allSyllables },
  { id: "all-mixed", title: "全音节 · 综合", subtitle: `${allSyllables.length} 个随机挑战`, items: allSyllables, forceShuffle: true },
];

const rows = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "delete"],
  ["tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["caps lock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "return"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "shift"],
  ["space"],
];

const gongbaoLabels = {
  w: { main: "c", bridge: "ch", bridgeTo: "e" },
  e: { main: "l", bridge: "n", bridgeTo: "r" },
  r: { main: "d" },
  t: { main: "t" },
  u: { main: "u", zero: "w" },
  i: { main: "er", left: "-i", right: "-u" },
  o: { main: "o" },
  s: { main: "s", bridge: "sh", bridgeTo: "d" },
  d: { main: "h", bridge: "r", bridgeTo: "f", top: "x" },
  f: { main: "g", top: "j" },
  g: { main: "k", top: "q" },
  j: { main: "i", zero: "y" },
  k: { main: "en", left: "-n" },
  l: { main: "e", left: "-ng" },
  x: { main: "z", bridge: "zh", bridgeTo: "c", top: "j" },
  c: { main: "f", bridge: "m", bridgeTo: "v" },
  v: { main: "b" },
  b: { main: "p" },
  m: { main: "ü", zero: "y" },
  " ": { main: "a" },
};

function mappingMarkup(mapping) {
  if (!mapping) return "";
  return `<small class="mapping">
    ${mapping.bridge ? `<span class="chord-bridge">${mapping.bridge}</span>` : ""}
    ${mapping.top ? `<span class="map-top">${mapping.top}</span>` : ""}
    ${mapping.left ? `<span class="map-left">${mapping.left}</span>` : ""}
    <span class="map-main">${mapping.main}</span>
    ${mapping.right ? `<span class="map-right">${mapping.right}</span>` : ""}
    ${mapping.zero ? `<span class="map-zero">${mapping.zero}</span>` : ""}
  </small>`;
}

function qwertyLabel(label) {
  return /^[a-z]$/.test(label) ? label.toUpperCase() : label;
}

const elements = {
  keyboard: document.querySelector("#keyboard"), syllables: document.querySelector("#syllables"),
  raw: document.querySelector("#raw-input"), translated: document.querySelector("#translated-input"),
  hint: document.querySelector("#hint"), counter: document.querySelector("#counter"),
  progress: document.querySelector("#progress"),
  toast: document.querySelector("#toast"), courseName: document.querySelector("#course-name"),
  courseSelect: document.querySelector("#course-select"), courseProgress: document.querySelector("#course-progress"),
  shuffle: document.querySelector("#shuffle"), keyboardHints: document.querySelector("#keyboard-hints"),
};

let courseIndex = Math.max(0, Number(localStorage.getItem("combo-course")) || 0);
let queue = [];
let index = 0;
let shuffleMode = false;
let userShuffle = false;
let hideKeyboardHints = localStorage.getItem("combo-hide-keyboard-hints") === "true";
let revealCorrectAfterError = false;
let activeChord = new Set();
let chordPeak = new Set();
let onscreenChord = new Set();
let onscreenSubmitTimer;
let toastTimer;
const completed = new Set(JSON.parse(localStorage.getItem("combo-completed") || "[]"));

function displayKey(key) { return key === " " ? "space" : key.toLowerCase(); }
function keyId(key) { return key === "space" ? " " : key.toLowerCase(); }
function shuffled(items) { return [...items].sort(() => Math.random() - 0.5); }

function makeKeyboard() {
  rows.forEach((row) => {
    const rowElement = document.createElement("div");
    rowElement.className = "key-row";
    row.forEach((label, keyIndex) => {
      const id = keyId(label);
      const key = document.createElement("button");
      key.type = "button";
      key.className = "key";
      if (["tab", "caps lock", "return", "shift"].includes(label)) key.classList.add("wide");
      if (label === "delete") key.classList.add("xwide");
      if (label === "space") key.classList.add("space");
      if (["tab", "caps lock"].includes(label) || (label === "shift" && keyIndex === 0)) key.classList.add("align-left");
      if (["delete", "return"].includes(label) || (label === "shift" && keyIndex === row.length - 1)) key.classList.add("align-right");
      key.dataset.key = id;
      key.setAttribute("aria-label", label === "space" ? "空格" : label);
      key.innerHTML = `<span class="qwerty-label">${qwertyLabel(label)}</span>${mappingMarkup(gongbaoLabels[id])}`;
      key.addEventListener("pointerdown", () => handleOnscreenKey(id));
      rowElement.appendChild(key);
    });
    elements.keyboard.appendChild(rowElement);
  });
}

function populateCourses() {
  elements.courseSelect.innerHTML = courses.map((course, i) =>
    `<option value="${i}">${completed.has(course.id) ? "✓ " : ""}${String(i + 1).padStart(2, "0")} · ${course.title}（${course.items.length}）</option>`
  ).join("");
  elements.courseSelect.value = String(courseIndex);
  elements.courseProgress.textContent = `${completed.size} / ${courses.length}`;
}

function loadCourse(nextIndex, announce = true) {
  courseIndex = (nextIndex + courses.length) % courses.length;
  const course = courses[courseIndex];
  shuffleMode = course.forceShuffle || userShuffle;
  elements.shuffle.setAttribute("aria-pressed", String(shuffleMode));
  elements.shuffle.textContent = shuffleMode ? "随机练习" : "顺序练习";
  elements.shuffle.disabled = Boolean(course.forceShuffle);
  queue = shuffleMode ? shuffled(course.items) : [...course.items];
  index = 0; revealCorrectAfterError = false; activeChord.clear(); chordPeak.clear(); onscreenChord.clear();
  clearTimeout(onscreenSubmitTimer);
  localStorage.setItem("combo-course", String(courseIndex));
  populateCourses();
  render();
  if (announce) showToast(`第 ${courseIndex + 1} 课 · ${course.title}`);
}

function visibleSyllables() {
  const start = Math.max(0, Math.min(index - 3, queue.length - 9));
  const end = Math.min(queue.length, start + 9);
  return queue.slice(start, end).map((item, offset) => ({ item, actual: start + offset }));
}

function render() {
  const course = courses[courseIndex];
  const current = queue[index];
  const finished = !current;
  const alternates = current?.alternatives || [];
  elements.courseName.textContent = `${course.title} · ${current?.section || course.subtitle}`;
  elements.syllables.innerHTML = visibleSyllables().map(({ item, actual }) =>
    `<span class="syllable ${actual < index ? "done" : actual === index ? "current" : ""}" data-syllable="${actual}">${item.sound.replace(/v/g, "ü")}</span>`
  ).join("");
  elements.raw.textContent = finished
    ? "✓"
    : [current.keys, ...alternates.map((option) => option.keys)]
      .map((keys) => keys.map(displayKey).join(" + ")).join("  /  ");
  elements.translated.textContent = finished ? "完成" : `⟨${current.sound.replace(/v/g, "ü")}⟩`;
  elements.counter.textContent = finished ? `${queue.length} / ${queue.length}` : `${index + 1} / ${queue.length}`;
  elements.progress.style.width = `${(index / queue.length) * 100}%`;
  elements.hint.innerHTML = finished
    ? `本课完成。按 <strong>Esc</strong> 再练一次。`
    : [
        `推荐 <strong>${current.keys.map(displayKey).join(" + ")}</strong> · [${current.code}]`,
        ...alternates.map((option) => `${option.label || "也可"} <strong>${option.keys.map(displayKey).join(" + ")}</strong> · [${option.code}]`),
        current.note,
      ].filter(Boolean).join("；");
  document.querySelectorAll(".key").forEach((key) => {
    const mapping = gongbaoLabels[key.dataset.key];
    const accepted = finished ? [] : acceptedKeysets(current);
    const showKeyboardHint = !hideKeyboardHints || revealCorrectAfterError;
    key.classList.toggle("target", showKeyboardHint && !finished && current.keys.includes(key.dataset.key));
    key.classList.toggle("alternate-target", Boolean(
      showKeyboardHint && !finished && alternates.some((option) => option.keys.includes(key.dataset.key)) && !current.keys.includes(key.dataset.key)
    ));
    key.classList.toggle("bridge-active", Boolean(
      showKeyboardHint && mapping?.bridgeTo && accepted.some((keys) => keys.includes(key.dataset.key) && keys.includes(mapping.bridgeTo))
    ));
    key.classList.remove("wrong");
  });
  if (finished) {
    elements.progress.style.width = "100%";
    if (!completed.has(course.id)) {
      completed.add(course.id);
      localStorage.setItem("combo-completed", JSON.stringify([...completed]));
      populateCourses();
    }
    showToast(`${course.title}完成`);
  }
}

function sameKeys(a, b) { return a.length === b.length && a.every((key) => b.includes(key)); }

function acceptedKeysets(item) {
  return [item.keys, ...(item.alternatives || []).map((option) => option.keys)];
}

function submit(keys) {
  if (!queue[index]) return;
  const normalized = [...new Set(keys)].sort();
  if (!normalized.length) return;
  const accepted = acceptedKeysets(queue[index]).map((keys) => [...keys].sort());
  if (accepted.some((expected) => sameKeys(normalized, expected))) {
    revealCorrectAfterError = false;
    index += 1;
    render();
    return;
  }
  document.querySelector(`[data-syllable="${index}"]`)?.classList.add("error");
  normalized.forEach((key) => document.querySelector(`.key[data-key="${CSS.escape(key)}"]`)?.classList.add("wrong"));
  if (hideKeyboardHints) {
    revealCorrectAfterError = true;
    queue[index].keys.forEach((key) =>
      document.querySelector(`.key[data-key="${CSS.escape(key)}"]`)?.classList.add("target")
    );
  }
  setTimeout(render, 380);
}

function handleOnscreenKey(key) {
  if (!/^[a-z ]$/.test(key)) return;
  const accepted = queue[index] ? acceptedKeysets(queue[index]) : [];
  clearTimeout(onscreenSubmitTimer);
  onscreenChord.add(key);
  if (!hideKeyboardHints) document.querySelector(`.key[data-key="${CSS.escape(key)}"]`)?.classList.add("pressed");
  const possible = accepted.filter((keys) => [...onscreenChord].every((pressed) => keys.includes(pressed)));
  const exact = possible.find((keys) => sameKeys([...onscreenChord].sort(), [...keys].sort()));
  const finish = () => {
    const chord = [...onscreenChord];
    onscreenChord.clear();
    submit(chord);
    document.querySelectorAll(".key.pressed").forEach((el) => el.classList.remove("pressed"));
  };
  if (!possible.length || (exact && !possible.some((keys) => keys.length > exact.length))) finish();
  else if (exact) onscreenSubmitTimer = setTimeout(finish, 420);
}

document.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.key === "Escape") { loadCourse(courseIndex, false); return; }
  if (event.key === "Enter") { skip(); return; }
  const key = event.key === " " ? " " : event.key.toLowerCase();
  if (!/^[a-z ]$/.test(key)) return;
  event.preventDefault(); activeChord.add(key); chordPeak.add(key);
  if (!hideKeyboardHints) document.querySelector(`.key[data-key="${CSS.escape(key)}"]`)?.classList.add("pressed");
});

document.addEventListener("keyup", (event) => {
  const key = event.key === " " ? " " : event.key.toLowerCase();
  if (!/^[a-z ]$/.test(key)) return;
  document.querySelector(`.key[data-key="${CSS.escape(key)}"]`)?.classList.remove("pressed");
  activeChord.delete(key);
  if (activeChord.size === 0 && chordPeak.size) { submit([...chordPeak]); chordPeak.clear(); }
});

function skip() {
  if (!queue[index]) return;
  clearTimeout(onscreenSubmitTimer);
  revealCorrectAfterError = false;
  onscreenChord.clear();
  document.querySelectorAll(".key.pressed").forEach((el) => el.classList.remove("pressed"));
  index += 1;
  render();
}
function showToast(message) {
  clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 1800);
}

document.querySelector("#restart").addEventListener("click", () => loadCourse(courseIndex, false));
document.querySelector("#next").addEventListener("click", skip);
document.querySelector("#previous-course").addEventListener("click", () => loadCourse(courseIndex - 1));
document.querySelector("#next-course").addEventListener("click", () => loadCourse(courseIndex + 1));
elements.courseSelect.addEventListener("change", (event) => loadCourse(Number(event.target.value)));
elements.shuffle.addEventListener("click", () => {
  userShuffle = !userShuffle;
  loadCourse(courseIndex, false);
});
elements.keyboardHints.setAttribute("aria-pressed", String(hideKeyboardHints));
elements.keyboardHints.addEventListener("click", () => {
  hideKeyboardHints = !hideKeyboardHints;
  localStorage.setItem("combo-hide-keyboard-hints", String(hideKeyboardHints));
  elements.keyboardHints.setAttribute("aria-pressed", String(hideKeyboardHints));
  render();
});

makeKeyboard(); populateCourses(); loadCourse(courseIndex, false);
