const bcrypt = require('bcryptjs');
const hash = '$2b$12$ksb/9fnOeqTkd/lZwnVAWuC7Kb.L05qvtaemBMi9Uw4UZ7LrMHgga';
const pass = 'Password123!';

bcrypt.compare(pass, hash).then(res => {
  console.log('Result for Password123!:', res);
});
