const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const sha1 = require('sha1');
const { ObjectId } = require('mongodb');
const UsersControllers = require('./usersController');
const RedisClient = require('../utils/redis');
const DBClient = require('../utils/db');

const { expect } = chai;

chai.use(chaiHttp);

describe('UsersController', () => {
  describe('postNew', () => {
    it('should create a new user and return user information', async () => {
      const request = {
        body: {
          email: 'you@example.com',
          password: 'password123'
        }
      };
      const response = {
        status: (statusCode) => {
          expect(statusCode).to.equal(201);
          return {
            send: (data) => {
              expect(data).to.have.property('id').to.be.a('string');
              expect(data).to.have.property('email').to.equal('you@example.com');
            }
          };
        }
      };

      sinon.stub(DBClient.db.collection('users'), 'findOne').resolves(null);
      sinon.stub(DBClient.db.collection('users'), 'insertOne').resolves({ inseredId: 'user_id' });

      await UsersControllers.postNew(request, response);

      DBClient.db.collection('users').findOne.restore();
      DBClient.db.collection('users').findOne.restore();
    });

    it('should return an error if email already exists', async () => {
      const request = {
        body: {
          email: 'existing@example.com',
          password: 'password123'
        }
      };
      const response = {
        status: (statusCode) => {
          expect(statusCode).to.equal(400);
          return {
            send: (error) => {
              expect(error).to.have.property('error').to.equal('Already exists');
            }
          };
        }
      };
      sinon.stub(DBClient.db.collection('users'), 'findOne').resolves({ email: 'existing@example.com' });

      await UsersControllers.postNew(request, response);

      DBClient.db.collection('users').findOne.restore();
    });
    it('should return an error if email or password is missing', async () => {
      const request = {
        body: {}
      };
      const response = {
        status: (statusCode) => {
          expect(statusCode).to.equal(400);
          return {
            send: (error) => {
              expect(error).to.have.property('error');
            }
          };
        }
      };
      await UsersControllers.postNew(request, response);
    });
  });
});
describe('getMe', () => {
  it('should return user information if a valid token is provided', async () => {
    const request = {
      header: (headerName) => {
        if (headerName === 'X-Token') {
          return 'valid_token';
        }
        return null;
      }
    };
    const response = {
      status: (statusCode) => {
        expect(statusCode).to.equal(200);
        return {
          send: (data) => {
            expect(data).to.have.property('id').to.be.a('string');
            expect(data).to.have.property('email').to.equal('test@example.com');
          }
        };
      }
    };
    sinon.stub(DBClient.db.collection('users'), 'findOne').resolves({ _id: 'user_id', email: 'test@example.com' });

    await UsersControllers.getMe(request, response);

    RedisClient.get.restore();
    DBClient.db.collection('users').findOne.restore();
  });

  it('should return an unauthorized error if an invalid token is provided', async () => {
    const request = {
      header: () => null
    };
    const response = {
      status: (statusCode) => {
        expect(statusCode).to.equal(401);
        return {
          send: (error) => {
            expect(error).to.have.property('error').to.equal('Unauthorized');
          }
        };
      }
    };

    await UsersControllers.getMe(request, response);
  });
});
