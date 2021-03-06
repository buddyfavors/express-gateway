const testHelper = require('../common/routing.helper');
const sinon = require('sinon');
const assert = require('assert');
const Config = require('../../lib/config/config');
const config = new Config();

// there are several configuration ways to listen to all hosts
describe('default config with multi step (multi action) policy', () => {
  const helper = testHelper();
  const spy = sinon.spy();
  const handler = (params) => (req, res, next) => {
    spy(params);
    next();
  };

  before('setup', () => {
    const plugins = {
      policies: [
        {
          name: 'test', policy: handler
        }, {
          name: 'test-return',
          policy: () => (req, res) => {
            res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
          }
        }
      ]
    };

    config.gatewayConfig = {
      http: { port: 9233 },
      apiEndpoints: {
        test_default: {}
      },
      policies: ['test', 'test-return'],
      pipelines: {
        pipeline1: {
          apiEndpoints: ['test_default'],
          policies: [
            {
              test: [{
                action: { param: 1 }
              }, {
                action: { param: 2 }
              }, {
                action: { param: 3 }
              }]
            },
            { 'test-return': null }
          ]
        }
      }
    };
    helper.setup({ config, plugins });
  });

  after('cleanup', (done) => {
    helper.cleanup();
    done();
  });

  beforeEach('reset', () => {
    spy.reset();
  });

  ['/random/17/3', '/', '/admin'].forEach(url => {
    it('should execute 2 policy steps for random host/path: ' + url, done => {
      helper.validateSuccess({
        setup: {
          host: 'zu.io',
          url
        },
        test: {
          host: 'zu.io',
          url,
          result: 'test'
        }
      })((err) => {
        assert(spy.calledThrice);
        assert(spy.calledWith({ param: 1 }));
        assert(spy.calledWith({ param: 2 }));
        assert(spy.calledWith({ param: 3 }));
        done(err);
      });
    });
  });
});
