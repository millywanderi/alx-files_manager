const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');
const AuthController = require('./authController');
const RedisClient = require('../utils/redis');
const DBClient = require('../utils/db');

const { expect } = chai;

chai.use(chaiHttp);

describe('AuthController', () => {
  describe('getConnect', () => {
    it('should return a toke if valid credentials are provided', async () => {
      const request = {
        header: (headerName) => {
          if (headerName === 'Authorization') {
            return 'Basic dXNlcm5bWU6CGFzc3dvcmQ=';
          }
          return null;
        }
      };
      const response = {
        status: (statusCode) => {
          expect(statusCode).to.equal(200);
          return {
            send: (data) => {
              expect(data).to.have.property('token').to.be.a('string');
            }
          };
        }
      };
      sinon.stub(DBClient.db.collection('users'), 'findOne').resolves({ _id: 'user_id' });

      sinon.stub(RedisClient, 'set').resolves('OK');

      await AuthController.getConnect(request, response);

      DBClient.db.collection('users').findOne.restore();
      RedisClient.set.restore();
    });

    it('should return an authorized error if invalid creadentials are provided', async () => {
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

      await AuthController.getConnect(request, response);
    });
  });

  describe('getDisconnect', () => {
    it('should disconnect and return a 204 status if a valid token is provided', async () => {
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
          expect(statusCode).to.equal(204);
          return {
            send: () => {}
          };
        }
      };

      sinon.stub(RedisClient, 'get').resolves('user_id');
      sinon.stub(RedisClient, 'del').resolves('Ok');

      await AuthController.getDisconnect(request, response);

      RedisClient.get.restore();
      RedisClient.del.restore();
    });

    it('should return an authorized error if an invalid token is provided', async () => {
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

      await AuthController.getDisconnect(request, response);
    });
  });
});
