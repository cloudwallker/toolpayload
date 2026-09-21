// Verification hook only; never included in the published runtime.
const deny = () => { throw new Error('NETWORK_DISABLED_BY_TOOLPAYLOAD_SMOKE_TEST'); };
const net = require('node:net');
net.connect = deny;
net.createConnection = deny;
net.Socket.prototype.connect = deny;
for (const name of ['node:http', 'node:https']) {
  const module = require(name);
  module.request = deny;
  module.get = deny;
}
require('node:tls').connect = deny;
globalThis.fetch = deny;
