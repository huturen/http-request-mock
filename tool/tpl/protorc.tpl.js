const faker = require('../plugin/faker.js').shadow; // __hrm_faker_shadow__

module.exports = {
  overwrite: true,

  apiPrefix: '',

  // The proto entry file. Absolute path.
  protoEntry: '',

  // A list of search paths that are absolute for imported .proto files.
  protoPaths: [],


  // Generate mock files that match specified methods, such as: ['getUser', /^getUser.*/].
  // Note: this option is exclusive with `exclude_methods`.
  includeMethods: [],

  // Skip methods that match specified items, such as: ['getUser', /^getUser.*/].
  // Note: this option is exclusive with `include_methods`.
  excludeMethods: [],

  // Whether or not to generate proto request fields, default to false.
  generateProtoRequestFields: false,

  // The default length of a repeated field
  repeatedLength: () => faker.rand(2, 5),

  // Set global default values for specified types
  globalTypes: {
    int32: faker.integer(1, 10000),
    int64: 'faker.integer(1, 10000).toString()',
    string: faker.string(5, 12),
    bool: faker.bool(),
    double: faker.float(0, 10000, 2),
    float: faker.float(0, 10000, 2),
    uint32: faker.integer(0, 10000),
    uint64: faker.integer(0, 10000),
    sint32: faker.integer(-10000, 10000),
    sint64: faker.integer(-10000, 10000),
    fixed32: faker.integer(0, 10000),
    fixed64: faker.integer(0, 10000),
    sfixed32: faker.integer(-10000, 10000),
    sfixed64: faker.integer(-10000, 10000),
    bytes: faker.bytes(),
  },

  // Set global default values for specified fields.
  globalFields: {
    code: 0,
    msg: 'ok',
    id: (messageType) => {
      return faker.incrementId(messageType, 1);
    },
    title: faker.text(),
    name: faker.name(),
    url: faker.url(),
    email: faker.email(),
    avatar: faker.avatar(),
    image: faker.image(),
    datetime: faker.datetime(),
    ip: faker.ip(),
    phone: faker.phone(),
    address: faker.address(),
    guid: faker.guid(),
  }
};
