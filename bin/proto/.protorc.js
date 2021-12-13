const faker = require('../../plugin/faker.js');

module.exports = {
  overwrite: true,

  apiPrefix: '',

  // The proto entry file. Absolute path.
  protoEntry: '',

  // A list of search paths that are absolute for imported .proto files.
  protoPath: [],


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
    int32: 'faker.integer(0, 1000000)',
    int64: `String(faker.integer(1, 1000000))`,
    string: 'faker.string(5, 12)',
    bool: 'faker.bool()',
    double: 'faker.float(0, 1000000, 2)',
    float: 'faker.float(0, 1000000, 2)',
    uint32: 'faker.integer(0, 1000000)',
    uint64: 'faker.integer(0, 1000000)',
    sint32: 'faker.integer(-1000000, 1000000)',
    sint64: 'faker.integer(-1000000, 1000000)',
    fixed32: 'faker.integer(0, 1000000)',
    fixed64: 'faker.integer(0, 1000000)',
    sfixed32: 'faker.integer(-1000000, 1000000)',
    sfixed64: 'faker.integer(-1000000, 1000000)',
    bytes: 'faker.bytes()'
  },

  // Set global default values for specified fields. Only for scalar value types.
  globalFields: {
    code: () => 0,
    msg: () => 'ok',
  }
};
