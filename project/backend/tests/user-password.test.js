const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/userSchema/user');

test('hashPassword creates a pbkdf2 password hash', () => {
    const hash = User.hashPassword('secret123');

    assert.equal(User.isHashedPassword(hash), true);
    assert.notEqual(hash, 'secret123');
});

test('comparePassword validates hashed passwords', async () => {
    const user = new User({
        username: 'hash-test-user',
        phone: '9999999999',
        email: 'hash-test@example.com',
        gender: 'Other',
        age: 21,
        password: User.hashPassword('secret123')
    });

    assert.equal(await user.comparePassword('secret123'), true);
    assert.equal(await user.comparePassword('wrong-password'), false);
});
