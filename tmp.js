var faker = require('faker');

// faker.locale = "zh_CN";


console.log(faker.datatype.number(999999999))
console.log(faker.name.findName())
console.log(faker.name.gender())
console.log(faker.internet.email())
console.log(faker.address.city())
console.log(faker.internet.ip())
console.log(faker.image.avatar())
console.log(faker.lorem.text())
