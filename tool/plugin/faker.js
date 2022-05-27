const {
  rand,
  randAvatar,
  randBoolean,
  randCity,
  randEmail,
  randEmailProvider,
  randFirstName,
  randFloat,
  randFullAddress,
  randFullName,
  randIp,
  randLastName,
  randNumber,
  randPhoneNumber,
  randSentence,
  randState,
  randStreetAddress,
  randText,
  randUrl,
  randUuid,
  randWord
} = require('@ngneat/falso');

const randArr = rand;
const cache = {};
const chinese = getChineseInfo();
const twoDigits = num => num < 10 ? `0${num}` : `${num}`;

/**
 * Export some frequently-used methods.
 */
module.exports = {
  chinese,

  /**
   * Return a random integer.
   * @param {number} min
   * @param {number} max
   */
  rand(min = 0, max = Number.MAX_SAFE_INTEGER) {
    return randNumber({ min, max });
  },

  /**
   * Create an array containing a range of elements
   * @param {number} start
   * @param {number} stop
   * @param {number} step
   */
  range(start = 0, stop = 10, step = 1) {
    const res = [];
    for(let i = start; i < stop; i += step) {
      res.push(i);
    }
    return res;
  },

  /**
   * The default likelihood of success (returning true) is 50%. Can optionally specify the likelihood in percent.
   * chance.bool({likelihood: 30}): In this case only a 30% likelihood of true, and a 70% likelihood of false.
   */
  bool() {
    return randBoolean();
  },

  /**
   * By default it will return a string with random character from the specified pool.
   * @param {string} pool
   */
  char(pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_') {
    return pool[this.rand(0, pool.length - 1)];
  },

  /**
   * Return a random string. By default it will return a string with random length of 5-20 characters
   * and will contain any of the following characters.
   * @param {number} min
   * @param {number} max
   * @param {string} pool
   */
  string(min = 5, max = 20, pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_') {
    return [...Array(this.rand(min, max))].map(() => this.char(pool)).join('');
  },

  /**
   * Return a random floating point number. By default it will return a fixed number of at most 2 digits after the decimal.
   * @param {number} min
   * @param {number} max
   * @param {number} fraction
   */
  float(min = 0, max = Number.MAX_SAFE_INTEGER, fraction = 2) {
    return randFloat({ min, max, fraction });
  },

  /**
   * Return a random integer. range: -9007199254740991 to 9007199254740991
   * @param {number} min
   * @param {number} max
   */
  integer(min = 0, max = Number.MAX_SAFE_INTEGER) {
    return randNumber({ min, max });
  },


  /**
   * Return a random sentence populated by semi-pronounceable random (nonsense) words.
   * Default is a sentence with a random number of words from 12 to 18.
   * @param {boolean} cn
   */
  sentence(cn = false) {
    return cn ? randArr(chinese.words, { length: this.rand(8, 18) }).join('') : randSentence();
  },

  /**
   * Return a random text words.
   * Default is a sentence with a random number of words from 2 to 8.
   * @param {boolean} cn
   */
  text(cn = false) {
    return cn ? randArr(chinese.words, { length: this.rand(3, 8) }).join('') : randText();
  },

  /**
   * Return a semi-pronounceable random (nonsense) word.
   * @param {boolean} cn
   */
  word(cn = false) {
    return cn ? randArr(chinese.words) : randWord();
  },

  /**
   * Generate a random user name.
   * @param {boolean} cn
   */
  name(cn = false) {
    if (cn) {
      return randArr(chinese.firstNames) + randArr(chinese.lastNames, { length: this.rand(1, 2)}).join('');
    }
    return randFullName({ withAccents: false });
  },

  /**
   * Generate a random first name.
   * @param {boolean} cn
   */
  firstName(cn = false) {
    return cn ? randArr(chinese.firstNames) : randFirstName({ withAccents: false });
  },

  /**
   * Generate a random last name.
   * @param {boolean} cn
   */
  lastName(cn = false) {
    return cn ? randArr(chinese.lastNames, { length: this.rand(1, 2)}).join('') : randLastName({ withAccents: false });
  },

  /**
   * Generate a random gender.
   * @param {string[]} pool
   */
  gender(pool = ['male', 'female']) {
    return this.pick(pool);
  },

  /**
   * Return a random province.
   * @param {boolean} cn
   */
  province(cn = false) {
    return cn ? randArr(Object.keys(chinese.cities)) : randState();
  },

  /**
   * Return a random city.
   * @param {boolean} cn
   */
  city(cn = false) {
    return cn ? randArr(randArr(Object.values(chinese.cities)).split(',')) : randCity();
  },

  /**
   * Return a random street.
   * @param {boolean} cn
   */
  street(cn = false) {
    if (cn) {
      return randArr(chinese.area) + randArr(chinese.words, { length: this.rand(2, 3)}).join('')+'街';
    }
    return randStreetAddress();
  },

  /**
   * Return a random address.
   * @param {boolean} cn
   */
  address(cn = false) {
    if (cn) {
      return [
        randArr(chinese.area),
        randArr(chinese.words, { length: this.rand(2, 3)}).join(''),
        '路',
        this.rand(10, 999),
        '号'
      ].join('');
    }
    return randFullAddress({ includeCounty: false, includeCountry: false });
  },

  /**
   * Return a random avatar.
   * @param {number} size
   */
  avatar(size = 100) {
    return randAvatar({ size });
  },

  /**
   * Return a random image.
   * @param {string} size default to 640x480
   * @param {string} type default to any
   */
  image(size = '640x480', type = 'any') {
    if (!/^\w+x\d+$/i.test(size)) {
      throw new Error('Invalid size format.');
    }
    const category = ['animals', 'arch', 'nature', 'people', 'tech', 'any'].includes(type) ? type : 'any';

    const [width, height] = size.toLowerCase().split('x');
    return `https://placeimg.com/${width}/${height}/${category}`;
  },

  /**
   * Return a random email with a random domain.
   * @param {string} provider
   * @param {string} suffix
   */
  email(provider = randEmailProvider(), suffix = 'com') {
    return randEmail({ provider, suffix, nameSeparator: '_'  }).replace('_', this.rand(1, 3) === 1 ? '_' : '');
  },

  /**
   * Return a random IP Address.
   */
  ip(){
    return randIp();
  },

  /**
   * Generate a random phone.
   * @param {string} format
   */
  phone(format = '1##########') {
    return format === 'random' ? randPhoneNumber() : format.replace(/#/g, () => this.rand(0, 9));
  },

  /**
   * Generate a random string with specified format.
   * Meta chars:
   *    '#' for [0-9]
   *    '!' for [1-9]
   *    '@' for [a-zA-Z]
   *    '$' for [~!@#$%^&*()_+;'",<>/?\\-]
   *    '%' for [a-zA-Z~!@#$%^&*()_+;'",<>/?\\-]
   * Quantity chars:
   *    '*' for a random number from 0 to 10
   *    '+' for a random number from 1 to 10
   *    '?' for a random number from 0 to 1
   * @param {string} format
   */
  format(format) {
    if (typeof format !== 'string') {
      throw new Error('Expect [format] to be a string.');
    }
    const replacer = (match) => {
      const [char, quantity = ''] = [match[0], match.slice(1)];
      const fun = {
        '#': () => this.rand(0, 9),
        '!': () => this.rand(1, 9),
        '@': () => this.string(1, 1, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'),
        '$': () => this.string(1, 1, '~!@#$%^&*()_-+;\'",<>/?\\'),
        '%': () => this.string(1, 1, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_-+;\'",<>/?\\'),
      }[char];
      const len = /^\d+$/.test(quantity) ? +quantity : {
        '*': this.rand(0, 10),
        '+': this.rand(1, 10),
        '?': this.rand(0, 1),
        '': 1,
      }[quantity];
      return [...Array(len)].map(() => fun()).join('');
    };
    return format.replace(/[#!@]([+*?]|\d+)?/g, replacer);
  },

  /**
   * Return a random url.
   * @param {string | undefined} domain
   * @param {string} protocol
   */
  url(){
    return randUrl().replace(/\/+$/g, '') + '/' + randWord();
  },

  /**
   * Return a random guid.
   */
  guid(){
    return randUuid();
  },

  /**
   * Return a random datetime.
   * @param {number} timestamp
   * @param {string} dateFormat
   * @param {string} timeFormat
   */
  datetime(timestamp, dateFormat = 'YYYY-MM-DD', timeFormat = 'HH:mm:ss') {
    return this.date(timestamp, dateFormat) + ' ' + this.time(timestamp, timeFormat);
  },

  /**
   * Return a random date.
   * @param {number} timestamp
   * @param {string} format default YYY-MM-DD
   */
  date(timestamp, format = 'YYYY-MM-DD') {
    const time = new Date(timestamp || Date.now() - this.rand(0, 1000) * 86400000);
    return format
      .replace(/YYYY/g, time.getFullYear())
      .replace(/MM/g, twoDigits(time.getMonth()+1))
      .replace(/DD/g, twoDigits(time.getDate()));
  },

  /**
   * Return a random time.
   * @param {number} timestamp
   * @param {string} format default HH:mm:ss
   */
  time(timestamp, format = 'HH:mm:ss') {
    const time = new Date(timestamp || Date.now() - this.rand(0, 86400000));
    return format
      .replace(/HH/g, twoDigits(time.getHours()))
      .replace(/mm/g, twoDigits(time.getMinutes()))
      .replace(/ss/g, twoDigits(time.getSeconds()));
  },



  /**
   * Return some bytes.
   * @param {string} str
   */
  bytes(str = '') {
    if (typeof ArrayBuffer === 'function' && typeof Uint8Array === 'function') {
      const chars = str || this.string(5, 10);
      const buf = new ArrayBuffer(chars.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < chars.length; i++) {
        view[i] = chars.charCodeAt(i);
      }
      return buf;
    }
    return (str || this.string(5, 10)).split('').map(c => c.charCodeAt(0));
  },

  /**
   * Given an array, pick some random elements.
   * @param {any[]} arr
   * @param {number} quantity
   */
  pick(arr, quantity = 1) {
    return quantity === 1 ? randArr(arr) : randArr(arr, { length: quantity });
  },

  /**
   * Return an auto-incremented id.
   * @param {string} group
   * @param {number} base
   */
  incrementId(group = 'default', base = 1) {
    if (typeof group === 'number' && typeof base === 'string') {
      [group, base] = [base, group];
    }
    cache.incrementId = cache.incrementId || {};
    cache.incrementId[group || 'default'] = cache.incrementId[group] || base;
    return cache.incrementId[group]++;
  },

  /**
   * Given an array, returns a value from it in turn
   * @param {any[]} arr
   * @param {string} group
   */
  rotate(arr, group = 'default') {
    if (!arr.length) {
      throw new Error('`arr` can not be empty.');
    }
    cache.rotate = cache.rotate || {};
    cache.rotate[group || 'default'] = cache.rotate[group] || 0;

    return arr[(cache.rotate[group]++)%arr.length];
  },

  /**
   * The shadow of 'faker' which returns a representation of a faker method invocation.
   * Example:
   *    const faker = require('http-request-mock/plugin/faker.js').shadow;
   *    console.log(faker.integer(1, 10));
   *    The codes above will output: "faker.integer(1, 10)";
   */
  get shadow() {
    const inteceptor = (instance, key) => new Proxy(instance, {
      // eslint-disable-next-line
      apply: function(_, __, argumentsList) {
        const args = argumentsList.map(arg => JSON.stringify(arg)).join(', ');
        return `faker.${key}(${args})`;
      }
    });
    const shadow = new Proxy(this, {
      get(target, key) {
        return typeof target[key] === 'function' ? inteceptor(target[key], key) : target[key];
      },
    });
    return shadow;
  }
};

function getChineseInfo () {
  const words = (
    '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经'+
    '十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间'+
    '样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入'+
    '常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光'+
    '门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至'+
    '达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非'+
    '验连断深难近矿千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养'+
    '易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞'
  ).split('');

  const firstNames = (
    '王李张刘陈杨黄吴赵周徐孙马朱胡林郭何高罗郑梁谢宋唐许邓冯韩曹曾彭萧蔡潘田董顾毛郝龚邵万钱严赖覃洪武贺' +
    '袁于余叶蒋杜苏魏程吕丁沈任姚卢傅钟姜崔谭廖范汪陆莫孔金石戴贾韦夏邱方侯邹熊孟秦白江阎薛尹段雷黎史龙陶'
  ).split('');

  const lastNames = (
    '绍齐博文梓晨胤祥瑞霖明哲天翊凯瑞健雄耀杰潇然子涵越彬钰轩智辉致远俊驰雨泽驰烨磊晟睿文昊修洁黎昕远航旭尧'+
    '鸿涛伟祺荣轩越泽浩宇瑾瑜皓轩擎苍擎宇志泽子轩睿渊弘文哲瀚雨涛泽楷瑞建辉晋鹏天磊绍辉泽洋鑫磊鹏煊昊强伟宸'+
    '博超君浩子骞鹏涛炎彬鹤轩越彬风华靖琪明辉伟诚琪明轩健柏修杰志泽弘文峻熙嘉懿煜城懿轩烨伟苑博伟泽熠彤鸿煊'+
    '博涛烨霖烨华煜祺智宸正豪昊然明浩杰立诚立轩立辉峻熙弘文熠彤鸿煊烨霖哲瀚鑫鹏昊天思聪展鹏笑愚志强炫明雪松'+
    '思源智渊思淼晓啸航天宇浩然文轩鹭洋振家乐驹晓博文博昊焱立果金鑫锦程嘉熙鹏飞子默思远浩轩语堂聪健明文果思鹏'
  ).split('');

  const cities = {
    河北省: '石家庄市,唐山市,秦皇岛市,邯郸市,邢台市,保定市,张家口市,承德市,沧州市,廊坊市,衡水市',
    山西省: '太原市,大同市,阳泉市,长治市,晋城市,朔州市,晋中市,运城市,忻州市,临汾市,吕梁市',
    内蒙古自治区: '呼和浩特市,包头市,乌海市,赤峰市,通辽市,鄂尔多斯市,呼伦贝尔市,巴彦淖尔市,乌兰察布市',
    辽宁省: '沈阳市,大连市,鞍山市,抚顺市,本溪市,丹东市,锦州市,营口市,阜新市,辽阳市,盘锦市,铁岭市,朝阳市,葫芦岛市',
    吉林省: '长春市,吉林市,四平市,辽源市,通化市,白山市,松原市,白城市',
    黑龙江省: '哈尔滨市,齐齐哈尔市,黑河市,大庆市,伊春市,鹤岗市,佳木斯市,双鸭山市,七台河市,鸡西市,牡丹江市,绥化市',
    江苏省: '南京市,徐州市,连云港市,宿迁市,淮安市,盐城市,扬州市,泰州市,南通市,镇江市,常州市,无锡市,苏州市',
    浙江省: '杭州市,宁波市,湖州市,嘉兴市,舟山市,绍兴市,衢州市,金华市,台州市,温州市,丽水市',
    安徽省: '合肥市,芜湖市,蚌埠市,淮南市,马鞍山市,淮北市,铜陵市,安庆市,黄山市,滁州市,阜阳市,宿州市,六安市,亳州市,池州市,宣城市',
    福建省: '厦门市,福州市,南平市,三明市,莆田市,泉州市,漳州市,龙岩市,宁德市。',
    江西省: '南昌市,九江市,景德镇市,鹰潭市,新余市,萍乡市,赣州市,上饶市,抚州市,宜春市,吉安市',
    山东省: '济南市,青岛市,德州市,东营市,淄博市,潍坊市,烟台市,威海市,日照市,临沂市,枣庄市,济宁市,泰安市,滨州市,菏泽市',
    河南省: '郑州市,开封市,洛阳市,平顶山市,安阳市,鹤壁市,新乡市,焦作市,濮阳市,许昌市,漯河市,三门峡市,南阳市,商丘市,周口市,驻马店市,信阳市',
    湖北省: '武汉市:,十堰市,襄阳市,荆门市,孝感市,黄冈市,鄂州市,黄石市,咸宁市,荆州市,宜昌市,随州市',
    湖南省: '长沙市,衡阳市,张家界市,常德市,益阳市,岳阳市,株洲市,湘潭市,郴州市,永州市,邵阳市,怀化市,娄底市',
    广东省: '广州市,深圳市,清远市,韶关市,河源市,梅州市,潮州市,汕头市,揭阳市,汕尾市,惠州市,东莞市,珠海市,中山市,江门市,佛山市,肇庆市,云浮市,阳江市,茂名市,湛江市',
    广西壮族自治区: '南宁市,桂林市,柳州市,梧州市,贵港市,玉林市,钦州市,北海市,防城港市,崇左市,百色市,河池市,来宾市,贺州市',
    海南省: '海口市,三亚市,三沙市,儋州市',
    四川省: '成都市,广元市,绵阳市,德阳市,南充市,广安市,遂宁市,内江市,乐山市,自贡市,泸州市,宜宾市,攀枝花市,巴中市,达州市,资阳市,眉山市,雅安市',
    贵州省: '贵阳市,六盘水市,遵义市,安顺市,毕节市,铜仁市',
    云南省: '昆明市,曲靖市,玉溪市,丽江市,昭通市,普洱市,临沧市,保山市',
    陕西省: '西安市,延安市,铜川市,渭南市,咸阳市,宝鸡市,汉中市,榆林市,商洛市,安康市',
    甘肃省: '兰州市,嘉峪关市,金昌市,白银市,天水市,酒泉市,张掖市,武威市,庆阳市,平凉市,定西市,陇南市',
    青海省: '西宁市,海东市',
    西藏自治区: '拉萨市,日喀则市,昌都市,林芝市,山南市,那曲市',
    宁夏回族自治区: '银川市,石嘴山市,吴忠市,中卫市,固原市',
    新疆维吾尔自治区: '乌鲁木齐市,克拉玛依市,吐鲁番市,哈密市',
  };

  const area = '东城区,西城区,朝阳区,西湖区,东湖区,丰台区,石景山区,海淀区,门头沟区,房山区,通州区,顺义区,昌平区,大兴区,怀柔区,平谷区'.split(',');

  return { words, firstNames, lastNames, cities, area };
}
